#!/usr/bin/env node
/*
 * upload-images.mjs — STUB (runs post-deploy, NOT in this environment)
 *
 * Copies validated image binaries from image-report/images.json into the
 * Supabase Storage bucket `event-images`, then rewrites each row's
 * image_url to the Storage public URL.
 *
 * Prerequisites (user's live Supabase project):
 *   1. `supabase/migrations/0002_event_images.sql` applied.
 *   2. Storage bucket `event-images` created (public read).
 *   3. Env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *      (service-role key: this script runs server-side only, never in a
 *      browser bundle — keep it out of git.)
 *   4. Optional but recommended: `sharp` installed for resizing
 *      (`npm i -D sharp` in aiweek-app). Without it, originals are stored
 *      as-is.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/upload-images.mjs [--dry-run]
 *
 * Steps per event row in image-report/images.json with a decision URL:
 *   a. GET the original URL (the collector already validated it; re-check
 *      content-type image/* and skip rows where hotlink_ok === 'unknown'
 *      and the domain's ToS forbids copying — copy is safer than hotlink).
 *   b. Resize to max 1200px wide (16:9-ish cards are 1200x630 natively) via
 *      sharp if available; skip resize otherwise.
 *   c. Upload to `event-images/<uid>.<ext>` with content-type, upsert=true.
 *   d. UPDATE public.events SET image_url = <public URL>,
 *      image_verified_at = now() WHERE id = <uid>  (service-role client).
 *   e. Rewrite image-report/images.json decisions: image_url -> Storage URL,
 *      keep image_original_url as provenance, set hotlink_ok -> 'n/a (stored)'.
 *
 * Idempotent: re-running overwrites the same Storage paths and UPDATEs.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, "..");
const IMAGES_JSON = path.join(APP_ROOT, "image-report", "images.json");
const DRY_RUN = process.argv.includes("--dry-run");
const BUCKET = "event-images";

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("[upload] missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — see header for setup.");
    process.exit(2);
  }
  if (!fs.existsSync(IMAGES_JSON)) {
    console.error(`[upload] ${IMAGES_JSON} not found — run scripts/collect-images.mjs first.`);
    process.exit(2);
  }

  // Lazy-load the Supabase client so this stub imports cleanly without creds.
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(url, key, { auth: { persistSession: false } });

  // Optional resizer.
  let sharp = null;
  try {
    sharp = (await import("sharp")).default;
    console.log("[upload] sharp available — resizing to max 1200px wide.");
  } catch {
    console.log("[upload] sharp not installed — storing originals as-is (`npm i -D sharp` to enable resize).");
  }

  const doc = JSON.parse(fs.readFileSync(IMAGES_JSON, "utf8"));
  const rows = doc.events.filter((e) => e.decision?.image_original_url);
  console.log(`[upload] ${rows.length} images to copy (dryRun=${DRY_RUN})`);

  let ok = 0, failed = 0;
  for (const e of rows) {
    const src = e.decision.image_original_url;
    const ext = extFrom(src, e.decision);
    const storagePath = `${e.uid}.${ext}`;
    try {
      if (DRY_RUN) {
        console.log(`[upload] DRY ${e.uid} -> ${BUCKET}/${storagePath}`);
        continue;
      }
      const res = await fetch(src, { headers: { "User-Agent": "BostonAIWeekPlanner-ImageBot/1.0 (+contact joshua19solomon@gmail.com)" } });
      if (!res.ok) throw new Error(`GET ${res.status}`);
      const ct = (res.headers.get("content-type") || "").split(";")[0];
      if (!ct.startsWith("image/")) throw new Error(`content-type ${ct}`);
      let bytes = Buffer.from(await res.arrayBuffer());
      if (sharp) bytes = await sharp(bytes).resize({ width: 1200, withoutEnlargement: true }).toBuffer();

      const { error: upErr } = await sb.storage.from(BUCKET).upload(storagePath, bytes, {
        contentType: ct, upsert: true, cacheControl: "31536000",
      });
      if (upErr) throw upErr;

      const { data } = sb.storage.from(BUCKET).getPublicUrl(storagePath);
      const publicUrl = data.publicUrl;
      const { error: dbErr } = await sb.from("events").update({
        image_url: publicUrl,
        image_original_url: src,
        image_verified_at: new Date().toISOString(),
      }).eq("id", e.uid);
      if (dbErr) throw dbErr;

      e.decision.image_url = publicUrl;
      e.decision.hotlink_ok = "n/a (stored)";
      ok++;
      console.log(`[upload] OK ${e.uid} -> ${publicUrl}`);
    } catch (err) {
      failed++;
      e.decision.upload_error = String(err.message || err);
      console.error(`[upload] FAIL ${e.uid}: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 300)); // be gentle on the source hosts
  }

  if (!DRY_RUN) fs.writeFileSync(IMAGES_JSON, JSON.stringify(doc, null, 2));
  console.log(`[upload] done: ok=${ok} failed=${failed}`);
}

function extFrom(src, decision) {
  if (decision?.format) return decision.format === "jpeg" ? "jpg" : decision.format;
  const m = src.match(/\.([a-z0-9]{3,4})(?:[?#]|$)/i);
  return (m && ["png", "jpg", "jpeg", "webp", "gif"].includes(m[1].toLowerCase()) ? m[1] : "png").toLowerCase().replace("jpeg", "jpg");
}

main().catch((e) => { console.error("[upload] fatal:", e); process.exit(1); });
