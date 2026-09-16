import { NextRequest, NextResponse } from "next/server";
import { HttpError, handleRoute } from "@/lib/http";
import { requireAnonClient } from "@/lib/db";
import { getEventStats } from "@/lib/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/events/[id] — single event + public stats.
 * -> 200 { event: { ...event fields, stats: { likes, dislikes, comment_count } } }
 * -> 404 when the event does not exist.
 */

const EVENT_COLUMNS =
  "id, title, display_title, official_url, registration_url, registration_is_direct, start_at, end_at, venue, address, city, neighborhood, event_type, hosted_by, speakers, description, about, summary, image_url, image_kind, image_source_url, image_attribution, image_verified_at, image_width, image_height";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return handleRoute(async () => {
    const { id } = await params;
    const sb = requireAnonClient();

    const { data, error } = await sb
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new HttpError(500, "Could not load event.");
    if (!data) throw new HttpError(404, "Event not found.");

    const stats = await getEventStats(sb, id);
    return NextResponse.json({ event: { ...data, stats } });
  });
}
