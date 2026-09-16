"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import EventFiltersBar from "@/components/EventFilters";
import EventMap from "@/components/EventMap";
import TrendingSection from "@/components/TrendingSection";
import { fetchAllEvents, type EventWithStats } from "@/lib/api";
import {
  DEFAULT_FILTERS,
  computeCoreWeekRange,
  deriveEventTypes,
  deriveLocations,
  filterEvents,
  trendingEvents,
  upcomingEvents,
  type EventFilters,
} from "@/lib/filters";

export default function PlannerDashboard() {
  const [events, setEvents] = useState<EventWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<EventFilters>(DEFAULT_FILTERS);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchAllEvents();
      setEvents(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const coreWeek = useMemo(() => computeCoreWeekRange(events), [events]);
  const eventTypes = useMemo(() => deriveEventTypes(events), [events]);
  const locations = useMemo(() => deriveLocations(events), [events]);

  const filtered = useMemo(
    () => filterEvents(events, filters, coreWeek),
    [events, filters, coreWeek]
  );

  const upcomingCount = useMemo(() => upcomingEvents(events).length, [events]);
  const trending = useMemo(() => trendingEvents(events, 3), [events]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 md:pt-8">
      <header className="text-center md:text-left">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
          Boston <span className="gradient-text">AI Week</span>
        </h1>
        <p className="mt-2 text-lg text-ink-soft">
          {loading ? (
            "Loading the festival catalog…"
          ) : error ? (
            "Couldn't load events right now."
          ) : (
            <>
              <span className="font-semibold text-ink">{upcomingCount}</span> upcoming
              event{upcomingCount === 1 ? "" : "s"} across the festival
            </>
          )}
        </p>
      </header>
      <p className="mt-3 max-w-2xl text-base text-ink-soft">
        Find your people. Discover something new. Save the events you love and make the week your own.
      </p>
      <nav aria-label="Explore the planner" className="mt-5 flex flex-wrap gap-3">
        <a href="#map" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-pink px-5 font-semibold text-ink">Map &amp; events <span aria-hidden="true">↓</span></a>
        <Link href="/gallery" className="inline-flex min-h-[44px] items-center rounded-full border border-pink/40 bg-white px-5 font-semibold text-ink">Event gallery</Link>
        <Link href="/gallery#community" className="inline-flex min-h-[44px] items-center rounded-full border border-pink/40 bg-white px-5 font-semibold text-ink">Community comments</Link>
      </nav>

      <div className="mt-6">
        <EventFiltersBar
          filters={filters}
          onChange={setFilters}
          eventTypes={eventTypes}
          locations={locations}
          events={events}
        />
      </div>

      <section id="map" aria-label="Event map" className="mt-4 scroll-mt-24">
        <EventMap
          events={filtered}
          loading={loading}
          error={error}
          onRetry={() => void load()}
        />
      </section>
      {!loading && !error && <TrendingSection events={trending} />}
    </div>
  );
}
