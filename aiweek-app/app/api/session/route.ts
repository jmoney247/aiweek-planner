import { NextRequest, NextResponse } from "next/server";
import { randomInt } from 'node:crypto';
import { HttpError, err, handleRoute, readJson, unauthorized } from "@/lib/http";
import { requireServiceClient } from "@/lib/db";
import { displayNameInputSchema, zodMessage } from "@/lib/validation";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  generateSessionToken,
  getSessionUser,
  hashSessionToken,
  sanitizeDisplayName,
  sessionCookieOptions,
} from "@/lib/server-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/session — create an anonymous identity.
 *   body: { display_name } (1–40 chars after HTML/control-char stripping)
 *   -> 201 { user: { id, display_name } } + httpOnly `aiweek_session` cookie.
 * The cookie holds the raw 32-byte token; only its SHA-256 is stored
 * (user_sessions.token_hash), expiring 1 year after creation.
 *
 * GET /api/session — current session user, or 401.
 * PATCH /api/session — change your own display name (does NOT rewrite
 *   display_name_snapshot on already-posted comments; history is frozen).
 */

function userShape(row: { id: string; display_name: string }) {
  return { user: { id: row.id, display_name: row.display_name } };
}

function cleanDisplayName(raw: unknown): string {
  const name = sanitizeDisplayName(raw);
  if (!name) {
    throw new HttpError(
      400,
      "display_name must be 1–40 characters after removing HTML tags and control characters."
    );
  }
  return name;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return handleRoute(async () => {
    const current = await getSessionUser(req);
    if (current) return NextResponse.json({ user: { id: current.userId, display_name: current.displayName } });
    const body = await readJson(req);
    const adjectives = ['Sunny', 'Curious', 'Friendly', 'Happy', 'Kind', 'Bright'];
    const animals = ['Otter', 'Robin', 'Fox', 'Puffin', 'Owl', 'Dolphin'];
    const generated = `${adjectives[randomInt(adjectives.length)]} ${animals[randomInt(animals.length)]} ${randomInt(100, 1000)}`;
    const parsed = displayNameInputSchema.safeParse(body && typeof body === 'object' && 'display_name' in body ? body : { display_name: generated });
    if (!parsed.success) return err(400, zodMessage(parsed.error));
    const displayName = cleanDisplayName(parsed.data.display_name);

    const sb = requireServiceClient();
    const { data: user, error: userErr } = await sb
      .from("anon_users")
      .insert({ display_name: displayName })
      .select("id, display_name")
      .single();
    if (userErr || !user) throw new HttpError(500, "Could not create user.");

    const token = generateSessionToken();
    const { error: sessErr } = await sb.from("user_sessions").insert({
      user_id: user.id,
      token_hash: hashSessionToken(token),
      expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    });
    if (sessErr) {
      // Roll back the orphaned user row; failure here is non-fatal.
      await sb.from("anon_users").delete().eq("id", user.id);
      throw new HttpError(500, "Could not create session.");
    }

    const res = NextResponse.json(userShape(user), { status: 201 });
    res.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
    return res;
  });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  return handleRoute(async () => {
    const session = await getSessionUser(req);
    if (!session) return unauthorized();
    return NextResponse.json({
      user: { id: session.userId, display_name: session.displayName },
    });
  });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  return handleRoute(async () => {
    const session = await getSessionUser(req);
    if (!session) return unauthorized();

    const body = await readJson(req);
    const parsed = displayNameInputSchema.safeParse(body);
    if (!parsed.success) return err(400, zodMessage(parsed.error));
    const displayName = cleanDisplayName(parsed.data.display_name);

    const sb = requireServiceClient();
    const { data, error } = await sb
      .from("anon_users")
      .update({ display_name: displayName })
      .eq("id", session.userId)
      .select("id, display_name")
      .single();
    if (error || !data) throw new HttpError(500, "Could not update display name.");
    return NextResponse.json(userShape(data));
  });
}
