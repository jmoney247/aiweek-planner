import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { HttpError } from "./http";
import { requireServiceClient } from "./db";
import { getSessionUser } from "./server-session";
import { checkRateLimit, RATE_LIMITS } from "./rate-limit";
import { reactionInputSchema, zodMessage } from "./validation";
import type { ReactionKind } from "./types";

/**
 * Shared community domain logic (reactions, comments, stats) used by the
 * API routes. All functions take an injected Supabase client; mutation
 * routes pass the service-role client AFTER resolving the session and
 * enforcing ownership — the functions themselves never trust client input
 * for user identity.
 */

export interface EventStatsShape {
  likes: number;
  dislikes: number;
  comment_count: number;
}

const ZERO_STATS: EventStatsShape = { likes: 0, dislikes: 0, comment_count: 0 };

/** Public stats for an event. The event_stats row only exists after the
 *  first reaction/comment (trigger-created), so missing rows read as zeros. */
export async function getEventStats(
  sb: SupabaseClient,
  eventId: string
): Promise<EventStatsShape> {
  const { data, error } = await sb
    .from("event_stats")
    .select("likes, dislikes, comment_count")
    .eq("event_id", eventId)
    .maybeSingle();
  if (error || !data) return { ...ZERO_STATS };
  return {
    likes: data.likes ?? 0,
    dislikes: data.dislikes ?? 0,
    comment_count: data.comment_count ?? 0,
  };
}

