/**
 * AI concierge core logic — SERVER ONLY.
 *
 * This module contains every piece of concierge logic that can run without
 * Next.js: intent parsing, keyword scoring, candidate selection, provider
 * calls, and output validation. The API route at app/api/concierge/route.ts
 * is a thin wrapper that validates input, fetches events from Supabase, and
 * delegates to `runConcierge()`.
 *
 * SECURITY: this module reads `process.env.AI_API_KEY`. It must never be
 * imported from client components — only from server routes/modules.
 * (No NEXT_PUBLIC_ prefix anywhere near the key; see docs/ai-concierge.md.)
 */

import { z } from "zod";
import type { Event } from "./types";

// ---------------------------------------------------------------------------
// Input / output schemas
// ---------------------------------------------------------------------------

export const ConciergeContextSchema = z.object({
  city: z.string().min(1).max(80).optional(),
  date_from: z.string().min(1).max(40).optional(), // ISO date/datetime
  date_to: z.string().min(1).max(40).optional(), // ISO date/datetime
  time_of_day: z.enum(["morning", "afternoon", "evening", "night"]).optional(),
  max_travel_min: z.number().int().min(1).max(180).optional(),
  exclude_ids: z.array(z.string().min(1).max(200)).max(200).optional(),
  saved_event_ids: z.array(z.string().min(1).max(200)).max(200).optional(),
});

export type ConciergeContext = z.infer<typeof ConciergeContextSchema>;

export const ConciergeRequestSchema = z.object({
  message: z.string().min(1).max(500),
  context: ConciergeContextSchema.optional(),
});

export type ConciergeRequest = z.infer<typeof ConciergeRequestSchema>;

const RecommendationSchema = z.object({
  event_id: z.string().min(1).max(200),
  reason: z.string().min(1).max(280),
});

export const ConciergeResponseSchema = z.object({
  recommendations: z.array(RecommendationSchema).min(0).max(8),
  follow_up_question: z.string().min(1).max(280).optional(),
  source: z.enum(["ai", "keyword-fallback"]),
  note: z.string().min(1).max(500).optional(),
});

export type ConciergeResponse = z.infer<typeof ConciergeResponseSchema>;

/** Shape of the model-produced JSON before it is sanitized against candidates. */
export const ModelOutputSchema = z.object({
  recommendations: z.array(RecommendationSchema).min(1).max(8),
  follow_up_question: z.string().min(1).max(280).optional(),
});

export type ModelOutput = z.infer<typeof ModelOutputSchema>;

// ---------------------------------------------------------------------------
// Intent parsing (pure)
// ---------------------------------------------------------------------------

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface ParsedIntent {
  /** Goal slugs, e.g. "investors", "jobs", "co-founder". */
  goals: string[];
  /** Date window parsed from the message, if any (America/New_York). */
  dateRange: DateRange | null;
  timeOfDay: TimeOfDay | null;
  cityHint: string | null;
  /** Raw extra keywords worth boosting (beyond goal keywords). */
  keywords: string[];
}

export const GOAL_LABELS: Record<string, string> = {
  "co-founder": "co-founder / founding team",
  investors: "investors / VC / fundraising",
  jobs: "jobs / hiring",
  engineering: "engineering / CTO / technical",
  healthcare: "healthcare / biotech",
  robotics: "robotics / hardware",
  workshops: "workshops / beginner-friendly learning",
  social: "social / fun / networking",
  evening: "evening / after-work events",
};

const GOAL_KEYWORDS: Record<string, string[]> = {
  "co-founder": ["co-founder", "cofounder", "co founder", "founding team", "cofounder matchmaking", "find a cofounder"],
  investors: ["investor", "investors", "vc", "venture capital", "funding", "fundraise", "fundraising", "pitch", "angel investor", "angels", "seed round", "series a", "demo day"],
  jobs: ["job", "jobs", "hiring", "career", "careers", "recruiting", "employment", "talent", "job fair", "get hired", "open roles"],
  engineering: ["cto", "engineering", "engineer", "engineers", "developer", "developers", "technical", "software", "ml engineer", "ai engineer", "tech lead"],
  healthcare: ["healthcare", "health", "medical", "biotech", "clinical", "hospital", "pharma", "life sciences", "digital health"],
  robotics: ["robotics", "robot", "robots", "hardware", "drone", "drones", "embodied ai", "automation"],
  workshops: ["workshop", "workshops", "beginner", "learn", "tutorial", "hands-on", "hands on", "intro", "course", "training", "bootcamp", "101", "getting started"],
  social: ["social", "fun", "party", "mixer", "networking", "meetup", "drinks", "happy hour", "trivia", "socialize", "hangout"],
  evening: ["evening", "tonight", "after work", "after-work", "afterwork", "nightlife"],
};

