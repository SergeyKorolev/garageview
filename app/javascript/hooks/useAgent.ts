import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  sendAgentMessage,
  getAgentConversations,
  getAgentConversation,
  deleteAgentConversation,
  AgentChatResponse,
} from "@/api/agent";

export function useAgentChat() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ message, conversationId, currentCollectionId }: { message: string; conversationId?: number | null; currentCollectionId?: number | null }) =>
      sendAgentMessage(message, conversationId, currentCollectionId),
    onSuccess: (data: AgentChatResponse) => {
      // Invalidate caches based on actions performed
      for (const action of data.actions) {
        switch (action.type) {
          case "collection_created":
          case "collection_from_search":
            qc.invalidateQueries({ queryKey: ["collections"] });
            break;
          case "cars_added":
            qc.invalidateQueries({ queryKey: ["collections"] });
            if (action.collection_id) {
              qc.invalidateQueries({ queryKey: ["collections", action.collection_id] });
              qc.invalidateQueries({ queryKey: ["collectionCars", action.collection_id] });
            }
            break;
          case "research_launched":
            if (action.collection_id) {
              qc.invalidateQueries({ queryKey: ["deep-researches", action.collection_id] });
            }
            break;
          case "rating_started":
            if (action.collection_id) {
              qc.invalidateQueries({ queryKey: ["collectionCars", action.collection_id] });
            }
            break;
        }
      }
      // Refresh conversation list
      qc.invalidateQueries({ queryKey: ["agent-conversations"] });
    },
  });
}

export function useAgentConversations(type?: string) {
  return useQuery({
    queryKey: ["agent-conversations", type],
    queryFn: () => getAgentConversations(type),
  });
}

export function useAgentConversation(id: number) {
  return useQuery({
    queryKey: ["agent-conversation", id],
    queryFn: () => getAgentConversation(id),
    enabled: id > 0,
  });
}

export function useDeleteAgentConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteAgentConversation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-conversations"] });
    },
  });
}
