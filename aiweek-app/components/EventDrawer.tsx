"use client";

import { useEffect, useRef } from "react";
import CommunityBar from "@/components/CommunityBar";
import { CategoryTile, RegisterButton, displaySummary, displayTitle } from "@/components/EventCard";
import { formatEventDate, formatLocation, isLiveNow } from "@/lib/format";
import type { Event } from "@/lib/types";
import Link from 'next/link';

interface Props {
  event: Event | null;
  onClose: () => void;
}

/**
 * Event detail drawer for the map: opens when a marker / list row is
 * selected. Desktop: right-side panel. Mobile: bottom sheet.
 */
export default function EventDrawer({ event, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!event) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    }, 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [event, onClose]);

  if (!event) return null;

  const title = displayTitle(event);
  const summary = displaySummary(event);
  const location = formatLocation(event.city, event.neighborhood);
  const live = isLiveNow(event.start_at, event.end_at);
  const address = [event.venue, event.address].filter(Boolean).join(" · ");

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="event-drawer-title"
      className="absolute inset-x-0 bottom-0 z-[500] max-h-[70%] overflow-y-auto rounded-t-2xl border-t-2 border-pink/40 bg-white shadow-2xl md:inset-x-auto md:bottom-auto md:right-4 md:top-4 md:max-h-[calc(100%-2rem)] md:w-[380px] md:rounded-2xl md:border md:border-zinc-200"
    >
      <div ref={panelRef}>
        <CategoryTile eventType={event.event_type} className="h-28 w-full" />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 id="event-drawer-title" className="text-xl font-bold leading-snug">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close event details"
              className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-xl hover:bg-canvas-soft"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {event.event_type && (
              <span className="rounded-full bg-canvas-soft px-2.5 py-0.5 text-xs font-semibold text-plum">
                {event.event_type}
              </span>
            )}
            {live && (
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                Live now
              </span>
            )}
          </div>

          <dl className="mt-3 space-y-1.5 text-sm text-ink-soft">
            <div>
              <dt className="sr-only">Date and time</dt>
              <dd>
                <span aria-hidden="true">🕒 </span>
                <time dateTime={event.start_at}>{formatEventDate(event.start_at, event.end_at)}</time>
              </dd>
            </div>
            {address && (
              <div>
                <dt className="sr-only">Venue</dt>
                <dd>
                  <span aria-hidden="true">📍 </span>
                  {address}
                  {location && ` — ${location}`}
                </dd>
              </div>
            )}
            {!address && location && (
              <div>
                <dt className="sr-only">Location</dt>
                <dd>
                  <span aria-hidden="true">📍 </span>
                  {location}
                </dd>
              </div>
            )}
            {event.hosted_by && (
              <div>
                <dt className="sr-only">Hosted by</dt>
                <dd>
                  <span aria-hidden="true">🏠 </span>
                  {event.hosted_by}
                </dd>
              </div>
            )}
          </dl>

          {summary && <p className="mt-3 text-sm">{summary}</p>}
          <p className="mt-3 text-sm text-ink-soft">{event.location_accuracy === 'approximate' ? 'Approximate district pin—exact venue undisclosed.' : event.lat == null ? 'Location not mapped yet.' : 'Confirm arrival details with the organizer.'}</p>
          <Link className="mt-3 inline-flex min-h-[44px] items-center font-bold text-pink underline" href={`/events/${encodeURIComponent(event.id)}`}>Event page, photos & experiences</Link>
          {event.about && event.about !== summary && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">{event.about}</p>
          )}

          <div className="mt-4">
            <RegisterButton event={event} className="w-full" />
          </div>

          <div className="mt-3 border-t border-zinc-100 pt-2">
            <CommunityBar eventId={event.id} lazy={false} />
          </div>
        </div>
      </div>
    </div>
  );
}
