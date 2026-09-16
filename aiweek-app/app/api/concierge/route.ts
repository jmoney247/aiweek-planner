import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  ConciergeRequestSchema,
  runConcierge,
} from "@/lib/concierge";
import type { Event } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/concierge
 *
 * Body: { message: string (1-500 chars), context?: {...} }  (zod-validated)
 *
 * Secure server-side AI concierge:
 *  - The AI key lives ONLY in process.env.AI_API_KEY, read inside
 *    lib/concierge.ts (a server module). It is never sent to the client,
 *    never prefixed NEXT_PUBLIC_, and never appears in client bundles.
 *  - With no AI_API_KEY configured the route still works: runConcierge()
 *    degrades to transparent keyword ranking (source: "keyword-fallback").
 *  - All model output is validated with zod and every recommended id is
 *    checked against the real candidate list — invented ids are dropped.
 */
async function fetchUpcomingEvents(): Promise<Event[]> {
  // Lenient env read on purpose: serverEnv() throws when AI vars are
  // missing, but this route must keep working (keyword fallback) without
  // the AI key. Supabase config, however, is required to retrieve events.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing)");
  }
  const sb = createClient(url, anonKey, { auth: { persistSession: false } });
  // events has a public SELECT policy; anon read is sufficient and avoids
  // exposing anything the service key could see.
  const { data, error } = await sb
    .from("events")
    .select("*")
    .gte("start_at", new Date().toISOString())
    .order("start_at", { ascending: true })
    .limit(500);
  if (error) throw new Error(`Supabase events query failed: ${error.message}`);
  return (data ?? []) as Event[];
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = ConciergeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Optional session cookie: read for future saved-events personalization.
  // Today the client passes saved_event_ids explicitly in `context`; the
  // cookie read stays so a server-side saved-events lookup can be wired in
  // without changing the API contract.
  const sessionCookie = req.cookies.get("aiweek_session")?.value ?? null;

  try {
    const result = await runConcierge(parsed.data, fetchUpcomingEvents);
    const res = NextResponse.json(result);
    if (sessionCookie) res.headers.set("x-concierge-session", "present");
    return res;
  } catch (err) {
    // Retrieval/config failure — a real 503, never a faked answer.
    return NextResponse.json(
      { error: "Concierge temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }
}
