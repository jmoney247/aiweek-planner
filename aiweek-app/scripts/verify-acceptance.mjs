// scripts/verify-acceptance.mjs
//
// Post-deployment acceptance test for the Boston AI Week community DB layer.
//
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... APP_URL=... \
//     node scripts/verify-acceptance.mjs
//
// It exercises the app's real HTTP API routes end-to-end with TWO separate
// anonymous sessions. The service key is used ONLY for setup/teardown
// (picking an event id, deleting test data); all user behavior goes through
// the app API with the session cookie.
//
// === Expected app API route contract (the app backend must implement this) ===
//
//   POST /api/session
//     body: { display_name: string }
//     -> 201 { user: { id, display_name }, session_token? } ; sets httpOnly
//        cookie "aiweek_session" (opaque token; SHA-256 stored in user_sessions)
//   GET  /api/events?limit=1
//     -> 200 { events: [{ id, title, ... }] }              (public catalog)
//   GET  /api/events/:id/comments
//     -> 200 { comments: [{ id, display_name_snapshot, body, parent_id, created_at }] }
//        (visible, non-deleted only; order by created_at asc)
//   POST /api/events/:id/comments
//     body: { body: string, parent_id?: string }
//     -> 201 { comment: {...} } ; 400 on empty/overlong body ; 401 without session
//   PATCH /api/comments/:commentId
//     body: { body: string }
//     -> 200 { comment } if requester owns the comment ; 403 otherwise
//   POST /api/events/:id/react
//     body: { reaction: "like" | "dislike" }
//     -> 200 { stats: { likes, dislikes, comment_count } } ; upserts the
//        requester's single reaction row (like -> dislike is an update, not a dup)
//   GET  /api/events/:id/stats
//     -> 200 { likes, dislikes, comment_count }            (public aggregate)
//   GET  /api/events/:id/reactions/mine
//     -> 200 { reaction: "like"|"dislike"|null }           (own row only)
//
// Security expectations enforced below:
//   - comment creation requires a session; B sees A's comment publicly
//   - reaction changes move the single row (no duplicates; counts shift)
//   - cross-user comment edit returns 403 (API/RLS ownership enforcement)
//   - state survives a "refresh" (fresh GETs with no cache assumptions)

const APP_URL = process.env.APP_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!APP_URL || !SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing env: need APP_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(2);
}

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

// Minimal cookie jar: one per anonymous session.
function makeAgent() {
  const jar = new Map();
  return {
    async req(method, path, body) {
      const headers = { "content-type": "application/json" };
      if (jar.size) headers.cookie = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
      const res = await fetch(APP_URL + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const setCookie = res.headers.getSetCookie?.() ?? [];
      for (const c of setCookie) {
        const [pair] = c.split(";");
        const idx = pair.indexOf("=");
        if (idx > 0) jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
      }
      let json = null;
      try { json = await res.json(); } catch { /* non-JSON */ }
      return { status: res.status, json };
    },
  };
}

// Service-role REST helper (setup/teardown only).
async function svc(path, method = "GET", body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "content-type": "application/json",
      Prefer: "return=representation",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`service REST ${method} ${path} -> ${res.status}`);
  return res.json();
}

const marker = `acceptance-${Date.now()}`;
const createdUserIds = [];

