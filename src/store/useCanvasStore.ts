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
    updatePixels: (newPixels: PixelData[]) => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
    pixels: new Map(),
    selectedColor: "#00ff41", // Default to neon green
    setSelectedColor: (color: string) => set({ selectedColor: color }),
    updatePixels: (newPixels: PixelData[]) =>
        set((state) => {
            const newMap = new Map(state.pixels);
            newPixels.forEach(p => {
                newMap.set(`${p.x}_${p.y}`, p);
            });
            return { pixels: newMap };
        }),
}));
