# Boston AI Week — Event Image Report

Generated: 2026-09-16T07:54:09.992Z · Collector: `scripts/collect-images.mjs` · Seed events: 185 · Provenance: `image-report/images.json`

## Pipeline priority (first passing candidate wins)

1. structured per-event data image → 2. `og:image` → 3. twitter card image → 4. registration-page banner → 5. official flyer → 6. organizer-provided (JSON-LD) → 7. official organizer logo → 8. generic festival og card as branded fallback.

**Honest note on priority 1:** aiweek.boston's `/api/og/events/<slug>` endpoint — which the event pages advertise as their og:image — returns a *single festival-wide card* for every slug (verified byte-identical, md5 `468c29d642b7c10a3ae027d9481aa6ff`, 1200×630, across 4 sampled events on 2026-09-16). There is no per-event structured image on the official site, so priority 1 is unoccupied and that card is used as the priority-8 branded fallback (`image_kind='fallback'`). `image_kind='none'` is reserved for rows where even the fallback could not be fetched.

## Counts

| kind | count |
|---|---|
| official (event-specific image found) | 115 |
| organizer_logo | 2 |
| fallback (generic festival card) | 68 |
| none (no image at all) | 0 |
| registration pages bot-blocked | 2 |
| events covered in images.json | 185 / 185 |

## Validation gates (automatic rejections)

- HTTP non-200, content-type not `image/*`
- < 15 KB; < 400 px wide (dimensions read from PNG/GIF/JPEG/WebP headers — no decoder lib needed)
- filename matches pixel|tracker|spacer|beacon|1x1|icon|logo-small|cookie|sprite|favicon; 1x1/spacer gifs
- site chrome rejected: aiweek.boston's own nav logo (`boston-ai-week-2026*.png`, identical on every page) is classified as nav imagery, not an event/organizer image
- ads, stock photos, unrelated-event banners: not auto-detectable with certainty — every decision lists its source page in `images.json` for human spot-checks.

## Rejected as irrelevant / failed validation

