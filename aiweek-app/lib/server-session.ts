import { createHash, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * Server-side anonymous session helpers.
 *
 * (NOTE: the similarly-named lib/session.ts is the CLIENT-side localStorage
 * hint owned by the frontend workstream — this module is the server-side
 * counterpart and is intentionally separate so client bundles never pull in
 * node:crypto or the service-role client.)
 *
 * Session model (see supabase/migrations/0001_init.sql):
 * - The browser holds an opaque random token in the httpOnly cookie
 *   `aiweek_session`. The raw token is NEVER stored server-side.
 * - `user_sessions.token_hash` stores SHA-256(token); lookups hash the
 *   presented cookie value, so a DB read alone never reveals a live token.
 * - Sessions expire 1 year after creation.
 *
 * Only node:crypto is imported statically, so the pure helpers (token
 * generation, hashing, display-name sanitizing) are unit-testable in plain
 * node. The DB lookup is lazy-loaded inside getSessionUser().
 */

export const SESSION_COOKIE_NAME = "aiweek_session";

/** 1 year. */
export const SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000;
export const SESSION_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export interface SessionUser {
  userId: string;
  displayName: string;
}

/** 32 random bytes, base64url-encoded (43 chars, cookie-safe alphabet). */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 hex digest of the raw session token — this is what we store. */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/**
 * Sanitize a user-supplied display name: strip HTML tags and control
 * characters, collapse whitespace, trim. Returns the clean name, or null
 * when the input is not a usable 1–40 char name.
 */
export function sanitizeDisplayName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  // Strip ASCII control chars (including \t \n \r — a name is one line).
  let name = raw.replace(/[\x00-\x1F\x7F]/g, "");
  // Strip anything that looks like an HTML tag.
  name = name.replace(/<[^>]*>/g, "");
  // Collapse interior whitespace and trim.
  name = name.replace(/\s+/g, " ").trim();
  if (name.length < 1 || name.length > 40) return null;
  return name;
}

/** Cookie attributes for the session cookie. Secure only in production. */
export function sessionCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

/**
 * Resolve the anonymous session for an incoming request.
 * Reads the httpOnly cookie -> SHA-256 -> user_sessions -> anon_users.
 * Returns null when the cookie is missing, unknown, or expired (routes map
 * null to 401). Never throws.
 */
export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    // Lazy import keeps this module's static imports limited to node:crypto.
    const { requireServiceClient } = await import("./db");
    const sb = requireServiceClient();

    const { data, error } = await sb
      .from("user_sessions")
      .select("id, user_id, expires_at, anon_users(id, display_name)")
      .eq("token_hash", hashSessionToken(token))
      .maybeSingle();

    if (error || !data) return null;
    if (new Date(data.expires_at).getTime() <= Date.now()) {
      // Best-effort cleanup of the stale row; failure is non-fatal.
      await sb.from("user_sessions").delete().eq("id", data.id);
      return null;
    }
    const user = data.anon_users as unknown as {
      id: string;
      display_name: string;
    } | null;
    if (!user) return null;
    return { userId: user.id, displayName: user.display_name };
  } catch {
    return null;
  }
}
