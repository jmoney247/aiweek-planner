-- ============================================================================
-- Boston AI Week community app — initial schema
-- Migration: 0001_init
-- ============================================================================
--
-- SECURITY MODEL (chosen): service-role-only writes via API routes.
--
-- There is no Supabase Auth here — identities are anonymous sessions created
-- by the app backend. Every mutation (create/update/delete) goes through a
-- server-side API route that:
--   1. reads the session token from an httpOnly cookie,
--   2. hashes it and looks it up in public.user_sessions via the service key,
--   3. rejects the request (401/403) if the session is missing/expired or the
--      token does not belong to the row's owner (ownership check compares the
--      session's user_id against the target row's user_id),
--   4. performs the write with the service-role key (which bypasses RLS).
--
-- RLS is enabled on EVERY public table. Direct anon-key access is:
--   - events            : SELECT only (public read)
--   - event_stats       : SELECT only (public read; aggregate reaction counts)
--   - event_comments    : SELECT only where moderation_state='visible'
--                         AND is_deleted=false (public read)
--   - event_reactions   : NO direct reads. Individual reactions are private;
--                         counts are exposed only via event_stats. This avoids
--                         leaking which anonymous user reacted to what.
--   - anon_users        : NO direct access (service role only)
--   - user_sessions     : NO direct access (service role only)
--   - reports           : NO direct access (service role only; written by API
--                         routes after session validation)
--
-- Consequences:
--   - Users can only insert/update/delete their own rows because only the API
--     server (holding the service key) can write, and it enforces ownership
--     per request against the session store.
--   - event_stats is trigger-maintained so the public stats endpoints can be
--     served with plain anon-key SELECTs and wired to Supabase Realtime.
--   - Token hashes only (never raw tokens) are stored in user_sessions.
--
-- Apply with: supabase db push   (or paste into Dashboard > SQL Editor)
-- ============================================================================