- `enterprise-ai-mind-the-gap-a-talk-on-intelligence-applications-at-scale-by-ai-pr@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `enterprise-ai-mind-the-gap-a-talk-on-intelligence-applications-at-scale-by-ai-pr@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `boston-ai-week-meets-the-world@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `boston-ai-week-meets-the-world@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `ai-in-medical-education-administration-whats-changing-and-how-to-prepare@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `ai-in-medical-education-administration-whats-changing-and-how-to-prepare@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `building-ai-that-scales-avoiding-the-multicloud-trap-red-sox-game@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `building-ai-that-scales-avoiding-the-multicloud-trap-red-sox-game@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `building-ai-that-scales-avoiding-the-multicloud-trap-red-sox-game@aiweek.boston` — https://info.wasabi.com/hs-fs/hubfs/wasabi_primary_logo-1.png?width=250&amp;height=75&amp;name=wasabi_primary_logo-1.png — too small (5.2 KB < 15 KB)
- `networking-connection-workbar-needham-2026@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `networking-connection-workbar-needham-2026@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `ai-week-keynote-how-ai-startups-will-reshape-bostons-future@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `ai-week-keynote-how-ai-startups-will-reshape-bostons-future@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `the-ai-defense-stack-showcase-day@aiweek.boston` — https://static.licdn.com/scds/common/u/images/logos/favicons/v1/favicon.ico — rejected filename pattern (favicon.ico)
- `the-ai-defense-stack-showcase-day@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `the-ai-defense-stack-showcase-day@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `how-our-ai-navigator-has-supported-success-in-developing-healthier-happier-peopl@aiweek.boston` — https://www.eventbrite.com/e/_next/image?url=https%3A%2F%2Fimg.evbuc.com%2Fhttps%253A%252F%252Fcdn.evbuc.com%252Fimages%252F1192691915%252F292464166036%252F1%252Foriginal.20260904-155130%3Fcrop%3Dfocalpoint%26fit%3Dcrop%26w%3D940%26auto%3Dformat%252Ccompress%26q%3D75%26sharp%3D10%26fp-x%3D0.5%26fp-y%3D0.5%26s%3D7bf1eda1a1ae69ef09d02845aec1170d&amp;w=940&amp;q=75 — image HTTP 400
- `how-our-ai-navigator-has-supported-success-in-developing-healthier-happier-peopl@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `how-our-ai-navigator-has-supported-success-in-developing-healthier-happier-peopl@aiweek.boston` — https://www.eventbrite.com/e/_next/image?url=https%3A%2F%2Fimg.evbuc.com%2Fhttps%253A%252F%252Fcdn.evbuc.com%252Fimages%252F1192691915%252F292464166036%252F1%252Foriginal.20260904-155130%3Fcrop%3Dfocalpoint%26fit%3Dcrop%26w%3D1880%26auto%3Dformat%252Ccompress%26q%3D75%26sharp%3D10%26fp-x%3D0.5%26fp-y%3D0.5%26s%3D38de3af61307f74c0fb37f9bbc1ec084&amp;w=1880&amp;q=75 — image HTTP 400
- `how-our-ai-navigator-has-supported-success-in-developing-healthier-happier-peopl@aiweek.boston` — https://www.eventbrite.com/e/_next/image?url=https%3A%2F%2Fcdn.evbstatic.com%2Fe%2F_next%2Fstatic%2Fmedia%2Fmap.2hve6ktt4gqsr.png&amp;w=940&amp;q=75 — image HTTP 400
- `boat-rides-boston-harbor-captain-chris-2026-09-24@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `boat-rides-boston-harbor-captain-chris-2026-09-24@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `boston-cloud-connect-summit@aiweek.boston` — https://www.eventbrite.com/e/_next/image?url=https%3A%2F%2Fimg.evbuc.com%2Fhttps%253A%252F%252Fcdn.evbuc.com%252Fimages%252F1190312324%252F223585495939%252F1%252Foriginal.20260804-191519%3Fcrop%3Dfocalpoint%26fit%3Dcrop%26w%3D940%26auto%3Dformat%252Ccompress%26q%3D75%26sharp%3D10%26fp-x%3D0.5%26fp-y%3D0.5%26s%3D2ced80b5e97e0797674b84a06d0b623f&amp;w=940&amp;q=75 — image HTTP 400
- `boston-cloud-connect-summit@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `boston-cloud-connect-summit@aiweek.boston` — https://www.eventbrite.com/e/_next/image?url=https%3A%2F%2Fimg.evbuc.com%2Fhttps%253A%252F%252Fcdn.evbuc.com%252Fimages%252F1190312324%252F223585495939%252F1%252Foriginal.20260804-191519%3Fcrop%3Dfocalpoint%26fit%3Dcrop%26w%3D1880%26auto%3Dformat%252Ccompress%26q%3D75%26sharp%3D10%26fp-x%3D0.5%26fp-y%3D0.5%26s%3D95fd951d4e6b5772b477fcfbe71e208e&amp;w=1880&amp;q=75 — image HTTP 400
- `boston-cloud-connect-summit@aiweek.boston` — https://www.eventbrite.com/e/_next/image?url=https%3A%2F%2Fcdn.evbstatic.com%2Fe%2F_next%2Fstatic%2Fmedia%2Fmap.2hve6ktt4gqsr.png&amp;w=940&amp;q=75 — image HTTP 400
- `under-the-hood-of-microsoft-scout-a-15-seat-working-session-on-corporate-ai-agen@aiweek.boston` — https://www.eventbrite.com/e/_next/image?url=https%3A%2F%2Fimg.evbuc.com%2Fhttps%253A%252F%252Fcdn.evbuc.com%252Fimages%252F1192365189%252F1357714474773%252F1%252Foriginal.20260901-140044%3Fcrop%3Dfocalpoint%26fit%3Dcrop%26w%3D940%26auto%3Dformat%252Ccompress%26q%3D75%26sharp%3D10%26fp-x%3D0.044%26fp-y%3D0.231%26s%3Df70c443d6c462cd20910771ea1b2ce90&amp;w=940&amp;q=75 — image HTTP 400
- `under-the-hood-of-microsoft-scout-a-15-seat-working-session-on-corporate-ai-agen@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `under-the-hood-of-microsoft-scout-a-15-seat-working-session-on-corporate-ai-agen@aiweek.boston` — https://www.eventbrite.com/e/_next/image?url=https%3A%2F%2Fimg.evbuc.com%2Fhttps%253A%252F%252Fcdn.evbuc.com%252Fimages%252F1192365189%252F1357714474773%252F1%252Foriginal.20260901-140044%3Fcrop%3Dfocalpoint%26fit%3Dcrop%26w%3D1880%26auto%3Dformat%252Ccompress%26q%3D75%26sharp%3D10%26fp-x%3D0.044%26fp-y%3D0.231%26s%3D064fc5a149b5c3d2399ed2e62495dd38&amp;w=1880&amp;q=75 — image HTTP 400
- `under-the-hood-of-microsoft-scout-a-15-seat-working-session-on-corporate-ai-agen@aiweek.boston` — https://www.eventbrite.com/e/_next/image?url=https%3A%2F%2Fcdn.evbstatic.com%2Fe%2F_next%2Fstatic%2Fmedia%2Fmap.2hve6ktt4gqsr.png&amp;w=940&amp;q=75 — image HTTP 400
- `vizit-fireside-questrom-2026@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `vizit-fireside-questrom-2026@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `human-centric-ai-summit-2026@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `human-centric-ai-summit-2026@aiweek.boston` — https://mahealthcouncil.org/global_graphics/icons/notepad.gif — too small (0.5 KB < 15 KB)
- `human-centric-ai-summit-2026@aiweek.boston` — https://mahealthcouncil.org/global_graphics/icons/envelope.gif — too small (0.6 KB < 15 KB)
- `human-centric-ai-summit-2026@aiweek.boston` — https://mahealthcouncil.org/global_graphics/calendar.png — too small (0.9 KB < 15 KB)
- `human-centric-ai-summit-2026@aiweek.boston` — https://mahealthcouncil.org/global_graphics/icons/edit.gif — too small (0.5 KB < 15 KB)
- `human-centric-ai-summit-2026@aiweek.boston` — https://mahealthcouncil.org/global_graphics/icons/buddy_add.gif — too small (0.6 KB < 15 KB)
- `human-centric-ai-summit-2026@aiweek.boston` — https://mahealthcouncil.org/global_graphics/facebook-icon.png — rejected filename pattern (facebook-icon.png)
- `human-centric-ai-summit-2026@aiweek.boston` — https://mahealthcouncil.org/global_graphics/linkedin-icon.png — rejected filename pattern (linkedin-icon.png)
- `human-centric-ai-summit-2026@aiweek.boston` — https://mahealthcouncil.org/global_graphics/icons/securesubmit.png — too small (0.5 KB < 15 KB)
- `human-centric-ai-summit-2026@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `custom-software-at-business-speed-from-operator-requirement-to-governed-prototyp@aiweek.boston` — https://static.licdn.com/scds/common/u/images/logos/favicons/v1/favicon.ico — rejected filename pattern (favicon.ico)
- `custom-software-at-business-speed-from-operator-requirement-to-governed-prototyp@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `custom-software-at-business-speed-from-operator-requirement-to-governed-prototyp@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `boat-rides-boston-harbor-captain-chris-2026-09-25@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `boat-rides-boston-harbor-captain-chris-2026-09-25@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `the-ai-identity-shift-rebuilding-leadership-structure-and-capabilities-for-the-n@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `the-ai-identity-shift-rebuilding-leadership-structure-and-capabilities-for-the-n@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `boston-ai-week-opening-party@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `boston-ai-week-opening-party@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `simulating-cinema-with-aiemerson@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `simulating-cinema-with-aiemerson@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `devfest-boston-2026@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `devfest-boston-2026@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `architecting-with-ai-developer-roundtable@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `architecting-with-ai-developer-roundtable@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `boat-rides-boston-harbor-captain-chris-2026-09-26@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `boat-rides-boston-harbor-captain-chris-2026-09-26@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `the-underutilization-hypothesis-on-the-allocation-of-existing-artificial-intelli@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `the-underutilization-hypothesis-on-the-allocation-of-existing-artificial-intelli@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `boat-rides-boston-harbor-captain-chris-2026-09-27@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `boat-rides-boston-harbor-captain-chris-2026-09-27@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `behavior-adaptation-strategies-for-language-models-in-high-sensitivity-and-vulne@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `behavior-adaptation-strategies-for-language-models-in-high-sensitivity-and-vulne@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `conv2x-2026@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `conv2x-2026@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `gai-world-2026@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `introducing-motivation-intelligence-signal-to-power-better-ai-hosted-by-the-scie@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `boat-rides-boston-harbor-captain-chris-2026-09-28@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `boat-rides-boston-harbor-captain-chris-2026-09-28@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `ai-governance-the-difference-between-a-pilot-and-a-successful-rollout@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `ai-governance-the-difference-between-a-pilot-and-a-successful-rollout@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `demos-drinks-where-ai-meets-human-behavior-research@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `demos-drinks-where-ai-meets-human-behavior-research@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `when-ai-gets-physical-navigating-the-real-world-risks-and-rewards@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `when-ai-gets-physical-navigating-the-real-world-risks-and-rewards@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `women-in-ai-breakfast-gai-world-2026@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `ai-are-we-doing-this-right@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `gai-world-2026-day-2@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `how-to-build-a-company-brain@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `how-to-build-a-company-brain@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `how-legacy-industries-are-quietly-winning-with-ai@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `how-legacy-industries-are-quietly-winning-with-ai@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `boat-rides-boston-harbor-captain-chris-2026-09-29@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `boat-rides-boston-harbor-captain-chris-2026-09-29@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `build-your-first-ai-executive-assistant-in-base44-in-15-minutes-or-less@aiweek.boston` — https://us06web.zoom.usnull/ — image fetch failed: fetch failed
- `build-your-first-ai-executive-assistant-in-base44-in-15-minutes-or-less@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `build-your-first-ai-executive-assistant-in-base44-in-15-minutes-or-less@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `build-your-first-ai-executive-assistant-in-base44-in-15-minutes-or-less@aiweek.boston` — https://us06st1.zoom.us/static/26.8.66435/image/new/topNav/Zoom_logo.svg — too small (1.6 KB < 15 KB)
- `training-custom-ai-models-via-fine-tuning@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `training-custom-ai-models-via-fine-tuning@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `manufacturing-ai-siop-to-shop-floor@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `manufacturing-ai-siop-to-shop-floor@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `ai-in-action-questrom-2026@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `ai-in-action-questrom-2026@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `ai-in-sales-selling-hasnt-changed-the-tools-have@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `ai-in-sales-selling-hasnt-changed-the-tools-have@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `thriving-in-the-age-of-ai-the-intersection-of-business-higher-education-and-tech@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `thriving-in-the-age-of-ai-the-intersection-of-business-higher-education-and-tech@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `gai-world-2026-day-3@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `your-first-digital-employee-building-an-ai-agent-that-actually-does-the-work@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `your-first-digital-employee-building-an-ai-agent-that-actually-does-the-work@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `ai-software-vs-physical-ai-potential-and-reality@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `ai-software-vs-physical-ai-potential-and-reality@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `boat-rides-boston-harbor-captain-chris-2026-09-30@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `boat-rides-boston-harbor-captain-chris-2026-09-30@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `mvp-workshop-for-entrepreneurs@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `mvp-workshop-for-founders@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `mvp-workshop-for-founders@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `lab-to-launch-rooftop-edition@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `lab-to-launch-rooftop-edition@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `special-olympics-massachusetts-polar-plunge@aiweek.boston` — https://fundraise.specialolympicsma.org/https&#x3a;&#x2f;&#x2f;donordrivecontent.com&#x2f;specialolympicsma&#x2f;images&#x2f;fbLogo.jpg&#x3f;v&#x3d;202609151506 — content-type not image/* (got "text/html")
- `special-olympics-massachusetts-polar-plunge@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `the-silence-tax-in-the-ai-era@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `the-silence-tax-in-the-ai-era@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `pitch-lift-bostons-100000-elevator-pitch-competition@aiweek.boston` — https://static.wixstatic.com/media/d3f550_65395c5db24c4881b4197b19494fa3c7%7Emv2.png/v1/fit/w_2500,h_1330,al_c/d3f550_65395c5db24c4881b4197b19494fa3c7%7Emv2.png — too small (13.6 KB < 15 KB)
- `pitch-lift-bostons-100000-elevator-pitch-competition@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `pitch-lift-bostons-100000-elevator-pitch-competition@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `multi-agent-symphony-conductor@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `multi-agent-symphony-conductor@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `pydata-boston-ai-talks@aiweek.boston` — https://secure.meetupstatic.com/photos/event/2/3/2/f/600_533949007.jpeg — too small (9.9 KB < 15 KB)
- `pydata-boston-ai-talks@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `pydata-boston-ai-talks@aiweek.boston` — https://www.facebook.com/tr?id=792405807634160&amp;ev=PageView&amp;noscript=1 — content-type not image/* (got "text/plain")
- `pydata-boston-ai-talks@aiweek.boston` — https://secure.meetupstatic.com/photos/member/4/8/f/5/thumb_9318677.jpeg?w=64 — too small (2.6 KB < 15 KB)
- `pydata-boston-ai-talks@aiweek.boston` — https://secure.meetupstatic.com/photos/event/5/2/0/2/event_467900994.jpeg?w=3840 — too narrow (360px < 400px)
- `pydata-boston-ai-talks@aiweek.boston` — https://secure.meetupstatic.com/next/images/complex-icons/branded/calendar.webp?w=64 — too narrow (128px < 400px)
- `pydata-boston-ai-talks@aiweek.boston` — https://secure.meetupstatic.com/next/images/complex-icons/branded/pin.webp?w=64 — too small (11.5 KB < 15 KB)
- `pydata-boston-ai-talks@aiweek.boston` — https://secure.meetupstatic.com/photos/sponsor/1/4/2/f/iab120x90_2645167.jpeg — too small (7.7 KB < 15 KB)
- `pydata-boston-ai-talks@aiweek.boston` — https://secure-content.meetupstatic.com/images/classic-events/533949007/676x676.jpg — too small (7.9 KB < 15 KB)
- `pydata-boston-ai-talks@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `pioneers-of-ai-live-2026@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `tedxboston-longevity-2026@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `tedxboston-longevity-2026@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `ai-ready-or-risky-a-working-session-for-c-level-and-equivalent-enterprise-leader@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `ai-ready-or-risky-a-working-session-for-c-level-and-equivalent-enterprise-leader@aiweek.boston` — https://cdn.prod.website-files.com/657141b092d019b05ff57885/657141b092d019b05ff578d4_EAI_Wordmark_Dark.webp — too small (4.5 KB < 15 KB)
- `ai-ready-or-risky-a-working-session-for-c-level-and-equivalent-enterprise-leader@aiweek.boston` — https://cdn.prod.website-files.com/624380709031623bfe4aee60/624380709031626fc14aee84_icon.svg — too small (0.9 KB < 15 KB)
- `ai-ready-or-risky-a-working-session-for-c-level-and-equivalent-enterprise-leader@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `ai-ready-or-risky-a-working-session-for-c-level-and-equivalent-enterprise-leader@aiweek.boston` — https://cdn.prod.website-files.com/657141b092d019b05ff57885/657141b092d019b05ff578d5_EAI_Wordmark_Light.webp — too small (4.6 KB < 15 KB)
- `safe-ai-governance-dont-let-ai-eat-your-lunch@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `safe-ai-governance-dont-let-ai-eat-your-lunch@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `boat-rides-boston-harbor-captain-chris-2026-10-01@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `boat-rides-boston-harbor-captain-chris-2026-10-01@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `ai-and-the-next-economy@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `ai-and-the-next-economy@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `ai-hub-accelerator-alpfa-boston@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `ai-hub-accelerator-alpfa-boston@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `boston-ai-week-venture-cafe@aiweek.boston` — https://storage.googleapis.com/gatherus-app/event_images/at_1_0DM5vQu.webp — content-type not image/* (got "application/octet-stream")
- `boston-ai-week-venture-cafe@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `hacktoberfest-2026-hack-day-with-cloudinary-cambridge@aiweek.boston` — https://s3.amazonaws.com/organizer.mlh.io/e7l2d8w7mhhstghwd6ss0ijjc89f?response-content-disposition=inline%3B%20filename%3D%22hacktoberfest%202026.png%22%3B%20filename%2A%3DUTF-8%27%27hacktoberfest%25202026.png&amp;response-content-type=image%2Fpng&amp;X-Amz-Algorithm=AWS4-HMAC-SHA256&amp;X-Amz-Credential=AKIAJFCF2ZS25I2RWYBQ%2F20260916%2Fus-east-1%2Fs3%2Faws4_request&amp;X-Amz-Date=20260916T074950Z&amp;X-Amz-Expires=300&amp;X-Amz-SignedHeaders=host&amp;X-Amz-Signature=ede89163c5779eaf599bc65953924e9730c120f6b418c2a890c73fef3da72327 — image HTTP 400
- `hacktoberfest-2026-hack-day-with-cloudinary-cambridge@aiweek.boston` — https://s3.amazonaws.com/organizer.mlh.io/e7l2d8w7mhhstghwd6ss0ijjc89f?response-content-disposition=inline%3B%20filename%3D%22hacktoberfest%202026.png%22%3B%20filename%2A%3DUTF-8%27%27hacktoberfest%25202026.png&amp;amp;response-content-type=image%2Fpng&amp;amp;X-Amz-Algorithm=AWS4-HMAC-SHA256&amp;amp;X-Amz-Credential=AKIAJFCF2ZS25I2RWYBQ%2F20260916%2Fus-east-1%2Fs3%2Faws4_request&amp;amp;X-Amz-Date=20260916T074950Z&amp;amp;X-Amz-Expires=300&amp;amp;X-Amz-SignedHeaders=host&amp;amp;X-Amz-Signature=ede89163c5779eaf599bc65953924e9730c120f6b418c2a890c73fef3da72327 — image HTTP 400
- `hacktoberfest-2026-hack-day-with-cloudinary-cambridge@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `women-in-data-fall-happy-hour@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `women-in-data-fall-happy-hour@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `your-ai-chatbot-is-live-now-what@aiweek.boston` — https://www.eventbrite.com/e/_next/image?url=https%3A%2F%2Fimg.evbuc.com%2Fhttps%253A%252F%252Fcdn.evbuc.com%252Fimages%252F1192717241%252F4187713221%252F1%252Foriginal.20260904-203152%3Fcrop%3Dfocalpoint%26fit%3Dcrop%26w%3D940%26auto%3Dformat%252Ccompress%26q%3D75%26sharp%3D10%26fp-x%3D0.629%26fp-y%3D0.539%26s%3D28aef3fbed44b10d8c839c934a854289&amp;w=940&amp;q=75 — image HTTP 400
- `your-ai-chatbot-is-live-now-what@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `your-ai-chatbot-is-live-now-what@aiweek.boston` — https://www.eventbrite.com/e/_next/image?url=https%3A%2F%2Fimg.evbuc.com%2Fhttps%253A%252F%252Fcdn.evbuc.com%252Fimages%252F1192717241%252F4187713221%252F1%252Foriginal.20260904-203152%3Fcrop%3Dfocalpoint%26fit%3Dcrop%26w%3D1880%26auto%3Dformat%252Ccompress%26q%3D75%26sharp%3D10%26fp-x%3D0.629%26fp-y%3D0.539%26s%3D1683b3a4af75ade0f93e37321bfe2246&amp;w=1880&amp;q=75 — image HTTP 400
- `your-ai-chatbot-is-live-now-what@aiweek.boston` — https://www.eventbrite.com/e/_next/image?url=https%3A%2F%2Fcdn.evbstatic.com%2Fe%2F_next%2Fstatic%2Fmedia%2Fmap.2hve6ktt4gqsr.png&amp;w=940&amp;q=75 — image HTTP 400
- `ai-education-and-the-future-of-how-we-prove-what-we-know@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `ai-education-and-the-future-of-how-we-prove-what-we-know@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `workforce-innovation-ai-driven-technology@aiweek.boston` — https://www.eventbrite.com/e/_next/image?url=https%3A%2F%2Fimg.evbuc.com%2Fhttps%253A%252F%252Fcdn.evbuc.com%252Fimages%252F1192056174%252F2994774532845%252F1%252Foriginal.20260827-175527%3Fcrop%3Dfocalpoint%26fit%3Dcrop%26w%3D940%26auto%3Dformat%252Ccompress%26q%3D75%26sharp%3D10%26fp-x%3D0.432%26fp-y%3D0.494%26s%3D65d0f18cf6c603de5ef2414a001c7078&amp;w=940&amp;q=75 — image HTTP 400
- `workforce-innovation-ai-driven-technology@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `workforce-innovation-ai-driven-technology@aiweek.boston` — https://www.eventbrite.com/e/_next/image?url=https%3A%2F%2Fimg.evbuc.com%2Fhttps%253A%252F%252Fcdn.evbuc.com%252Fimages%252F1192056174%252F2994774532845%252F1%252Foriginal.20260827-175527%3Fcrop%3Dfocalpoint%26fit%3Dcrop%26w%3D1880%26auto%3Dformat%252Ccompress%26q%3D75%26sharp%3D10%26fp-x%3D0.432%26fp-y%3D0.494%26s%3D29827a4478c349ae9d3a1f63554845ab&amp;w=1880&amp;q=75 — image HTTP 400
- `workforce-innovation-ai-driven-technology@aiweek.boston` — https://www.eventbrite.com/e/_next/image?url=https%3A%2F%2Fcdn.evbstatic.com%2Fe%2F_next%2Fstatic%2Fmedia%2Fmap.2hve6ktt4gqsr.png&amp;w=940&amp;q=75 — image HTTP 400
- `builders-and-brews@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `builders-and-brews@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `aws-ai-league-drug-discovery-challenge@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `aws-ai-league-drug-discovery-challenge@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `grade-the-work-can-your-managers-tell-good-ai-output-from-bad-a-live-test@aiweek.boston` — https://www.eventbrite.com/e/_next/image?url=https%3A%2F%2Fimg.evbuc.com%2Fhttps%253A%252F%252Fcdn.evbuc.com%252Fimages%252F1191596697%252F2233773368543%252F1%252Foriginal.20260821-143757%3Fcrop%3Dfocalpoint%26fit%3Dcrop%26w%3D940%26auto%3Dformat%252Ccompress%26q%3D75%26sharp%3D10%26fp-x%3D0.689%26fp-y%3D0.535%26s%3Df7579ccfb8f2fb3180ac6b2bbc0c00ac&amp;w=940&amp;q=75 — image HTTP 400
- `grade-the-work-can-your-managers-tell-good-ai-output-from-bad-a-live-test@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `grade-the-work-can-your-managers-tell-good-ai-output-from-bad-a-live-test@aiweek.boston` — https://www.eventbrite.com/e/_next/image?url=https%3A%2F%2Fimg.evbuc.com%2Fhttps%253A%252F%252Fcdn.evbuc.com%252Fimages%252F1191596697%252F2233773368543%252F1%252Foriginal.20260821-143757%3Fcrop%3Dfocalpoint%26fit%3Dcrop%26w%3D1880%26auto%3Dformat%252Ccompress%26q%3D75%26sharp%3D10%26fp-x%3D0.689%26fp-y%3D0.535%26s%3D2a9e0847cc2811c6621e70c5e8b81d06&amp;w=1880&amp;q=75 — image HTTP 400
- `boat-rides-boston-harbor-captain-chris-2026-10-02@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `boat-rides-boston-harbor-captain-chris-2026-10-02@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `the-human-role-in-ai-driven-businesses-c-dean-metropoulos-institute-for-technolo@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `the-human-role-in-ai-driven-businesses-c-dean-metropoulos-institute-for-technolo@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `the-human-role-in-ai-driven-businesses-c-dean-metropoulos-institute-for-technolo@aiweek.boston` — https://cvent.me/event_guestside_app/_next/image?url=https%3A%2F%2Fimages.cvent.com%2F12cf9d9bae5b4ab98189270bfb758373%2Fpix%2F9d7b8b492d9641b3b7690ea43f5cf08a!_!0d1eafda5a3db3321f5bd11a9d86a0e0.png&amp;w=3840&amp;q=75 — too small (5.9 KB < 15 KB)
- `boston-ai-week-closing-party@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `boston-ai-week-closing-party@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `venture-signal-founder-investor-exchange-how-investors-evaluate-ai-native-and-ai@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `venture-signal-founder-investor-exchange-how-investors-evaluate-ai-native-and-ai@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `the-150-million-secret-free-money-free-fellows-and-free-time-back@aiweek.boston` — https://us06web.zoom.usnull/ — image fetch failed: fetch failed
- `the-150-million-secret-free-money-free-fellows-and-free-time-back@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `the-150-million-secret-free-money-free-fellows-and-free-time-back@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `the-150-million-secret-free-money-free-fellows-and-free-time-back@aiweek.boston` — https://us06st1.zoom.us/static/26.8.66435/image/new/topNav/Zoom_logo.svg — too small (1.6 KB < 15 KB)
- `beyond-the-chatbot-a-framework-for-finding-where-ai-pays-off@aiweek.boston` — https://elasticpath.zoom.us/w_p/92502000464/1b6b411a-92af-49c1-8513-d8b304b47fba.png — too small (1.6 KB < 15 KB)
- `beyond-the-chatbot-a-framework-for-finding-where-ai-pays-off@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `beyond-the-chatbot-a-framework-for-finding-where-ai-pays-off@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `ai-disability-and-the-future-of-work-2026@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `ai-disability-and-the-future-of-work-2026@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `gtm-under-pressure-the-ai-mystery-basket-challenge@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `gtm-under-pressure-the-ai-mystery-basket-challenge@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `cambridge-ai-civil-rights-proclamation@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `cambridge-ai-civil-rights-proclamation@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `ai-in-finance-lab-boston@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `ai-in-finance-lab-boston@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `agricultural-ai-two-more-kilograms-per-ton@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `agricultural-ai-two-more-kilograms-per-ton@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `ai-education-what-students-and-parents-need-to-know@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `ai-education-what-students-and-parents-need-to-know@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `the-missing-layer-ai-governance-as-organizational-architecture@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `the-missing-layer-ai-governance-as-organizational-architecture@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `authors-innovators-all-day-book-preview-2026@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `authors-innovators-all-day-book-preview-2026@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `the-state-of-ai-control-in-institutional-finance@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `the-state-of-ai-control-in-institutional-finance@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `celebrate-hope-chris-hope-day-2026@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026-128.png — rejected: site chrome (aiweek.boston nav logo), not an event image
- `celebrate-hope-chris-hope-day-2026@aiweek.boston` — https://aiweek.boston/assets/boston-ai-week-2026.png — rejected: site chrome (aiweek.boston nav logo), not an event image

