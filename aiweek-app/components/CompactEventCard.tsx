"use client";

import { useEffect, useState } from "react";
import {
  CategoryTile,
  RegisterButton,
  displayTitle,
} from "@/components/EventCard";
import { formatEventDate, formatLocation } from "@/lib/format";
import { isSaved, onSavedChange, saveEvent, unsaveEvent } from "@/lib/saved";
import type { EventWithStats } from "@/lib/api";
import CommunityBar from "@/components/CommunityBar";
import Link from 'next/link';

interface Props {
  event: EventWithStats;
  selected?: boolean;
  onSelect?: () => void;
  onHover?: (hovering: boolean) => void;
}

function EventThumb({ event }: { event: EventWithStats }) {
  const [failed, setFailed] = useState(false);
  const title = displayTitle(event);
  if (event.image_url && !failed) {
    return (
      <img
        src={event.image_url}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-16 w-20 shrink-0 rounded-xl object-cover"
      />
    );
  }
  return (
    <CategoryTile
      eventType={event.event_type}
      className="h-16 w-20 shrink-0 rounded-xl"
      compact
    />
  );
}

function SaveButton({ event }: { event: EventWithStats }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setSaved(isSaved(event.id));
    return onSavedChange(() => setSaved(isSaved(event.id)));
  }, [event.id]);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        saved ? unsaveEvent(event.id) : saveEvent(event);
      }}
      aria-pressed={saved}
      aria-label={saved ? "Remove from My Plan" : "Save to My Plan"}
      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-zinc-200 text-lg hover:bg-canvas-soft"
    >
      <span aria-hidden="true" className={saved ? "text-pink" : "text-zinc-400"}>
        {saved ? "★" : "☆"}
      </span>
    </button>
  );
}

/**
 * Compact card for the map "Events in view" panel.
 */
export default function CompactEventCard({ event, selected = false, onSelect, onHover }: Props) {
  const title = displayTitle(event);
  const location = formatLocation(event.city, event.neighborhood);
  return <article
    onMouseEnter={() => onHover?.(true)} onMouseLeave={() => onHover?.(false)}
    className={`rounded-2xl border bg-white p-3 shadow-card ${selected ? 'border-pink ring-2 ring-pink/25' : 'border-zinc-200/80'}`}>
    <div className="flex gap-3">
      <EventThumb event={event} />
      <div className="min-w-0 flex-1">
        <h3><button type="button" onClick={onSelect} aria-pressed={selected} className="min-h-[44px] text-left text-sm font-bold leading-snug hover:underline">{title}</button></h3>
        <p className="text-xs text-ink-soft"><time dateTime={event.start_at}>{formatEventDate(event.start_at, event.end_at)}</time></p>
        {event.venue && <p className="mt-1 break-words text-xs text-ink-soft">{event.venue}</p>}
        {location && <p className="text-xs text-ink-soft">{location}</p>}
        {event.location_accuracy === 'approximate' && <p className="text-xs text-ink-soft">Approximate district location</p>}
        {event.lat == null && <p className="text-xs text-ink-soft">Location not mapped yet</p>}
        <Link className="inline-flex min-h-[44px] items-center text-sm text-pink underline" href={`/events/${encodeURIComponent(event.id)}`}>Event details</Link>
      </div>
    </div>
    <div className="mt-2 border-t border-stone-100 pt-2"><CommunityBar eventId={event.id} compact /></div>
    <div className="mt-2 flex items-center justify-end gap-2"><SaveButton event={event} /><RegisterButton event={event} className="!min-h-[44px] !px-3 !text-xs" /></div>
  </article>;
}
