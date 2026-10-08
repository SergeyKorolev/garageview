import client from "./client";

export interface AgentAction {
  type: "collection_created" | "cars_added" | "collection_from_search" | "research_launched" | "rating_started";
  collection_id?: number;
  collection_name?: string;
  name?: string;
  cars_added?: number;
  research_id?: number;
  filter_id?: number;
}

export interface AgentChatResponse {
  conversation_id: number;
  reply: string;
  actions: AgentAction[];
  conversation_type: string;
}

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentConversationSummary {
  id: number;
  title: string | null;
  conversation_type: string;
  last_message: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface AgentConversationDetail {
  id: number;
  title: string | null;
  conversation_type: string;
  messages: AgentMessage[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export async function sendAgentMessage(
  message: string,
  conversationId?: number | null,
  currentCollectionId?: number | null
): Promise<AgentChatResponse> {
  const { data } = await client.post("/agent/chat", {
    message,
    conversation_id: conversationId,
    current_collection_id: currentCollectionId,
  });
  return data;
}

export async function getAgentConversations(
  type?: string,
  page?: number
): Promise<{ conversations: AgentConversationSummary[]; total: number; page: number; total_pages: number }> {
  const params: Record<string, string | number> = {};
  if (type) params.type = type;
  if (page) params.page = page;
  const { data } = await client.get("/agent/conversations", { params });
  return data;
}

export async function getAgentConversation(id: number): Promise<AgentConversationDetail> {
  const { data } = await client.get(`/agent/conversations/${id}`);
  return data;
}

export async function deleteAgentConversation(id: number): Promise<void> {
  await client.delete(`/agent/conversations/${id}`);
}
