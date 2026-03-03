"use client";
import { useEffect, useState } from "react";
import clsx from "clsx";

export const COOLDOWN_MS = 60000;

export default function CooldownTimer() {
    const [timeLeft, setTimeLeft] = useState<number>(0);

    useEffect(() => {
        const updateTimer = () => {
            const storedTime = localStorage.getItem("lastPixelPlacedAt");
            if (storedTime) {
                const timePassed = Date.now() - parseInt(storedTime, 10);
                if (timePassed < COOLDOWN_MS) {
                    setTimeLeft(Math.ceil((COOLDOWN_MS - timePassed) / 1000));
                } else {
                    setTimeLeft(0);
                }
            } else {
                setTimeLeft(0);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        // Listen for custom event when placed
        const handlePixelPlaced = () => updateTimer();
        window.addEventListener("pixelPlaced", handlePixelPlaced);

        return () => {
            clearInterval(interval);
            window.removeEventListener("pixelPlaced", handlePixelPlaced);
        };
    }, []);

    const isReady = timeLeft === 0;

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div
                className={clsx(
                    "px-6 py-3 rounded-lg font-pixel text-2xl border text-center pointer-events-auto transition-colors shadow-lg",
                    isReady
                        ? "bg-black/80 border-neon-green text-neon-green neon-text neon-shadow cursor-default"
                        : "bg-black/60 border-zinc-500 text-zinc-500 cursor-not-allowed"
                )}
            >
                {isReady ? "READY TO DRAW" : `COOLDOWN: ${timeLeft}s`}
            </div>
        </div>
    );
}
