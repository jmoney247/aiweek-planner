import { NextRequest, NextResponse } from "next/server";
import { handleRoute, readJson } from "@/lib/http";
import { resolveReactionWrite } from "@/lib/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/events/[id]/reactions — set my reaction.
 *   body: { reaction: "like" | "dislike" }
 *   Upserts the caller's single row: insert, update-if-changed, no-op-if-same.
 *   Rate limit: 60 writes/min per user (in-memory, see lib/rate-limit.ts).
 *   -> 200 { stats: { likes, dislikes, comment_count } }
 *   -> 401 without session, 404 unknown event, 429 over the rate limit.
 *
 * DELETE /api/events/[id]/reactions — remove my reaction (idempotent).
 *   -> 200 { stats }
 *
 * NOTE: the acceptance contract also exposes these as
 * POST|DELETE /api/events/[id]/react — that route (./react/route.ts)
 * delegates to the handlers below so both paths share one implementation.
 */

export async function handleReactionPost(req: NextRequest, eventId: string): Promise<NextResponse> {
  return handleRoute(async () => {
    const body = await readJson(req);
    const stats = await resolveReactionWrite(req, eventId, body, "upsert");
    return NextResponse.json({ stats });
  });
}

export async function handleReactionDelete(req: NextRequest, eventId: string): Promise<NextResponse> {
  return handleRoute(async () => {
    const stats = await resolveReactionWrite(req, eventId, null, "delete");
    return NextResponse.json({ stats });
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  return handleReactionPost(req, id);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  return handleReactionDelete(req, id);
}
