import { describe, it, expect, beforeEach } from "vitest";
import { useAgentStore } from "@/stores/agentStore";

describe("useAgentStore", () => {
  beforeEach(() => {
    useAgentStore.setState({
      isOpen: false,
      conversationId: null,
      messages: [],
      isLoading: false,
    });
  });

  it("has correct initial state", () => {
    const state = useAgentStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.conversationId).toBeNull();
    expect(state.messages).toEqual([]);
    expect(state.isLoading).toBe(false);
  });

  it("open sets isOpen to true", () => {
    useAgentStore.getState().open();
    expect(useAgentStore.getState().isOpen).toBe(true);
  });

  it("close sets isOpen to false", () => {
    useAgentStore.getState().open();
    useAgentStore.getState().close();
    expect(useAgentStore.getState().isOpen).toBe(false);
  });

  it("toggle flips isOpen", () => {
    useAgentStore.getState().toggle();
    expect(useAgentStore.getState().isOpen).toBe(true);
    useAgentStore.getState().toggle();
    expect(useAgentStore.getState().isOpen).toBe(false);
  });

  it("addMessage appends a message to the list", () => {
    useAgentStore.getState().addMessage({ role: "user", content: "Hello" });
    useAgentStore.getState().addMessage({ role: "assistant", content: "Hi!" });
    expect(useAgentStore.getState().messages).toHaveLength(2);
    expect(useAgentStore.getState().messages[0]).toEqual({
      role: "user",
      content: "Hello",
    });
    expect(useAgentStore.getState().messages[1]).toEqual({
      role: "assistant",
      content: "Hi!",
    });
  });

  it("startNewConversation resets conversationId and messages", () => {
    useAgentStore.setState({
      conversationId: 5,
      messages: [{ role: "user", content: "test" }],
    });
    useAgentStore.getState().startNewConversation();
    expect(useAgentStore.getState().conversationId).toBeNull();
    expect(useAgentStore.getState().messages).toEqual([]);
  });
});
