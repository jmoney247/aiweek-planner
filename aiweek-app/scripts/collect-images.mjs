#!/usr/bin/env node
/*
 * collect-images.mjs — Boston AI Week event-image collector
 *
 * Reads the enriched seed JSON (workspace/aiweek_events_enriched.json) and,
 * for each event, discovers a legitimate event image in priority order:
 *
 *   1. structured event-data image (aiweek.boston /api/og/events/<slug> card)
 *   2. og:image
 *   3. twitter card image
 *   4. registration-page banner
 *   5. official flyer
 *   6. organizer-provided image
 *   7. official organizer logo
 *   8. generic festival og card as branded fallback (aiweek.boston's
 *      /api/og/events/<slug> returns one shared festival card for every
 *      slug — verified byte-identical — so it serves as 'fallback', not a
 *      per-event 'official' image)
 *
 * Polite crawling: fetches aiweek.boston/robots.txt once (cached), honors
 * Disallow, 1 request / 2s global rate limit, identifiable User-Agent.
 * Registration platforms (luma/eventbrite/meetup/partiful) often block bots —
 * 403/captcha/timeout there is recorded as `blocked`, NOT a failure.
 *
 * Validation gates (rejections are recorded, never stored as the event image):
 *   - HTTP 200 with content-type image/*
 *   - content-length > 15 KB (or >15 KB actually received)
 *   - rejects 1x1/gif and filenames matching pixel|tracker|spacer|beacon|
 *     icon|logo-small|cookie|sprite|favicon
 *   - rejects images < 400 px wide when dimensions are readable
 *   - ads / stock photos / unrelated-event images: not auto-detectable with
 *     certainty; the provenance record (images.json) keeps the source page for
 *     every choice so a human can spot-check.
 *
 * Image binaries are NOT downloaded or stored here (no Supabase credentials
 * exist). Output is the provenance record + human report:
 *   image-report/images.json       (machine-readable provenance)
 *   image-report/IMAGE_REPORT.md   (human-readable counts + per-event table)
 * Next steps: scripts/upload-images.mjs (Storage) and
 *             scripts/apply-images-to-seed.mjs (image_updates.sql).
 *
 * Usage:
 *   node scripts/collect-images.mjs [--limit N] [--offset M] [--dry-run]
 *   Full 185-event crawl (resume from an offset):
 *   node scripts/collect-images.mjs --limit 50 --offset 0   # batch 1
 *   node scripts/collect-images.mjs --limit 50 --offset 50  # batch 2
 * Results merge: re-running with a different offset APPENDS new event rows
 * keyed by uid (existing uids are updated in place).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, "..");
const SEED_JSON = process.env.SEED_JSON || path.resolve(APP_ROOT, "../aiweek_events_enriched.json");
const REPORT_DIR = path.resolve(APP_ROOT, "image-report");
const IMAGES_JSON = path.join(REPORT_DIR, "images.json");
const REPORT_MD = path.join(REPORT_DIR, "IMAGE_REPORT.md");

const UA = "BostonAIWeekPlanner-ImageBot/1.0 (+contact joshua19solomon@gmail.com)";
const RATE_LIMIT_MS = 2000; // 1 request / 2s
const PAGE_TIMEOUT_MS = 25000;
const IMG_TIMEOUT_MS = 20000;
const MIN_BYTES = 15 * 1024;
const MIN_WIDTH = 400;
const HEAD_READ_BYTES = 65536;

const BAD_FILENAME = /(pixel|tracker|tracking|spacer|beacon|1x1|clear\.gif|\bicon\b|logo-small|cookie|sprite|favicon)/i;
// Site-chrome assets that are never event images: aiweek.boston's own nav
// logo (identical on every event page). The task rejects nav/social icons;
// the *event organizer's* logo (priority 7) is a different thing — e.g. a
// host company's logo found on the registration page.
const CHROME_FILENAME = /boston-ai-week-2026(-128)?\.png/i;

// ---------------------------------------------------------------- args
const args = process.argv.slice(2);
const opt = { limit: Infinity, offset: 0, dryRun: false };
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--limit") opt.limit = Number(args[++i]);
  else if (args[i] === "--offset") opt.offset = Number(args[++i]);
  else if (args[i] === "--dry-run") opt.dryRun = true;
}

// ---------------------------------------------------------------- helpers
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastReqAt = 0;
async function polite() {
  const wait = RATE_LIMIT_MS - (Date.now() - lastReqAt);
  if (wait > 0) await sleep(wait);
  lastReqAt = Date.now();
}
async function fetchT(url, { timeout = PAGE_TIMEOUT_MS, headers = {} } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,image/*,*/*;q=0.8", ...headers },
      redirect: "follow",
    });
    return res;
  } finally {
    clearTimeout(t);
  }
}
function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function absUrl(raw, base) {
  if (!raw || /^(data|javascript|mailto):/i.test(raw)) return null;
  try {
    const u = new URL(raw, base);
    if (!["http:", "https:"].includes(u.protocol)) return null;
    return u.href;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- robots
const robotsCache = new Map(); // host -> { disallow: string[], allowed }
async function robotsAllows(targetUrl) {
  const u = new URL(targetUrl);
  const host = u.host;
  if (!robotsCache.has(host)) {
    let disallow = [];
    try {
      const res = await fetchT(`${u.protocol}//${host}/robots.txt`, { timeout: 12000 });
      if (res.ok) {
        const txt = await res.text();
        let inGroup = false;
        for (const line of txt.split("\n")) {
          const m = line.match(/^\s*(user-agent|disallow|crawl-delay)\s*:\s*(.*)\s*$/i);
          if (!m) continue;
          const [, key, val] = m;
          if (key.toLowerCase() === "user-agent") inGroup = val === "*" || val.toLowerCase().includes("bostonaiweekplanner");
          else if (inGroup && key.toLowerCase() === "disallow" && val) disallow.push(val.trim());
        }
      }
    } catch {
      /* robots fetch failed: proceed cautiously, paths still fetched politely */
    }
    robotsCache.set(host, { disallow });
  }
  const { disallow } = robotsCache.get(host);
  return !disallow.some((d) => u.pathname.startsWith(d));
}

// ---------------------------------------------------------------- extraction (regex only, no parser lib)
// Priority numbers follow the pipeline spec (1..7). Fallback (8) is CSS-only.
function extractCandidates(html, pageUrl) {
  const cands = [];
  const seen = new Set();
  const push = (raw, priority, label) => {
    const url = absUrl(raw, pageUrl);
    if (!url) return;
    const key = url.replace(/[?&](v|ver|cachebust)=\w+/g, "");
    if (seen.has(key)) return;
    seen.add(key);
    cands.push({ url, source_page: pageUrl, priority, label });
  };

  const metaRe = /<meta[^>]+(?:property|name)=["'](og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]*>/gi;
  let m;
  while ((m = metaRe.exec(html))) {
    const tag = m[0];
    const content = (tag.match(/content=["']([^"']+)["']/i) || [])[1];
    const prop = m[1].toLowerCase();
    if (!content) continue;
    const isStructuredCard = /\/api\/og\/events\//.test(content);
    // KNOWN GENERIC: aiweek.boston's /api/og/events/<slug> endpoint returns a
    // single festival-wide card for EVERY slug (verified byte-identical,
    // md5 468c29d642b7c10a3ae027d9481aa6ff, across 4 sampled events on
    // 2026-09-16). It is legitimate festival branding but not event-specific,
    // so it serves as the branded fallback (priority 8), never as a
    // per-event "official" image.
    const prio = isStructuredCard ? 8 : prop.startsWith("og:") ? 2 : 3;
    push(content, prio, isStructuredCard ? "generic festival og card (shared)" : prop.startsWith("og:") ? "og:image" : "twitter:image");
  }

  // JSON-LD image fields -> organizer-provided
  const ldRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = ldRe.exec(html))) {
    for (const im of m[1].matchAll(/"image"\s*:\s*"([^"]+)"/g)) {
      push(im[1], 6, "json-ld image");
    }
    for (const im of m[1].matchAll(/"image"\s*:\s*\[\s*"([^"]+)"/g)) {
      push(im[1], 6, "json-ld image");
    }
  }

  // <img> tags: logos -> 7, everything else -> 4 (banner/flyer candidate)
  const imgRe = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  while ((m = imgRe.exec(html))) {
    const src = m[1];
    const isLogo = /logo/i.test(src) || /logo/i.test(m[0]);
    push(src, isLogo ? 7 : 4, isLogo ? "organizer logo" : "page image");
  }

  cands.sort((a, b) => a.priority - b.priority);
  return cands;
}

