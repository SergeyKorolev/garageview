import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useCollectionCars } from "@/hooks/useCollectionCars";

vi.mock("@/api/cars", () => ({
  getCollectionCars: vi.fn(),
  getAllCollectionCars: vi.fn(),
  addCarToCollection: vi.fn(),
  removeCarFromCollection: vi.fn(),
  updateCarRating: vi.fn(),
}));

vi.mock("@/hooks/useCollections", () => ({
  useCollection: vi.fn(() => ({ data: null })),
}));

vi.mock("@/stores/filterStore", () => ({
  useFilterStore: vi.fn(() => ({
    filters: {},
    sort: { field: "price", direction: "asc" },
  })),
}));

import { getCollectionCars, getAllCollectionCars } from "@/api/cars";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useCollectionCars", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches paginated cars for a collection", async () => {
    const mockData = {
      cars: [{ id: 1, title: "BMW 3 Series", status: "ready" }],
      total: 1,
      page: 1,
      per_page: 50,
      total_pages: 1,
    };
    vi.mocked(getAllCollectionCars).mockResolvedValue(mockData as any);

    const { result } = renderHook(() => useCollectionCars(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.cars).toHaveLength(1);
    expect(result.current.data?.total).toBe(1);
  });

  it("does not fetch when collectionId is 0", async () => {
    const { result } = renderHook(() => useCollectionCars(0), {
      wrapper: createWrapper(),
    });

    // Should remain idle/not fetching since enabled: collectionId > 0
    expect(result.current.isFetching).toBe(false);
    expect(getCollectionCars).not.toHaveBeenCalled();
  });

  it("passes page parameter to API", async () => {
    vi.mocked(getCollectionCars).mockResolvedValue({
      cars: [],
      total: 0,
      page: 2,
      per_page: 50,
      total_pages: 3,
    } as any);

    const { result } = renderHook(() => useCollectionCars(1, 2), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getCollectionCars).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2 })
    );
  });

  it("handles error state", async () => {
    vi.mocked(getAllCollectionCars).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useCollectionCars(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