export async function eventExists(sb: SupabaseClient, eventId: string): Promise<boolean> {
  const { data, error } = await sb
    .from("events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();
  return !error && !!data;
}

// ---------------------------------------------------------------------------
// Reactions
// ---------------------------------------------------------------------------

/**
 * Upsert the caller's single reaction row: insert when none exists, update
 * when it changed, no-op when identical. Returns the refreshed public stats.
 */
export async function upsertReaction(
  sb: SupabaseClient,
  eventId: string,
  userId: string,
  reaction: ReactionKind
): Promise<EventStatsShape> {
  const { data: existing, error: readErr } = await sb
    .from("event_reactions")
    .select("id, reaction")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();
  if (readErr) throw new HttpError(500, "Could not read existing reaction.");

  if (!existing) {
    const { error } = await sb
      .from("event_reactions")
      .insert({ event_id: eventId, user_id: userId, reaction });
    if (error) throw new HttpError(500, "Could not save reaction.");
  } else if (existing.reaction !== reaction) {
    const { error } = await sb
      .from("event_reactions")
      .update({ reaction })
      .eq("id", existing.id);
    if (error) throw new HttpError(500, "Could not update reaction.");
  }
  // else: identical reaction — no-op, counts unchanged.

  return getEventStats(sb, eventId);
}

/** Remove the caller's reaction row (idempotent). Returns refreshed stats. */
export async function deleteReaction(
  sb: SupabaseClient,
  eventId: string,
  userId: string
): Promise<EventStatsShape> {
  const { error } = await sb
    .from("event_reactions")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", userId);
  if (error) throw new HttpError(500, "Could not delete reaction.");
  return getEventStats(sb, eventId);
}

/** The caller's own reaction for an event, or null. Requires a session. */
export async function getOwnReaction(
  sb: SupabaseClient,
  eventId: string,
  userId: string
): Promise<ReactionKind | null> {
  const { data, error } = await sb
    .from("event_reactions")
    .select("reaction")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data.reaction === "like" || data.reaction === "dislike" ? data.reaction : null;
}

/**
 * Shared write path for POST/DELETE on both /react and /reactions.
 * Enforces: session (401) -> body validation (400) -> rate limit (429) ->
 * event exists (404) -> write. Throws HttpError; returns fresh stats.
 */
export async function resolveReactionWrite(
  req: NextRequest,
  eventId: string,
  body: unknown,
  mode: "upsert" | "delete"
): Promise<EventStatsShape> {
  const session = await getSessionUser(req);
  if (!session) throw new HttpError(401, "A valid session is required.");

  let reaction: ReactionKind | undefined;
  if (mode === "upsert") {
    const parsed = reactionInputSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, zodMessage(parsed.error));
    reaction = parsed.data.reaction;
  }

  const budget = RATE_LIMITS.reactions;
  const rl = checkRateLimit(`react:${session.userId}`, budget.limit, budget.windowMs);
  if (!rl.allowed) {
    throw new HttpError(429, "Too many reactions — please slow down and try again shortly.", {
      "Retry-After": String(Math.max(1, Math.ceil(rl.retryAfterMs / 1000))),
    });
  }

  const sb = requireServiceClient();
  if (!(await eventExists(sb, eventId))) throw new HttpError(404, "Event not found.");

  if (mode === "delete") return deleteReaction(sb, eventId, session.userId);
  return upsertReaction(sb, eventId, session.userId, reaction as ReactionKind);
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export interface CommentRow {
  id: string;
  event_id: string;
  user_id: string | null;
  display_name_snapshot: string;
  body: string;
  parent_id: string | null;
  created_at: string;
  is_deleted: boolean;
  moderation_state: string;
}

/** Public comment shape. user_id is NEVER exposed; is_mine is derived server-side. */
export interface PublicComment {
  id: string;
  display_name_snapshot: string;
  body: string;
  parent_id: string | null;
  created_at: string;
  reply_count: number;
  is_mine: boolean;
}

export function toPublicComment(
  row: CommentRow,
  sessionUserId: string | null,
  replyCount: number
): PublicComment {
  return {
    id: row.id,
    display_name_snapshot: row.display_name_snapshot,
    body: row.body,
    parent_id: row.parent_id,
    created_at: row.created_at,
    reply_count: replyCount,
    is_mine: sessionUserId !== null && row.user_id !== null && row.user_id === sessionUserId,
  };
}

/**
 * Visible, non-deleted comments for an event, ordered by created_at ASC
 * (per the acceptance contract in scripts/verify-acceptance.mjs).
 * `before` paginates: only comments with created_at < before are returned.
 */
export async function listComments(
  sb: SupabaseClient,
  eventId: string,
  opts: { limit: number; before?: string; sessionUserId: string | null }
): Promise<PublicComment[]> {
  let query = sb
    .from("event_comments")
    .select(
      "id, event_id, user_id, display_name_snapshot, body, parent_id, created_at, is_deleted, moderation_state"
    )
    .eq("event_id", eventId)
    .eq("is_deleted", false)
    .eq("moderation_state", "visible")
    .order("created_at", { ascending: true })
    .limit(opts.limit);
  if (opts.before) query = query.lt("created_at", opts.before);

  const { data, error } = await query;
  if (error) throw new HttpError(500, "Could not load comments.");
  const rows = (data ?? []) as CommentRow[];

  // reply_count per comment in one grouped query (no N+1).
  const counts = new Map<string, number>();
  if (rows.length > 0) {
    const ids = rows.map((r) => r.id);
    const { data: replies, error: replyErr } = await sb
      .from("event_comments")
      .select("parent_id")
      .in("parent_id", ids)
      .eq("is_deleted", false)
      .eq("moderation_state", "visible");
    if (replyErr) throw new HttpError(500, "Could not load reply counts.");
    for (const r of (replies ?? []) as { parent_id: string | null }[]) {
      if (r.parent_id) counts.set(r.parent_id, (counts.get(r.parent_id) ?? 0) + 1);
    }
  }

  return rows.map((r) => toPublicComment(r, opts.sessionUserId, counts.get(r.id) ?? 0));
}

export async function getCommentById(
  sb: SupabaseClient,
  commentId: string
): Promise<CommentRow | null> {
  const { data, error } = await sb.from("event_comments").select("*").eq("id", commentId).maybeSingle();
  if (error || !data) return null;
  return data as CommentRow;
}

export async function countReplies(sb: SupabaseClient, commentId: string): Promise<number> {
  const { count, error } = await sb
    .from("event_comments")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", commentId)
    .eq("is_deleted", false)
    .eq("moderation_state", "visible");
  if (error) return 0;
  return count ?? 0;
}

/** Ownership gate shared by edit + delete: 404 when missing/deleted, 403 when not the author. */
function assertOwnsComment(row: CommentRow | null, userId: string): CommentRow {
  if (!row || row.is_deleted) throw new HttpError(404, "Comment not found.");
  if (!row.user_id || row.user_id !== userId) {
    throw new HttpError(403, "You can only modify your own comments.");
  }
  return row;
}

/** Author-only body edit. Returns the updated row. */
export async function editOwnComment(
  sb: SupabaseClient,
  commentId: string,
  userId: string,
  body: string
): Promise<CommentRow> {
  const row = assertOwnsComment(await getCommentById(sb, commentId), userId);
  const { data, error } = await sb
    .from("event_comments")
    .update({ body })
    .eq("id", row.id)
    .select()
    .single();
  if (error || !data) throw new HttpError(500, "Could not update comment.");
  return data as CommentRow;
}

/** Author-only soft delete (is_deleted = true). Returns the updated row. */
export async function deleteOwnComment(
  sb: SupabaseClient,
  commentId: string,
  userId: string
): Promise<CommentRow> {
  const row = assertOwnsComment(await getCommentById(sb, commentId), userId);
  const { data, error } = await sb
    .from("event_comments")
    .update({ is_deleted: true })
    .eq("id", row.id)
    .select()
    .single();
  if (error || !data) throw new HttpError(500, "Could not delete comment.");
  return data as CommentRow;
}