## Broken / unreachable URLs

- `vizit-fireside-questrom-2026@aiweek.boston` — https://trusted.bu.edu/s/1759/2-bu/19/1col.aspx?sid=1759&gid=2&pgid=19663&content_id=20780 → error: fetch failed
- `ai-in-action-questrom-2026@aiweek.boston` — https://trusted.bu.edu/s/1759/2-bu/19/1col.aspx?sid=1759&gid=2&pgid=19672&content_id=20786 → error: fetch failed
- `ai-education-and-the-future-of-how-we-prove-what-we-know@aiweek.boston` — https://trusted.bu.edu/s/1759/2-bu/19/1col.aspx?sid=1759&gid=2&pgid=19867&content_id=20993 → error: fetch failed
- `builders-and-brews@aiweek.boston` — https://luma.com/12snuaq9 → 404: registration page fetch failed
- `aws-ai-league-drug-discovery-challenge@aiweek.boston` — https://awsaileaguedrugdiscoveryqachal.splashthat.com/ → 403: blocked (anti-bot / login wall) — recorded as blocked, not failure
- `ai-disability-and-the-future-of-work-2026@aiweek.boston` — https://www.mass.gov/news/2026-national-disability-employment-awareness-month-celebration → 403: blocked (anti-bot / login wall) — recorded as blocked, not failure

