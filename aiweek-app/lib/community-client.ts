export async function communityRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...init });
  const result = await response.json();
  if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Could not complete your request. Please try again.');
  return result as T;
}
export interface CommunityPost {
  id: string; event_id: string; event_title: string; display_name: string;
  body: string; photos: string[]; created_at: string; likes: number; dislikes: number;
  reaction: 'like' | 'dislike' | null; is_mine: boolean;
  parent_id: string | null;
  reply_count: number;
}
