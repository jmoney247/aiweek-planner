/**
 * Thin fetch wrappers around the app API routes.
 * Shape follows scripts/verify-acceptance.mjs (API contract).
 */
import type { Event, EventComment, EventStats, ReactionKind } from "@/lib/types";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = (body as { error?: string }).error ?? JSON.stringify(body);
    } catch {
      /* non-JSON error body */
    }
    throw new Error(`Request failed (${res.status})${detail ? `: ${detail}` : ""}`);
  }
  return (await res.json()) as T;
}

export async function fetchEvents(limit = 200): Promise<Event[]> {
  const res = await fetch(`/api/events?limit=${limit}`, { cache: "no-store" });
  const data = await json<{ events: Event[] }>(res);
  return Array.isArray(data.events) ? data.events : [];
}

export async function fetchEventStats(eventId: string): Promise<EventStats> {
  const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/stats`, {
    cache: "no-store",
  });
  const data = await json<{ likes: number; dislikes: number; comment_count: number }>(res);
  return {
    event_id: eventId,
    likes: data.likes ?? 0,
    dislikes: data.dislikes ?? 0,
    comment_count: data.comment_count ?? 0,
  };
}

export async function fetchMyReaction(eventId: string): Promise<ReactionKind | null> {
  const res = await fetch(
    `/api/events/${encodeURIComponent(eventId)}/reactions/mine`,
    { cache: "no-store" }
  );
  if (res.status === 401) return null; // no session yet
  const data = await json<{ reaction: ReactionKind | null }>(res);
  return data.reaction ?? null;
}

export async function postReaction(
  eventId: string,
  reaction: ReactionKind
): Promise<EventStats> {
  const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/react`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reaction }),
  });
  const data = await json<{ stats: EventStats }>(res);
  return data.stats;
}

/**
 * Remove my reaction. NOT in the acceptance contract yet — the backend route
 * must implement DELETE /api/events/:id/react. The UI reverts on failure.
 */
export async function deleteReaction(eventId: string): Promise<EventStats> {
  const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/react`, {
    method: "DELETE",
  });
  const data = await json<{ stats: EventStats }>(res);
  return data.stats;
}

export async function fetchComments(eventId: string): Promise<EventComment[]> {
  const res = await fetch(
    `/api/events/${encodeURIComponent(eventId)}/comments`,
    { cache: "no-store" }
  );
  const data = await json<{ comments: EventComment[] }>(res);
  return Array.isArray(data.comments) ? data.comments : [];
}

export async function postComment(
  eventId: string,
  body: string,
  parentId?: string | null
): Promise<EventComment> {
  const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/comments`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ body, parent_id: parentId ?? null }),
  });
  const data = await json<{ comment: EventComment }>(res);
  return data.comment;
}

export async function patchComment(
  commentId: string,
  body: string
): Promise<EventComment> {
  const res = await fetch(`/api/comments/${encodeURIComponent(commentId)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ body }),
  });
  const data = await json<{ comment: EventComment }>(res);
  return data.comment;
}

/**
 * Delete my own comment. NOT in the acceptance contract yet — the backend
 * route must implement DELETE /api/comments/:commentId. Reverts on failure.
 */
export async function deleteComment(commentId: string): Promise<void> {
  const res = await fetch(`/api/comments/${encodeURIComponent(commentId)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Delete failed (${res.status})`);
}

export interface SessionUser {
  id: string;
  display_name: string;
}

/** Create an anonymous session with the chosen display name. */
export async function createSession(displayName: string): Promise<SessionUser> {
  const res = await fetch("/api/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ display_name: displayName }),
  });
  const data = await json<{ user: SessionUser }>(res);
  return data.user;
}

/**
 * Report a comment (or user) for moderation. Payload shape is the UI's
 * proposal — the backend route must implement POST /api/reports.
 */
export async function postReport(
  targetType: "comment" | "user",
  targetId: string,
  reason: string
): Promise<void> {
  const res = await fetch("/api/reports", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ target_type: targetType, target_id: targetId, reason }),
  });
  if (!res.ok) throw new Error(`Report failed (${res.status})`);
}
