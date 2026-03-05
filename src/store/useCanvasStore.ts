import { create } from "zustand";
import { Timestamp } from "firebase/firestore";

export interface PixelData {
    x: number;
    y: number;
    color: string;
    updatedAt: Timestamp | null; // Firestore timestamp
}

interface CanvasState {
    pixels: Map<string, PixelData>;
    selectedColor: string;
    setSelectedColor: (color: string) => void;
    applyChanges: (changes: { type: "added" | "modified" | "removed"; data: PixelData }[]) => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
    pixels: new Map(),
    selectedColor: "#00ff41", // Default to neon green
    setSelectedColor: (color: string) => set({ selectedColor: color }),
    applyChanges: (changes) =>
        set((state) => {
            const newMap = new Map(state.pixels);
            changes.forEach(({ type, data }) => {
                const key = `${data.x}_${data.y}`;
                if (type === "added" || type === "modified") {
                    newMap.set(key, data);
                } else if (type === "removed") {
                    newMap.delete(key);
                }
            });
            return { pixels: newMap };
        }),
}));
