import { create } from "zustand";

interface AgentMessage {
  role: "user" | "assistant";
  content: string;
  actions?: Array<{
    type: string;
    collection_id?: number;
    collection_name?: string;
    name?: string;
    cars_added?: number;
    research_id?: number;
  }>;
}

interface AgentState {
  isOpen: boolean;
  conversationId: number | null;
  messages: AgentMessage[];
  isLoading: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setConversationId: (id: number | null) => void;
  addMessage: (msg: AgentMessage) => void;
  setMessages: (msgs: AgentMessage[]) => void;
  setLoading: (loading: boolean) => void;
  startNewConversation: () => void;
}

export const useAgentStore = create<AgentState>()((set) => ({
  isOpen: false,
  conversationId: null,
  messages: [],
  isLoading: false,

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),

  setConversationId: (id) => set({ conversationId: id }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setMessages: (msgs) => set({ messages: msgs }),
  setLoading: (loading) => set({ isLoading: loading }),

  startNewConversation: () =>
    set({ conversationId: null, messages: [] }),
}));
