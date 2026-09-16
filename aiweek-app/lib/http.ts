import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Shared HTTP plumbing for API routes.
 *
 * - Every route returns `{ error: string }` JSON on failure with the right
 *   status code (401 unauthenticated, 403 forbidden, 404 missing, 409
 *   conflict, 429 rate-limited, 503 unconfigured, 500 unexpected).
 * - `handleRoute` is the single try/catch boundary: route handlers throw
 *   HttpError for expected failures and let unexpected ones become 500s.
 */

export class HttpError extends Error {
  status: number;
  headers: Record<string, string>;

  constructor(status: number, message: string, headers: Record<string, string> = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.headers = headers;
  }
}

/** Consistent `{ error }` JSON response. */
export function err(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/** Wrap a route handler: HttpError -> matching status, anything else -> 500. */
export function handleRoute(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  return fn().catch((e: unknown) => {
    if (e instanceof HttpError) {
      const res = NextResponse.json({ error: e.message }, { status: e.status });
      for (const [k, v] of Object.entries(e.headers)) res.headers.set(k, v);
      return res;
    }
    console.error("[api] unexpected error", e);
    return err(500, "Internal server error.");
  });
}

/** Parse a JSON body, throwing HttpError(400) on invalid JSON. */
export async function readJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}

/** 401 response helper for "no (valid) session" paths. */
export function unauthorized(): NextResponse {
  return err(401, "A valid session is required. Create one with POST /api/session.");
}
