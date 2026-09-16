// scripts/build-seed.mjs
//
// Generates supabase/seed.sql from the enriched events JSON.
//
//   node scripts/build-seed.mjs
//
// Reads:   workspace/aiweek_events_enriched.json   (185 records)
// Writes:  supabase/seed.sql
//          INSERT INTO events (...) VALUES (...) ON CONFLICT (id) DO NOTHING;
//
// Mapping:
//   id                     <- uid (stable internal event ID)
//   title, official_url    <- title, url
//   registration_url       <- register_url
//   registration_is_direct <- register_url present AND NOT containing "aiweek.boston"
//   start_at / end_at      <- "YYYYMMDDTHHMMSS" (or "YYYYMMDD") parsed as
//                             America/New_York wall time. All events fall within
//                             Aug-Oct 2026 (EDT, UTC-04:00).
//   venue / address        <- location_venue / location_address
//   city                   <- derived from location_address/location via a
//                             Greater-Boston city list + ", MA" regex fallback;
//                             "Virtual" for online-only events, NULL otherwise
//   event_type / hosted_by <- event_type / hosted_by
//   speakers               <- JSON array of {name, bio} -> jsonb
//   description / about    <- description / about
//   source_urls            <- ARRAY[official_url]
//   last_verified_at       <- now() at seed-apply time
//   display_title / summary / neighborhood stay NULL for later enrichment.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "..", "aiweek_events_enriched.json"); // ~/workspace/aiweek_events_enriched.json
const OUT = join(ROOT, "supabase", "seed.sql");

const raw = readFileSync(SRC, "utf8");
const events = JSON.parse(raw);

// --- SQL escaping ------------------------------------------------------------
const q = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);

// --- datetime: "20260824T180000" | "20261028" -> timestamptz literal ------------
// All events are Aug-Oct 2026, which is EDT (UTC-04:00) in America/New_York.
function toTimestamptz(s) {
  if (!s) return "NULL";
  const m = String(s).match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?$/);
  if (!m) throw new Error(`Unparseable datetime: ${s}`);
  const [, Y, Mo, D, H = "00", Mi = "00", S = "00"] = m;
  return `'${Y}-${Mo}-${D}T${H}:${Mi}:${S}-04:00'::timestamptz`;
}

// --- city derivation ----------------------------------------------------------
const CITIES = [
  "boston", "cambridge", "somerville", "brookline", "watertown", "newton",
  "waltham", "burlington", "quincy", "medford", "malden", "revere", "chelsea",
  "everett", "arlington", "lexington", "needham", "dedham", "woburn",
  "framingham", "natick", "worcester", "lowell", "lynn", "salem", "lawrence",
  "haverhill", "plymouth", "taunton", "beverly", "peabody", "danvers",
  "wakefield", "reading", "stoneham", "melrose", "saugus", "winthrop",
  "belmont", "concord", "acton", "bedford", "winchester", "billerica",
  "chelmsford", "tewksbury", "andover", "amesbury", "newburyport", "ipswich",
  "gloucester", "marblehead", "swampscott", "nahant", "allston", "brighton",
  "charlestown", "dorchester", "roxbury", "jamaica plain", "south boston",
  "east boston", "beacon hill", "north end", "fenway", "kenmore", "seaport",
  "kendall square", "harvard square", "central square", "porter square",
  "davis square", "union square", "assembly row",
];
// Boston neighborhoods that should normalize to "Boston".
const NEIGHBORHOODS = new Set([
  "allston", "brighton", "charlestown", "dorchester", "roxbury",
  "jamaica plain", "south boston", "east boston", "beacon hill",
  "north end", "fenway", "kenmore", "seaport",
]);
const titleCase = (s) => s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1));

function deriveCity(e) {
  const hay = `${e.location_address || ""} ${e.location || ""}`;
  const low = hay.toLowerCase();
  if (/virtual|online|zoom\.us|remote\b/.test(low)) return "Virtual";
  for (const c of CITIES) {
    if (low.includes(c)) return NEIGHBORHOODS.has(c) ? "Boston" : titleCase(c);
  }
  const m = hay.match(/([A-Za-z][A-Za-z .'\-]+?),\s*MA\b/);
  return m ? titleCase(m[1].trim()) : null;
}

// --- uniqueness check on uid ---------------------------------------------------
const ids = events.map((e) => e.uid);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupes.length) {
  console.error(`FATAL: duplicate uids found: ${[...new Set(dupes)].join(", ")}`);
  process.exit(1);
}

// --- build INSERT --------------------------------------------------------------
const COLS = [
  "id", "title", "official_url", "registration_url", "registration_is_direct",
  "start_at", "end_at", "venue", "address", "city", "event_type", "hosted_by",
  "speakers", "description", "about", "source_urls", "last_verified_at",
];

let nDirect = 0, nFallback = 0, nMissingCity = 0, nMissingMaps = 0;

const rows = events.map((e) => {
  const reg = e.register_url || null;
  const isDirect = reg !== null && !reg.includes("aiweek.boston");
  if (isDirect) nDirect++;
  else if (reg !== null) nFallback++;

  const city = deriveCity(e);
  if (!city) nMissingCity++;
  if (!e.maps_url) nMissingMaps++;

  const vals = [
    q(e.uid),
    q(e.title),
    q(e.url),
    q(reg),
    isDirect ? "TRUE" : "FALSE",
    toTimestamptz(e.start),
    toTimestamptz(e.end),
    q(e.location_venue || null),
    q(e.location_address || null),
    q(city),
    q(e.event_type || null),
    q(e.hosted_by || null),
    `${q(JSON.stringify(e.speakers || []))}::jsonb`,
    q(e.description || null),
    q(e.about || null),
    `ARRAY[${q(e.url)}]::text[]`,
    "now()",
  ];
  return `  (${vals.join(", ")})`;
});

const sql = `-- ============================================================================
-- Boston AI Week community app — event seed
-- Generated by scripts/build-seed.mjs from workspace/aiweek_events_enriched.json
-- Idempotent: INSERT ... ON CONFLICT (id) DO NOTHING
-- ============================================================================

INSERT INTO public.events (${COLS.join(", ")})
VALUES
${rows.join(",\n")}
ON CONFLICT (id) DO NOTHING;
`;

writeFileSync(OUT, sql);

// --- verification summary -------------------------------------------------------
console.log("== seed build summary ==");
console.log(`total events            : ${events.length}`);
console.log(`unique uids             : ${new Set(ids).size} (checked, no duplicates)`);
console.log(`direct registration     : ${nDirect}`);
console.log(`fallback (aiweek.boston): ${nFallback}`);
console.log(`missing city            : ${nMissingCity}`);
console.log(`missing maps_url        : ${nMissingMaps}`);
console.log(`wrote                   : ${OUT}`);