const CITY_HINTS = [
  "boston", "cambridge", "somerville", "brookline", "newton", "quincy",
  "watertown", "waltham", "medford", "arlington", "belmont", "lexington",
  "allston", "brighton", "charlestown", "dorchester", "roxbury",
  "jamaica plain", "south boston", "seaport", "back bay", "downtown",
  "kendall", "kendall square", "harvard square", "fenway", "chinatown",
];

const TIME_OF_DAY_HINTS: Record<TimeOfDay, string[]> = {
  morning: ["morning", "breakfast", "am "],
  afternoon: ["afternoon", "lunch", "midday"],
  evening: ["evening", "after work", "after-work", "afterwork", "tonight", "dinner"],
  night: ["night", "late night", "nightlife"],
};

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const BOSTON_TZ = "America/New_York";

/** Offset of `tz` from UTC in minutes at the given instant (DST-aware). */
function offsetMinutes(tz: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  const wallAsUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return (wallAsUTC - date.getTime()) / 60000;
}

function startOfDayNY(d: Date): Date {
  // Midnight in Boston for the calendar date of `d` (DST-aware).
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: BOSTON_TZ, year: "numeric", month: "2-digit", day: "2-digit",
  });
  const parts = dtf.formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "1");
  const y = get("year"), mo = get("month"), da = get("day");
  const offMin = offsetMinutes(BOSTON_TZ, new Date(Date.UTC(y, mo - 1, da, 12, 0, 0)));
  return new Date(Date.UTC(y, mo - 1, da, 0, 0, 0) - offMin * 60000);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 24 * 60 * 60 * 1000);
}

function endOfDay(d: Date): Date {
  return new Date(addDays(d, 1).getTime() - 1);
}

function weekdayInBoston(d: Date): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: BOSTON_TZ, weekday: "long" })
    .format(d).toLowerCase();
  return WEEKDAYS.indexOf(name);
}

/**
 * Parse natural-language date hints into a Boston-timezone date window.
 * Exported for tests. `now` is injectable so tests are deterministic.
 */
export function parseDateHint(message: string, now: Date): DateRange | null {
  const m = message.toLowerCase();
  const today = startOfDayNY(now);

  if (/\btonight\b/.test(m) || /\bthis evening\b/.test(m)) {
    return { from: new Date(today.getTime() + 17 * 3600 * 1000), to: endOfDay(today) }; // ~5pm Boston
  }
  if (/\btomorrow\b/.test(m)) {
    const t = addDays(today, 1);
    return { from: t, to: endOfDay(t) };
  }
  if (/\bthis weekend\b/.test(m) || /\bweekend\b/.test(m)) {
    const wd = weekdayInBoston(now); // 0=Sun..6=Sat
    const daysToSat = (6 - wd + 7) % 7;
    const sat = addDays(today, daysToSat);
    return { from: sat, to: endOfDay(addDays(sat, 1)) };
  }
  if (/\bnext week\b/.test(m)) {
    const wd = weekdayInBoston(now);
    const daysToMon = (8 - wd) % 7 || 7; // next Monday (strictly future week)
    const mon = addDays(today, daysToMon);
    return { from: mon, to: endOfDay(addDays(mon, 6)) };
  }
  if (/\bthis week\b/.test(m)) {
    const wd = weekdayInBoston(now);
    const daysToSun = (7 - wd) % 7;
    return { from: now, to: endOfDay(addDays(today, daysToSun)) };
  }
  for (let i = 0; i < 7; i++) {
    const day = WEEKDAYS[i];
    const re = new RegExp(`\\bnext ${day}\\b`);
    if (re.test(m)) {
      const wd = weekdayInBoston(now);
      let delta = (i - wd + 7) % 7;
      delta = delta + 7; // "next X" = the one in the following week
      const d = addDays(today, delta);
      return { from: d, to: endOfDay(d) };
    }
    const re2 = new RegExp(`\\b${day}\\b`);
    if (re2.test(m)) {
      const wd = weekdayInBoston(now);
      const delta = (i - wd + 7) % 7;
      const d = addDays(today, delta);
      return { from: d, to: endOfDay(d) };
    }
  }
  return null;
}

