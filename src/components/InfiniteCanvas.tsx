"use client";
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useCanvasStore, PixelData } from "@/store/useCanvasStore";
import { COOLDOWN_MS } from "@/components/CooldownTimer";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp, limit } from "firebase/firestore";

// The size of one logical pixel block
const PIXEL_SIZE = 15; // Slightly larger for better mobile/desktop balance

export default function InfiniteCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Transform state: [x, y, scale]
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
    const [isDragging, setIsDragging] = useState(false);
    const lastMousePos = useRef({ x: 0, y: 0 });

    const { pixels, selectedColor, updatePixels } = useCanvasStore();

    // Track window size for correct bounds querying
    const [windowSize, setWindowSize] = useState({
        width: typeof window !== "undefined" ? window.innerWidth : 1000,
        height: typeof window !== "undefined" ? window.innerHeight : 1000
    });

    useEffect(() => {
        const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Track bounds as simple state, updated in a debounced way inside an effect
    const scale = transform.scale;
    const computedMinX = Math.floor((- (windowSize.width / 2 + transform.x)) / (PIXEL_SIZE * scale)) - 30;
    const computedMaxX = Math.ceil((windowSize.width - (windowSize.width / 2 + transform.x)) / (PIXEL_SIZE * scale)) + 30;
    const computedMinY = Math.floor((- (windowSize.height / 2 + transform.y)) / (PIXEL_SIZE * scale)) - 30;
    const computedMaxY = Math.ceil((windowSize.height - (windowSize.height / 2 + transform.y)) / (PIXEL_SIZE * scale)) + 30;

    const [bounds, setBounds] = useState({ minX: -50, maxX: 50, minY: -50, maxY: 50 });

    useEffect(() => {
        // use a timeout to ensure we don't set state synchronously during render cycle
        const t = setTimeout(() => {
            setBounds(prev => {
                if (Math.abs(computedMinX - prev.minX) < 10 && Math.abs(computedMaxX - prev.maxX) < 10 &&
                    Math.abs(computedMinY - prev.minY) < 10 && Math.abs(computedMaxY - prev.maxY) < 10) {
                    return prev;
                }
                return { minX: computedMinX, maxX: computedMaxX, minY: computedMinY, maxY: computedMaxY };
            });
        }, 50);
        return () => clearTimeout(t);
    }, [computedMinX, computedMaxX, computedMinY, computedMaxY]);

    useEffect(() => {
        const { minX, maxX, minY, maxY } = bounds;

        const q = query(
            collection(db, "pixels"),
            where("x", ">=", minX),
            where("x", "<=", maxX),
            limit(1000)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newPixels: PixelData[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data() as PixelData;
                if (data.y >= minY && data.y <= maxY) {
                    newPixels.push(data);
                }
            });
            updatePixels(newPixels);
        }, (error) => {
            console.error("Firestore Error:", error);
        });

        return () => unsubscribe();
    }, [bounds, updatePixels]);

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
        ctx.fillStyle = "#050505"; // Match background
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        // Apply transform (pan & zoom)
        ctx.translate(canvas.width / 2 + transform.x, canvas.height / 2 + transform.y);
        ctx.scale(transform.scale, transform.scale);

        // Render Grid if zoomed in enough
        if (transform.scale > 0.5) {
            ctx.strokeStyle = "rgba(0, 255, 65, 0.1)"; // Neon grid line
            ctx.lineWidth = 1 / transform.scale; // keep line width constant on screen

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

        setTransform(prev => {
            let newScale = prev.scale * Math.exp(delta);
            // Min limit
            newScale = Math.max(0.1, newScale);
            // Max limit
            newScale = Math.min(10, newScale);
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

            setTransform(prev => ({
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