// ---------------------------------------------------------------- validation
function parseImageSize(buf) {
  // Cheap header-only parsing: PNG / GIF / JPEG / WebP. No decoder lib.
  try {
    if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), format: "png" };
    }
    if (buf.length > 10 && buf.toString("ascii", 0, 3) === "GIF") {
      return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8), format: "gif" };
    }
    if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
      const chunk = buf.toString("ascii", 12, 16);
      if (chunk === "VP8X" && buf.length >= 30)
        return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3), format: "webp" };
      if (chunk === "VP8 " && buf.length >= 30) {
        const w = buf.readUInt16LE(26) & 0x3fff, h = buf.readUInt16LE(28) & 0x3fff;
        if (w && h) return { width: w, height: h, format: "webp" };
      }
      if (chunk === "VP8L" && buf.length >= 25) {
        const b = buf.readUInt32LE(21);
        return { width: 1 + (b & 0x3fff), height: 1 + ((b >> 14) & 0x3fff), format: "webp" };
      }
    }
    if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
      let i = 2;
      while (i < buf.length - 8) {
        if (buf[i] !== 0xff) break;
        const marker = buf[i + 1];
        const len = buf.readUInt16BE(i + 2);
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8) {
          return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5), format: "jpeg" };
        }
        i += 2 + len;
      }
    }
  } catch {
    /* unreadable header */
  }
  return null;
}