/** Parse a user message into a structured intent. Pure + exported for tests. */
export function parseIntent(message: string, now: Date = new Date()): ParsedIntent {
  const m = message.toLowerCase();

  const goals: string[] = [];
  for (const [goal, kws] of Object.entries(GOAL_KEYWORDS)) {
    if (kws.some((k) => m.includes(k))) goals.push(goal);
  }

  let timeOfDay: TimeOfDay | null = null;
  for (const [tod, hints] of Object.entries(TIME_OF_DAY_HINTS) as [TimeOfDay, string[]][]) {
    if (hints.some((h) => m.includes(h))) { timeOfDay = tod; break; }
  }

  let cityHint: string | null = null;
  for (const city of CITY_HINTS) {
    if (m.includes(city)) { cityHint = city; break; }
  }

  const dateRange = parseDateHint(m, now);

  // Extra free keywords: quoted phrases or salient nouns the scorer can boost.
  const keywords: string[] = [];
  const quoted = m.match(/"([^"]{2,40})"/g);
  if (quoted) keywords.push(...quoted.map((q) => q.replace(/"/g, "")));

  return { goals, dateRange, timeOfDay, cityHint, keywords };
}

// ---------------------------------------------------------------------------
// Keyword scoring (pure, transparent)
// ---------------------------------------------------------------------------

export interface ScoredEvent {
  event: Event;
  score: number;
  matchedGoals: string[];
}

function eventText(e: Event): string {
  const speakers = (e.speakers ?? []).map((s) => s.name).join(" ");
  return [
    e.display_title ?? e.title, e.title, e.description ?? "", e.about ?? "",
    (e as { summary?: string | null }).summary ?? "",
    e.event_type ?? "", e.hosted_by ?? "", e.venue ?? "", e.city ?? "", speakers,
  ].join(" ").toLowerCase();
}

function hourInBoston(iso: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BOSTON_TZ, hour: "numeric", hour12: false,
  }).formatToParts(new Date(iso));
  return Number(parts.find((p) => p.type === "hour")?.value ?? "12") % 24;
}

function timeBucketMatches(hour: number, tod: TimeOfDay): boolean {
  if (tod === "morning") return hour >= 5 && hour < 12;
  if (tod === "afternoon") return hour >= 12 && hour < 17;
  if (tod === "evening") return hour >= 17 && hour < 23;
  return hour >= 23 || hour < 5; // night
}

/**
 * Transparent keyword/intent scorer. Higher is better. Weights are
 * documented here (and in docs/ai-concierge.md) so ranking is explainable.
 *
 *  +3 per matched goal keyword hit (cap +9 per goal)
 *  +2 if the goal keyword appears in event_type
 *  +4 if the event falls inside the parsed date range, -10 if outside
 *  +2 if start time matches the requested time-of-day bucket
 *  +3 city match (message hint or context city); -8 city mismatch when a city was specified
 *  +1 direct (one-click) registration
 *  -2 event already saved by the user (deprioritize, don't hide)
 *  +1 event starts within 7 days (mild recency nudge)
 */
export function scoreEvent(
  event: Event,
  intent: ParsedIntent,
  context: ConciergeContext,
  now: Date = new Date(),
): ScoredEvent {
  const text = eventText(event);
  const type = (event.event_type ?? "").toLowerCase();
  let score = 0;
  const matchedGoals: string[] = [];

  for (const goal of intent.goals) {
    let hits = 0;
    for (const kw of GOAL_KEYWORDS[goal] ?? []) {
      if (text.includes(kw)) hits++;
    }
    if (hits > 0) {
      matchedGoals.push(goal);
      score += Math.min(hits, 3) * 3;
      if ((GOAL_KEYWORDS[goal] ?? []).some((kw) => type.includes(kw))) score += 2;
    }
  }

  for (const kw of intent.keywords) {
    if (kw && text.includes(kw)) score += 2;
  }

  const start = new Date(event.start_at).getTime();

  if (intent.dateRange) {
    const { from, to } = intent.dateRange;
    if (start >= from.getTime() && start <= to.getTime()) score += 4;
    else score -= 10;
  }

  if (intent.timeOfDay) {
    if (timeBucketMatches(hourInBoston(event.start_at), intent.timeOfDay)) score += 2;
  }

  const wantCity = (context.city ?? intent.cityHint ?? "").toLowerCase();
  if (wantCity) {
    const eventCity = (event.city ?? "").toLowerCase();
    if (eventCity.includes(wantCity) || wantCity.includes(eventCity)) score += 3;
    else score -= 8;
  }

  if (event.registration_is_direct) score += 1;

  if ((context.saved_event_ids ?? []).includes(event.id)) score -= 2;

  const daysOut = (start - now.getTime()) / (24 * 60 * 60 * 1000);
  if (daysOut >= 0 && daysOut <= 7) score += 1;

  return { event, score, matchedGoals };
}