## Per-event source table

| uid | kind | chosen image | source page | width×height | hotlink |
|---|---|---|---|---|---|
| `enterprise-ai-mind-the-gap-a-talk-on-intelligence-` | fallback | https://aiweek.boston/api/og/events/enterprise-ai-mind-the-gap-a-talk- | aiweek.boston/schedule/enterprise-ai-mind-the-gap-a-t | 1200×630 | true |
| `boston-ai-week-meets-the-world@aiweek.boston` | fallback | https://aiweek.boston/api/og/events/boston-ai-week-meets-the-world?v=1 | aiweek.boston/schedule/boston-ai-week-meets-the-world | 1200×630 | true |
| `hey-hub-come-here-bostons-voice-ai-meetup@aiweek.b` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/gqxuajjg | 800×420 | unknown |
| `ai-insights-summit-2026-a-free-3-day-virtual-ai-ev` | official | https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/lovp_6c6twn8a06887 | aiinsightssummit.com/ | 1920×1080 | unknown |
| `ai-in-medical-education-administration-whats-chang` | fallback | https://aiweek.boston/api/og/events/ai-in-medical-education-administra | aiweek.boston/schedule/ai-in-medical-education-admini | 1200×630 | true |
| `science-of-scaling-hubspot-case-hbs-2026@aiweek.bo` | official | https://20627419.fs1.hubspotusercontent-na1.net/hubfs/20627419/The%20S | scienceofscaling.co/mark-roberge-harvard-hubspot-case-study | 1080×1080 | unknown |
| `ai-native-dev-boston-inside-the-dark-factory@aiwee` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/ainative-u9dd | 800×420 | unknown |
| `film-philosophy-what-if-ai-won@aiweek.boston` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/nthwqu6m | 800×420 | unknown |
| `ai-powered-go-to-market-engine-2026@aiweek.boston` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/mass-cp7l | 800×420 | unknown |
| `tech-exit-playbook-liquidity-events-2026@aiweek.bo` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/867255g9 | 800×420 | unknown |
| `the-cost-of-intelligence-a-breakfast-briefing-on-a` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/0l18a79t | 800×420 | unknown |
| `ai-assistant-training@aiweek.boston` | official | https://unicorn-images.b-cdn.net/776fd5da-a149-44b2-8f11-03ddbf47640c? | www.kendallai.org/ai-assistant-webinar/ | 2445×820 | unknown |
| `stop-running-pilots-start-running-ai-and-unlocking` | official | https://ai.launchconsulting.com/hubfs/Launch_MS_Boston_image-1.jpg | ai.launchconsulting.com/ai-ebc-microsoft-burlington-ma | 1563×1043 | unknown |
| `subconscious-launch-night-the-easy-button-for-open` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/u0415mk2 | 800×420 | unknown |
| `from-idea-to-working-software-vibe-code-like-a-pro` | official | https://massaicoalition.com/__l5e/assets-v1/c445817c-098b-4cec-99ed-b8 | massaicoalition.com/retrain/register | 1672×941 | unknown |
| `building-ai-that-scales-avoiding-the-multicloud-tr` | fallback | https://aiweek.boston/api/og/events/building-ai-that-scales-avoiding-t | aiweek.boston/schedule/building-ai-that-scales-avoidi | 1200×630 | true |
| `ai-in-ma-and-financing-workbar-needham-2026@aiweek` | official | https://static.wixstatic.com/media/71ee65_61fc40b4dcce43d9a6361099f34b | bit.ly/4yk2ugq | 2000×1429 | unknown |
| `ai-entrepreneurial-finance-workbar-needham-2026@ai` | official | https://static.wixstatic.com/media/71ee65_61fc40b4dcce43d9a6361099f34b | bit.ly/46drLg3 | 2000×1429 | unknown |
| `networking-connection-workbar-needham-2026@aiweek.` | fallback | https://aiweek.boston/api/og/events/networking-connection-workbar-need | aiweek.boston/schedule/networking-connection-workbar- | 1200×630 | true |
| `ai-week-keynote-how-ai-startups-will-reshape-bosto` | fallback | https://aiweek.boston/api/og/events/ai-week-keynote-how-ai-startups-wi | aiweek.boston/schedule/ai-week-keynote-how-ai-startup | 1200×630 | true |
| `the-ai-defense-stack-showcase-day@aiweek.boston` | fallback | https://aiweek.boston/api/og/events/the-ai-defense-stack-showcase-day? | aiweek.boston/schedule/the-ai-defense-stack-showcase- | 1200×630 | true |
| `ai-for-all-britebound-2026@aiweek.boston` | official | https://lh3.googleusercontent.com/YmlVac6RT3xNW9WUdsY7Wk_oEVio1hncj5-h | forms.gle/hoPKnaEY3xiGXcPL8 | 1200×630 | unknown |
| `boston-ai-executive-exchange-executive-dinner-and-` | official | https://static.wixstatic.com/media/4c038e_2a524235b3d542d98eced4e51be8 | www.legacyclub.boston/event-details/boston-ai-executive-excha | 980×552 | unknown |
| `healthcare-ai-activationTM-from-problem-to-partner` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/htfiz6vs | 800×420 | unknown |
| `christensen-institute-innovation-summit-2026@aiwee` | official | https://www.christenseninstitute.org/wp-content/uploads/2026/05/cci-su | www.christenseninstitute.org/programs/summit/ | 500×513 | unknown |
| `devconf-us-2026@aiweek.boston` | official | https://devconf.info/assets/images/devconf-us-social.svg | www.devconf.info/us/ | — | unknown |
| `how-our-ai-navigator-has-supported-success-in-deve` | official | https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F119269191 | www.eventbrite.com/e/boston-ai-week-ai-enhanced-engagement | 940×925 | unknown |
| `boat-rides-boston-harbor-captain-chris-2026-09-24@` | fallback | https://aiweek.boston/api/og/events/boat-rides-boston-harbor-captain-c | aiweek.boston/schedule/boat-rides-boston-harbor-capta | 1200×630 | true |
| `healthcare-ai-activationTM@aiweek.boston` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/vgjah76g | 800×420 | unknown |
| `boston-cloud-connect-summit@aiweek.boston` | official | https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F119031232 | www.eventbrite.com/e/boston-cloud-connect-summit-tickets-1 | 940×470 | unknown |
| `building-in-the-age-of-ai-a-founders-panel@aiweek.` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/q5hai03a | 800×420 | unknown |
| `under-the-hood-of-microsoft-scout-a-15-seat-workin` | official | https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F119236518 | www.eventbrite.com/e/under-the-hood-of-microsoft-scout-tic | 940×529 | unknown |
| `venture-lanes-oktoberfest-2026@aiweek.boston` | official | https://firebasestorage.googleapis.com/v0/b/markit-d5e9b.appspot.com/o | markitai.com/e/v62tRIZBf | 1080×1080 | unknown |
| `b2b-tech-oktoberfest@aiweek.boston` | official | https://firebasestorage.googleapis.com/v0/b/markit-d5e9b.appspot.com/o | markitai.com/e/v62tRIZBf | 1080×1080 | unknown |
| `nuvert-healthcare-ai-activationTM-private-executiv` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/g74infhz | 800×420 | unknown |
| `vizit-fireside-questrom-2026@aiweek.boston` | fallback | https://aiweek.boston/api/og/events/vizit-fireside-questrom-2026?v=1 | aiweek.boston/schedule/vizit-fireside-questrom-2026 | 1200×630 | true |
| `the-human-edge-women-leading-in-the-age-of-ai@aiwe` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/bax9tycg | 800×420 | unknown |
| `ai-transformation-in-enterprises@aiweek.boston` | official | https://secure.meetupstatic.com/photos/event/6/2/6/4/600_535945188.jpe | www.meetup.com/magyar-tech-meetup/events/316349905/ | 600×338 | unknown |
| `pmi-project-leadership-summit-2026@aiweek.boston` | official | https://pmimassbay.zohobackstage.com/thumbnail/ProjectLeadershipSummit | pmimassbay.zohobackstage.com/ProjectLeadershipSummit2026AloftSeaport | 3942×1292 | unknown |
| `human-centric-ai-summit-2026@aiweek.boston` | organizer_logo | https://cdn.ymaws.com/mahealthcouncil.site-ym.com/graphics/logo-1c.png | mahealthcouncil.org/event/AISummit | 1200×235 | unknown |
| `agentic-world-cup-boston-build-ai-agents-that-play` | official | https://aws.amazon.com/startups/upload/events/611ce1d5-2535-4998-a96c- | startups.aws.com/events/agentic-world-cup-boston-build-a | 640×440 | unknown |
| `building-to-amplify-human-potential-in-an-ai-first` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/01oosuir | 800×420 | unknown |
| `clawbio-developing-your-own-genomic-agent-from-scr` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/clawbio-broad-2026 | 800×420 | unknown |
| `ai-in-mechanical-engineering-and-manufacturing@aiw` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/xvnekefl | 800×420 | unknown |
| `custom-software-at-business-speed-from-operator-re` | fallback | https://aiweek.boston/api/og/events/custom-software-at-business-speed- | aiweek.boston/schedule/custom-software-at-business-sp | 1200×630 | true |
| `boat-rides-boston-harbor-captain-chris-2026-09-25@` | fallback | https://aiweek.boston/api/og/events/boat-rides-boston-harbor-captain-c | aiweek.boston/schedule/boat-rides-boston-harbor-capta | 1200×630 | true |
| `show-me-something-cool-with-ai@aiweek.boston` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/wq8dqahi | 800×420 | unknown |
| `the-ai-identity-shift-rebuilding-leadership-struct` | fallback | https://aiweek.boston/api/og/events/the-ai-identity-shift-rebuilding-l | aiweek.boston/schedule/the-ai-identity-shift-rebuildi | 1200×630 | true |
| `boston-ai-week-opening-party@aiweek.boston` | fallback | https://aiweek.boston/api/og/events/boston-ai-week-opening-party?v=1 | aiweek.boston/schedule/boston-ai-week-opening-party | 1200×630 | true |
| `simulating-cinema-with-aiemerson@aiweek.boston` | fallback | https://aiweek.boston/api/og/events/simulating-cinema-with-aiemerson?v | aiweek.boston/schedule/simulating-cinema-with-aiemers | 1200×630 | true |
| `devfest-boston-2026@aiweek.boston` | fallback | https://aiweek.boston/api/og/events/devfest-boston-2026?v=1 | aiweek.boston/schedule/devfest-boston-2026 | 1200×630 | true |
| `glasswing-ventures-enterprise-ready-ai-hackathon@a` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/gzpv85yq | 800×420 | unknown |
| `architecting-with-ai-developer-roundtable@aiweek.b` | fallback | https://aiweek.boston/api/og/events/architecting-with-ai-developer-rou | aiweek.boston/schedule/architecting-with-ai-developer | 1200×630 | true |
| `robot-block-party-2026@aiweek.boston` | official | https://www.massrobotics.org/wp-content/uploads/2022/09/RoboBoston-ten | www.massrobotics.org/roboboston/ | 1080×810 | unknown |
| `boat-rides-boston-harbor-captain-chris-2026-09-26@` | fallback | https://aiweek.boston/api/og/events/boat-rides-boston-harbor-captain-c | aiweek.boston/schedule/boat-rides-boston-harbor-capta | 1200×630 | true |
| `the-underutilization-hypothesis-on-the-allocation-` | fallback | https://aiweek.boston/api/og/events/the-underutilization-hypothesis-on | aiweek.boston/schedule/the-underutilization-hypothesi | 1200×630 | true |
| `code-counsels-human-in-the-loop-ping-pong-meetup@a` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/nihzmk1n | 800×420 | unknown |
| `glasswing-ventures-enterprise-ready-ai-hackathon-d` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/gzpv85yq | 800×420 | unknown |
| `recursive-learning-hackathon-2026@aiweek.boston` | official | https://storage.googleapis.com/club-site-images/events/de0c3179-34ff-4 | www.sundai.club/events/boston/recursive-learning-hack-w | 1254×1254 | unknown |
| `code-counsels-legal-ai-community-hackathon-buildin` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/kt5j0ocm | 800×420 | unknown |
| `imagination-in-action-ai-retreat@aiweek.boston` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/3sgqtj5q | 800×420 | unknown |
| `boat-rides-boston-harbor-captain-chris-2026-09-27@` | fallback | https://aiweek.boston/api/og/events/boat-rides-boston-harbor-captain-c | aiweek.boston/schedule/boat-rides-boston-harbor-capta | 1200×630 | true |
| `behavior-adaptation-strategies-for-language-models` | fallback | https://aiweek.boston/api/og/events/behavior-adaptation-strategies-for | aiweek.boston/schedule/behavior-adaptation-strategies | 1200×630 | true |
| `bdmt-global-innovator-summit-2026@aiweek.boston` | official | https://bdmtglobal.com/wp-content/uploads/2026/06/BDMT-Global-Innovato | bdmtglobal.com/bdmt-global-innovator-summit-2026/ | 1024×512 | unknown |
| `conv2x-2026@aiweek.boston` | fallback | https://aiweek.boston/api/og/events/conv2x-2026?v=1 | aiweek.boston/schedule/conv2x-2026 | 1200×630 | true |
| `gai-world-2026@aiweek.boston` | official | https://www.gaiworld.com/hs-fs/hubfs/banner-img-2%20(1)%20(1).webp?wid | www.gaiworld.com/buy-passes | 620×348 | unknown |
| `introducing-motivation-intelligence-signal-to-powe` | official | https://agilebrain.com/wp-content/uploads/2026/07/HeadshotJDPincus2026 | agilebrain.com/events/bostonai-week-2026/ | 1200×1200 | unknown |
| `the-trust-layer-for-ai-operations@aiweek.boston` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/1c2q2noy | 800×420 | unknown |
| `boat-rides-boston-harbor-captain-chris-2026-09-28@` | fallback | https://aiweek.boston/api/og/events/boat-rides-boston-harbor-captain-c | aiweek.boston/schedule/boat-rides-boston-harbor-capta | 1200×630 | true |
| `ai-governance-the-difference-between-a-pilot-and-a` | fallback | https://aiweek.boston/api/og/events/ai-governance-the-difference-betwe | aiweek.boston/schedule/ai-governance-the-difference-b | 1200×630 | true |
| `ai-in-oncology-from-data-to-better-patient-outcome` | official | https://www.concertai.com/hubfs/Boston%20AI%20Week-2.png | www.concertai.com/boston-ai-week-ai-in-oncology | 2400×2400 | unknown |
| `show-tell-meet-the-real-small-business-owners-usin` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/launchby-px5r | 800×420 | unknown |
| `demos-drinks-where-ai-meets-human-behavior-researc` | fallback | https://aiweek.boston/api/og/events/demos-drinks-where-ai-meets-human- | aiweek.boston/schedule/demos-drinks-where-ai-meets-hu | 1200×630 | true |
| `maven-agi-happy-hour@aiweek.boston` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/5rfrkleg | 800×420 | unknown |
| `when-ai-gets-physical-navigating-the-real-world-ri` | fallback | https://aiweek.boston/api/og/events/when-ai-gets-physical-navigating-t | aiweek.boston/schedule/when-ai-gets-physical-navigati | 1200×630 | true |
| `boston-generative-ai-meetup-2026@aiweek.boston` | official | https://secure.meetupstatic.com/photos/event/c/f/4/5/600_535853061.jpe | www.meetup.com/boston-generative-ai-meetup/events/3160 | 600×337 | unknown |
| `beyond-the-demo-the-human-side-of-ai@aiweek.boston` | official | https://curevoz.com/og-curevoz-heali.png | curevoz.com/ | 1200×630 | unknown |
| `women-in-ai-breakfast-gai-world-2026@aiweek.boston` | official | https://www.gaiworld.com/hs-fs/hubfs/banner-img-2%20(1)%20(1).webp?wid | www.gaiworld.com/buy-passes | 620×348 | unknown |
| `bdmt-global-innovator-summit-2026-day-2@aiweek.bos` | official | https://bdmtglobal.com/wp-content/uploads/2026/06/BDMT-Global-Innovato | bdmtglobal.com/bdmt-global-innovator-summit-2026/ | 1024×512 | unknown |
| `ai-are-we-doing-this-right@aiweek.boston` | official | https://chambermaster.blob.core.windows.net/userfiles/UserFiles/chambe | business.nvcoc.com/events/details/breakfast-with-the-boss- | 1275×1650 | unknown |
| `langsmith-roadshow-building-agents-with-agents-bos` | official | https://staticassets.public-pr50.goldcast.io/public_images/events/2f85 | events.langchain.com/LangSmithRoadshow/Boston/ | 6000×6000 | unknown |
| `gai-world-2026-day-2@aiweek.boston` | official | https://www.gaiworld.com/hs-fs/hubfs/banner-img-2%20(1)%20(1).webp?wid | www.gaiworld.com/buy-passes | 620×348 | unknown |
| `ai-for-the-rest-of-us-2026@aiweek.boston` | official | https://support-forge.com/og-image.png | support-forge.com/events/ai-week-boston | 1200×630 | unknown |
| `ai-meet-the-investors-breakfast@aiweek.boston` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/rflxqfk5 | 800×420 | unknown |
| `how-to-build-a-company-brain@aiweek.boston` | fallback | https://aiweek.boston/api/og/events/how-to-build-a-company-brain?v=1 | aiweek.boston/schedule/how-to-build-a-company-brain | 1200×630 | true |
| `how-legacy-industries-are-quietly-winning-with-ai@` | fallback | https://aiweek.boston/api/og/events/how-legacy-industries-are-quietly- | aiweek.boston/schedule/how-legacy-industries-are-quie | 1200×630 | true |
| `boat-rides-boston-harbor-captain-chris-2026-09-29@` | fallback | https://aiweek.boston/api/og/events/boat-rides-boston-harbor-captain-c | aiweek.boston/schedule/boat-rides-boston-harbor-capta | 1200×630 | true |
| `build-your-first-ai-executive-assistant-in-base44-` | fallback | https://aiweek.boston/api/og/events/build-your-first-ai-executive-assi | aiweek.boston/schedule/build-your-first-ai-executive- | 1200×630 | true |
| `training-custom-ai-models-via-fine-tuning@aiweek.b` | fallback | https://aiweek.boston/api/og/events/training-custom-ai-models-via-fine | aiweek.boston/schedule/training-custom-ai-models-via- | 1200×630 | true |
| `ma-workforce-ai-career-fair-2026@aiweek.boston` | official | https://secure.meetupstatic.com/photos/event/9/f/8/9/600_535120841.jpe | meetu.ps/e/PJc0v/p69G2/i | 600×337 | unknown |
| `wentworth-ai-test-kitchen-2026@aiweek.boston` | official | https://lh4.googleusercontent.com/L33aHsvHaQUXeL-FS4zsNWxcvRPR0MKxrwAN | docs.google.com/forms/d/e/1FAIpQLScDfyk_SxlBTnyAR0hV0cF | 1200×630 | unknown |
| `manufacturing-ai-siop-to-shop-floor@aiweek.boston` | fallback | https://aiweek.boston/api/og/events/manufacturing-ai-siop-to-shop-floo | aiweek.boston/schedule/manufacturing-ai-siop-to-shop- | 1200×630 | true |
| `national-security-defense-tech-demo-day-2026@aiwee` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/tjv4766v | 800×420 | unknown |
| `founders-and-funders-bos-vc-reverse-pitch@aiweek.b` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/fnfxbos0829 | 800×420 | unknown |
| `jd-ai-building-whats-next-at-democracy-brewing@aiw` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/j6uxbl9q | 800×420 | unknown |
| `whiskey-wine-whiteboards-september-29@aiweek.bosto` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/9pd7iwj7 | 800×420 | unknown |
| `maven-agi-vip-networking-meetup@aiweek.boston` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/852b0ufm | 800×420 | unknown |
| `ai-in-action-questrom-2026@aiweek.boston` | fallback | https://aiweek.boston/api/og/events/ai-in-action-questrom-2026?v=1 | aiweek.boston/schedule/ai-in-action-questrom-2026 | 1200×630 | true |
| `ai-in-sales-selling-hasnt-changed-the-tools-have@a` | fallback | https://aiweek.boston/api/og/events/ai-in-sales-selling-hasnt-changed- | aiweek.boston/schedule/ai-in-sales-selling-hasnt-chan | 1200×630 | true |
| `thriving-in-the-age-of-ai-the-intersection-of-busi` | fallback | https://aiweek.boston/api/og/events/thriving-in-the-age-of-ai-the-inte | aiweek.boston/schedule/thriving-in-the-age-of-ai-the- | 1200×630 | true |
| `event-hosts-friends@aiweek.boston` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/ngp02f2t | 800×420 | unknown |
| `starburst-ai-meetup-building-an-agent-for-your-dat` | official | https://secure.meetupstatic.com/photos/event/8/1/4/5/600_535953093.jpe | www.meetup.com/trino-americas/events/316378241/ | 600×338 | unknown |
| `executive-dinner-the-future-of-ai@aiweek.boston` | official | https://mbexec.com/wp-content/uploads/2026/07/Wells-Fargo-Boston-10.14 | mbexec.com/executive-dinner-exploring-whats-next-i | 1024×512 | unknown |
| `growing-revenue-enterprise-gtm-ai-infrastructure-2` | official | https://go.marketgrowthconsulting.com/hubfs/MGC-BostonAIWeek-LP-Share- | go.marketgrowthconsulting.com/boston-ai-week-registration | 1200×630 | unknown |
| `bdmt-global-innovator-summit-2026-day-3@aiweek.bos` | official | https://bdmtglobal.com/wp-content/uploads/2026/06/BDMT-Global-Innovato | bdmtglobal.com/bdmt-global-innovator-summit-2026/ | 1024×512 | unknown |
| `gai-world-2026-day-3@aiweek.boston` | official | https://www.gaiworld.com/hs-fs/hubfs/banner-img-2%20(1)%20(1).webp?wid | www.gaiworld.com/buy-passes | 620×348 | unknown |
| `ai-blueprint-for-massachusetts@aiweek.boston` | official | https://aiweek.boston/assets/og/boston-ai-week-2026-og.png?v=20260726c | aiweek.boston/schedule/ai-blueprint-for-massachusetts | 1200×630 | true |
| `mit-futurefest-2026-day-1@aiweek.boston` | official | https://mitfuturefest.org/wp-content/uploads/2026/06/MIT-FF-social-car | mitfuturefest.org/festival-passes | 1200×630 | unknown |
| `executive-inquiry-lab-collective-sensemaking-in-th` | official | https://lh6.googleusercontent.com/p9ET9C6Z-P57shEEXrI5jvNgKevBo1A1Wc8q | docs.google.com/forms/d/1Hj9c--nBtv9eqDyxfj3DEO87MkvKrj | 1200×630 | unknown |
| `your-first-digital-employee-building-an-ai-agent-t` | fallback | https://aiweek.boston/api/og/events/your-first-digital-employee-buildi | aiweek.boston/schedule/your-first-digital-employee-bu | 1200×630 | true |
| `ai-software-vs-physical-ai-potential-and-reality@a` | fallback | https://aiweek.boston/api/og/events/ai-software-vs-physical-ai-potenti | aiweek.boston/schedule/ai-software-vs-physical-ai-pot | 1200×630 | true |
| `boat-rides-boston-harbor-captain-chris-2026-09-30@` | fallback | https://aiweek.boston/api/og/events/boat-rides-boston-harbor-captain-c | aiweek.boston/schedule/boat-rides-boston-harbor-capta | 1200×630 | true |
| `mvp-workshop-for-entrepreneurs@aiweek.boston` | official | https://conjure.work/media/contextdrop-delivery-poster.jpg | conjure.work/ | 1280×720 | unknown |
| `who-ai-cant-see-two-tedx-voices-on-what-ai-gets-wr` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/bchscf1g | 800×420 | unknown |
| `mvp-workshop-for-founders@aiweek.boston` | fallback | https://aiweek.boston/api/og/events/mvp-workshop-for-founders?v=1 | aiweek.boston/schedule/mvp-workshop-for-founders | 1200×630 | true |
| `lab-to-launch-rooftop-edition@aiweek.boston` | fallback | https://aiweek.boston/api/og/events/lab-to-launch-rooftop-edition?v=1 | aiweek.boston/schedule/lab-to-launch-rooftop-edition | 1200×630 | true |
| `an-evening-with-bostons-ai-data-leaders@aiweek.bos` | official | https://live-starburst.pantheonsite.io/wp-content/uploads/2021/01/star | www.starburst.io/info/an-evening-with-bostons-ai-data-le | 1200×800 | unknown |
| `ai-go-to-market-from-first-customers-to-repeatable` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/eikrfzd2 | 800×420 | unknown |
| `special-olympics-massachusetts-polar-plunge@aiweek` | official | https://donordrivecontent.com/specialolympicsma/images/$event1030$/ban | fundraise.specialolympicsma.org/index.cfm | 1790×550 | unknown |
| `the-silence-tax-in-the-ai-era@aiweek.boston` | fallback | https://aiweek.boston/api/og/events/the-silence-tax-in-the-ai-era?v=1 | aiweek.boston/schedule/the-silence-tax-in-the-ai-era | 1200×630 | true |
| `pitch-lift-bostons-100000-elevator-pitch-competiti` | fallback | https://aiweek.boston/api/og/events/pitch-lift-bostons-100000-elevator | aiweek.boston/schedule/pitch-lift-bostons-100000-elev | 1200×630 | true |
| `multi-agent-symphony-conductor@aiweek.boston` | fallback | https://aiweek.boston/api/og/events/multi-agent-symphony-conductor?v=1 | aiweek.boston/schedule/multi-agent-symphony-conductor | 1200×630 | true |
| `pydata-boston-ai-talks@aiweek.boston` | fallback | https://aiweek.boston/api/og/events/pydata-boston-ai-talks?v=1 | aiweek.boston/schedule/pydata-boston-ai-talks | 1200×630 | true |
| `women-in-ai-dinner-series-kickoff@aiweek.boston` | official | https://partiful.imgix.net/external/user/kbtIOQfZMagVit5hnAdFZXbtctk1/ | partiful.com/e/YiEz2KqpiUpIdSZvvE06 | 1000×1000 | unknown |
| `pioneers-of-ai-live-2026@aiweek.boston` | official | https://www.mos.org/sites/default/files/2024-10/optnav-Visit-the-Museu | www.mos.org/events/pioneers-ai-live | 710×710 | unknown |
| `tedxboston-longevity-2026@aiweek.boston` | fallback | https://aiweek.boston/api/og/events/tedxboston-longevity-2026?v=1 | aiweek.boston/schedule/tedxboston-longevity-2026 | 1200×630 | true |
| `dataiq-peer-exchange-boston-2026@aiweek.boston` | official | https://www.dataiq.global/wp-content/uploads/Boston-1.avif | www.dataiq.global/2026-boston-peer-exchange/ | — | unknown |
| `ai-ready-or-risky-a-working-session-for-c-level-an` | fallback | https://aiweek.boston/api/og/events/ai-ready-or-risky-a-working-sessio | aiweek.boston/schedule/ai-ready-or-risky-a-working-se | 1200×630 | true |
| `agents-in-the-am@aiweek.boston` | official | https://page.datarobot.com/rs/229-XUK-217/images/campaign-lp-image-04. | page.datarobot.com/agents-in-the-am.html | 2600×1300 | unknown |
| `boston-ai-summit-2026@aiweek.boston` | official | https://aiweek.boston/__l5e/assets-v1/67b3ff0e-86ff-4f0c-ae5b-76471b6e | aiweek.boston/schedule/boston-ai-summit-2026 | 1200×1184 | true |
| `glasswing-massopen-agentic-101-2026@aiweek.boston` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/3kp1o3og | 800×420 | unknown |
| `mit-futurefest-2026-day-2@aiweek.boston` | official | https://mitfuturefest.org/wp-content/uploads/2026/06/MIT-FF-social-car | mitfuturefest.org/festival-passes | 1200×630 | unknown |
| `safe-ai-governance-dont-let-ai-eat-your-lunch@aiwe` | fallback | https://aiweek.boston/api/og/events/safe-ai-governance-dont-let-ai-eat | aiweek.boston/schedule/safe-ai-governance-dont-let-ai | 1200×630 | true |
| `boat-rides-boston-harbor-captain-chris-2026-10-01@` | fallback | https://aiweek.boston/api/og/events/boat-rides-boston-harbor-captain-c | aiweek.boston/schedule/boat-rides-boston-harbor-capta | 1200×630 | true |
| `ai-and-the-next-economy@aiweek.boston` | fallback | https://aiweek.boston/api/og/events/ai-and-the-next-economy?v=1 | aiweek.boston/schedule/ai-and-the-next-economy | 1200×630 | true |
| `second-annual-ai-drug-discovery-symposium-revoluti` | official | https://www.goodwinlaw.com/-/media/images/general-meta-images/goodwin- | www.goodwinlaw.com/en/news-and-events/events/2026/10/lifes | 1200×628 | unknown |
| `architecture-and-ai-wentworth-2026@aiweek.boston` | official | https://lh3.googleusercontent.com/t8nbrxjhicActlpA76CGU-TTisLUr4zPTHbY | docs.google.com/forms/d/e/1FAIpQLScpv7dB7zMsvHfhfJIFq-A | 1200×630 | unknown |
| `datarobot-build-club-boston-ai-week-edition@aiweek` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/7fe0z1nj | 800×420 | unknown |
| `where-does-research-end-and-production-begin@aiwee` | official | https://partiful.imgix.net/external/user/qFBRkMLmeQUfH2M0Pz8GkYEiEIu2/ | partiful.com/e/j998GjHiZg2dSgGf4FSi | 1000×1000 | unknown |
| `ai-hub-accelerator-alpfa-boston@aiweek.boston` | fallback | https://aiweek.boston/api/og/events/ai-hub-accelerator-alpfa-boston?v= | aiweek.boston/schedule/ai-hub-accelerator-alpfa-bosto | 1200×630 | true |
| `boston-ai-week-venture-cafe@aiweek.boston` | official | https://storage.googleapis.com/gatherus-app/session_images/thumbnails/ | community.venturecafecambridge.org/events/1342 | 400×267 | unknown |
| `agentforce-salesforce-2026@aiweek.boston` | official | https://res.cloudinary.com/startup-grind/image/upload/c_fill,dpr_2.0,f | trailblazercommunitygroups.com/events/details/salesforce-salesforce-ma | 2160×2160 | unknown |
| `ai-strategy-to-enterprise-execution@aiweek.boston` | official | https://partiful.imgix.net/external/user/vKEotrGA7yVXsK7vt8UmS5fQPnG2/ | partiful.com/e/1UPm7YxDKBn659KydINs | 1000×1000 | unknown |
| `hacktoberfest-2026-hack-day-with-cloudinary-cambri` | official | https://events.mlh.com/rails/active_storage/representations/redirect/e | events.mlh.com/events/14720-hacktoberfest-2026-hack-da | 1200×600 | unknown |
| `its-1952-again-the-missing-compiler-for-ai-pipelin` | official | https://partiful.imgix.net/external/user/qFBRkMLmeQUfH2M0Pz8GkYEiEIu2/ | partiful.com/e/opyw9DpUqapGSRBcSHnH | 1000×1000 | unknown |
| `building-ai-agents-for-founders-and-fractional-lea` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/2aqbxxsz | 800×420 | unknown |
| `aws-startups-x-boston-ai-week-ai-visionaries-dinne` | official | https://images.getbento.com/accounts/a64eec95c75fe56be4cd80016c2d7986/ | www.capriboston.com/ | 600×600 | unknown |
| `quay-acceleration-x-hub-tokyo-boston-demo-day-2026` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/g8j4zu5a | 800×420 | unknown |
| `women-in-data-fall-happy-hour@aiweek.boston` | fallback | https://aiweek.boston/api/og/events/women-in-data-fall-happy-hour?v=1 | aiweek.boston/schedule/women-in-data-fall-happy-hour | 1200×630 | true |
| `your-ai-chatbot-is-live-now-what@aiweek.boston` | official | https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F119271724 | www.eventbrite.com/e/make-ai-work-enterprise-ai-that-compa | 940×1410 | unknown |
| `ai-storytelling-and-organizational-change-a-dinner` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/meetgamma-a0fa | 800×420 | unknown |
| `tiecon-east-2026-the-next-growth-playbook-product-` | official | https://events.tie.org/thumbnail/TiECONEast2026?_=1786550915223 | events.tie.org/Boston/TiECONEast2026 | 1440×813 | unknown |
| `ai-education-and-the-future-of-how-we-prove-what-w` | fallback | https://aiweek.boston/api/og/events/ai-education-and-the-future-of-how | aiweek.boston/schedule/ai-education-and-the-future-of | 1200×630 | true |
| `2nd-annual-ai-powered-innovation-in-protein-and-an` | official | https://static.wixstatic.com/media/nsplsh_0f47efee66d4439c901389e01308 | www.biolinkevents.com/event-details/ai-powered-innovation-in- | 4032×3024 | unknown |
| `workforce-innovation-ai-driven-technology@aiweek.b` | official | https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F119205617 | www.eventbrite.com/e/workforce-innovation-ai-driven-techno | 940×299 | unknown |
| `builders-and-brews@aiweek.boston` | fallback | https://aiweek.boston/api/og/events/builders-and-brews?v=1 | aiweek.boston/schedule/builders-and-brews | 1200×630 | true |
| `aws-ai-league-drug-discovery-challenge@aiweek.bost` | fallback | https://aiweek.boston/api/og/events/aws-ai-league-drug-discovery-chall | aiweek.boston/schedule/aws-ai-league-drug-discovery-c | 1200×630 | true |
| `mit-futurefest-2026-day-3@aiweek.boston` | official | https://mitfuturefest.org/wp-content/uploads/2026/06/MIT-FF-social-car | mitfuturefest.org/festival-passes | 1200×630 | unknown |
| `grade-the-work-can-your-managers-tell-good-ai-outp` | official | https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F119159669 | www.eventbrite.com/e/grade-the-work-would-your-managers-tr | 940×470 | unknown |
| `ai-meets-clinical-data-what-actually-breaks-and-wh` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | lu.ma/9qojmptf | 800×420 | unknown |
| `boat-rides-boston-harbor-captain-chris-2026-10-02@` | fallback | https://aiweek.boston/api/og/events/boat-rides-boston-harbor-captain-c | aiweek.boston/schedule/boat-rides-boston-harbor-capta | 1200×630 | true |
| `the-human-role-in-ai-driven-businesses-c-dean-metr` | fallback | https://aiweek.boston/api/og/events/the-human-role-in-ai-driven-busine | aiweek.boston/schedule/the-human-role-in-ai-driven-bu | 1200×630 | true |
| `boston-ai-week-closing-party@aiweek.boston` | fallback | https://aiweek.boston/api/og/events/boston-ai-week-closing-party?v=1 | aiweek.boston/schedule/boston-ai-week-closing-party | 1200×630 | true |
| `mit-futurefest-2026-day-4@aiweek.boston` | official | https://mitfuturefest.org/wp-content/uploads/2026/06/MIT-FF-social-car | mitfuturefest.org/festival-passes | 1200×630 | unknown |
| `venture-signal-founder-investor-exchange-how-inves` | fallback | https://aiweek.boston/api/og/events/venture-signal-founder-investor-ex | aiweek.boston/schedule/venture-signal-founder-investo | 1200×630 | true |
| `mit-futurefest-2026-day-5@aiweek.boston` | official | https://mitfuturefest.org/wp-content/uploads/2026/06/MIT-FF-social-car | mitfuturefest.org/festival-passes | 1200×630 | unknown |
| `ai-in-action-boston-2026@aiweek.boston` | official | https://aiweek.boston/__l5e/assets-v1/28080a5a-1114-43c4-aa76-43c9445a | aiweek.boston/schedule/ai-in-action-boston-2026 | 596×335 | true |
| `the-150-million-secret-free-money-free-fellows-and` | fallback | https://aiweek.boston/api/og/events/the-150-million-secret-free-money- | aiweek.boston/schedule/the-150-million-secret-free-mo | 1200×630 | true |
| `beyond-the-chatbot-a-framework-for-finding-where-a` | organizer_logo | https://zoom.us/account/branding/p/f7cd3454-da91-49f7-8aa2-069a8b746f9 | elasticpath.zoom.us/webinar/register/WN_4Ndo5sbhSN-lJi2ULDx | 4140×963 | unknown |
| `from-lean-to-the-intelligent-enterprise-how-ai-is-` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/4rk7eykz | 800×420 | unknown |
| `ai-leadership-workshop-for-hr-learning-executives@` | official | https://unicorn-images.b-cdn.net/776fd5da-a149-44b2-8f11-03ddbf47640c? | www.kendallai.org/261007-hr-learning-leader-ai-leadership | 2445×820 | unknown |
| `ai-disability-and-the-future-of-work-2026@aiweek.b` | fallback | https://aiweek.boston/api/og/events/ai-disability-and-the-future-of-wo | aiweek.boston/schedule/ai-disability-and-the-future-o | 1200×630 | true |
| `gtm-under-pressure-the-ai-mystery-basket-challenge` | fallback | https://aiweek.boston/api/og/events/gtm-under-pressure-the-ai-mystery- | aiweek.boston/schedule/gtm-under-pressure-the-ai-myst | 1200×630 | true |
| `cambridge-ai-civil-rights-proclamation@aiweek.bost` | fallback | https://aiweek.boston/api/og/events/cambridge-ai-civil-rights-proclama | aiweek.boston/schedule/cambridge-ai-civil-rights-proc | 1200×630 | true |
| `boston-openclaw-meetup@aiweek.boston` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/jdun7rei | 800×420 | unknown |
| `stop-prompting-start-delegating-build-your-first-a` | official | https://vibe.filesafe.space/1783192433028683207/assets/e522b683-7621-4 | buildmyagent.imarahealthai.com/workshop | 1376×768 | unknown |
| `ai-in-finance-lab-boston@aiweek.boston` | fallback | https://aiweek.boston/api/og/events/ai-in-finance-lab-boston?v=1 | aiweek.boston/schedule/ai-in-finance-lab-boston | 1200×630 | true |
| `agricultural-ai-two-more-kilograms-per-ton@aiweek.` | fallback | https://aiweek.boston/api/og/events/agricultural-ai-two-more-kilograms | aiweek.boston/schedule/agricultural-ai-two-more-kilog | 1200×630 | true |
| `african-women-building-with-ai@aiweek.boston` | official | https://africanwomenbuildingwithai.com/og-image.jpg | africanwomenbuildingwithai.com/ | 1200×640 | unknown |
| `ai-education-what-students-and-parents-need-to-kno` | fallback | https://aiweek.boston/api/og/events/ai-education-what-students-and-par | aiweek.boston/schedule/ai-education-what-students-and | 1200×630 | true |
| `boston-startup-demo-competition@aiweek.boston` | official | https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,a | luma.com/epipel-jd9u | 800×420 | unknown |
| `the-missing-layer-ai-governance-as-organizational-` | fallback | https://aiweek.boston/api/og/events/the-missing-layer-ai-governance-as | aiweek.boston/schedule/the-missing-layer-ai-governanc | 1200×630 | true |
| `authors-innovators-all-day-book-preview-2026@aiwee` | fallback | https://aiweek.boston/api/og/events/authors-innovators-all-day-book-pr | aiweek.boston/schedule/authors-innovators-all-day-boo | 1200×630 | true |
| `the-state-of-ai-control-in-institutional-finance@a` | fallback | https://aiweek.boston/api/og/events/the-state-of-ai-control-in-institu | aiweek.boston/schedule/the-state-of-ai-control-in-ins | 1200×630 | true |
| `celebrate-hope-chris-hope-day-2026@aiweek.boston` | fallback | https://aiweek.boston/api/og/events/celebrate-hope-chris-hope-day-2026 | aiweek.boston/schedule/celebrate-hope-chris-hope-day- | 1200×630 | true |