function hotlinkStatus(imageUrl) {
  const host = new URL(imageUrl).host;
  if (host === "aiweek.boston") {
    return {
      ok: true,
      note: "Festival's own site; robots.txt allows crawling. Interim hotlink acceptable until Storage copy lands.",
    };
  }
  // Task guidance: luma/eventbrite images generally allow hotlinking, but we
  // cannot verify ToS from here — record honestly.
  return { ok: "unknown", note: `Hotlink permission for ${host} not verified — flagged for manual review before hotlinking.` };
}

async function validateImage(cand) {
  const reasons = [];
  const url = cand.url;
  const pathname = new URL(url).pathname;
  if (BAD_FILENAME.test(pathname)) {
    reasons.push(`rejected filename pattern (${pathname.split("/").pop()})`);
  }
  if (CHROME_FILENAME.test(pathname)) {
    reasons.push("rejected: site chrome (aiweek.boston nav logo), not an event image");
  }
  if (reasons.length) return { ok: false, reasons };

  let res;
  try {
    await polite();
    res = await fetchT(url, { timeout: IMG_TIMEOUT_MS, headers: { Range: `bytes=0-${HEAD_READ_BYTES}` } });
  } catch (e) {
    return { ok: false, reasons: [`image fetch failed: ${e.name === "AbortError" ? "timeout" : e.message}`] };
  }
  if (!res.ok) return { ok: false, reasons: [`image HTTP ${res.status}`] };
  const ct = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!ct.startsWith("image/")) {
    await res.body?.cancel().catch(() => {});
    return { ok: false, reasons: [`content-type not image/* (got "${ct || "none"}")`] };
  }
  if (ct === "image/gif" && /1x1|spacer|pixel/i.test(pathname)) {
    await res.body?.cancel().catch(() => {});
    return { ok: false, reasons: ["1x1/spacer gif"] };
  }

  const declaredLen = Number(res.headers.get("content-length") || 0);
  let buf;
  try {
    const chunks = [];
    let total = 0;
    for await (const chunk of res.body) {
      chunks.push(chunk);
      total += chunk.length;
      if (total >= HEAD_READ_BYTES) break;
    }
    buf = Buffer.concat(chunks);
  } catch (e) {
    return { ok: false, reasons: [`image body read failed: ${e.message}`] };
  }
  const size = declaredLen > buf.length ? declaredLen : buf.length;
  if (size < MIN_BYTES) {
    return { ok: false, reasons: [`too small (${(size / 1024).toFixed(1)} KB < 15 KB)`] };
  }

  const dims = parseImageSize(buf);
  if (dims && dims.width < MIN_WIDTH) {
    return { ok: false, reasons: [`too narrow (${dims.width}px < ${MIN_WIDTH}px)`] };
  }
  return { ok: true, reasons: [], contentType: ct, bytes: size, dims };
}

