# Map coordinates — September 16, 2026

The supplied 185-event handoff had empty coordinates. The map renderer already supported clusters, but had no pins to render.

The app joins a checked-in coordinate supplement to the public catalog and detail APIs. The user-approved migration and guarded coordinate UPDATE file are prepared locally but have NOT been applied to live Supabase. No live database or credentials were modified. Database coordinates take precedence when present. Supplementary coordinates only apply while event ID, address, venue, and city still match; changing a venue invalidates the old supplement pin. Database coordinates must be maintained when venues change.

Source: US Census Geocoder batch address service, benchmark 4 (Public_AR_Current), queried September 16, 2026. Only Exact matches were accepted. These are street-range interpolated address locations, not verified building entrances. Each record preserves its source and matched address.

Documentation: https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html

Against the downloaded 185-event catalog: 128 coordinate records, 127 mapped events. One record has a conflicting Virtual city classification and is deliberately excluded by the map. The user's pass-two file contained 25 updates: 7 overlapped existing records, so 18 new records were added. A third pass recovered 6 more events: four corrected exact Census matches and two identical venues already mapped elsewhere in the catalog. Two user-supplied district-level pins are explicitly labeled approximate; campus and pier points are venue-level, not confirmed entrances. All 185 events remain available to the matching list before filters. Unmatched and virtual locations have no invented pins. See unmapped-events.md for remaining records.

New events still load through cursor pagination but need database coordinates or a newly verified supplement to appear on the map. This file is not an automatic geocoding service. Obtain exact public street addresses or verified venue points for unresolved events; do not silently substitute city centers. Resolve conflicting virtual classifications before pinning those events.

Verification: `node scripts/test-event-coordinates.cjs`, `npm run typecheck`, `npm run build`. Browser interaction and the resulting Vercel deployment still require verification; a successful build alone is not a live deployment.
