import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

vi.mock("@/api/auth", () => ({
  getCurrentUser: vi.fn(),
  updateUser: vi.fn(),
}));

import { getCurrentUser } from "@/api/auth";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user data on success", async () => {
    const mockUser = {
      id: 1,
      email: "test@example.com",
      name: "Test User",
      avatar_url: null,
      latitude: null,
      longitude: null,
      location_name: null,
      theme: "dark" as const,
      currency: "EUR" as const,
      language: "en",
      onboarded: true,
    };
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockUser);
  });

  it("returns error state on 401", async () => {
    vi.mocked(getCurrentUser).mockRejectedValue({
      response: { status: 401 },
    });

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });

  it("does not retry on failure", async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(getCurrentUser).toHaveBeenCalledTimes(1);
  });
});
