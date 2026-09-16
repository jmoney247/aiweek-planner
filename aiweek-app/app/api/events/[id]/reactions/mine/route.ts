import { NextRequest, NextResponse } from "next/server";
import { HttpError, handleRoute, unauthorized } from "@/lib/http";
import { requireServiceClient } from "@/lib/db";
import { eventExists, getOwnReaction } from "@/lib/community";
import { getSessionUser } from "@/lib/server-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/events/[id]/reactions/mine — the caller's own reaction.
 * -> 200 { reaction: "like" | "dislike" | null }
 * -> 401 without a session (individual reactions are private; only the
 *    aggregate counts are public via event_stats).
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return handleRoute(async () => {
    const { id } = await params;
    const session = await getSessionUser(req);
    if (!session) return unauthorized();

    const sb = requireServiceClient();
    if (!(await eventExists(sb, id))) throw new HttpError(404, "Event not found.");

    const reaction = await getOwnReaction(sb, id, session.userId);
    return NextResponse.json({ reaction });
  });
}
