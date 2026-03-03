"use client";
import { useCanvasStore } from "@/store/useCanvasStore";

export default function Header() {
    const pixels = useCanvasStore((state) => state.pixels);

    return (
        <header className="fixed top-0 left-0 w-full p-4 flex justify-between items-center z-50 pointer-events-none">
            <h1 className="text-3xl font-pixel neon-text tracking-widest pointer-events-auto bg-black/50 px-2 py-1 border border-transparent hover:border-neon-green transition-colors rounded">
                [DevX] CRAZY CANVAS
            </h1>
            <div className="font-pixel text-xl neon-text pointer-events-auto bg-black/50 px-2 py-1 border border-neon-green shadow-[0_0_10px_rgba(0,255,65,0.2)] rounded">
                Pixels: {pixels.size}
            </div>
        </header>
    );
}
