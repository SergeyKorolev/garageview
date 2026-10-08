import { describe, it, expect, beforeEach } from "vitest";
import { useSelectionStore } from "@/stores/selectionStore";

describe("useSelectionStore", () => {
  beforeEach(() => {
    useSelectionStore.setState({
      selectedCarId: null,
      hoveredCarId: null,
    });
  });

  it("has correct initial state", () => {
    const state = useSelectionStore.getState();
    expect(state.selectedCarId).toBeNull();
    expect(state.hoveredCarId).toBeNull();
  });

  it("setSelectedCarId updates selected car", () => {
    useSelectionStore.getState().setSelectedCarId(42);
    expect(useSelectionStore.getState().selectedCarId).toBe(42);
  });

  it("setSelectedCarId can be cleared with null", () => {
    useSelectionStore.getState().setSelectedCarId(42);
    useSelectionStore.getState().setSelectedCarId(null);
    expect(useSelectionStore.getState().selectedCarId).toBeNull();
  });

  it("setHoveredCarId updates hovered car independently", () => {
    useSelectionStore.getState().setSelectedCarId(1);
    useSelectionStore.getState().setHoveredCarId(2);
    expect(useSelectionStore.getState().selectedCarId).toBe(1);
    expect(useSelectionStore.getState().hoveredCarId).toBe(2);
  });
});
