"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import CompactEventCard from "@/components/CompactEventCard";
import EventDrawer from "@/components/EventDrawer";
import type { EventWithStats } from "@/lib/api";
import type { MappedEvent } from "@/components/MapView";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-2xl bg-canvas-soft text-ink-soft">
      Loading map…
    </div>
  ),
});

function hasCoords(e: EventWithStats): e is MappedEvent {
  return (
    typeof e.lat === "number" &&
    typeof e.lng === "number" &&
    Number.isFinite(e.lat) &&
    Number.isFinite(e.lng) && Math.abs(e.lat) <= 90 && Math.abs(e.lng) <= 180
  );
}

function isVirtual(e: EventWithStats): boolean {
  const hay = [e.event_type, e.venue, e.address, e.city].filter(Boolean).join(" ").toLowerCase();
  return /\bvirtual\b|\bonline\b|zoom|webinar|livestream|live stream/.test(hay);
}

interface Props {
  focusEventId?: string | null;
  events: EventWithStats[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export default function EventMap({ events, loading = false, error = null, onRetry, focusEventId }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const focused = useRef<string | null>(null);
  useEffect(() => {
    if (!focusEventId) focused.current = null;
    if (focusEventId && focused.current !== focusEventId && events.some(e => e.id === focusEventId)) {
      setSelectedId(focusEventId); focused.current = focusEventId;
    }
  }, [focusEventId, events]);

  const { pinned, listEvents, virtualCount, noCoordCount } = useMemo(() => {
    const pinned: MappedEvent[] = [];
    const listEvents: EventWithStats[] = [];
    let virtualCount = 0;
    let noCoordCount = 0;
    for (const e of events) {
      listEvents.push(e);
      if (isVirtual(e)) virtualCount += 1;
      else if (hasCoords(e)) pinned.push(e);
      else noCoordCount += 1;
    }
    listEvents.sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at));
    return { pinned, listEvents, virtualCount, noCoordCount };
  }, [events]);

  const selected = useMemo(
    () => listEvents.find((e) => e.id === selectedId) ?? null,
    [listEvents, selectedId]
  );

  useEffect(() => {
    if (!selectedId || !listRef.current) return;
    const el = Array.from(listRef.current.querySelectorAll<HTMLElement>('[data-event-id]')).find(el => el.dataset.eventId === selectedId);
    el?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: "nearest" });
  }, [selectedId]);

  const mapShell = (
    <div className={`relative ${fullscreen ? "fixed inset-0 z-[80] bg-canvas p-2 md:p-4" : "h-full min-h-[420px]"}`}>
      {fullscreen && (
        <button
          type="button"
          onClick={() => setFullscreen(false)}
          className="absolute right-4 top-4 z-[90] min-h-[44px] rounded-full bg-white px-4 text-sm font-semibold shadow-lg hover:bg-canvas-soft"
        >
          Exit full screen
        </button>
      )}
      <div className="relative h-full w-full">
        <MapView
          events={pinned}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={(e) => setSelectedId(e.id)}
          onHover={setHoveredId}
        />
        {!loading && !error && pinned.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
            <div className="pointer-events-auto max-w-sm rounded-2xl border border-zinc-200 bg-white/95 p-5 text-center shadow-lg backdrop-blur">
              <p className="font-bold text-plum">{listEvents.length ? 'No mapped locations for these events' : 'No events match your filters'}</p>
              <p className="mt-2 text-sm text-ink-soft">
                {noCoordCount > 0
                  ? `${noCoordCount} event${noCoordCount === 1 ? "" : "s"} still need coordinates — browse them in the list →`
                  : "Events appear in the panel when filters match."}
              </p>
            </div>
          </div>
        )}
      </div>
      {selected && fullscreen && (
        <EventDrawer event={selected} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8">
        <p className="text-ink-soft">Loading events…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
        <p role="alert" className="font-semibold text-red-700">
          Unable to load events
        </p>
        <p className="mt-1 text-sm text-ink-soft">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 min-h-[44px] rounded-full bg-pink px-6 text-sm font-semibold text-white hover:opacity-90"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={fullscreen ? "" : "relative isolate overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-card"}>
      <div className={`flex flex-col ${fullscreen ? "h-screen" : "lg:flex-row lg:h-[min(72vh,720px)]"}`}>
        {/* Map column ~68% */}
        <div className={`relative ${fullscreen ? "flex-1" : "h-[420px] lg:h-auto lg:w-[68%]"}`}>
          {mapShell}
          {!fullscreen && (
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              className="absolute bottom-3 right-3 z-[500] min-h-[40px] rounded-full border border-zinc-200 bg-white/95 px-4 text-sm font-semibold shadow backdrop-blur hover:bg-canvas-soft"
            >
              Full-screen map
            </button>
          )}
        </div>

        {/* Events in view panel ~32% */}
        {!fullscreen && (
          <aside className="flex min-h-0 flex-col border-t border-zinc-200 lg:w-[32%] lg:border-l lg:border-t-0">
            <div className="border-b border-zinc-100 px-4 py-3">
              <h2 className="text-base font-bold">Matching Events</h2>
              <p className="text-xs text-ink-soft" role="status">
                {listEvents.length} matching event{listEvents.length === 1 ? "" : "s"}
                {` · ${pinned.length} shown on map`}
              </p>
              {(virtualCount > 0 || noCoordCount > 0) && (
                <p className="mt-1 text-xs text-ink-muted">
                  {virtualCount > 0 && `${virtualCount} virtual`}
                  {virtualCount > 0 && noCoordCount > 0 && " · "}
                  {noCoordCount > 0 && (
                    <>
                      {noCoordCount} not mapped yet — included below
                    </>
                  )}
                </p>
              )}
            </div>
            <div ref={listRef} className="max-h-[65vh] min-h-0 flex-1 overflow-y-auto p-3 lg:max-h-none">
              {listEvents.length === 0 ? (
                <div className="rounded-xl bg-canvas-soft p-6 text-center">
                  <p className="font-semibold">No events match these filters</p>
                  <p className="mt-1 text-sm text-ink-soft">Try clearing filters above.</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {listEvents.map((e) => (
                    <li key={e.id} data-event-id={e.id}>
                      <CompactEventCard
                        event={e}
                        selected={selectedId === e.id || hoveredId === e.id}
                        onSelect={() => setSelectedId(e.id)}
                        onHover={(h) => setHoveredId(h ? e.id : null)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        )}
      </div>

      {!fullscreen && selected && (
        <EventDrawer event={selected} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
