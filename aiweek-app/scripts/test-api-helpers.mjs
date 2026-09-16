// scripts/test-api-helpers.mjs
//
// Unit tests for the pure (DB-free) helpers behind the community API:
//   - lib/server-session.ts  (token generation, SHA-256 hashing, display-name
//                             sanitizing, cookie options)
//   - lib/rate-limit.ts      (in-memory sliding-window limiter)
//   - lib/validation.ts      (zod request-body schemas)
//
// These modules have no database or network dependencies, so they run in
// plain node. Run with:  node scripts/test-api-helpers.mjs
// (Node >= 22.6 strips TypeScript types on import; no build step needed.)
//
// What this does NOT test (requires live Supabase, no creds in this env):
//   - route handlers, getSessionUser()'s DB lookup, upsert/ownership logic.
//   - the end-to-end contract in scripts/verify-acceptance.mjs — run that
//     against a deployed app with real env vars instead.

import { test } from "node:test";
import assert from "node:assert/strict";

const session = await import("../lib/server-session.ts");
const rl = await import("../lib/rate-limit.ts");
const validation = await import("../lib/validation.ts");

// ---------------------------------------------------------------------------
// lib/server-session.ts
// ---------------------------------------------------------------------------

test("sanitizeDisplayName: strips HTML tags", () => {
  assert.equal(session.sanitizeDisplayName("<b>Ada</b>"), "Ada");
  assert.equal(session.sanitizeDisplayName('hi <img src=x onerror=alert(1)> there'), "hi there");
});

test("sanitizeDisplayName: strips control characters", () => {
  assert.equal(session.sanitizeDisplayName("A\x00d\x1Fa\t"), "Ada");
});

test("sanitizeDisplayName: collapses whitespace and trims", () => {
  assert.equal(session.sanitizeDisplayName("  Ada   Lovelace  "), "Ada Lovelace");
});

test("sanitizeDisplayName: rejects empty / overlong / non-string", () => {
  assert.equal(session.sanitizeDisplayName(""), null);
  assert.equal(session.sanitizeDisplayName("   "), null);
  assert.equal(session.sanitizeDisplayName("<br>"), null); // empty after stripping tags
  assert.equal(session.sanitizeDisplayName("x".repeat(41)), null);
  assert.equal(session.sanitizeDisplayName(null), null);
  assert.equal(session.sanitizeDisplayName(123), null);
});

test("sanitizeDisplayName: accepts a 40-char name, keeps unicode", () => {
  const name = "x".repeat(40);
  assert.equal(session.sanitizeDisplayName(name), name);
  assert.equal(session.sanitizeDisplayName("José García 🎉"), "José García 🎉");
});

test("hashSessionToken: deterministic SHA-256 hex", () => {
  const h1 = session.hashSessionToken("token-abc");
  const h2 = session.hashSessionToken("token-abc");
  assert.equal(h1, h2);
  assert.match(h1, /^[0-9a-f]{64}$/);
  assert.notEqual(session.hashSessionToken("token-abd"), h1);
});

test("generateSessionToken: unique, cookie-safe", () => {
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    const t = session.generateSessionToken();
    assert.match(t, /^[A-Za-z0-9_-]{43}$/); // 32 bytes -> base64url, no padding
    assert.ok(!seen.has(t), "token collision");
    seen.add(t);
  }
});

test("session cookie constants and options", () => {
  assert.equal(session.SESSION_COOKIE_NAME, "aiweek_session");
  assert.equal(session.SESSION_MAX_AGE_SECONDS, 365 * 24 * 60 * 60);
  const opts = session.sessionCookieOptions();
  assert.equal(opts.httpOnly, true);
  assert.equal(opts.sameSite, "lax");
  assert.equal(opts.path, "/");
  assert.equal(opts.maxAge, 365 * 24 * 60 * 60);
  assert.equal(typeof opts.secure, "boolean");
});

// ---------------------------------------------------------------------------
// lib/rate-limit.ts
// ---------------------------------------------------------------------------

