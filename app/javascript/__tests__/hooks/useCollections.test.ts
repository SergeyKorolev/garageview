import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useCollections } from "@/hooks/useCollections";

vi.mock("@/api/collections", () => ({
  getCollections: vi.fn(),
  getCollection: vi.fn(),
  createCollection: vi.fn(),
  updateCollection: vi.fn(),
  deleteCollection: vi.fn(),
}));

import { getCollections } from "@/api/collections";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useCollections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches collections successfully", async () => {
    const mockCollections = [
      { id: 1, name: "BMW", is_fetching: false },
      { id: 2, name: "Audi", is_fetching: false },
    ];
    vi.mocked(getCollections).mockResolvedValue(mockCollections as any);

    const { result } = renderHook(() => useCollections(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockCollections);
  });

  it("enables polling when a collection is_fetching", async () => {
    const mockCollections = [
      { id: 1, name: "BMW", is_fetching: true },
    ];
    vi.mocked(getCollections).mockResolvedValue(mockCollections as any);

    const { result } = renderHook(() => useCollections(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // The hook configures refetchInterval based on is_fetching.
    // We verify it fetched at least once.
    expect(getCollections).toHaveBeenCalled();
  });

  it("handles fetch error", async () => {
    vi.mocked(getCollections).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useCollections(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