-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- events: the stable event catalog. id is the seed `uid` — never key community
-- data (reactions/comments) by visible title, which can be rewritten later.
-- ----------------------------------------------------------------------------
create table public.events (
  id                      text primary key,
  title                   text not null,
  display_title           text,
  official_url            text not null,
  registration_url        text,
  registration_is_direct  boolean not null default false,
  start_at                timestamptz not null,
  end_at                  timestamptz,
  venue                   text,
  address                 text,
  city                    text,
  neighborhood            text,
  event_type              text,
  hosted_by               text,
  speakers                jsonb not null default '[]'::jsonb,
  description             text,
  about                   text,
  summary                 text,
  last_verified_at        timestamptz,
  source_urls             text[] not null default '{}',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index idx_events_start_at on public.events (start_at);
create index idx_events_city on public.events (city);
create index idx_events_registration_is_direct on public.events (registration_is_direct);

-- ----------------------------------------------------------------------------
-- anon_users: one row per anonymous community identity.
-- ----------------------------------------------------------------------------
create table public.anon_users (
  id                uuid primary key default gen_random_uuid(),
  display_name      text not null,
  moderation_status text not null default 'active',
  session_token_hash text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- user_sessions: server-side session store. token_hash is a SHA-256 of the
-- opaque session token issued in an httpOnly cookie. Service-role only.
-- ----------------------------------------------------------------------------
create table public.user_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.anon_users(id) on delete cascade,
  token_hash  text not null unique,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);

create index idx_user_sessions_user_id on public.user_sessions (user_id);

-- ----------------------------------------------------------------------------
-- event_reactions: one reaction per (event, user). Upsert toggles like/dislike.
-- ----------------------------------------------------------------------------
create table public.event_reactions (
  id          uuid primary key default gen_random_uuid(),
  event_id    text not null references public.events(id) on delete cascade,
  user_id     uuid not null references public.anon_users(id) on delete cascade,
  reaction    text not null check (reaction in ('like', 'dislike')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (event_id, user_id)
);

create index idx_event_reactions_event_id on public.event_reactions (event_id);

-- ----------------------------------------------------------------------------
-- event_comments: threaded comments. display_name_snapshot freezes the name at
-- post time so renames don't rewrite history. Soft delete via is_deleted.
-- ----------------------------------------------------------------------------
create table public.event_comments (
  id                    uuid primary key default gen_random_uuid(),
  event_id              text not null references public.events(id) on delete cascade,
  user_id               uuid references public.anon_users(id) on delete set null,
  display_name_snapshot text not null,
  body                  text not null check (char_length(body) between 1 and 2000),
  parent_id             uuid references public.event_comments(id) on delete cascade,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  is_deleted            boolean not null default false,
  moderation_state      text not null default 'visible'
);

create index idx_event_comments_event_id on public.event_comments (event_id);
create index idx_event_comments_parent_id on public.event_comments (parent_id);

-- ----------------------------------------------------------------------------
-- reports: moderation queue. Written via API routes only.
-- ----------------------------------------------------------------------------
create table public.reports (
  id               uuid primary key default gen_random_uuid(),
  target_type      text not null check (target_type in ('comment', 'user')),
  target_id        uuid not null,
  reporter_user_id uuid references public.anon_users(id) on delete set null,
  reason           text,
  created_at       timestamptz not null default now(),
  review_state     text not null default 'open'
);

-- ----------------------------------------------------------------------------
-- event_stats: trigger-maintained aggregate counts (realtime-friendly).
-- comment_count counts only visible, non-deleted comments.
-- ----------------------------------------------------------------------------
create table public.event_stats (
  event_id      text primary key references public.events(id) on delete cascade,
  likes         integer not null default 0,
  dislikes      integer not null default 0,
  comment_count integer not null default 0,
  updated_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Shared helpers
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

create trigger trg_anon_users_updated_at
  before update on public.anon_users
  for each row execute function public.set_updated_at();

create trigger trg_event_reactions_updated_at
  before update on public.event_reactions
  for each row execute function public.set_updated_at();

create trigger trg_event_comments_updated_at
  before update on public.event_comments
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Stats maintenance: recompute counts for one event after any reaction or
-- comment change. Idempotent; safe to call from triggers on both tables.
-- ----------------------------------------------------------------------------
create or replace function public.refresh_event_stats(p_event_id text)
returns void
language plpgsql as $$
begin
  insert into public.event_stats (event_id, likes, dislikes, comment_count)
  select
    p_event_id,
    count(*) filter (where r.reaction = 'like'),
    count(*) filter (where r.reaction = 'dislike'),
    (select count(*)
       from public.event_comments c
      where c.event_id = p_event_id
        and c.is_deleted = false
        and c.moderation_state = 'visible')
  from public.event_reactions r
  where r.event_id = p_event_id
  on conflict (event_id) do update set
    likes         = excluded.likes,
    dislikes      = excluded.dislikes,
    comment_count = excluded.comment_count,
    updated_at    = now();
end;
$$;

create or replace function public.trg_refresh_event_stats()
returns trigger
language plpgsql as $$
declare
  v_event_id text;
begin
  v_event_id := coalesce(new.event_id, old.event_id);
  perform public.refresh_event_stats(v_event_id);
  return coalesce(new, old);
end;
$$;

create trigger trg_event_reactions_stats
  after insert or update or delete on public.event_reactions
  for each row execute function public.trg_refresh_event_stats();

create trigger trg_event_comments_stats
  after insert or update or delete on public.event_comments
  for each row execute function public.trg_refresh_event_stats();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.events          enable row level security;
alter table public.anon_users      enable row level security;
alter table public.user_sessions   enable row level security;
alter table public.event_reactions enable row level security;
alter table public.event_comments  enable row level security;
alter table public.event_stats     enable row level security;
alter table public.reports         enable row level security;

-- Public catalog read.
create policy "events: public read"
  on public.events for select
  to anon, authenticated
  using (true);

-- Public aggregate read (realtime-friendly stats feed).
create policy "event_stats: public read"
  on public.event_stats for select
  to anon, authenticated
  using (true);

-- Public read of visible, non-deleted comments only.
create policy "event_comments: public read visible"
  on public.event_comments for select
  to anon, authenticated
  using (moderation_state = 'visible' and is_deleted = false);

-- NOTE: no SELECT policy on event_reactions — individual reactions are
-- private; counts are exposed through event_stats. No INSERT/UPDATE/DELETE
-- policies anywhere: all writes flow through API routes using the service
-- role, which bypasses RLS and enforces session ownership per request.
