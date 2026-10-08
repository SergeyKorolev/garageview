import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useMembers, useInviteMember } from "@/hooks/useMemberships";

vi.mock("@/api/memberships", () => ({
  fetchMembers: vi.fn(),
  inviteMember: vi.fn(),
  updateMemberRole: vi.fn(),
  removeMember: vi.fn(),
}));

import { fetchMembers, inviteMember } from "@/api/memberships";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useMembers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches members for a collection", async () => {
    const mockMembers = [
      { id: 1, email: "alice@test.com", role: "owner", status: "accepted" },
      { id: 2, email: "bob@test.com", role: "editor", status: "pending" },
    ];
    vi.mocked(fetchMembers).mockResolvedValue(mockMembers as any);

    const { result } = renderHook(() => useMembers(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });

  it("does not fetch when collectionId is 0", () => {
    const { result } = renderHook(() => useMembers(0), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(fetchMembers).not.toHaveBeenCalled();
  });
});

describe("useInviteMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invites a member via mutation", async () => {
    const mockMember = {
      id: 3,
      email: "charlie@test.com",
      role: "viewer",
      status: "pending",
    };
    vi.mocked(inviteMember).mockResolvedValue(mockMember as any);

    const { result } = renderHook(() => useInviteMember(1), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ email: "charlie@test.com", role: "viewer" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(inviteMember).toHaveBeenCalledWith(1, {
      email: "charlie@test.com",
      role: "viewer",
    });
  });
});
