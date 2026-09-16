# Boston AI Week Planner — Community App

A public, map-first Boston AI Week planner with **real shared community
features** (likes, dislikes, comments) and an **AI event concierge**.
Next.js 15 + TypeScript + Supabase (Postgres + Realtime), deployable to Vercel.

- **Stack / data flow / security model:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Database:** [supabase/README.md](supabase/README.md)
- **AI concierge setup:** [docs/ai-concierge.md](docs/ai-concierge.md)
- **Image pipeline:** [image-report/IMAGE_REPORT.md](image-report/IMAGE_REPORT.md),
  frontend contract [docs/image-contract.md](docs/image-contract.md)
- **Top feature section spec:** [docs/top-feature-section.md](docs/top-feature-section.md)

## 1. Prerequisites

- Node.js 20+
- A Supabase project ([supabase.com](https://supabase.com) → New project; note
  the **Project URL**, **anon public key**, and **service_role key**
  from Settings → API)
- (Optional) An AI provider key for the concierge: OpenAI-compatible
  (OpenAI, OpenRouter, Azure…) or Anthropic. Without it the concierge runs a
  transparent keyword fallback — the app still works.
- (Optional) A custom domain, if you want one (see §6).

No map API key needed: tiles are CartoDB Voyager (free, OSM data).

## 2. Supabase setup

1. In the Supabase dashboard, open the **SQL Editor** and run, in order:
   - `supabase/migrations/0001_init.sql` — tables, indexes, triggers,
     Row Level Security on every public table.
   - `supabase/migrations/0002_event_images.sql` — image provenance columns.
2. Seed the 185 events:
   - Generate (already generated, but reproducible):
     `node scripts/build-seed.mjs` → writes `supabase/seed.sql`.
   - Run `supabase/seed.sql` in the SQL Editor (idempotent:
     `INSERT … ON CONFLICT (id) DO NOTHING`).
   - After collecting images (`node scripts/collect-images.mjs`, see
     [image-report/IMAGE_REPORT.md](image-report/IMAGE_REPORT.md)), run
     `supabase/image_updates.sql` to attach them.
3. Enable Realtime: Database → Replication → enable for `event_stats`
   and `event_comments` (the UI subscribes for live counts/comments).
4. Create the Storage bucket `event-images` (public read) if you want
   cached image copies: `node scripts/upload-images.mjs` (needs
   `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in env).

Security model: the anon key can only **read** `events`, `event_stats`, and
visible comments. All writes go through the app's API routes, which validate
the httpOnly `aiweek_session` cookie against SHA-256 token hashes and enforce
"you can only touch your own rows". See [supabase/README.md](supabase/README.md).

## 3. Local development

```bash
cp .env.example .env.local   # then fill in real values (never commit this file)
npm install
npm run dev                  # http://localhost:3000
```

Without Supabase env vars the API routes return a clean `503 "not
configured"` JSON error and the UI shows retry states — the pages still
render.

Useful scripts:

| script | what it does |
|---|---|
| `npm run build` / `npm run typecheck` | production build / type check |
| `node scripts/test-api-helpers.mjs` | 17 unit tests (session, hashing, rate limit, validation) |
| `node scripts/test-concierge.mjs` | 24 unit tests (intent parsing, ranking, anti-hallucination guards) |
| `node scripts/verify-acceptance.mjs` | **post-deploy** two-browser acceptance test (see §7) |
| `node scripts/collect-images.mjs --limit 50 --offset N` | batched event-image crawl (polite, resumable) |
| `node scripts/apply-images-to-seed.mjs` | regenerates `supabase/image_updates.sql` from crawl results |

## 4. Environment variables

All documented in `.env.example`. Summary:

| var | where | required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client+server | yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client+server | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | yes |
| `AI_PROVIDER` (`openai`\|`anthropic`) | server only | no — keyword fallback without it |
| `AI_API_KEY` | server only, **never** `NEXT_PUBLIC_` | no |
| `AI_MODEL`, `AI_BASE_URL` | server only | no |

## 5. Deploy to Vercel

1. Push this directory to a Git repo (GitHub).
2. Vercel → Add New → Project → import the repo. Framework preset: Next.js.
3. Add the environment variables from `.env.example` in
   Project → Settings → Environment Variables (Production + Preview).
4. Deploy. The app is public at `https://<project>.vercel.app`.

## 6. Custom domain

Vercel → Project → Settings → Domains → Add (e.g.
`planner.bostonaiweek.com`). Follow the DNS instructions (A/CNAME record at
your registrar). HTTPS is automatic.

## 7. Acceptance test (post-deploy)

```bash
SUPABASE_URL=… SUPABASE_ANON_KEY=… SUPABASE_SERVICE_ROLE_KEY=… \
APP_URL=https://<your-app>.vercel.app \
node scripts/verify-acceptance.mjs
```

It runs the full two-visitor scenario with two independent anonymous
sessions: A comments → B sees it; B reacts → A sees the count; A cannot
like twice; A can flip like→dislike; A cannot edit B's comment (403);
refresh-equivalent re-reads persist. Every check prints PASS/FAIL.

## 8. Moderation

- Community reports land in the `reports` table (`review_state='open'`).
  Review them in the Supabase dashboard (Table Editor).
- To hide a comment: set its `moderation_state` to `'hidden'`.
- To suspend a user: set `anon_users.moderation_status='suspended'` and
  delete their `user_sessions` rows (API routes reject suspended users —
  verify this in `lib/server-session.ts` before relying on it for a large
  public launch).
- Rate limits (10 comments/hour, 60 reactions/min per user) and duplicate
  detection are enforced in the API routes; spam/profanity filtering beyond
  that is a future hardening step — see the roadmap note in
  [ARCHITECTURE.md](ARCHITECTURE.md).

## 9. Backup and recovery

- **Database:** Supabase → Database → Backups (daily automatic on paid
  plans; manual logical backup via `pg_dump` anytime). The seed is fully
  reproducible from `~/workspace/aiweek_events_enriched.json` +
  `scripts/build-seed.mjs`.
- **Images:** originals are re-collectable (`collect-images.mjs`); Storage
  bucket `event-images` can be re-uploaded via `upload-images.mjs`.
- **Code:** this repo. No secrets are stored in it — ever.

## 10. Known limitations (honest)

- **Geocoding:** the seed has no venue coordinates, so map pins render only
  for events with real lat/lng. A geocoding pass over `location_address` is
  still needed before the map shows pins (the UI shows an honest
  "Locations coming soon" state until then; it never invents pins).
- **Event images:** the collector found validated official images for the
  sampled events; run the full crawl (`IMAGE_REPORT.md` has the resume
  commands) for all 185, then `upload-images.mjs` for Storage copies.
- **Concierge travel time:** `context.max_travel_min` is accepted but not
  enforced until geocoding lands.
- The two-browser live test requires your deployed URL + Supabase project;
  it cannot run in this sandbox.
