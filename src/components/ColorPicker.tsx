"use client";
import { useCanvasStore } from "@/store/useCanvasStore";
import clsx from "clsx";

export const COLORS = [
    "#000000", "#ffffff", "#ff0000", "#00ff00", "#0000ff", "#ffff00",
    "#00ffff", "#ff00ff", "#ff8800", "#8800ff", "#00ff88", "#ff0088"
];

export default function ColorPicker() {
    const { selectedColor, setSelectedColor } = useCanvasStore();

    return (
        <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50 bg-black/80 border border-neon-green p-2 rounded-lg pointer-events-auto flex flex-col gap-2 shadow-[0_0_15px_rgba(0,255,65,0.2)]">
            {COLORS.map((color) => (
                <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={clsx(
                        "w-8 h-8 rounded-sm hover:scale-110 transition-transform cursor-pointer",
                        selectedColor === color ? "border-2 border-white scale-110 shadow-[0_0_10px_white]" : "border border-white/20"
                    )}
                    style={{ backgroundColor: color }}
                    title={color}
                />
            ))}
        </div>
    );
}