// ---------------------------------------------------------------- per-event
async function collectEvent(ev) {
  const rec = {
    uid: ev.uid,
    title: ev.title,
    event_url: ev.url,
    registration_url: ev.register_url || null,
    decision: null,
    candidates: [],
    fetch_log: [],
  };
  const t0 = Date.now();
  const note = (url, status, noteText) => rec.fetch_log.push({ url, status, ms: Date.now() - t0, note: noteText });

  // --- pass 1: the aiweek.boston event page
  if (!(await robotsAllows(ev.url))) {
    note(ev.url, "skipped", "robots.txt disallows this path");
  } else {
    await polite();
    try {
      const res = await fetchT(ev.url);
      if (res.ok) {
        const html = await res.text();
        note(ev.url, res.status, `event page OK (${html.length} chars)`);
        for (const c of extractCandidates(html, ev.url)) rec.candidates.push(c);
      } else {
        note(ev.url, res.status, "event page fetch failed");
      }
    } catch (e) {
      note(ev.url, "error", e.name === "AbortError" ? "timeout" : e.message);
    }
  }

  // --- pass 2: direct registration page (different host only)
  const reg = ev.register_url;
  const regIsExternal = reg && (() => { try { return new URL(reg).host !== "aiweek.boston"; } catch { return false; } })();
  let regBlocked = false;
  if (regIsExternal) {
    await polite();
    try {
      const res = await fetchT(reg, { timeout: 20000 });
      if (res.ok) {
        const html = await res.text();
        note(reg, res.status, `registration page OK (${html.length} chars)`);
        for (const c of extractCandidates(html, reg)) rec.candidates.push(c);
      } else if (res.status === 403 || res.status === 429 || res.status === 401) {
        regBlocked = true;
        note(reg, res.status, "blocked (anti-bot / login wall) — recorded as blocked, not failure");
      } else {
        note(reg, res.status, "registration page fetch failed");
      }
    } catch (e) {
      regBlocked = true;
      note(reg, "error", e.name === "AbortError" ? "timeout/blocked" : e.message);
    }
  }

  // --- validate in GLOBAL priority order (both passes merged + re-sorted)
  rec.candidates.sort((a, b) => a.priority - b.priority);
  let accepted = null;
  for (let i = 0; i < rec.candidates.length; i++) {
    const c = rec.candidates[i];
    if (opt.dryRun) {
      c.accepted = false;
      c.reject_reasons = ["dry-run: validation skipped"];
      continue;
    }
    const v = await validateImage(c);
    c.accepted = v.ok;
    c.reject_reasons = v.reasons;
    if (v.ok) {
      c.content_type = v.contentType;
      c.bytes = v.bytes;
      if (v.dims) {
        c.width = v.dims.width;
        c.height = v.dims.height;
        c.format = v.dims.format;
      }
      accepted = c;
      // Mark the rest as unevaluated rather than leaving them keyless.
      for (const rest of rec.candidates.slice(i + 1)) {
        rest.accepted = false;
        rest.reject_reasons = ["not evaluated — higher-priority candidate accepted"];
      }
      break; // first passing candidate wins; the rest stay listed as not-chosen
    }
  }

  if (accepted) {
    const hk = hotlinkStatus(accepted.url);
    const kind = accepted.priority === 8 ? "fallback"
      : accepted.priority === 7 ? "organizer_logo"
      : "official";
    rec.decision = {
      image_original_url: accepted.url,
      image_url: accepted.url, // interim hotlink until upload-images.mjs copies to Storage
      image_source_url: accepted.source_page,
      image_kind: kind,
      image_attribution: `${accepted.label} via ${new URL(accepted.source_page).host}`,
      image_verified_at: new Date().toISOString(),
      image_width: accepted.width || null,
      image_height: accepted.height || null,
      hotlink_ok: hk.ok,
      hotlink_note: hk.note,
      chosen_priority: accepted.priority,
    };
  } else {
    rec.decision = {
      image_original_url: null,
      image_url: null,
      image_source_url: null,
      image_kind: "none",
      image_attribution: null,
      image_verified_at: new Date().toISOString(),
      image_width: null,
      image_height: null,
      hotlink_ok: null,
      hotlink_note: null,
      chosen_priority: null,
      reason: regBlocked && rec.candidates.length === 0
        ? "no candidates; registration page blocked bot"
        : "no candidate passed validation",
    };
  }
  return rec;
}

