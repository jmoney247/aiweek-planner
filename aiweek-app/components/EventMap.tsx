"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import EventDrawer from "@/components/EventDrawer";
import { displayTitle } from "@/components/EventCard";
import { fetchEvents } from "@/lib/api";
import { formatEventDate, formatLocation } from "@/lib/format";
import type { Event } from "@/lib/types";
import type { MappedEvent } from "@/components/MapView";

// Leaflet requires `window`; load the map client-side only.
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-primary-soft/60 text-ink-soft">
      Loading map…
    </div>
  ),
});

function hasCoords(e: Event): e is MappedEvent {
  return typeof e.lat === "number" && typeof e.lng === "number" && Number.isFinite(e.lat) && Number.isFinite(e.lng);
}

/** Heuristic: online/virtual events don't need a map pin. */
function isVirtual(e: Event): boolean {
  const hay = [e.event_type, e.venue, e.address].filter(Boolean).join(" ").toLowerCase();
  return /\bvirtual\b|\bonline\b|zoom|webinar|livestream|live stream/.test(hay);
}

type LoadState = "loading" | "ready" | "error";

/**
 * Homepage map section: fetches the real catalog, renders pins only for
 * events that have coordinates (never invented), and shows an honest
 * fallback for everything still waiting on the geocoding pipeline.
 */
export default function EventMap() {
  const [events, setEvents] = useState<Event[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchEvents(200);
        if (!cancelled) {
          setEvents(list);
          setState("ready");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load events.");
          setState("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { pinned, virtual, needsAddress } = useMemo(() => {
    const pinned: MappedEvent[] = [];
    const virtual: Event[] = [];
    const needsAddress: Event[] = [];
    for (const e of events) {
      if (hasCoords(e)) pinned.push(e);
      else if (isVirtual(e)) virtual.push(e);
      else needsAddress.push(e);
    }
    return { pinned, virtual, needsAddress };
  }, [events]);

  const selected = useMemo(
    () => pinned.find((e) => e.id === selectedId) ?? null,
    [pinned, selectedId]
  );

  const onSelect = (e: MappedEvent) => setSelectedId(e.id);

  return (
    <div className="relative">
      <div className="h-[70vh] min-h-[420px] w-full">
        <MapView
          events={pinned}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={onSelect}
          onHover={setHoveredId}
        />
      </div>

      {/* Status / fallback overlay */}
      <div className="pointer-events-none absolute left-4 top-4 max-w-sm md:left-6 md:top-6">
        <div className="pointer-events-auto rounded-2xl border border-stone-200 bg-white/95 p-4 shadow-lg backdrop-blur">
          {state === "loading" && <p className="text-sm text-ink-soft">Loading events…</p>}
          {state === "error" && (
            <div>
              <p role="alert" className="text-sm font-semibold text-red-700">
                Couldn't load events
              </p>
              <p className="mt-1 text-sm text-ink-soft">{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-2 min-h-[44px] rounded-full border border-stone-300 px-4 text-sm font-semibold"
              >
                Try again
              </button>
            </div>
          )}
          {state === "ready" && (
            <div>
              <p className="text-sm font-bold">
                {pinned.length > 0
                  ? `${pinned.length} event${pinned.length === 1 ? "" : "s"} on the map`
                  : "📍 Locations coming soon"}
              </p>
              {pinned.length === 0 && needsAddress.length > 0 && (
                <p className="mt-1 text-sm text-ink-soft">
                  {needsAddress.length} event{needsAddress.length === 1 ? "" : "s"} still need
                  addresses — we're adding venue coordinates, so check back soon. Every
                  event is still browsable in the{" "}
                  <Link href="/gallery" className="font-semibold text-primary underline">
                    Gallery
                  </Link>
                  .
                </p>
              )}
              {virtual.length > 0 && (
                <p className="mt-1 text-sm text-ink-soft">
                  {virtual.length} online event{virtual.length === 1 ? " is" : "s are"} virtual —
                  no map pin needed.
                </p>
              )}
              {needsAddress.length > 0 && (
                <button
                  type="button"
                  onClick={() => setListOpen((v) => !v)}
                  aria-expanded={listOpen}
                  className="mt-2 inline-flex min-h-[44px] items-center rounded-full border border-stone-300 px-4 text-sm font-semibold hover:bg-stone-100"
                >
                  {listOpen ? "Hide list" : `See ${needsAddress.length} events without pins`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pinned-events list (marker <-> card hover sync) */}
      {state === "ready" && pinned.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-6 md:top-24 md:bottom-auto md:w-80 md:max-h-[calc(70vh-8rem)] md:overflow-y-auto">
          <ul className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible">
            {pinned
              .slice()
              .sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at))
              .map((e) => {
                const active = selectedId === e.id || hoveredId === e.id;
                return (
                  <li key={e.id} className="shrink-0 md:shrink">
                    <button
                      type="button"
                      onClick={() => onSelect(e)}
                      onMouseEnter={() => setHoveredId(e.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onFocus={() => setHoveredId(e.id)}
                      onBlur={() => setHoveredId(null)}
                      aria-pressed={selectedId === e.id}
                      className={`w-64 rounded-xl border bg-white/95 p-3 text-left shadow backdrop-blur md:w-full ${
                        active ? "border-primary-bright ring-2 ring-primary-bright/40" : "border-stone-200"
                      }`}
                    >
                      <span className="block truncate text-sm font-bold">{displayTitle(e)}</span>
                      <span className="mt-0.5 block text-xs text-ink-soft">
                        {formatEventDate(e.start_at, e.end_at)}
                      </span>
                      {formatLocation(e.city, e.neighborhood) && (
                        <span className="block text-xs text-ink-soft">
                          {formatLocation(e.city, e.neighborhood)}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
          </ul>
        </div>
      )}

      {/* Events-without-pins list (honest, scrollable) */}
      {state === "ready" && listOpen && needsAddress.length > 0 && (
        <div className="absolute inset-x-4 top-24 z-[400] max-h-[50vh] overflow-y-auto rounded-2xl border border-stone-200 bg-white p-4 shadow-xl md:left-6 md:right-auto md:w-96">
          <h3 className="text-sm font-bold">
            Events waiting on addresses ({needsAddress.length})
          </h3>
          <p className="mt-1 text-xs text-ink-soft">
            These events have no coordinates yet, so they can't be pinned. Find
            them in the Gallery meanwhile.
          </p>
          <ul className="mt-2 space-y-1.5">
            {needsAddress
              .slice()
              .sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at))
              .map((e) => (
                <li key={e.id} className="text-sm">
                  <Link href="/gallery" className="font-medium text-primary hover:underline">
                    {displayTitle(e)}
                  </Link>
                  <span className="block text-xs text-ink-soft">
                    {formatEventDate(e.start_at, e.end_at)}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}

      <EventDrawer event={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}