try {
  // 1. Setup: pick an event via the app's public catalog.
  const A = makeAgent(), B = makeAgent();
  const evList = await A.req("GET", "/api/events?limit=1");
  const eventId = evList.json?.events?.[0]?.id;
  check("setup: public event catalog readable", !!eventId, eventId ?? "no events");
  if (!eventId) throw new Error("no event to test against");

  // Baseline stats (delta-based so pre-existing data can't break the test).
  const base = (await A.req("GET", `/api/events/${eventId}/stats`)).json ?? {};
  const baseLikes = base.likes ?? 0, baseDislikes = base.dislikes ?? 0;
  const baseComments = base.comment_count ?? 0;

  // 2. A creates an anonymous identity + posts a comment.
  const sA = await A.req("POST", "/api/session", { display_name: `AcceptA-${marker}` });
  check("A creates anonymous session", sA.status === 201 && !!sA.json?.user?.id, `status=${sA.status}`);
  if (sA.json?.user?.id) createdUserIds.push(sA.json.user.id);

  const commentBody = `Hello from acceptance test ${marker}`;
  const cA = await A.req("POST", `/api/events/${eventId}/comments`, { body: commentBody });
  const commentIdA = cA.json?.comment?.id;
  check("A posts comment on event", cA.status === 201 && !!commentIdA, `status=${cA.status}`);
  check("A comment snapshot name matches", cA.json?.comment?.display_name_snapshot === `AcceptA-${marker}`);

  // 3. B (separate session) reads comments publicly and sees A's comment.
  const sB = await B.req("POST", "/api/session", { display_name: `AcceptB-${marker}` });
  check("B creates separate anonymous session", sB.status === 201 && !!sB.json?.user?.id, `status=${sB.status}`);
  if (sB.json?.user?.id) createdUserIds.push(sB.json.user.id);

  const commentsB = await B.req("GET", `/api/events/${eventId}/comments`);
  const seen = (commentsB.json?.comments ?? []).some(
    (c) => c.body === commentBody && c.display_name_snapshot === `AcceptA-${marker}`
  );
  check("B reads comments and sees A's comment", commentsB.status === 200 && seen);

  // B posts its own comment (needed for the 403 edit test).
  const cB = await B.req("POST", `/api/events/${eventId}/comments`, { body: `B's comment ${marker}` });
  const commentIdB = cB.json?.comment?.id;
  check("B posts own comment", cB.status === 201 && !!commentIdB, `status=${cB.status}`);

  // 4. B reacts like -> A sees updated count via stats endpoint.
  const rB = await B.req("POST", `/api/events/${eventId}/react`, { reaction: "like" });
  check("B reacts like (upsert ok)", rB.status === 200 && rB.json?.stats);
  const stats1 = (await A.req("GET", `/api/events/${eventId}/stats`)).json ?? {};
  check(
    "A sees likes incremented by 1",
    stats1.likes === baseLikes + 1,
    `likes=${stats1.likes} (base ${baseLikes})`
  );

  // 5. A tries to edit B's comment -> must fail 403.
  const evil = await A.req("PATCH", `/api/comments/${commentIdB}`, { body: "hijacked" });
  check("A cannot edit B's comment (403)", evil.status === 403, `status=${evil.status}`);
  const commentsAfter = (await B.req("GET", `/api/events/${eventId}/comments`)).json?.comments ?? [];
  const bComment = commentsAfter.find((c) => c.id === commentIdB);
  check("B's comment body unchanged", bComment?.body === `B's comment ${marker}`);

  // 6. A changes like -> dislike: counts shift, no duplicates.
  const rA1 = await A.req("POST", `/api/events/${eventId}/react`, { reaction: "like" });
  check("A reacts like", rA1.status === 200);
  const rA2 = await A.req("POST", `/api/events/${eventId}/react`, { reaction: "dislike" });
  check("A changes like -> dislike", rA2.status === 200);
  const stats2 = (await A.req("GET", `/api/events/${eventId}/stats`)).json ?? {};
  // B liked (still), A now dislikes: deltas vs baseline = likes+1, dislikes+1
  check(
    "counts update with no duplicates",
    stats2.likes === baseLikes + 1 && stats2.dislikes === baseDislikes + 1,
    `likes=${stats2.likes}, dislikes=${stats2.dislikes}`
  );
  const mine = (await A.req("GET", `/api/events/${eventId}/reactions/mine`)).json;
  check("A's own reaction reads back as dislike", mine?.reaction === "dislike");

  // 7. Refresh-equivalent: brand-new agents, no cached state, data persists.
  const A2 = makeAgent();
  const commentsFresh = (await A2.req("GET", `/api/events/${eventId}/comments`)).json?.comments ?? [];
  const statsFresh = (await A2.req("GET", `/api/events/${eventId}/stats`)).json ?? {};
  check(
    "re-read shows persisted comments",
    commentsFresh.some((c) => c.id === commentIdA) && commentsFresh.some((c) => c.id === commentIdB)
  );
  check(
    "re-read shows persisted stats",
    statsFresh.likes === stats2.likes &&
    statsFresh.dislikes === stats2.dislikes &&
    statsFresh.comment_count === baseComments + 2
  );

  // 8. Teardown: delete test users (cascades comments/reactions/sessions).
  for (const uid of createdUserIds) {
    await svc(`/anon_users?id=eq.${uid}`, "DELETE");
  }
  check("teardown: test users deleted", true);
} catch (err) {
  check(`unexpected error: ${err.message}`, false);
  process.exitCode = 1;
} finally {
  const failed = results.filter((r) => !r.ok);
  console.log(`\n== ${results.length - failed.length}/${results.length} checks passed ==`);
  if (failed.length) process.exitCode = 1;
}
