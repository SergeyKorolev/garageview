import { create } from "zustand";

interface SelectionState {
  selectedCarId: number | null;
  setSelectedCarId: (id: number | null) => void;
  hoveredCarId: number | null;
  setHoveredCarId: (id: number | null) => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedCarId: null,
  setSelectedCarId: (id) => set({ selectedCarId: id }),
  hoveredCarId: null,
  setHoveredCarId: (id) => set({ hoveredCarId: id }),
}));