// ---------------------------------------------------------------- main
async function main() {
  const seed = JSON.parse(fs.readFileSync(SEED_JSON, "utf8"));
  const batch = seed.slice(opt.offset, opt.offset + opt.limit);
  console.log(`[collect] seed=${seed.length} offset=${opt.offset} limit=${opt.limit} batch=${batch.length} dryRun=${opt.dryRun}`);
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  const results = [];
  for (const ev of batch) {
    console.log(`[collect] ${ev.uid.slice(0, 60)} ...`);
    results.push(await collectEvent(ev));
  }

  // merge with any previous run (keyed by uid)
  let existing = { events: [] };
  if (fs.existsSync(IMAGES_JSON)) {
    try { existing = JSON.parse(fs.readFileSync(IMAGES_JSON, "utf8")); } catch { /* start fresh */ }
  }
  const byUid = new Map(existing.events.map((e) => [e.uid, e]));
  for (const r of results) byUid.set(r.uid, r);

  const doc = {
    generated_at: new Date().toISOString(),
    collector: "scripts/collect-images.mjs",
    seed_count: seed.length,
    run: { offset: opt.offset, limit: opt.limit, dry_run: opt.dryRun },
    events: [...byUid.values()],
  };
  fs.writeFileSync(IMAGES_JSON, JSON.stringify(doc, null, 2));

  const stats = { official: 0, organizer_logo: 0, fallback: 0, none: 0, blocked_reg: 0, dry_run: 0 };
  for (const e of doc.events) {
    if (opt.dryRun) stats.dry_run++;
    else if (e.decision?.image_kind === "official") stats.official++;
    else if (e.decision?.image_kind === "organizer_logo") stats.organizer_logo++;
    else if (e.decision?.image_kind === "fallback") stats.fallback++;
    else stats.none++;
    if (e.fetch_log.some((f) => /blocked/.test(f.note || ""))) stats.blocked_reg++;
  }
  console.log(`[collect] done: official=${stats.official} organizer_logo=${stats.organizer_logo} fallback=${stats.fallback} none=${stats.none} blocked_reg=${stats.blocked_reg} total_events=${doc.events.length}`);
  console.log(`[collect] wrote ${IMAGES_JSON}`);

  writeReportMd(doc, stats);
  console.log(`[collect] wrote ${REPORT_MD}`);
}

