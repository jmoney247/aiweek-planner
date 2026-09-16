"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RegisterButton, displayTitle } from "@/components/EventCard";
import { formatEventDate, formatLocation } from "@/lib/format";
import { downloadIcs } from "@/lib/ics";
import { getSavedEvents, onSavedChange, unsaveEvent } from "@/lib/saved";
import type { Event } from "@/lib/types";

interface Conflict {
  withId: string;
  withTitle: string;
  overlapMin: number;
}

/** For each event, find saved events it overlaps with. */
function findConflicts(events: Event[]): Map<string, Conflict[]> {
  const map = new Map<string, Conflict[]>();
  const withEnds = events.map((e) => ({
    e,
    start: new Date(e.start_at).getTime(),
    end: e.end_at ? new Date(e.end_at).getTime() : new Date(e.start_at).getTime() + 60 * 60 * 1000,
  }));
  for (let i = 0; i < withEnds.length; i++) {
    for (let j = i + 1; j < withEnds.length; j++) {
      const a = withEnds[i];
      const b = withEnds[j];
      const overlap = Math.min(a.end, b.end) - Math.max(a.start, b.start);
      if (overlap > 0) {
        const mins = Math.round(overlap / 60000);
        const ca = map.get(a.e.id) ?? [];
        ca.push({ withId: b.e.id, withTitle: displayTitle(b.e), overlapMin: mins });
        map.set(a.e.id, ca);
        const cb = map.get(b.e.id) ?? [];
        cb.push({ withId: a.e.id, withTitle: displayTitle(a.e), overlapMin: mins });
        map.set(b.e.id, cb);
      }
    }
  }
  return map;
}

/**
 * My Plan: saved events in chronological order, conflict warnings,
 * per-event and bulk .ics calendar downloads.
 */
export default function PlanPage() {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    setEvents(getSavedEvents());
    return onSavedChange(() => setEvents(getSavedEvents()));
  }, []);

  const conflicts = findConflicts(events);

  const icsInput = (e: Event) => ({
    id: e.id,
    title: displayTitle(e),
    start_at: e.start_at,
    end_at: e.end_at,
    venue: e.venue,
    address: e.address,
    official_url: e.official_url,
  });

  return (
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight">
          My <span className="gradient-text">Plan</span>
        </h1>
        <p className="mt-2 text-ink-soft">
          Events you've saved. Stored on this device only.
        </p>

        {events.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-zinc-200/80 bg-white p-8 text-center shadow-card">
            <p className="text-lg font-bold">Nothing saved yet</p>
            <p className="mt-2 text-sm text-ink-soft">
              Tap the ☆ star on any event card to add it to your plan.
            </p>
            <Link
              href="/gallery"
              className="mt-4 inline-flex min-h-[44px] items-center rounded-full hero-gradient-bg px-6 py-2.5 font-semibold text-white hover:opacity-90"
            >
              Browse events
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <p className="text-sm text-ink-soft">
                {events.length} saved event{events.length === 1 ? "" : "s"}
              </p>
              <button
                type="button"
                onClick={() =>
                  downloadIcs(
                    "boston-ai-week-plan.ics",
                    events.map(icsInput)
                  )
                }
                className="inline-flex min-h-[44px] items-center rounded-full border border-pink/40 px-5 py-2 text-sm font-semibold text-pink hover:bg-canvas-soft"
              >
                ⬇ Download all (.ics)
              </button>
            </div>

            <ol className="mt-4 space-y-4">
              {events.map((e) => {
                const cs = conflicts.get(e.id) ?? [];
                const location = formatLocation(e.city, e.neighborhood);
                return (
                  <li
                    key={e.id}
                    className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-card"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-bold leading-snug">{displayTitle(e)}</h2>
                        <p className="mt-1 text-sm text-ink-soft">
                          <time dateTime={e.start_at}>
                            {formatEventDate(e.start_at, e.end_at)}
                          </time>
                        </p>
                        {location && (
                          <p className="text-sm text-ink-soft">📍 {location}</p>
                        )}
                        {e.venue && <p className="text-sm text-ink-soft">🏠 {e.venue}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => unsaveEvent(e.id)}
                        aria-label={`Remove "${displayTitle(e)}" from My Plan`}
                        className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full border border-stone-300 text-xl hover:bg-stone-100"
                      >
                        <span aria-hidden="true">✕</span>
                      </button>
                    </div>

                    {cs.length > 0 && (
                      <div role="alert" className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        {cs.map((c) => (
                          <p key={c.withId} className="font-medium">
                            ⚠ Conflict: overlaps by {c.overlapMin} min with “{c.withTitle}”
                          </p>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <RegisterButton event={e} />
                      <button
                        type="button"
                        onClick={() => downloadIcs(`aiweek-${e.id}.ics`, [icsInput(e)])}
                        className="inline-flex min-h-[44px] items-center rounded-full border border-stone-300 px-5 py-2 text-sm font-semibold hover:bg-stone-100"
                      >
                        ⬇ .ics
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>
    </main>
  );
}
