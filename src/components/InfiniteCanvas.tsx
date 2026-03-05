"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useCanvasStore, PixelData } from "@/store/useCanvasStore";
import { COOLDOWN_MS } from "@/components/CooldownTimer";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp, limit } from "firebase/firestore";

// The size of one logical pixel block
const PIXEL_SIZE = 15; // Slightly larger for better mobile/desktop balance

export default function InfiniteCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Transform state: [x, y, scale] - Persisted to localStorage
    const [transform, setTransform] = useState(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("canvas_transform");
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch (e) {
                    console.error("Failed to parse saved transform", e);
                }
            }
        }
        return { x: 0, y: 0, scale: 1 };
    });

    const [isDragging, setIsDragging] = useState(false);
    const lastMousePos = useRef({ x: 0, y: 0 });

    const { pixels, selectedColor, applyChanges } = useCanvasStore();

    // Track window size for correct bounds querying
    const [windowSize, setWindowSize] = useState({
        width: typeof window !== "undefined" ? window.innerWidth : 1200,
        height: typeof window !== "undefined" ? window.innerHeight : 800
    });

    // Helper to calculate bounds from transform and window size
    const calculateBounds = useCallback((t: typeof transform, w: typeof windowSize) => {
        const s = t.scale;
        const minX = Math.floor((- (w.width / 2 + t.x)) / (PIXEL_SIZE * s)) - 60;
        const maxX = Math.ceil((w.width - (w.width / 2 + t.x)) / (PIXEL_SIZE * s)) + 60;
        const minY = Math.floor((- (w.height / 2 + t.y)) / (PIXEL_SIZE * s)) - 60;
        const maxY = Math.ceil((w.height - (w.height / 2 + t.y)) / (PIXEL_SIZE * s)) + 60;
        return { minX, maxX, minY, maxY };
    }, []);

    const [bounds, setBounds] = useState(() => calculateBounds(transform, windowSize));

    useEffect(() => {
        const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Save transform and update bounds on move
    useEffect(() => {
        localStorage.setItem("canvas_transform", JSON.stringify(transform));

        const nextBounds = calculateBounds(transform, windowSize);
        setBounds(prev => {
            // Only update query bounds if moved significantly (more than 15 pixels worth)
            const dx = Math.abs(nextBounds.minX - prev.minX);
            const dy = Math.abs(nextBounds.minY - prev.minY);
            // We should also update if the scale changed significantly
            if (dx > 20 || dy > 20 || Math.abs(nextBounds.maxX - prev.maxX) > 20) {
                return nextBounds;
            }
            return prev;
        });
    }, [transform, windowSize, calculateBounds]);

    useEffect(() => {
        const { minX, maxX, minY, maxY } = bounds;

        const q = query(
            collection(db, "pixels"),
            where("x", ">=", minX),
            where("x", "<=", maxX),
            limit(5000)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const changes = snapshot.docChanges().map(change => ({
                type: change.type,
                data: change.doc.data() as PixelData
            })).filter(change => {
                // Manual filtering for Y axis in current view
                return change.data.y >= minY && change.data.y <= maxY;
            });

            if (changes.length > 0) {
                applyChanges(changes);
            }
        }, (error) => {
            console.error("Firestore Sync Error:", error);
        });

        return () => unsubscribe();
    }, [bounds, applyChanges]);

    // Draw loop
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Make canvas full screen by updating internal resolution
        const rect = canvas.getBoundingClientRect();
        if (canvas.width !== rect.width || canvas.height !== rect.height) {
            canvas.width = rect.width;
            canvas.height = rect.height;
        }

        // Clear background
        ctx.fillStyle = "#050505";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        // Apply transform (pan & zoom)
        ctx.translate(canvas.width / 2 + transform.x, canvas.height / 2 + transform.y);
        ctx.scale(transform.scale, transform.scale);

        // Render Grid if zoomed in enough
        if (transform.scale > 0.45) {
            ctx.strokeStyle = "rgba(0, 255, 65, 0.08)";
            ctx.lineWidth = 1 / transform.scale;

            const startX = -((canvas.width / 2 + transform.x) / transform.scale);
            const endX = startX + canvas.width / transform.scale;
            const startY = -((canvas.height / 2 + transform.y) / transform.scale);
            const endY = startY + canvas.height / transform.scale;

            const GRID_STEP = PIXEL_SIZE;
            const firstXLine = Math.floor(startX / GRID_STEP) * GRID_STEP;
            const firstYLine = Math.floor(startY / GRID_STEP) * GRID_STEP;

            ctx.beginPath();
            for (let x = firstXLine; x < endX; x += GRID_STEP) {
                ctx.moveTo(x, startY);
                ctx.lineTo(x, endY);
            }
            for (let y = firstYLine; y < endY; y += GRID_STEP) {
                ctx.moveTo(startX, y);
                ctx.lineTo(endX, y);
            }
            ctx.stroke();
        }

        // Render Pixels
        pixels.forEach((pixel) => {
            ctx.fillStyle = pixel.color;
            ctx.fillRect(pixel.x * PIXEL_SIZE, pixel.y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
        });

        ctx.restore();
    }, [transform, pixels]);

    // Request Animation Frame loop
    useEffect(() => {
        let animationFrameId: number;
        const render = () => {
            draw();
            animationFrameId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, [draw]);

    // Event Handlers
    const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const zoomSensitivity = 0.001;
        const delta = -e.deltaY * zoomSensitivity;

        setTransform((prev: typeof transform) => {
            let newScale = prev.scale * Math.exp(delta);
            newScale = Math.max(0.1, Math.min(15, newScale));
            return { ...prev, scale: newScale };
        });
    };

    const handlePointerDown = async (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (e.button === 1 || e.button === 2 || e.shiftKey) {
            setIsDragging(true);
            lastMousePos.current = { x: e.clientX, y: e.clientY };
        } else if (e.button === 0) {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const scale = transform.scale;
            const rect = canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;

            const worldX = (clickX - (canvas.width / 2 + transform.x)) / scale;
            const worldY = (clickY - (canvas.height / 2 + transform.y)) / scale;

            const gridX = Math.floor(worldX / PIXEL_SIZE);
            const gridY = Math.floor(worldY / PIXEL_SIZE);

            const storedTime = localStorage.getItem("lastPixelPlacedAt");
            if (storedTime) {
                const timePassed = Date.now() - parseInt(storedTime, 10);
                if (timePassed < COOLDOWN_MS) {
                    return;
                }
            }

            localStorage.setItem("lastPixelPlacedAt", Date.now().toString());
            window.dispatchEvent(new Event("pixelPlaced"));

            try {
                const docId = `${gridX}_${gridY}`;
                await setDoc(doc(db, "pixels", docId), {
                    x: gridX,
                    y: gridY,
                    color: selectedColor,
                    updatedAt: serverTimestamp()
                });
            } catch (err: unknown) {
                console.error("Failed to place pixel:", err);
                const message = err instanceof Error ? err.message : "Unknown error";
                alert("Could not place pixel (check internet or Firestore rules). " + message);
                localStorage.removeItem("lastPixelPlacedAt");
                window.dispatchEvent(new Event("pixelPlaced"));
            }
        }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (isDragging) {
            const dx = e.clientX - lastMousePos.current.x;
            const dy = e.clientY - lastMousePos.current.y;

            setTransform((prev: typeof transform) => ({
                ...prev,
                x: prev.x + dx,
                y: prev.y + dy,
            }));

            lastMousePos.current = { x: e.clientX, y: e.clientY };
        }
    };

    return (
        <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full cursor-crosshair touch-none outline-none"
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={() => setIsDragging(false)}
            onPointerLeave={() => setIsDragging(false)}
            onContextMenu={(e) => e.preventDefault()}
        />
    );
}