/**
 * Filter + rank + cap. Returns at most 12 candidates for the model.
 * Pure + exported for tests.
 */
export function selectCandidates(
  events: Event[],
  intent: ParsedIntent,
  context: ConciergeContext,
  now: Date = new Date(),
  limit = 12,
): ScoredEvent[] {
  const excluded = new Set(context.exclude_ids ?? []);
  const fromTs = context.date_from ? new Date(context.date_from).getTime() : null;
  const toTs = context.date_to ? new Date(context.date_to).getTime() : null;

  const scored: ScoredEvent[] = [];
  for (const event of events) {
    if (!event?.id) continue;
    if (excluded.has(event.id)) continue;
    const start = new Date(event.start_at).getTime();
    if (Number.isNaN(start)) continue;
    if (start < now.getTime() - 60 * 60 * 1000) continue; // drop events already started/over
    if (fromTs !== null && !Number.isNaN(fromTs) && start < fromTs) continue;
    if (toTs !== null && !Number.isNaN(toTs) && start > toTs) continue;
    scored.push(scoreEvent(event, intent, context, now));
  }

  scored.sort((a, b) => b.score - a.score || a.event.start_at.localeCompare(b.event.start_at));
  return scored.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Candidate shaping for the model (anti-hallucination: ids are the key)
// ---------------------------------------------------------------------------

export interface CandidateForModel {
  id: string;
  title: string;
  summary: string;
  start_at: string;
  city: string;
  venue: string;
  registration: "direct" | "external" | "none";
}

export function toCandidate(e: Event): CandidateForModel {
  const rawSummary =
    (e as { summary?: string | null }).summary ?? e.description ?? e.about ?? "";
  const summary = rawSummary.replace(/\s+/g, " ").trim().slice(0, 180) || "No description provided.";
  return {
    id: e.id,
    title: e.display_title ?? e.title,
    summary,
    start_at: e.start_at,
    city: e.city ?? "",
    venue: e.venue ?? "",
    registration: e.registration_is_direct
      ? "direct"
      : e.registration_url
        ? "external"
        : "none",
  };
}

// ---------------------------------------------------------------------------
// Keyword fallback (works with NO api key)
// ---------------------------------------------------------------------------

export function fallbackReason(scored: ScoredEvent, intent: ParsedIntent): string {
  const bits: string[] = [];
  if (scored.matchedGoals.length > 0) {
    bits.push(scored.matchedGoals.map((g) => `“${GOAL_LABELS[g] ?? g}”`).join(" + "));
  }
  if (intent.dateRange) bits.push("fits your date window");
  if (intent.timeOfDay) bits.push(`in the ${intent.timeOfDay}`);
  if (scored.event.registration_is_direct) bits.push("one-click registration");
  const why = bits.length > 0 ? bits.join(", ") : "keyword match";
  return `Keyword-ranked pick — ${why}.`;
}

export function keywordFallbackResponse(
  candidates: ScoredEvent[],
  intent: ParsedIntent,
  note?: string,
): ConciergeResponse {
  const recommendations = candidates.slice(0, 6).map((c) => ({
    event_id: c.event.id,
    reason: fallbackReason(c, intent).slice(0, 280),
  }));
  const response: ConciergeResponse = {
    recommendations,
    source: "keyword-fallback",
  };
  if (note) response.note = note;
  return ConciergeResponseSchema.parse(response);
}

// ---------------------------------------------------------------------------
// AI provider config + calls (server-side fetch, no SDK)
// ---------------------------------------------------------------------------

export type AIProvider = "openai" | "anthropic";

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-haiku-latest",
};

