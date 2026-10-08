export interface SearchFilter {
  id: number;
  collection_id: number;
  search_url: string;
  name: string;
  params: Record<string, string>;
  last_refreshed_at: string | null;
  active: boolean;
  created_at: string;
}

export interface CreateSearchFilterPayload {
  search_url: string;
  name?: string;
}
