import { create } from "zustand";
import type { CarFilters, CarSort } from "@/types/car";

interface FilterState {
  filters: CarFilters;
  sort: CarSort;
  setFilters: (filters: Partial<CarFilters>) => void;
  resetFilters: () => void;
  setSort: (sort: CarSort) => void;
}

const defaultFilters: CarFilters = {};
const defaultSort: CarSort = { field: "price", direction: "asc" };

export const useFilterStore = create<FilterState>((set) => ({
  filters: defaultFilters,
  sort: defaultSort,
  setFilters: (partial) =>
    set((state) => ({ filters: { ...state.filters, ...partial } })),
  resetFilters: () => set({ filters: defaultFilters }),
  setSort: (sort) => set({ sort }),
}));
