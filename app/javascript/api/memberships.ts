import client from "./client";
import type {
  CollectionMember,
  InviteMemberRequest,
  UpdateMemberRequest,
} from "@/types/membership";

export async function fetchMembers(
  collectionId: number
): Promise<CollectionMember[]> {
  const { data } = await client.get(
    `/collections/${collectionId}/members`
  );
  return data.members;
}

export async function inviteMember(
  collectionId: number,
  payload: InviteMemberRequest
): Promise<CollectionMember> {
  const { data } = await client.post(
    `/collections/${collectionId}/members`,
    payload
  );
  return data;
}

export async function updateMemberRole(
  collectionId: number,
  memberId: number,
  role: UpdateMemberRequest["role"]
): Promise<CollectionMember> {
  const { data } = await client.patch(
    `/collections/${collectionId}/members/${memberId}`,
    { role }
  );
  return data;
}

export async function removeMember(
  collectionId: number,
  memberId: number
): Promise<void> {
  await client.delete(
    `/collections/${collectionId}/members/${memberId}`
  );
}

export async function createCompareLink(
  collectionId: number,
  role: "viewer" | "editor" = "viewer"
): Promise<{ compare_token: string; compare_url: string; compare_role: string }> {
  const { data } = await client.post(
    `/collections/${collectionId}/create_compare_link`,
    { role }
  );
  return data;
}

export async function revokeCompareLink(
  collectionId: number
): Promise<void> {
  await client.delete(
    `/collections/${collectionId}/revoke_compare_link`
  );
}

export async function shareCollection(
  collectionId: number
): Promise<{ share_token: string; share_url: string }> {
  const { data } = await client.post(
    `/collections/${collectionId}/share`
  );
  return data;
}

export async function unshareCollection(
  collectionId: number
): Promise<void> {
  await client.delete(
    `/collections/${collectionId}/share`
  );
}
