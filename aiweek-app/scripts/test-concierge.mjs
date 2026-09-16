/**
 * Unit tests for the AI concierge (lib/concierge.ts).
 *
 * Run:  node --test scripts/test-concierge.mjs
 *
 * The fixtures below are FAKE events invented purely for testing — they are
 * not real Boston AI Week events and must never be presented as real.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  ConciergeRequestSchema,
  ConciergeResponseSchema,
  ModelOutputSchema,
  getAIConfig,
  parseIntent,
  scoreEvent,
  selectCandidates,
  sanitizeModelOutput,
  topUpWithKeywords,
  keywordFallbackResponse,
  runConcierge,
} from "../lib/concierge.ts";

// ---------------------------------------------------------------------------
// Fake fixtures (NOT real events)
// ---------------------------------------------------------------------------

const NOW = new Date("2026-09-16T12:00:00-04:00"); // Wednesday

function fakeEvent(overrides) {
  return {
    id: "evt-test-x",
    title: "TestConf: Fake Event",
    registration_url: null,
    registration_is_direct: false,
    start_at: "2026-09-17T18:00:00-04:00",
    end_at: "2026-09-17T20:00:00-04:00",
    venue: "Test Venue",
    address: "1 Test St",
    city: "Boston",
    neighborhood: null,
    event_type: "meetup",
    hosted_by: "TestConf",
    speakers: [{ name: "Test Speaker" }],
    description: "A fake event for unit tests.",
    about: "",
    official_url: "https://example.invalid/test",
    ...overrides,
  };
}

const FIXTURES = [
  fakeEvent({
    id: "evt-test-1",
    title: "TestConf: AI Investor Mixer",
    description: "Meet investors and VCs. Startup pitch night for founders seeking seed funding.",
    event_type: "networking",
    city: "Cambridge",
    start_at: "2026-09-17T18:30:00-04:00",
    end_at: "2026-09-17T21:00:00-04:00",
    registration_is_direct: true,
    registration_url: "https://example.invalid/register/1",
  }),
  fakeEvent({
    id: "evt-test-2",
    title: "TestConf: Robotics Hands-On Workshop",
    description: "Beginner-friendly robotics workshop. Learn to build and program a small robot.",
    event_type: "workshop",
    city: "Boston",
    start_at: "2026-09-19T10:00:00-04:00",
    end_at: "2026-09-19T13:00:00-04:00",
  }),
  fakeEvent({
    id: "evt-test-3",
    title: "TestConf: Healthcare AI Summit",
    description: "Clinical AI, biotech and digital health leaders discuss hospital deployments.",
    event_type: "conference",
    city: "Boston",
    start_at: "2026-09-22T09:00:00-04:00",
    end_at: "2026-09-22T17:00:00-04:00",
  }),
  fakeEvent({
    id: "evt-test-4",
    title: "TestConf: Job Fair for Engineers",
    description: "Hiring fair: meet engineering teams, bring your resume, on-site interviews.",
    event_type: "career",
    city: "Somerville",
    start_at: "2026-09-24T17:30:00-04:00",
    end_at: "2026-09-24T20:00:00-04:00",
  }),
  fakeEvent({
    id: "evt-test-5",
    title: "TestConf: Past Event (should be filtered)",
    description: "This already happened.",
    start_at: "2026-09-10T18:00:00-04:00",
    end_at: "2026-09-10T20:00:00-04:00",
  }),
];

const byId = (id) => FIXTURES.find((e) => e.id === id);

/** Boston calendar date (YYYY-MM-DD) — avoids UTC spillover in assertions. */
const bostonDate = (d) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);

// ---------------------------------------------------------------------------
// Intent parsing
// ---------------------------------------------------------------------------

describe("parseIntent", () => {
  it("detects investor + evening goals and the tomorrow date hint", () => {
    const intent = parseIntent("I want to meet investors and VCs tomorrow evening", NOW);
    assert.ok(intent.goals.includes("investors"), `goals=${intent.goals}`);
    assert.ok(intent.goals.includes("evening"), `goals=${intent.goals}`);
    assert.equal(intent.timeOfDay, "evening");
    assert.ok(intent.dateRange, "expected a date range");
    assert.equal(bostonDate(intent.dateRange.from), "2026-09-17");
    assert.equal(bostonDate(intent.dateRange.to), "2026-09-17");
  });

  it("detects robotics + workshop goals, city hint, and this-weekend window", () => {
    const intent = parseIntent("beginner robotics workshop this weekend in Cambridge", NOW);
    assert.ok(intent.goals.includes("robotics"), `goals=${intent.goals}`);
    assert.ok(intent.goals.includes("workshops"), `goals=${intent.goals}`);
    assert.equal(intent.cityHint, "cambridge");
    assert.ok(intent.dateRange, "expected a date range");
    // 2026-09-19 is a Saturday, 2026-09-20 a Sunday
    assert.equal(bostonDate(intent.dateRange.from), "2026-09-19");
    assert.equal(bostonDate(intent.dateRange.to), "2026-09-20");
  });

  it("detects jobs goal and weekday hints", () => {
    const intent = parseIntent("any hiring events next friday?", NOW);
    assert.ok(intent.goals.includes("jobs"), `goals=${intent.goals}`);
    assert.ok(intent.dateRange, "expected a date range");
    // 2026-09-25 is the Friday of next week
    assert.equal(bostonDate(intent.dateRange.from), "2026-09-25");
  });

  it("returns empty goals for a vague message", () => {
    const intent = parseIntent("what is happening?", NOW);
    assert.deepEqual(intent.goals, []);
    assert.equal(intent.dateRange, null);
    assert.equal(intent.cityHint, null);
  });
});

