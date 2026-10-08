import { describe, it, expect, beforeEach } from "vitest";
import { useFilterStore } from "@/stores/filterStore";

describe("useFilterStore", () => {
  beforeEach(() => {
    useFilterStore.setState({
      filters: {},
      sort: { field: "price", direction: "asc" },
    });
  });

  it("has correct initial state", () => {
    const state = useFilterStore.getState();
    expect(state.filters).toEqual({});
    expect(state.sort).toEqual({ field: "price", direction: "asc" });
  });

  it("setFilters merges partial filters into existing state", () => {
    useFilterStore.getState().setFilters({ price_min: 5000 });
    expect(useFilterStore.getState().filters).toEqual({ price_min: 5000 });

    useFilterStore.getState().setFilters({ fuel_type: "diesel" });
    expect(useFilterStore.getState().filters).toEqual({
      price_min: 5000,
      fuel_type: "diesel",
    });
  });

  it("resetFilters restores default empty filters", () => {
    useFilterStore.getState().setFilters({ price_min: 5000, fuel_type: "diesel" });
    useFilterStore.getState().resetFilters();
    expect(useFilterStore.getState().filters).toEqual({});
  });

  it("setSort replaces the sort configuration", () => {
    useFilterStore.getState().setSort({ field: "mileage", direction: "desc" });
    expect(useFilterStore.getState().sort).toEqual({
      field: "mileage",
      direction: "desc",
    });
  });

  it("setFilters does not affect sort", () => {
    useFilterStore.getState().setSort({ field: "mileage", direction: "desc" });
    useFilterStore.getState().setFilters({ price_min: 1000 });
    expect(useFilterStore.getState().sort).toEqual({
      field: "mileage",
      direction: "desc",
    });
  });
});
