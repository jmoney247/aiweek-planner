# AI Event Concierge — `POST /api/concierge`

Server-side recommendation endpoint for the Boston AI Week community app.
Given a free-text request ("I want to meet investors tomorrow evening"), it
returns 3–8 event recommendations drawn **only** from the real Supabase event
catalog — never invented.

## How it works

```
client ──POST {message, context?}──▶ /api/concierge
                                        │
                                        ▼
                              1. zod-validate input (message 1–500 chars)
                              2. parseIntent() — goals, date/time/city hints
                              3. fetch upcoming events from Supabase (anon read)
                              4. scoreEvent() keyword ranking → top 12 candidates
                              5a. AI_API_KEY set → model re-ranks candidates
                              5b. no key / AI fails → keyword fallback (labeled)
                                        │
                                        ▼
                              { recommendations: [{event_id, reason}],
                                follow_up_question?, source, note? }
```

The frontend hydrates full event data by `event_id` from `/api/events`
(it never trusts titles/dates from the concierge response).

## Anti-hallucination design

1. **Retrieval before generation.** The model only ever sees the 12
   candidate events fetched from Supabase, serialized as compact JSON
   (`id`, title, one-line summary, start time, city, venue, registration
   status). It has no other event knowledge to draw on.
2. **Hard rules in the system prompt.** Recommend ONLY events from the list
   by exact `id`; 3–8 recs; one short reason each; "likely to attract"
   language (never guarantees about attendees, jobs, or funding); at most
   one follow-up question and only when genuinely ambiguous; reply JSON only.
3. **Output validation + id allowlist.** The model JSON is parsed with zod
   (`ModelOutputSchema`). `sanitizeModelOutput()` then **drops every
   recommendation whose `event_id` is not in the candidate list** — an
   invented id can never reach the client. Results are deduped and capped
   at 8; if fewer than 3 survive, keyword picks top it up.
4. **Honest fallback.** Any AI failure (no key, network error, bad JSON,
   zero valid ids) returns the transparent keyword ranking with
   `"source": "keyword-fallback"` and a `note` explaining why — never a
   faked AI answer. The keyword scorer's weights are documented in
   `lib/concierge.ts` (`scoreEvent` docstring) so ranking is explainable.

## Environment setup

`lib/env.ts` already declares the AI variables (they were present before
this feature). Set them in `.env.local` (local) or the Vercel project
settings (production):

| Variable      | Required? | Values / notes |
|---------------|-----------|----------------|
| `AI_PROVIDER` | No (default `openai`) | `openai` = any OpenAI-compatible chat-completions API · `anthropic` = Anthropic Messages API. Anything else → honest keyword fallback with a note. |
| `AI_API_KEY`  | **Yes, to enable AI** | The provider secret key. **No key → the route still works** via keyword fallback; it never 500s on a missing key. |
| `AI_MODEL`    | No | Model id. Defaults: `gpt-4o-mini` (openai), `claude-3-5-haiku-latest` (anthropic). Set explicitly in production. |
| `AI_BASE_URL` | No | Override the chat-completions base URL (default `https://api.openai.com/v1`). Useful for OpenAI-compatible gateways/proxies. **OpenAI-compatible means: `POST {base}/chat/completions` with `response_format: {"type":"json_object"}`** — Azure OpenAI, OpenRouter, LiteLLM, vLLM, Ollama (with JSON mode) all work. |

Example `.env.local` (placeholders — never commit real keys):

```bash
# OpenAI (or any OpenAI-compatible endpoint)
AI_PROVIDER=openai
AI_API_KEY=sk-your-key-here
AI_MODEL=gpt-4o-mini
# AI_BASE_URL=https://your-gateway.example.com/v1   # optional

# Anthropic
# AI_PROVIDER=anthropic
# AI_API_KEY=sk-ant-your-key-here
# AI_MODEL=claude-3-5-haiku-latest
```

## How the key stays server-side

- `AI_API_KEY` is read **only** in `lib/concierge.ts` via `getAIConfig()`,
  which is imported only by `app/api/concierge/route.ts` (a server route).
- It is **never** prefixed `NEXT_PUBLIC_`, never returned in any response,
  never logged, and never passed to the browser. The client only ever sees
  `{event_id, reason}` pairs.
- Verified: `grep -rn "AI_API_KEY" app components` shows hits only in
  `app/api/concierge/route.ts` (server) and `lib/concierge.ts` (server).
  Zero references in client components.
- Error messages from the provider are truncated to 300 chars server-side
  and never forwarded to the client (the client gets a generic note).

## Cost / latency notes

- One request = 1 Supabase query (upcoming events, capped at 500 rows)
  + at most 1 model call. No streaming, no multi-turn.
- Payload to the model is small: 12 candidates × ~150 tokens ≈ 2k input
  tokens; output capped at `max_tokens: 1200`. With `gpt-4o-mini` /
  Haiku-class models this is a fraction of a cent per request.
- `temperature: 0.3` keeps output stable and JSON-shaped; `response_format:
  {"type":"json_object"}` is requested for OpenAI-compatible providers.
- 25s server-side timeout (`AbortController`) per provider call — well
  under the Vercel hobby 60s limit. On timeout the route returns the
  keyword fallback, not an error.
- Abuse surface is bounded: message capped at 500 chars, response at 8
  recs, candidate list at 12. Consider adding the repo's rate limiter
  (`lib/rate-limit.ts`) per IP/session if the endpoint is hit hard.

## Keyword scorer (fallback + candidate selection)

Weights (see `scoreEvent` in `lib/concierge.ts`):

- +3 per matched goal-keyword hit (cap 3 hits/goal), +2 if it also
  appears in `event_type`
- +4 event inside parsed date window / −10 outside it
- +2 start time matches requested time-of-day bucket (Boston time)
- +3 city match / −8 city mismatch (when a city was given)
- +1 direct (one-click) registration · −2 already-saved event · +1 within 7 days

Goals detected: co-founder, investors/VC, jobs/hiring, CTO/engineering,
healthcare/biotech, robotics/hardware, workshops/beginner, social/fun,
evening/after-work. Date hints: tonight, tomorrow, this weekend, next
week, this week, weekday names ("friday", "next friday"). City hints:
Boston-area municipalities and neighborhoods.

Known limitations:

- `context.max_travel_min` is accepted for API compatibility but
  **travel-time filtering is not implemented yet** (needs geocoding +
  a distance matrix). It is ignored, not faked.
- The optional `aiweek_session` cookie is read by the route but there is
  no server-side saved-events store yet — pass `saved_event_ids`
  explicitly in `context` (the client can source them from localStorage).
- Date parsing is English-only and Boston-timezone-based.

## Testing

```bash
node --test scripts/test-concierge.mjs   # 24 unit tests, no network
```

Covers: intent parsing (goals/dates/city), scoring order, candidate
selection (past-event filtering, `exclude_ids`, date filters, 12-cap),
model-output schema validation, invented-id sanitization, request schema
limits, `getAIConfig` degradation, and end-to-end `runConcierge`
degradation with no key / provider failure / empty catalog.

`lib/concierge.ts` is deliberately framework-free (only `zod` +
`import type` from `./types`, no `@/` aliases, no TS enums) so the tests
can import it directly under Node 22+ type stripping.