/**
 * Lenient env read — NEVER throws. Returns null when no key is configured
 * (the route degrades to keyword fallback), or { unsupported } for a
 * provider we don't have a client for yet.
 */
export function getAIConfig(env: NodeJS.ProcessEnv = process.env): AIConfig | { unsupported: string } | null {
  const apiKey = env.AI_API_KEY;
  if (!apiKey) return null;
  const provider = (env.AI_PROVIDER ?? "openai").toLowerCase();
  if (provider !== "openai" && provider !== "anthropic") {
    return { unsupported: provider };
  }
  return {
    provider,
    apiKey,
    model: env.AI_MODEL || DEFAULT_MODELS[provider],
    baseUrl: env.AI_BASE_URL || undefined,
  };
}

const SYSTEM_PROMPT = `You are the Boston AI Week event concierge. You recommend real events from a fixed candidate list — nothing else.

HARD RULES (never break these):
- Recommend ONLY events from CANDIDATE EVENTS below, referenced by their exact "id". Never invent events, speakers, companies, jobs, sponsors, prices, or availability.
- Output 3–8 recommendations as JSON: {"recommendations":[{"event_id":"<exact id>","reason":"<short phrase>"}], "follow_up_question":"<optional>"}.
- Each reason is ONE short phrase (max ~15 words) saying why it fits the request.
- Use "likely to attract" language — never guarantee who will attend, and never promise jobs, funding, or meetings will happen.
- Include "follow_up_question" ONLY if the request is genuinely ambiguous (max 1 question, max ~25 words). Otherwise omit it.
- If no candidate is a strong match, say so honestly in the reasons and offer the closest alternatives.
- Reply with JSON ONLY. No markdown, no code fences, no extra text.`;

function buildUserPrompt(message: string, intent: ParsedIntent, candidates: CandidateForModel[]): string {
  const intentLine = [
    `goals: ${intent.goals.join(", ") || "none detected"}`,
    `time_of_day: ${intent.timeOfDay ?? "any"}`,
    `city_hint: ${intent.cityHint ?? "any"}`,
    intent.dateRange
      ? `date_window: ${intent.dateRange.from.toISOString()} to ${intent.dateRange.to.toISOString()}`
      : "date_window: none",
  ].join("; ");
  return [
    `USER REQUEST: ${message}`,
    `PARSED INTENT (${intentLine}) — use it as a hint; the request text is authoritative.`,
    `CANDIDATE EVENTS (JSON):`,
    JSON.stringify(candidates),
    `Return your JSON recommendation now.`,
  ].join("\n\n");
}

