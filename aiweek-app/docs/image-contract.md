# Event image contract (for `EventCard` / frontend)

Source of truth: `public.events` image columns (migration `0002_event_images.sql`).
Another agent builds the card — this file is the contract only.

## Fields

| column | meaning |
|---|---|
| `image_url` | Final served URL: Supabase Storage public URL (`event-images/<uid>.<ext>`) once `scripts/upload-images.mjs` has run; before that, the validated original URL as interim **only when** the row was collected with hotlink permission recorded |
| `image_source_url` | Page where the image was found (provenance, not for display) |
| `image_original_url` | Direct image URL before any Storage copy (provenance) |
| `image_attribution` | Credit line, e.g. `"og:image via aiweek.boston"` — show on hover/expand if you show credits at all |
| `image_kind` | `'official'` \| `'organizer_logo'` \| `'fallback'` \| `'none'` |
| `image_verified_at` | Last time the URL was fetched and validated |
| `image_width` / `image_height` | Pixels, when the collector could read them from headers |

## Rendering rules

1. **Primary render**: `<img src={image_url}>` when `image_url` is non-null.
   - Aspect: 16:9 crop, `object-fit: cover`, `loading="lazy"`.
   - `alt` = event title (never empty, never the URL).
   - Fixed aspect-ratio container so layout doesn't shift while loading.
2. **`image_kind === 'none'`** (or `image_url` null/empty): render the **branded CSS fallback tile** — gradient tile with event-type label / host initial. No gray box, no broken-image icon, no empty space.
3. **`onError`**: if the image fails to load, swap to the fallback tile (do not retry in a loop, do not show the browser's broken-image glyph).
4. **`image_kind === 'fallback'`**: branded fallback artwork — currently the official festival-wide og card from aiweek.boston (identical across events; verified). Render it like a normal image. If the design later ships per-event-type tiles, they also land here.
5. Never render `image_source_url` / `image_original_url` as images — they're provenance.
6. Don't hotlink-check client-side; the pipeline already validated each URL (`image_verified_at`). Treat `onError` as the runtime safety net.

## What "verified" guarantees (and doesn't)

- Guarantees: URL returned HTTP 200 with `content-type: image/*`, ≥ 15 KB, ≥ 400 px wide when dimensions were readable, and passed the junk-filename filter (pixels, trackers, icons, cookie banners rejected).
- Doesn't guarantee: aesthetic fit or that a human approved it. The provenance (`image_source_url`) is in `image-report/images.json` for spot-checks.
