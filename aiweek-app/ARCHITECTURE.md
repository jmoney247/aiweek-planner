# Architecture

## Stack

| Layer        | Choice |
|--------------|--------|
| Framework    | Next.js 15, App Router, TypeScript (strict) |
| Styling      | Tailwind CSS v3 (custom tokens in `tailwind.config.ts`, base in `app/globals.css`) |
| Database/Auth| Supabase (Postgres + Realtime) via `@supabase/supabase-js` / `@supabase/ssr` |
| Maps         | Leaflet + react-leaflet, CartoDB Voyager tiles |
| Validation   | zod (`lib/env.ts`) |
| AI concierge | Provider-agnostic server route (`AI_PROVIDER` / `AI_API_KEY` / `AI_MODEL`) |
| Deployment   | Vercel |

## Why Leaflet + CartoDB Voyager tiles

- **No API key required.** CartoDB's free basemap CDN (`{s}.basemaps.cartocdn.com/rastertiles/voyager/…`)
  serves OSM-derived tiles with street-level detail; Voyager styling fits the warm light UI.
  Google/Mapbox were rejected to avoid key management and quota billing for a community app.
- **Marker clustering:** rather than a heavyweight plugin, the plan is a lightweight custom
  `divIcon` cluster layer (group markers by grid cell at low zoom, expand on click), or
  `react-leaflet-cluster` if the custom layer proves insufficient. Clustering code lives
  next to `components/MapView.tsx`, not in the page.
- **SSR safety:** Leaflet touches `window` at import time, so the map is always loaded via
  `next/dynamic(..., { ssr: false })` inside a `"use client"` component.

## Data flow

```
Browser ──anon key──▶ Supabase (RLS-enforced reads: events, stats, comments, reactions)
   │                        ▲
   │ httpOnly session cookie │ Realtime (comment/reaction updates)
   ▼                        │
Next.js API routes ──service role──▶ privileged writes
   │ (session issuance, reaction/comment writes, moderation)
   ▼
AI concierge route ──server key──▶ AI provider (streams SSE to client)
```

- Reads go straight from the browser with the anon key; RLS is the boundary.
- All writes go through Next.js API routes using the service-role client
  (`lib/supabase/server.ts`), which validates the session cookie first.

## Auth / session model (anonymous-first)

No sign-up, no email. First gated action (react/comment) opens the
"Choose a display name" gate:

1. Client hits `POST /api/session` with `{display_name}` (user-chosen,
   sanitized server-side). The route creates a row in `anon_users` and a row
   in `user_sessions` holding only the **SHA-256 hash** of a 32-byte random
   token (raw tokens are never stored), then sets an **httpOnly,
   SameSite=Lax, Secure-in-prod cookie `aiweek_session`** containing the raw
   token. The browser never sees any user id.
2. Subsequent API calls read the cookie, hash it, look up `user_sessions`,
   and act as that user. Reactions and comments are written via API routes,
   which stamp `user_id` (and `display_name_snapshot` for comments)
   server-side — never trusted from the client.
3. All mutation tables deny direct anon-key writes via RLS; only the
   service-role API routes write. Public reads: `events`, `event_stats`, and
   visible/non-deleted `event_comments`. Individual `event_reactions` rows are
   never readable via the anon key (counts only, via trigger-maintained
   `event_stats`).

## Database schema (authoritative)

The SQL in `supabase/migrations/` is authoritative; the sketch below is a
summary only. `0001_init.sql` creates `events` (stable `id` = seed `uid`,
never the visible title), `anon_users`, `user_sessions`, `event_reactions`
(one row per user per event), `event_comments` (replies via `parent_id`,
soft delete, moderation state), `reports`, and the trigger-maintained
`event_stats` table, with RLS on everything. `0002_event_images.sql` adds the
image provenance columns (`image_url`, `image_source_url`,
`image_original_url`, `image_attribution`, `image_kind`,
`image_verified_at`, `image_width`, `image_height`).

```sql
-- summary only; see supabase/migrations/0001_init.sql
create table events (id text primary key, ...);          -- 185 seeded events
create table anon_users (id uuid primary key, display_name text, ...);
create table user_sessions (id uuid primary key, user_id uuid, token_hash text, expires_at timestamptz);
create table event_reactions (event_id text, user_id uuid, reaction text, primary key (event_id, user_id));
create table event_comments (id uuid primary key, event_id text, user_id uuid, display_name_snapshot text, body text, parent_id uuid, ...);
create table reports (...);
create table event_stats (event_id text primary key, likes int, dislikes int, comment_count int);
```

RLS: public read on `events`, `event_stats`, visible comments; writes only via
service-role API routes (deny direct anon writes on reactions/comments/sessions).

## AI concierge (implemented: `POST /api/concierge`)

- Request: `{message, context?}` (zod-validated). Response:
  `{recommendations: [{event_id, reason}], follow_up_question?, source: 'ai'|'keyword-fallback', note?}`.
- Server fetches upcoming events from Supabase, keyword-ranks to 12
  candidates, and — only if `AI_API_KEY` is set — calls the provider
  (OpenAI-compatible chat completions or Anthropic Messages API, chosen by
  `AI_PROVIDER`) with the candidates as the sole source of truth. System
  prompt hard-rules: exact candidate `id`s only, 3–8 recs, one short reason
  each, "likely to attract" language, JSON-only output. Output validated by
  zod; unknown ids are dropped; any failure degrades to the labeled keyword
  fallback — never a faked AI answer, never a 500 for a missing key.
- The key lives only in `lib/concierge.ts` (server module) + the route;
  zero references in client components. Logic is framework-free and
  unit-tested (`scripts/test-concierge.mjs`, 24 tests). See
  `docs/ai-concierge.md`.

## Deployment

Vercel. Env vars set in the Vercel dashboard from `.env.example` (never commit
`.env.local`). Supabase connection strings stay server-side only.

## Visual direction

Light warm canvas `#FFFDF8`; primary orange `#F97316` (text-safe variant `#C2570B`
for AA); Instagram gradient `linear-gradient(135deg,#FCAF45,#FD5949,#E1306C,#833AB4)`
used selectively (pills, gradient text, card rings) — never as a full background.
Inter/system font stack. WCAG AA contrast targets throughout.