test("checkRateLimit: allows up to the limit, then blocks", () => {
  rl.resetRateLimits();
  const now = 1_000_000;
  for (let i = 0; i < 5; i++) {
    assert.equal(rl.checkRateLimit("k1", 5, 60_000, now).allowed, true);
  }
  const blocked = rl.checkRateLimit("k1", 5, 60_000, now);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterMs > 0 && blocked.retryAfterMs <= 60_000);
});

test("checkRateLimit: window slides — old hits expire", () => {
  rl.resetRateLimits();
  const t0 = 2_000_000;
  assert.equal(rl.checkRateLimit("k2", 1, 1_000, t0).allowed, true);
  assert.equal(rl.checkRateLimit("k2", 1, 1_000, t0 + 500).allowed, false);
  assert.equal(rl.checkRateLimit("k2", 1, 1_000, t0 + 1_001).allowed, true);
});

test("checkRateLimit: buckets are independent per key", () => {
  rl.resetRateLimits();
  assert.equal(rl.checkRateLimit("a", 1, 60_000).allowed, true);
  assert.equal(rl.checkRateLimit("a", 1, 60_000).allowed, false);
  assert.equal(rl.checkRateLimit("b", 1, 60_000).allowed, true);
});

test("RATE_LIMITS budgets match the API contract", () => {
  assert.deepEqual(rl.RATE_LIMITS.reactions, { limit: 60, windowMs: 60_000 });
  assert.deepEqual(rl.RATE_LIMITS.commentsPerHour, { limit: 10, windowMs: 3_600_000 });
});

// ---------------------------------------------------------------------------
// lib/validation.ts
// ---------------------------------------------------------------------------

test("commentInputSchema: accepts valid bodies, null parent", () => {
  const ok = validation.commentInputSchema.safeParse({ body: "  hello  ", parent_id: null });
  assert.equal(ok.success, true);
  if (ok.success) assert.equal(ok.data.body, "hello"); // trimmed
});

test("commentInputSchema: rejects empty / overlong / bad parent_id", () => {
  assert.equal(validation.commentInputSchema.safeParse({ body: "   " }).success, false);
  assert.equal(validation.commentInputSchema.safeParse({ body: "" }).success, false);
  assert.equal(validation.commentInputSchema.safeParse({ body: "x".repeat(2001) }).success, false);
  assert.equal(validation.commentInputSchema.safeParse({ body: "ok", parent_id: "nope" }).success, false);
  const withParent = validation.commentInputSchema.safeParse({
    body: "reply",
    parent_id: "123e4567-e89b-12d3-a456-426614174000",
  });
  assert.equal(withParent.success, true);
});

test("reactionInputSchema: like/dislike only", () => {
  assert.equal(validation.reactionInputSchema.safeParse({ reaction: "like" }).success, true);
  assert.equal(validation.reactionInputSchema.safeParse({ reaction: "dislike" }).success, true);
  assert.equal(validation.reactionInputSchema.safeParse({ reaction: "love" }).success, false);
  assert.equal(validation.reactionInputSchema.safeParse({}).success, false);
});

test("reportInputSchema: comment|user targets with UUID ids", () => {
  const id = "123e4567-e89b-12d3-a456-426614174000";
  assert.equal(
    validation.reportInputSchema.safeParse({ target_type: "comment", target_id: id, reason: "spam" }).success,
    true
  );
  assert.equal(
    validation.reportInputSchema.safeParse({ target_type: "user", target_id: id }).success,
    true
  );
  assert.equal(
    validation.reportInputSchema.safeParse({ target_type: "event", target_id: id }).success,
    false
  );
  assert.equal(
    validation.reportInputSchema.safeParse({ target_type: "comment", target_id: "x" }).success,
    false
  );
});

test("zodMessage: produces a readable single-line message", () => {
  const parsed = validation.commentInputSchema.safeParse({ body: "" });
  assert.equal(parsed.success, false);
  if (!parsed.success) {
    const msg = validation.zodMessage(parsed.error);
    assert.equal(typeof msg, "string");
    assert.ok(msg.length > 0);
    assert.ok(!msg.includes("\n"));
  }
});
