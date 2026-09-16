# Community and map release handoff

## Status

Implemented locally on `pink-planner-redesign`. Not pushed or deployed. Supabase and Vercel browser access were denied because an administrator-enforced security check was unavailable. Do not bypass that restriction. No live schema, storage, or coordinate changes have been made.

## Release order

1. Confirm a current Supabase backup/export and inspect the live schema against migrations 0001/0002. Do not re-run those initialization files on an existing database. If the deployed schema differs, reconcile before applying this update.
2. In the project's Supabase SQL Editor, apply `supabase/migrations/0003_maps_community.sql` once. It runs in a transaction, preserves existing content, extends comments for photo-only posts, adds private post reactions/attendance/website feedback, and provisions a private photo bucket. No email/password fields are added.
3. Apply `supabase/map-coordinate-updates.sql`. This only updates rows with BOTH coordinates missing and matching ID/address/venue/city. Existing coordinates are untouched. Two approximate district pins are marked as such.
4. Verify database and storage configuration. The `community-photos` bucket must be private, accept JPEG only, and have a 1 MiB per-file limit. Service credentials must stay server-side. Existing Vercel variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` must be available to the branch's Preview environment.
5. Commit and push `pink-planner-redesign` only after the migration succeeds. With the existing Vercel Git integration, use its new branch Preview deployment. Do not merge to main or promote production until the checks below pass.

## Verify before calling the release complete

- Confirm all cursor pages load (current downloaded catalog: 185 unique events; no hardcoded total).
- Check mapped count against live data (local supplement currently maps 127; one additional coordinate record is excluded by the event's conflicting Virtual classification).
- Desktop AND phone: pins appear; zoom buttons, scroll/drag/pinch work; numbered groups separate; same-location groups list all events; pin details show title/date/time/venue and link to the event page.
- Map initially fits available locations. Search/date/type/location filters update both counts, pins, and the complete matching list. Unmapped events remain in the list. A community/card View on map link opens that event's details and centers its pin when available.
- Two independent browser profiles: create text-only, photo-only, and combined posts; refresh and verify visibility in the second browser. Confirm photo previews/removal, all/photos/comments filters, newest/most-liked sort, event filter, and event-scoped feed.
- Verify generated names, editing, browser persistence, no signup, independent identities across browsers. Earlier posts retain their name snapshot; no verified-identity claim.
- Like/dislike/change/remove a post reaction; verify both counts from the second browser. Duplicate reactions and duplicate attendance must remain impossible. Planned attendance is separate from reviews and blocked after an event starts.
- Report and delete a post; hidden/deleted posts must disappear. Previously issued photo links can remain valid for up to one hour. Photos remain privately retained in storage for moderation; define a retention policy before a larger public launch.
- Send website review and improvement feedback. Confirm it appears in `website_feedback`, not the public event feed. Verify footer portrait, Joshua Solomon credit, About copy, and contact links.
- Check keyboard focus, dialog escape/close, mobile overflow, readable selected states, and empty/error states. Browser visual checks remain outstanding because browser access is blocked.

## Local checks

`npm install`, `npm run typecheck`, `npm run build`, `node scripts/test-event-coordinates.cjs`, `node scripts/test-map-clusters.cjs`, and `node scripts/test-community-db.mjs`.

The database test uses isolated PGlite PostgreSQL, not the live Supabase server. It covers migration syntax, private access, photo-only content rules, reaction changes/removal, attendance uniqueness, persistent per-profile rate limits, hidden-post exclusion, and coordinate bounds. It stubs only Supabase storage bucket metadata; real image uploads, RLS/storage integration, and cross-browser behavior require deployment checks.

## Remaining operational risks

- Anonymous identities can be reset by clearing cookies; one browser profile is not one verified person. Per-profile persistent limits reduce bursts but do not prevent determined abuse. Monitor reports and storage usage; no moderation dashboard or automated image moderation is included.
- Photos are capped at three per post and 1 MiB each, decoded/re-encoded to JPEG, resized, and metadata-stripped. Uploads use private storage and expiring read links for visible posts. Failed writes attempt upload cleanup; interrupted server execution can leave private orphan objects.
- Feed pagination is offset-based; newly added posts or changing reaction counts can shift page boundaries. Reload to obtain fresh ordering.
- New/moved venues need verified coordinate maintenance. The unresolved list includes virtual events, unknown venues, ambiguous matches, and one address that conflicts with the named venue; the approximate 142 target is not yet verified.
- No public share URL for this version exists yet. Keep the previous deployment available until these checks pass.
