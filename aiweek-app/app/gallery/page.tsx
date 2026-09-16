"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import EventCard from "@/components/EventCard";
import EventFiltersBar from "@/components/EventFilters";
import { fetchAllEvents, type EventWithStats } from "@/lib/api";
import {
  DEFAULT_FILTERS,
  computeCoreWeekRange,
  deriveEventTypes,
  deriveLocations,
  filterEvents,
  sortEvents,
  type EventFilters,
  type GallerySort,
} from "@/lib/filters";

export default function GalleryPage() {
  const [events, setEvents] = useState<EventWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<EventFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<GallerySort>("soonest");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEvents(await fetchAllEvents());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const showDiscussion = () => {
      if (window.location.hash === "#community") setSort("most_discussed");
    };
    showDiscussion();
    window.addEventListener("hashchange", showDiscussion);
    return () => window.removeEventListener("hashchange", showDiscussion);
  }, []);

  const coreWeek = useMemo(() => computeCoreWeekRange(events), [events]);
  const eventTypes = useMemo(() => deriveEventTypes(events), [events]);
  const locations = useMemo(() => deriveLocations(events), [events]);

  const displayed = useMemo(() => {
    const filtered = filterEvents(events, filters, coreWeek);
    return sortEvents(filtered, sort);
  }, [events, filters, coreWeek, sort]);

  return (
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-7xl px-4 py-8 md:py-10">
        <header>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            Event <span className="gradient-text">Gallery</span>
          </h1>
          <p className="mt-2 text-ink-soft">
            Browse every Boston AI Week event — react, comment, and save your favorites.
          </p>
          <p className="mt-2 text-sm text-ink-soft">Read community comments on any event. Ask a question or share your experience with a display name — no email needed.</p>
        </header>

        <div className="mt-6 space-y-4">
          <EventFiltersBar
            filters={filters}
            onChange={setFilters}
            eventTypes={eventTypes}
            locations={locations}
            events={events}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-soft">
              {loading ? "Loading…" : `${displayed.length} event${displayed.length === 1 ? "" : "s"}`}
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor="gallery-sort" className="text-sm font-medium text-ink-soft">
                Sort
              </label>
              <select
                id="gallery-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as GallerySort)}
                className="min-h-[40px] rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:border-pink focus:outline-none focus:ring-2 focus:ring-pink/20"
              >
                <option value="soonest">Soonest</option>
                <option value="most_liked">Most liked</option>
                <option value="most_discussed">Most discussed</option>
              </select>
            </div>
          </div>
        </div>

        {loading && (
          <p className="mt-8 text-center text-ink-soft">Loading events…</p>
        )}

        {error && (
          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-card">
            <p role="alert" className="font-semibold text-red-700">
              Unable to load events
            </p>
            <p className="mt-1 text-sm text-ink-soft">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 min-h-[44px] rounded-full bg-pink px-6 text-sm font-semibold text-white hover:opacity-90"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && displayed.length === 0 && (
          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-card">
            <p className="text-lg font-bold">No events match these filters</p>
            <p className="mt-2 text-sm text-ink-soft">Try clearing filters or choosing a different date.</p>
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="mt-4 min-h-[44px] rounded-full border border-pink/40 px-6 text-sm font-semibold text-pink hover:bg-canvas-soft"
            >
              Clear filters
            </button>
          </div>
        )}

        {!loading && !error && displayed.length > 0 && (
          <section id="community" aria-label="Events" className="mt-6 scroll-mt-24">
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {displayed.map((e) => (
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
