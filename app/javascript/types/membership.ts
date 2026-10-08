export interface CollectionMember {
  id: number;
  user_id: number | null;
  name: string | null;
  email: string;
  avatar_url: string | null;
  role: "owner" | "editor" | "viewer";
  status: "pending" | "accepted" | "declined";
  created_at: string;
}

export interface InviteMemberRequest {
  email: string;
  role: "editor" | "viewer";
}

export interface UpdateMemberRequest {
  role: "editor" | "viewer";
}