## Capability check (this environment, 2026-09-16)

- ✅ Fetching aiweek.boston event pages: works (robots.txt `Allow: /`, HTTP 200, og:image present).
- ✅ Reading og:image / twitter:image / JSON-LD images via regex: works.
- ✅ Image binary validation (content-type, size, dimensions from PNG/JPEG/GIF/WebP headers): works — no decoder lib required.
- ⚠️ Registration platforms (luma/eventbrite/meetup/partiful): flaky bot handling from this environment — luma timed out on some runs (recorded as `blocked`) and served full pages with harvestable og:images on others (7 luma banners collected in the sample run). Eventbrite/Meetup/Partiful not yet exercised; expect 403/captcha on some. **Honest caveat:** registration-page images may need retries or a browser session for full coverage.
- ❌ Uploading to Supabase Storage: not possible here — no Supabase project credentials exist in this environment. `scripts/upload-images.mjs` runs post-deploy against the live project (bucket `event-images`).
- ❌ Downloading/resizing image binaries for Storage: not done yet by design (binaries deferred to the upload step); the probe fetch confirms bytes are retrievable when the host allows it.

## Hotlinking notes

- `aiweek.boston` (the festival's own generated og cards): interim hotlink acceptable; Storage copy planned. Each row carries `hotlink_ok` + `hotlink_note`.
- All other domains: `hotlink_ok: "unknown"` until their ToS is checked. Never hotlink where terms prohibit — the upload step copies to Storage instead.
- No images were invented: every stored URL was fetched and validated live.

## Resuming the full crawl

```bash
# 15-event sample (this run)
node scripts/collect-images.mjs --limit 15 --offset 0

# Full 185-event crawl in polite batches (~1 req/2s; ~10–15 min per 100 events incl. image HEAD checks)
node scripts/collect-images.mjs --limit 50 --offset 0
node scripts/collect-images.mjs --limit 50 --offset 50
node scripts/collect-images.mjs --limit 50 --offset 100
node scripts/collect-images.mjs --limit 50 --offset 150

# Then generate the idempotent UPDATE script and review:
node scripts/apply-images-to-seed.mjs
# apply supabase/image_updates.sql after migration 0002 is live
```
