#!/usr/bin/env node
/*
 * apply-images-to-seed.mjs — Boston AI Week event images -> SQL UPDATEs
 *
 * Reads image-report/images.json (the collector's provenance record) and
 * generates supabase/image_updates.sql: one idempotent
 *   UPDATE public.events SET <image columns> WHERE id = '<uid>';
 * per event.
 *
 * Plain UPDATEs are idempotent by construction — re-running the script or
 * re-applying the SQL converges to the same state. Events with no image keep
 * image_kind='none' (frontend renders the branded CSS fallback tile).
 *
 * Run AFTER supabase/migrations/0002_event_images.sql is applied:
 *   node scripts/apply-images-to-seed.mjs
 *   # then: supabase db push (migration) + psql/supabase SQL editor for image_updates.sql
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, "..");
const IMAGES_JSON = path.join(APP_ROOT, "image-report", "images.json");
const OUT_SQL = path.join(APP_ROOT, "supabase", "image_updates.sql");

const lit = (v) =>
  v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;

function main() {
  if (!fs.existsSync(IMAGES_JSON)) {
    console.error(`[apply] ${IMAGES_JSON} not found — run scripts/collect-images.mjs first.`);
    process.exit(2);
  }
  const doc = JSON.parse(fs.readFileSync(IMAGES_JSON, "utf8"));
  const L = [];
  L.push("-- ============================================================================");
  L.push("-- Boston AI Week — event image updates");
  L.push(`-- Generated ${new Date().toISOString()} by scripts/apply-images-to-seed.mjs`);
  L.push("-- from image-report/images.json. Idempotent: plain UPDATEs, safe to re-apply.");
  L.push("-- Requires migration 0002_event_images.sql to be applied first.");
  L.push("-- ============================================================================");
  L.push("");

  let withImage = 0, none = 0;
  for (const e of doc.events) {
    const d = e.decision || {};
    const kind = d.image_kind || "none";
    if (kind === "none") {
      L.push(`UPDATE public.events SET image_kind = 'none', image_url = NULL, image_source_url = NULL, image_original_url = NULL, image_attribution = NULL, image_verified_at = ${lit(d.image_verified_at)}, image_width = NULL, image_height = NULL WHERE id = ${lit(e.uid)};`);
      none++;
    } else {
      L.push(
        `UPDATE public.events SET image_url = ${lit(d.image_url)}, image_source_url = ${lit(d.image_source_url)}, image_original_url = ${lit(d.image_original_url)}, image_attribution = ${lit(d.image_attribution)}, image_kind = ${lit(kind)}, image_verified_at = ${lit(d.image_verified_at)}, image_width = ${d.image_width ?? "NULL"}, image_height = ${d.image_height ?? "NULL"} WHERE id = ${lit(e.uid)};`
      );
      withImage++;
    }
  }
  L.push("");
  fs.writeFileSync(OUT_SQL, L.join("\n"));
  console.log(`[apply] wrote ${OUT_SQL}: ${withImage} with image, ${none} none (${doc.events.length} total)`);
}

main();
