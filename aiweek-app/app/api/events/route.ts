import { NextRequest, NextResponse } from "next/server";
import { HttpError, handleRoute } from "@/lib/http";
import { requireAnonClient } from "@/lib/db";
import type { EventStatsShape } from "@/lib/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/events — public, paginated event catalog with stats joined.
 *
 * Query params:
 *   city      — ilike match on city
 *   date_from — ISO timestamp, start_at >= date_from
 *   date_to   — ISO timestamp, start_at <= date_to
 *   q         — ilike match across title / description / hosted_by
 *               (basic search; the AI concierge route does the smart part)
 *   limit     — page size, default 50, max 100
 *   cursor    — opaque keyset cursor from the previous page's next_cursor
 *
 * -> 200 { events: [{ ...event, stats: { likes, dislikes, comment_count } }],
 *           next_cursor: string | null }
 *
 * Reads use the anon key: RLS grants public SELECT on events + event_stats.
 */

const EVENT_COLUMNS =
  "id, title, display_title, official_url, registration_url, registration_is_direct, start_at, end_at, venue, address, city, neighborhood, event_type, hosted_by, speakers, description, about, summary, image_url, image_kind, image_source_url, image_attribution, image_verified_at, image_width, image_height, lat, lng";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/** Escape LIKE wildcards so user input is matched literally. */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

function parseLimit(raw: string | null): number {
  if (raw === null) return DEFAULT_LIMIT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) throw new HttpError(400, "limit must be a positive integer.");
  return Math.min(n, MAX_LIMIT);
}

function parseDateParam(name: string, raw: string | null): string | null {
  if (raw === null || raw === "") return null;
  if (Number.isNaN(Date.parse(raw))) throw new HttpError(400, `${name} must be a valid ISO timestamp.`);
  return raw;
}

interface Cursor {
  s: string; // start_at of last row
  i: string; // id of last row
}

function encodeCursor(s: string, i: string): string {
  return Buffer.from(JSON.stringify({ s, i }), "utf8").toString("base64url");
}

function decodeCursor(raw: string): Cursor {
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8")
    ) as Partial<Cursor>;
    if (typeof parsed.s !== "string" || typeof parsed.i !== "string" || !parsed.s || !parsed.i) {
      throw new Error("bad cursor");
    }
    return { s: parsed.s, i: parsed.i };
  } catch {
    throw new HttpError(400, "Invalid cursor.");
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  return handleRoute(async () => {
    const sp = req.nextUrl.searchParams;
    const limit = parseLimit(sp.get("limit"));
    const city = sp.get("city");
    const dateFrom = parseDateParam("date_from", sp.get("date_from"));
    const dateTo = parseDateParam("date_to", sp.get("date_to"));
    const q = sp.get("q");
    const cursorRaw = sp.get("cursor");
    const cursor = cursorRaw ? decodeCursor(cursorRaw) : null;

    const sb = requireAnonClient();
    let query = sb
      .from("events")
      .select("*")
      .order("start_at", { ascending: true })
      .order("id", { ascending: true });

    if (city) query = query.ilike("city", `%${escapeLike(city)}%`);
    if (dateFrom) query = query.gte("start_at", dateFrom);
    if (dateTo) query = query.lte("start_at", dateTo);
    if (q) {
      const needle = `%${escapeLike(q)}%`;
      query = query.or(`title.ilike.${needle},description.ilike.${needle},hosted_by.ilike.${needle}`);
    }
    if (cursor) {
      // Keyset pagination on (start_at, id): strictly after the last row.
      query = query.or(`start_at.gt.${cursor.s},and(start_at.eq.${cursor.s},id.gt.${cursor.i})`);
    }

    const { data, error } = await query.limit(limit + 1);
    if (error) throw new HttpError(500, "Could not load events.");

    const rows = data ?? [];
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    // Join stats (event_stats rows only exist once an event has activity).
    const statsById = new Map<string, EventStatsShape>();
    if (page.length > 0) {
      const ids = page.map((e) => e.id as string);
      const { data: statsRows, error: statsErr } = await sb
        .from("event_stats")
        .select("event_id, likes, dislikes, comment_count")
        .in("event_id", ids);
      if (statsErr) throw new HttpError(500, "Could not load event stats.");
      for (const s of statsRows ?? []) {
        statsById.set(s.event_id as string, {
          likes: (s.likes as number) ?? 0,
          dislikes: (s.dislikes as number) ?? 0,
          comment_count: (s.comment_count as number) ?? 0,
        });
      }
    }

    const events = page.map((e) => ({
      // Project only public fields; older catalogs may not yet have coordinates.
      ...Object.fromEntries(EVENT_COLUMNS.split(", ").map((key) => [key, e[key] ?? null])),
      stats: statsById.get(e.id as string) ?? { likes: 0, dislikes: 0, comment_count: 0 },
    }));

    const last = page[page.length - 1];
    const next_cursor =
      hasMore && last ? encodeCursor(last.start_at as string, last.id as string) : null;

    return NextResponse.json({ events, next_cursor });
  });
}
