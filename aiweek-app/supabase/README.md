# Boston AI Week community app — database layer (`supabase/`)

Everything here deploys against a Supabase Postgres project. No real secrets
live in this repo — use your own project URL/keys.

## Layout

```
supabase/
  migrations/0001_init.sql   schema, indexes, triggers, RLS (apply once)
  seed.sql                   generated event catalog (185 events, idempotent)
scripts/
  build-seed.mjs             regenerates supabase/seed.sql from the enriched JSON
  verify-acceptance.mjs      post-deployment acceptance test (two anonymous sessions)
```

## Apply the migration

### Option A — Supabase CLI (recommended)

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push        # applies supabase/migrations/0001_init.sql
```

### Option B — Dashboard SQL Editor

Supabase Dashboard → your project → **SQL Editor** → New query → paste the
full contents of `supabase/migrations/0001_init.sql` → **Run**.

## Run the seed

`supabase/seed.sql` is a single idempotent `INSERT ... ON CONFLICT (id) DO NOTHING`,
so it is safe to re-run.

- **Dashboard:** SQL Editor → New query → paste `supabase/seed.sql` → Run.
- **psql:** `psql "postgres://<user>:<password>@<host>:5432/postgres" -f supabase/seed.sql`
  (use your project's connection string from Dashboard → Settings → Database)

Regenerate it any time the source data changes:

```bash
node scripts/build-seed.mjs
```

It reads `../aiweek_events_enriched.json` (the repo root), verifies `uid`
uniqueness, and rewrites `supabase/seed.sql` plus a verification summary.

## Enable Realtime

The app subscribes to aggregate updates and new comments live. Enable
Realtime on exactly these tables (individual reactions stay private — only
`event_stats` aggregates are exposed):

**Dashboard:** Database → Replication → add `public.event_stats` and
`public.event_comments` to the `supabase_realtime` publication.

**Or SQL:**

```sql
alter publication supabase_realtime add table public.event_stats;
alter publication supabase_realtime add table public.event_comments;
```

Do NOT add `public.event_reactions` — its rows are readable only in aggregate.

## Security model

Anonymous sessions, service-role-only writes:

1. The client never talks to mutation tables with the anon key. RLS grants
   anon-key holders **read-only** access to `events`, `event_stats`, and
   visible `event_comments`; all other tables deny direct access entirely.
2. `POST /api/session` creates an `anon_users` row + a `user_sessions` row
   holding a SHA-256 hash of an opaque token, and sets it as an httpOnly
   cookie. Tokens themselves are never stored.
3. Every mutating API route validates the session (hash lookup + expiry),
   compares the session's `user_id` to the target row's `user_id`, and only
   then writes with the service-role key, which bypasses RLS.
4. Comments are publicly readable only when `moderation_state='visible'` and
   `is_deleted=false`. Reaction counts come from the trigger-maintained
   `event_stats` table, never from row-level reads of `event_reactions`.
5. Reports are written by API routes into the service-role-only `reports` table.

Expected API route contract is documented at the top of
`scripts/verify-acceptance.mjs`.

## Run the acceptance test

```bash
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_ANON_KEY=<anon-key> \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
APP_URL=https://<your-app> \
node scripts/verify-acceptance.mjs
```

It runs the full two-session flow (comment, cross-read, like, 403 on
cross-edit, like→dislike without duplicates, persistence re-read), prints
PASS/FAIL per check, and cleans up its test users via the service key.