// ---------------------------------------------------------------------------
// Scoring + candidate selection
// ---------------------------------------------------------------------------

describe("scoreEvent / selectCandidates", () => {
  it("ranks the investor mixer above the robotics workshop for an investor query", () => {
    const intent = parseIntent("meet investors and VCs for my startup", NOW);
    const a = scoreEvent(byId("evt-test-1"), intent, {}, NOW);
    const b = scoreEvent(byId("evt-test-2"), intent, {}, NOW);
    assert.ok(a.matchedGoals.includes("investors"));
    assert.ok(a.score > b.score, `investor=${a.score} robotics=${b.score}`);
  });

  it("filters out past events", () => {
    const intent = parseIntent("anything interesting?", NOW);
    const cands = selectCandidates(FIXTURES, intent, {}, NOW);
    assert.ok(!cands.some((c) => c.event.id === "evt-test-5"), "past event leaked through");
    assert.equal(cands.length, 4);
  });

  it("honors exclude_ids", () => {
    const intent = parseIntent("investors", NOW);
    const cands = selectCandidates(FIXTURES, intent, { exclude_ids: ["evt-test-1"] }, NOW);
    assert.ok(!cands.some((c) => c.event.id === "evt-test-1"));
  });

  it("applies context date_from/date_to filters", () => {
    const intent = parseIntent("events", NOW);
    const cands = selectCandidates(
      FIXTURES, intent,
      { date_from: "2026-09-20T00:00:00-04:00", date_to: "2026-09-23T23:59:59-04:00" },
      NOW,
    );
    assert.deepEqual(cands.map((c) => c.event.id), ["evt-test-3"]);
  });

  it("caps candidates at 12", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      fakeEvent({ id: `evt-bulk-${i}`, start_at: "2026-09-20T10:00:00-04:00", end_at: "2026-09-20T12:00:00-04:00" }),
    );
    const intent = parseIntent("events", NOW);
    const cands = selectCandidates(many, intent, {}, NOW);
    assert.equal(cands.length, 12);
  });

  it("penalizes city mismatch when a city is requested", () => {
    const intent = parseIntent("events in Cambridge", NOW);
    const cam = scoreEvent(byId("evt-test-1"), intent, {}, NOW);
    const bos = scoreEvent(byId("evt-test-2"), intent, {}, NOW);
    assert.ok(cam.score > bos.score, `cambridge=${cam.score} boston=${bos.score}`);
  });
});

// ---------------------------------------------------------------------------
// Model output validation + sanitization (anti-hallucination)
// ---------------------------------------------------------------------------

describe("ModelOutputSchema / sanitizeModelOutput", () => {
  it("accepts a well-formed model output", () => {
    const out = ModelOutputSchema.safeParse({
      recommendations: [{ event_id: "evt-test-1", reason: "Great for meeting VCs." }],
      follow_up_question: "Are you fundraising now?",
    });
    assert.ok(out.success);
  });

  it("rejects malformed model output", () => {
    assert.ok(!ModelOutputSchema.safeParse({ recommendations: [] }).success);
    assert.ok(!ModelOutputSchema.safeParse({ nope: true }).success);
    assert.ok(!ModelOutputSchema.safeParse({
      recommendations: [{ event_id: "x".repeat(500), reason: "ok" }],
    }).success);
  });

  it("drops invented event ids and dedupes", () => {
    const intent = parseIntent("investors", NOW);
    const cands = selectCandidates(FIXTURES, intent, {}, NOW);
    const clean = sanitizeModelOutput([
      { event_id: "evt-test-1", reason: "real" },
      { event_id: "evt-invented-999", reason: "hallucinated" },
      { event_id: "evt-test-1", reason: "duplicate" },
    ], cands);
    assert.deepEqual(clean.map((r) => r.event_id), ["evt-test-1"]);
  });

  it("tops up sparse model output with keyword picks", () => {
    const intent = parseIntent("investors", NOW);
    const cands = selectCandidates(FIXTURES, intent, {}, NOW);
    const topped = topUpWithKeywords([{ event_id: "evt-test-1", reason: "real" }], cands, intent, 3);
    assert.equal(topped.length, 3);
    assert.ok(topped.every((r) => cands.some((c) => c.event.id === r.event_id)));
  });
});

