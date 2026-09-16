/**
 * Simple in-memory sliding-window rate limiter.
 *
 * DOCUMENTED LIMITATIONS (read before relying on this in production):
 * - State lives in the Node.js process memory of a single server instance.
 *   It is lost on restart/redeploy and is NOT shared across instances.
 * - On multi-instance deployments (e.g. Vercel with concurrent serverless
 *   invocations), each instance enforces its own budget, so the effective
 *   global limit is `limit x instances`.
 * - If strict global enforcement is ever required, replace the Map with a
 *   shared store (Redis / Upstash) behind the same function signatures.
 *
 * For this community app the limiter is a spam/abuse backstop, not a
 * security boundary — the session + ownership checks are the real boundary.
 */

interface Bucket {
  /** Epoch-ms timestamps of the requests inside the current window. */
  hits: number[];
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  /** ms until the oldest hit slides out of the window (0 when allowed). */
  retryAfterMs: number;
}

/**
 * Record one hit against `key` and report whether it is within budget.
 *
 * @param key      bucket id, e.g. `react:<userId>`
 * @param limit    max hits allowed per window
 * @param windowMs window length in milliseconds
 * @param now      override for "now" (tests); defaults to Date.now()
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): RateLimitResult {
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { hits: [] };
    buckets.set(key, bucket);
  }
  const cutoff = now - windowMs;
  // Prune expired hits (array stays small because it is pruned on every check).
  bucket.hits = bucket.hits.filter((t) => t > cutoff);

  if (bucket.hits.length < limit) {
    bucket.hits.push(now);
    return { allowed: true, retryAfterMs: 0 };
  }
  const oldest = bucket.hits[0] ?? now;
  return { allowed: false, retryAfterMs: Math.max(0, oldest + windowMs - now) };
}

/** How many hits remain in the current window (informational). */
export function rateLimitRemaining(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): number {
  const bucket = buckets.get(key);
  if (!bucket) return limit;
  const cutoff = now - windowMs;
  const live = bucket.hits.filter((t) => t > cutoff).length;
  return Math.max(0, limit - live);
}

/** Clear all buckets (used by tests) or a single bucket. */
export function resetRateLimits(key?: string): void {
  if (key === undefined) buckets.clear();
  else buckets.delete(key);
}

/** Rate-limit budgets used by the API routes. */
export const RATE_LIMITS = {
  /** Max reaction writes per user per minute. */
  reactions: { limit: 60, windowMs: 60_000 },
  /** Max comments per user per hour (spam guard). */
  commentsPerHour: { limit: 10, windowMs: 3_600_000 },
} as const;
