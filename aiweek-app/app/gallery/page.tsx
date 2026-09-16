"use client";

import { useEffect, useMemo, useState } from "react";
import EventCard from "@/components/EventCard";
import { fetchEvents } from "@/lib/api";
import type { Event } from "@/lib/types";

/**
 * Gallery: grid of event cards with community bars.
 * The #community anchor is the target of the homepage's
 * "See what people think" feature card.
 */
export default function GalleryPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchEvents(200);
        if (!cancelled) {
          setEvents(list);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load events.");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sorted = useMemo(
    () => events.slice().sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at)),
    [events]
  );

  return (
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Event <span className="gradient-text">Gallery</span>
        </h1>
        <p className="mt-2 text-ink-soft">
          Every Boston AI Week event — see what people think, join the conversation.
        </p>

        {loading && <p className="mt-8 text-ink-soft">Loading events…</p>}

        {error && (
          <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6">
            <p role="alert" className="font-semibold text-red-700">
              Couldn't load events
            </p>
            <p className="mt-1 text-sm text-ink-soft">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 inline-flex min-h-[44px] items-center rounded-full border border-stone-300 px-5 text-sm font-semibold"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && (
          <section id="community" aria-label="Events" className="mt-8 scroll-mt-20">
            <p className="mb-4 text-sm text-ink-soft">
              {sorted.length} event{sorted.length === 1 ? "" : "s"}, soonest first
            </p>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {sorted.map((e) => (
                <li key={e.id}>
                  <EventCard event={e} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