// ---------------------------------------------------------------------------
// Request schema
// ---------------------------------------------------------------------------

describe("ConciergeRequestSchema", () => {
  it("accepts a valid request", () => {
    assert.ok(ConciergeRequestSchema.safeParse({ message: "hello" }).success);
    assert.ok(ConciergeRequestSchema.safeParse({
      message: "investor events?",
      context: { city: "Boston", time_of_day: "evening", exclude_ids: ["a"] },
    }).success);
  });

  it("rejects empty or over-long messages", () => {
    assert.ok(!ConciergeRequestSchema.safeParse({ message: "" }).success);
    assert.ok(!ConciergeRequestSchema.safeParse({ message: "x".repeat(501) }).success);
    assert.ok(!ConciergeRequestSchema.safeParse({}).success);
  });
});

// ---------------------------------------------------------------------------
// getAIConfig: never throws, degrades honestly
// ---------------------------------------------------------------------------

describe("getAIConfig", () => {
  it("returns null when no key is configured", () => {
    assert.equal(getAIConfig({}), null);
    assert.equal(getAIConfig({ AI_PROVIDER: "openai" }), null);
  });

  it("returns a config when a key is set", () => {
    const cfg = getAIConfig({ AI_PROVIDER: "anthropic", AI_API_KEY: "sk-test", AI_MODEL: "m" });
    assert.ok(cfg && "provider" in cfg && cfg.provider === "anthropic");
  });

  it("flags unsupported providers instead of crashing", () => {
    const cfg = getAIConfig({ AI_PROVIDER: "google", AI_API_KEY: "sk-test" });
    assert.ok(cfg && "unsupported" in cfg && cfg.unsupported === "google");
  });
});

// ---------------------------------------------------------------------------
// runConcierge end-to-end (no network): graceful degradation
// ---------------------------------------------------------------------------

describe("runConcierge", () => {
  const fetchEvents = async () => FIXTURES;

  it("degrades to keyword-fallback when no API key is configured", async () => {
    const res = await runConcierge(
      { message: "I want to meet investors tomorrow evening" },
      fetchEvents,
      { env: {}, now: NOW },
    );
    assert.equal(res.source, "keyword-fallback");
    assert.ok(res.recommendations.length > 0, "expected recommendations");
    assert.ok(res.recommendations.length <= 8);
    // Every id must be a real fixture id — no hallucinations.
    const ids = new Set(FIXTURES.map((e) => e.id));
    assert.ok(res.recommendations.every((r) => ids.has(r.event_id)));
    // Investor mixer should rank first for this query.
    assert.equal(res.recommendations[0].event_id, "evt-test-1");
    assert.ok(res.note && res.note.includes("AI_API_KEY"));
    // Output validates against the public response schema.
    assert.ok(ConciergeResponseSchema.safeParse(res).success);
  });

  it("falls back honestly when the AI provider call fails", async () => {
    const boom = async () => { throw new Error("network down"); };
    const res = await runConcierge(
      { message: "robotics workshop for beginners" },
      fetchEvents,
      {
        env: { AI_PROVIDER: "openai", AI_API_KEY: "sk-test-fake", AI_MODEL: "gpt-4o-mini" },
        fetchFn: boom,
        now: NOW,
      },
    );
    assert.equal(res.source, "keyword-fallback");
    assert.ok(res.note && res.note.includes("unavailable"));
    assert.ok(res.recommendations.length > 0);
  });

  it("returns an empty-but-valid response when nothing matches", async () => {
    const res = await runConcierge(
      { message: "events" },
      async () => [],
      { env: {}, now: NOW },
    );
    assert.equal(res.source, "keyword-fallback");
    assert.deepEqual(res.recommendations, []);
    assert.ok(res.note);
    assert.ok(ConciergeResponseSchema.safeParse(res).success);
  });

  it("propagates retrieval failures instead of faking results", async () => {
    await assert.rejects(
      runConcierge({ message: "hi" }, async () => { throw new Error("db down"); }, { env: {}, now: NOW }),
      /Event retrieval failed/,
    );
  });

  it("keywordFallbackResponse builds labeled template reasons", () => {
    const intent = parseIntent("find a co-founder, healthcare", NOW);
    const cands = selectCandidates(FIXTURES, intent, {}, NOW);
    const res = keywordFallbackResponse(cands, intent, "test note");
    assert.equal(res.source, "keyword-fallback");
    assert.ok(res.recommendations.every((r) => r.reason.includes("Keyword-ranked")));
    assert.equal(res.note, "test note");
  });
});