async function readJsonSafely(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function callOpenAICompatible(
  cfg: AIConfig,
  system: string,
  user: string,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const base = (cfg.baseUrl ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetchFn(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.3,
        max_tokens: 1200,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await readJsonSafely(res);
      throw new Error(`OpenAI-compatible API error ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
    }
    const data = await readJsonSafely(res);
    const choices = (data.choices ?? []) as { message?: { content?: string } }[];
    const content = choices[0]?.message?.content ?? "";
    if (!content) throw new Error("Empty completion from OpenAI-compatible API");
    return content;
  } finally {
    clearTimeout(timer);
  }
}

export async function callAnthropic(
  cfg: AIConfig,
  system: string,
  user: string,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetchFn("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": cfg.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: 1200,
        temperature: 0.3,
        system,
        messages: [{ role: "user", content: user }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await readJsonSafely(res);
      throw new Error(`Anthropic API error ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
    }
    const data = await readJsonSafely(res);
    const blocks = (data.content ?? []) as { type?: string; text?: string }[];
    const text = blocks.filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
    if (!text) throw new Error("Empty completion from Anthropic API");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/** Extract the largest JSON object from model text (tolerates stray prose). */
export function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return text;
  return text.slice(start, end + 1);
}

// ---------------------------------------------------------------------------
// Model output sanitization (anti-hallucination enforcement)
// ---------------------------------------------------------------------------

/**
 * Drop any recommendation whose id is not in the candidate list (the model
 * must never invent events), dedupe, cap at 8. Pure + exported for tests.
 */
export function sanitizeModelOutput(
  recs: { event_id: string; reason: string }[],
  candidates: ScoredEvent[],
): { event_id: string; reason: string }[] {
  const validIds = new Set(candidates.map((c) => c.event.id));
  const seen = new Set<string>();
  const out: { event_id: string; reason: string }[] = [];
  for (const r of recs) {
    if (!validIds.has(r.event_id)) continue; // invented id — drop
    if (seen.has(r.event_id)) continue;
    seen.add(r.event_id);
    out.push({
      event_id: r.event_id,
      reason: (r.reason || "Recommended for you.").slice(0, 280),
    });
    if (out.length >= 8) break;
  }
  return out;
}

/** Top up with keyword-ranked candidates when the model returned too few. */
export function topUpWithKeywords(
  recs: { event_id: string; reason: string }[],
  candidates: ScoredEvent[],
  intent: ParsedIntent,
  min = 3,
): { event_id: string; reason: string }[] {
  const used = new Set(recs.map((r) => r.event_id));
  const out = [...recs];
  for (const c of candidates) {
    if (out.length >= min) break;
    if (used.has(c.event.id)) continue;
    out.push({ event_id: c.event.id, reason: fallbackReason(c, intent).slice(0, 280) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Orchestrator (what the route calls)
// ---------------------------------------------------------------------------

export interface RunConciergeDeps {
  fetchFn?: typeof fetch;
  env?: NodeJS.ProcessEnv;
  now?: Date;
}

/**
 * Full concierge flow: intent → retrieve → rank → (AI | keyword fallback).
 * `fetchEvents` is injected so this stays unit-testable without Supabase.
 * Never throws for missing AI config — degrades honestly instead.
 */
export async function runConcierge(
  input: ConciergeRequest,
  fetchEvents: () => Promise<Event[]>,
  deps: RunConciergeDeps = {},
): Promise<ConciergeResponse> {
  const now = deps.now ?? new Date();
  const context = input.context ?? {};
  const intent = parseIntent(input.message, now);

  let events: Event[];
  try {
    events = await fetchEvents();
  } catch (err) {
    // Retrieval failure is a real error — surface it, don't fake results.
    throw new Error(`Event retrieval failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  const candidates = selectCandidates(events, intent, context, now);

  if (candidates.length === 0) {
    return ConciergeResponseSchema.parse({
      recommendations: [],
      source: "keyword-fallback",
      note: "No upcoming events match your filters right now — try widening the dates or city.",
    });
  }

  const cfg = getAIConfig(deps.env ?? process.env);
  if (cfg === null) {
    return keywordFallbackResponse(
      candidates,
      intent,
      "AI is not configured (set AI_API_KEY to enable smart recommendations) — showing keyword-matched events.",
    );
  }
  if ("unsupported" in cfg) {
    return keywordFallbackResponse(
      candidates,
      intent,
      `AI provider "${cfg.unsupported}" is not supported yet (openai/anthropic only) — showing keyword-matched events.`,
    );
  }

  try {
    const candidateJson = candidates.map((c) => toCandidate(c.event));
    const userPrompt = buildUserPrompt(input.message, intent, candidateJson);
    const raw = cfg.provider === "anthropic"
      ? await callAnthropic(cfg, SYSTEM_PROMPT, userPrompt, deps.fetchFn)
      : await callOpenAICompatible(cfg, SYSTEM_PROMPT, userPrompt, deps.fetchFn);

    const parsed = ModelOutputSchema.safeParse(JSON.parse(extractJsonObject(raw)));
    if (!parsed.success) throw new Error("Model output failed validation");

    let recs = sanitizeModelOutput(parsed.data.recommendations, candidates);
    recs = topUpWithKeywords(recs, candidates, intent);
    if (recs.length === 0) throw new Error("No valid recommendations from model");

    const response: ConciergeResponse = { recommendations: recs, source: "ai" };
    if (parsed.data.follow_up_question) {
      response.follow_up_question = parsed.data.follow_up_question;
    }
    return ConciergeResponseSchema.parse(response);
  } catch {
    // AI failure (network, auth, bad JSON, invented ids) → honest fallback.
    // Never surface a fake AI answer.
    return keywordFallbackResponse(
      candidates,
      intent,
      "The AI service was unavailable — showing keyword-matched events instead.",
    );
  }
}
