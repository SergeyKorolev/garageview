import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
} from "@/api/memberships";
import type { InviteMemberRequest, UpdateMemberRequest } from "@/types/membership";

export function useMembers(collectionId: number) {
  return useQuery({
    queryKey: ["members", collectionId],
    queryFn: () => fetchMembers(collectionId),
    enabled: collectionId > 0,
  });
}

export function useInviteMember(collectionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InviteMemberRequest) =>
      inviteMember(collectionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", collectionId] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

export function useUpdateMemberRole(collectionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      memberId,
      role,
    }: {
      memberId: number;
      role: UpdateMemberRequest["role"];
    }) => updateMemberRole(collectionId, memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", collectionId] });
    },
  });
}

export function useRemoveMember(collectionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: number) => removeMember(collectionId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", collectionId] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}
