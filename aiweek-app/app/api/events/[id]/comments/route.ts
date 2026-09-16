import { NextRequest, NextResponse } from "next/server";
import { HttpError, err, handleRoute, readJson } from "@/lib/http";
import { requireAnonClient, requireServiceClient } from "@/lib/db";
import { commentInputSchema, zodMessage } from "@/lib/validation";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  eventExists,
  getCommentById,
  listComments,
  toPublicComment,
} from "@/lib/community";
import { getSessionUser } from "@/lib/server-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/events/[id]/comments — public comment thread.
 *   params: limit (default 20, max 100), before (ISO timestamp; only
 *           comments with created_at < before are returned)
 *   -> 200 { comments: [{ id, display_name_snapshot, body, parent_id,
 *                         created_at, reply_count, is_mine }] }
 *   Visible, non-deleted only, ordered by created_at ASC (acceptance
 *   contract). user_id / token hashes are never exposed; is_mine is
 *   derived server-side when a session cookie is present.
 *
 * POST /api/events/[id]/comments — post a comment (session required).
 *   body: { body (1–2000 chars), parent_id? (UUID of a comment on the
 *           same event, for replies) }
 *   Spam guards: max 10 comments/hour per user (429), identical body by
 *   the same user within 5 minutes -> 409.
 *   The author's CURRENT display name is snapshotted onto the comment;
 *   later renames don't rewrite history.
 *   -> 201 { comment } ; 400 bad body ; 401 no session ; 404 unknown event.
 *
 * HTML handling (deliberate choice): the body is stored as raw text
 * (trimmed). Nothing is stripped server-side, so code snippets and prose
 * containing "<" / ">" survive intact. The client MUST escape on render
 * (React escapes interpolated strings by default) — never dangerously
 * set inner HTML with comment bodies.
 */

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;

function parseLimit(raw: string | null): number {
  if (raw === null) return DEFAULT_LIMIT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) throw new HttpError(400, "limit must be a positive integer.");
  return Math.min(n, MAX_LIMIT);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return handleRoute(async () => {
    const { id } = await params;
    const sp = req.nextUrl.searchParams;
    const limit = parseLimit(sp.get("limit"));
    const before = sp.get("before");

    const sb = requireAnonClient();
    if (!(await eventExists(sb, id))) throw new HttpError(404, "Event not found.");

    // Optional session: only used to compute is_mine; absence is fine.
    const session = await getSessionUser(req);

    const comments = await listComments(sb, id, {
      limit,
      before: before ?? undefined,
      sessionUserId: session?.userId ?? null,
    });
    return NextResponse.json({ comments });
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return handleRoute(async () => {
    const { id: eventId } = await params;
    const session = await getSessionUser(req);
    if (!session) return err(401, "A valid session is required to comment.");

    const parsed = commentInputSchema.safeParse(await readJson(req));
    if (!parsed.success) return err(400, zodMessage(parsed.error));
    const { body, parent_id: parentId } = parsed.data;

    // Spam guard: max N comments/hour per user.
    const budget = RATE_LIMITS.commentsPerHour;
    const rl = checkRateLimit(`comment:${session.userId}`, budget.limit, budget.windowMs);
    if (!rl.allowed) {
      throw new HttpError(
        429,
        "You're commenting too fast — please wait a while before posting again.",
        { "Retry-After": String(Math.max(1, Math.ceil(rl.retryAfterMs / 1000))) }
      );
    }

    const sb = requireServiceClient();
    if (!(await eventExists(sb, eventId))) throw new HttpError(404, "Event not found.");

    // Replies must target a live comment on the SAME event.
    if (parentId) {
      const parent = await getCommentById(sb, parentId);
      if (!parent || parent.is_deleted || parent.moderation_state !== "visible") {
        throw new HttpError(400, "Parent comment not found.");
      }
      if (parent.event_id !== eventId) {
        throw new HttpError(400, "Parent comment belongs to a different event.");
      }
    }

    // Duplicate guard: identical body by this user within 5 minutes.
    const since = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();
    const { data: dupes, error: dupeErr } = await sb
      .from("event_comments")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", session.userId)
      .eq("body", body)
      .eq("is_deleted", false)
      .gt("created_at", since)
      .limit(1);
    if (dupeErr) throw new HttpError(500, "Could not check for duplicates.");
    if (dupes && dupes.length > 0) {
      throw new HttpError(409, "Duplicate comment detected — you already posted this recently.");
    }

    const { data, error } = await sb
      .from("event_comments")
      .insert({
        event_id: eventId,
        user_id: session.userId,
        display_name_snapshot: session.displayName,
        body,
        parent_id: parentId ?? null,
      })
      .select()
      .single();
    if (error || !data) throw new HttpError(500, "Could not post comment.");

    return NextResponse.json(
      {
        comment: toPublicComment(
          {
            id: data.id,
            event_id: data.event_id,
            user_id: data.user_id,
            display_name_snapshot: data.display_name_snapshot,
            body: data.body,
            parent_id: data.parent_id,
            created_at: data.created_at,
            is_deleted: data.is_deleted,
            moderation_state: data.moderation_state,
          },
          session.userId,
          0
        ),
      },
      { status: 201 }
    );
  });
}
