import { NextRequest, NextResponse } from "next/server";
import { HttpError, handleRoute } from "@/lib/http";
import { requireAnonClient } from "@/lib/db";
import { eventExists, getEventStats } from "@/lib/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/events/[id]/stats — public aggregate counts.
 * -> 200 { likes, dislikes, comment_count }
 * Used by the polling fallback and wired to Supabase Realtime on the client.
 */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return handleRoute(async () => {
    const { id } = await params;
    const sb = requireAnonClient();
    if (!(await eventExists(sb, id))) throw new HttpError(404, "Event not found.");
    const stats = await getEventStats(sb, id);
    return NextResponse.json(stats);
  });
}
