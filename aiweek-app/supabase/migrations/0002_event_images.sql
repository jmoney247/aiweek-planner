-- ============================================================================
-- Boston AI Week community app — event image columns
-- Migration: 0002_event_images
--
-- Adds image metadata to public.events. Populated by:
--   1. scripts/collect-images.mjs   -> image-report/images.json (provenance)
--   2. scripts/apply-images-to-seed.mjs -> supabase/image_updates.sql (UPDATEs)
--
-- RLS: the existing "events: public read" policy (0001_init.sql) is a plain
-- `for select ... using (true)` policy with NO column restriction, so these
-- new columns are covered by public SELECT automatically. Verified 2026-09-16:
-- no column-restricted policies exist on public.events, so no policy changes
-- are needed here.
--
-- Image URL strategy:
--   * image_url  = Supabase Storage public URL under bucket `event-images`
--                  (path: <uid>.<ext>) once scripts/upload-images.mjs has run.
--   * Before upload, image_url holds the original hotlink URL as an interim
--                  value, and only when hotlink_ok is recorded per-domain in
--                  image-report/images.json.
--   * image_kind = 'none' means "no suitable image found yet" — the frontend
--                  must render the branded CSS fallback tile for these rows.
--
-- Apply with: supabase db push   (or paste into Dashboard > SQL Editor)
-- ============================================================================

alter table public.events
  add column if not exists image_url          text,
  add column if not exists image_source_url   text,
  add column if not exists image_original_url text,
  add column if not exists image_attribution  text,
  add column if not exists image_kind         text not null default 'none',
  add column if not exists image_verified_at  timestamptz,
  add column if not exists image_width        int,
  add column if not exists image_height       int;

-- Kind vocabulary. 'none' = no suitable image found yet (frontend shows the
-- branded fallback tile). No 'unverified'/'ad' rows may be stored.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'events_image_kind_check'
  ) then
    alter table public.events
      add constraint events_image_kind_check
      check (image_kind in ('official', 'organizer_logo', 'fallback', 'none'));
  end if;
end $$;

create index if not exists idx_events_image_kind
  on public.events (image_kind);

comment on column public.events.image_url is
  'Final served URL: Supabase Storage public URL (event-images bucket) when uploaded, else the original hotlink URL as interim when hotlinking is permitted for that domain.';
comment on column public.events.image_source_url is
  'Page URL where the image was found (aiweek.boston event page, or the registration page).';
comment on column public.events.image_original_url is
  'Direct image URL as discovered, before any Storage copy.';
comment on column public.events.image_attribution is
  'Human-readable credit line, e.g. "og:image via aiweek.boston event page".';
comment on column public.events.image_kind is
  'official | organizer_logo | fallback | none. Only vetted images land here; ads/pixels/stock are rejected by the collector.';
comment on column public.events.image_verified_at is
  'When the image URL was last fetched and validated (content-type + size + dimensions).';
comment on column public.events.image_width is 'Pixel width, when the collector could read it cheaply.';
comment on column public.events.image_height is 'Pixel height, when the collector could read it cheaply.';
