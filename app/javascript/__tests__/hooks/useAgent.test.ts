import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  useAgentChat,
  useAgentConversations,
  useDeleteAgentConversation,
} from "@/hooks/useAgent";

vi.mock("@/api/agent", () => ({
  sendAgentMessage: vi.fn(),
  getAgentConversations: vi.fn(),
  getAgentConversation: vi.fn(),
  deleteAgentConversation: vi.fn(),
}));

import {
  sendAgentMessage,
  getAgentConversations,
  deleteAgentConversation,
} from "@/api/agent";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useAgentChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends a chat message via mutation", async () => {
    const mockResponse = {
      conversation_id: 1,
      reply: "Hello!",
      actions: [],
      conversation_type: "general",
    };
    vi.mocked(sendAgentMessage).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAgentChat(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ message: "Hi" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(sendAgentMessage).toHaveBeenCalledWith("Hi", undefined, undefined);
  });
});

describe("useAgentConversations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches conversation list", async () => {
    const mockData = {
      conversations: [{ id: 1, title: "Test", conversation_type: "general" }],
      total: 1,
      page: 1,
      total_pages: 1,
    };
    vi.mocked(getAgentConversations).mockResolvedValue(mockData as any);

    const { result } = renderHook(() => useAgentConversations(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.conversations).toHaveLength(1);
  });

  it("passes type parameter to API", async () => {
    vi.mocked(getAgentConversations).mockResolvedValue({
      conversations: [],
      total: 0,
      page: 1,
      total_pages: 0,
    } as any);

    const { result } = renderHook(() => useAgentConversations("general"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getAgentConversations).toHaveBeenCalledWith("general");
  });
});

describe("useDeleteAgentConversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes a conversation", async () => {
    vi.mocked(deleteAgentConversation).mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteAgentConversation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(1);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(deleteAgentConversation).toHaveBeenCalledWith(1);
  });
});