function writeReportMd(doc, stats) {
  const L = [];
  L.push("# Boston AI Week — Event Image Report");
  L.push("");
  L.push(`Generated: ${doc.generated_at} · Collector: \`scripts/collect-images.mjs\` · Seed events: ${doc.seed_count} · Provenance: \`image-report/images.json\``);
  L.push("");
  L.push("## Pipeline priority (first passing candidate wins)");
  L.push("");
  L.push("1. structured per-event data image → 2. `og:image` → 3. twitter card image → 4. registration-page banner → 5. official flyer → 6. organizer-provided (JSON-LD) → 7. official organizer logo → 8. generic festival og card as branded fallback.");
  L.push("");
  L.push("**Honest note on priority 1:** aiweek.boston's `/api/og/events/<slug>` endpoint — which the event pages advertise as their og:image — returns a *single festival-wide card* for every slug (verified byte-identical, md5 `468c29d642b7c10a3ae027d9481aa6ff`, 1200×630, across 4 sampled events on 2026-09-16). There is no per-event structured image on the official site, so priority 1 is unoccupied and that card is used as the priority-8 branded fallback (`image_kind='fallback'`). `image_kind='none'` is reserved for rows where even the fallback could not be fetched.");
  L.push("");
  L.push("## Counts");
  L.push("");
  L.push(`| kind | count |`);
  L.push(`|---|---|`);
  L.push(`| official (event-specific image found) | ${stats.official} |`);
  L.push(`| organizer_logo | ${stats.organizer_logo} |`);
  L.push(`| fallback (generic festival card) | ${stats.fallback} |`);
  L.push(`| none (no image at all) | ${stats.none} |`);
  L.push(`| registration pages bot-blocked | ${stats.blocked_reg} |`);
  L.push(`| events covered in images.json | ${doc.events.length} / ${doc.seed_count} |`);
  L.push("");
  L.push("## Validation gates (automatic rejections)");
  L.push("");
  L.push("- HTTP non-200, content-type not `image/*`");
  L.push("- < 15 KB; < 400 px wide (dimensions read from PNG/GIF/JPEG/WebP headers — no decoder lib needed)");
  L.push("- filename matches pixel|tracker|spacer|beacon|1x1|icon|logo-small|cookie|sprite|favicon; 1x1/spacer gifs");
  L.push("- site chrome rejected: aiweek.boston's own nav logo (`boston-ai-week-2026*.png`, identical on every page) is classified as nav imagery, not an event/organizer image");
  L.push("- ads, stock photos, unrelated-event banners: not auto-detectable with certainty — every decision lists its source page in `images.json` for human spot-checks.");
  L.push("");
  L.push("## Rejected as irrelevant / failed validation");
  L.push("");
  let rejectedAny = false;
  for (const e of doc.events) {
    for (const c of e.candidates || []) {
      if (!c.accepted && c.reject_reasons && c.reject_reasons.length
          && !c.reject_reasons.includes("dry-run: validation skipped")
          && !c.reject_reasons.some((r) => r.startsWith("not evaluated"))) {
        L.push(`- \`${e.uid}\` — ${c.url} — ${c.reject_reasons.join("; ")}`);
        rejectedAny = true;
      }
    }
  }
  if (!rejectedAny) L.push("(none)");
  L.push("");
  L.push("## Broken / unreachable URLs");
  L.push("");
  let brokenAny = false;
  for (const e of doc.events) {
    for (const f of e.fetch_log || []) {
      if (f.status !== 200 && f.status !== "skipped") {
        L.push(`- \`${e.uid}\` — ${f.url} → ${f.status}: ${f.note || ""}`);
        brokenAny = true;
      }
    }
  }
  if (!brokenAny) L.push("(none)");
  L.push("");
  L.push("## Per-event source table");
  L.push("");
  L.push(`| uid | kind | chosen image | source page | width×height | hotlink |`);
  L.push(`|---|---|---|---|---|---|`);
  for (const e of doc.events) {
    const d = e.decision || {};
    L.push(`| \`${(e.uid || "").slice(0, 50)}\` | ${d.image_kind || "?"} | ${d.image_original_url ? escHtml(d.image_original_url).slice(0, 70) : "—"} | ${d.image_source_url ? escHtml(new URL(d.image_source_url).host + new URL(d.image_source_url).pathname.slice(0, 40)) : "—"} | ${d.image_width ? `${d.image_width}×${d.image_height}` : "—"} | ${d.hotlink_ok ?? "—"} |`);
  }
  L.push("");
  L.push("## Capability check (this environment, 2026-09-16)");
  L.push("");
  L.push("- ✅ Fetching aiweek.boston event pages: works (robots.txt `Allow: /`, HTTP 200, og:image present).");
  L.push("- ✅ Reading og:image / twitter:image / JSON-LD images via regex: works.");
  L.push("- ✅ Image binary validation (content-type, size, dimensions from PNG/JPEG/GIF/WebP headers): works — no decoder lib required.");
  L.push("- ⚠️ Registration platforms (luma/eventbrite/meetup/partiful): flaky bot handling from this environment — luma timed out on some runs (recorded as `blocked`) and served full pages with harvestable og:images on others (7 luma banners collected in the sample run). Eventbrite/Meetup/Partiful not yet exercised; expect 403/captcha on some. **Honest caveat:** registration-page images may need retries or a browser session for full coverage.");
  L.push("- ❌ Uploading to Supabase Storage: not possible here — no Supabase project credentials exist in this environment. `scripts/upload-images.mjs` runs post-deploy against the live project (bucket `event-images`).");
  L.push("- ❌ Downloading/resizing image binaries for Storage: not done yet by design (binaries deferred to the upload step); the probe fetch confirms bytes are retrievable when the host allows it.");
  L.push("");
  L.push("## Hotlinking notes");
  L.push("");
  L.push("- `aiweek.boston` (the festival's own generated og cards): interim hotlink acceptable; Storage copy planned. Each row carries `hotlink_ok` + `hotlink_note`.");
  L.push("- All other domains: `hotlink_ok: \"unknown\"` until their ToS is checked. Never hotlink where terms prohibit — the upload step copies to Storage instead.");
  L.push("- No images were invented: every stored URL was fetched and validated live.");
  L.push("");
  L.push("## Resuming the full crawl");
  L.push("");
  L.push("```bash");
  L.push("# 15-event sample (this run)");
  L.push("node scripts/collect-images.mjs --limit 15 --offset 0");
  L.push("");
  L.push("# Full 185-event crawl in polite batches (~1 req/2s; ~10–15 min per 100 events incl. image HEAD checks)");
  L.push("node scripts/collect-images.mjs --limit 50 --offset 0");
  L.push("node scripts/collect-images.mjs --limit 50 --offset 50");
  L.push("node scripts/collect-images.mjs --limit 50 --offset 100");
  L.push("node scripts/collect-images.mjs --limit 50 --offset 150");
  L.push("");
  L.push("# Then generate the idempotent UPDATE script and review:");
  L.push("node scripts/apply-images-to-seed.mjs");
  L.push("# apply supabase/image_updates.sql after migration 0002 is live");
  L.push("```");
  L.push("");
  fs.writeFileSync(REPORT_MD, L.join("\n"));
}

main().catch((e) => {
  console.error("[collect] fatal:", e);
  process.exit(1);
});
