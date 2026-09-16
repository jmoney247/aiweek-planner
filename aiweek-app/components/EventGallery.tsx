'use client';
import { useEffect, useMemo, useState } from 'react';
import { fetchAllEvents, type EventWithStats } from '@/lib/api';
import { DEFAULT_FILTERS, computeCoreWeekRange, deriveEventTypes, deriveLocations, filterEvents, type EventFilters } from '@/lib/filters';
import EventFiltersBar from './EventFilters';
import EventCard from './EventCard';

export default function EventGallery() {
  const [events, setEvents] = useState<EventWithStats[]>([]);
  const [filters, setFilters] = useState<EventFilters>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    fetchAllEvents().then(data => { if (active) setEvents(data); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);
  const core = useMemo(() => computeCoreWeekRange(events), [events]);
  const matches = useMemo(() => filterEvents(events, filters, core), [events, filters, core]);
  return <main className="mx-auto max-w-[1600px] space-y-5 px-4 py-6">
    <header><h1 className="text-3xl font-extrabold">🖼️ Gallery</h1><p className="mt-2 text-ink-soft">See all the events. Find your next stop and join the Hype.</p></header>
    <EventFiltersBar filters={filters} onChange={setFilters} eventTypes={deriveEventTypes(events)} locations={deriveLocations(events)} events={events} compact />
    {loading ? <p role="status">Loading all events…</p> : error ? <div role="alert"><p>{error}</p><button className="min-h-[44px] underline" onClick={() => setRetry(r => r + 1)}>Try again</button></div> : <>
      <p role="status" className="text-sm text-ink-soft">{matches.length} matching events · {events.length} events in the catalog</p>
      {!matches.length && <p className="rounded-xl border bg-white p-6">No events match your filters. Try another date or clear the filters.</p>}
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">{matches.map(event => <EventCard key={event.id} event={event} gallery />)}</div>
    </>}
  </main>;
}
