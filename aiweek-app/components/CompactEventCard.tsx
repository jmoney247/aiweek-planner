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
import CommentsDrawer from "@/components/CommentsDrawer";
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
export default function CompactEventCard({
  event,
  selected = false,
  onSelect,
  onHover,
}: Props) {
  const title = displayTitle(event);
  const location = formatLocation(event.city, event.neighborhood);
  const likes = event.stats?.likes ?? 0;
  const [commentsOpen, setCommentsOpen] = useState(false);

  return (
    <>
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.();
        }
      }}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      onFocus={() => onHover?.(true)}
      onBlur={() => onHover?.(false)}
      aria-pressed={selected}
      className={`flex cursor-pointer gap-3 rounded-2xl border bg-white p-3 shadow-card transition-all ${
        selected
          ? "border-pink ring-2 ring-pink/25 shadow-card-hover"
          : "border-zinc-200/80 hover:border-pink/30 hover:shadow-card-hover"
      }`}
    >
      <EventThumb event={event} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug">{title}</h3>
          {event.event_type && (
            <span className="shrink-0 rounded-full bg-canvas-soft px-2 py-0.5 text-[10px] font-semibold text-plum">
              {event.event_type}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-ink-soft">
          <time dateTime={event.start_at}>
            {formatEventDate(event.start_at, event.end_at)}
          </time>
        </p>
        {event.venue && (
          <p className="mt-0.5 truncate text-xs text-ink-soft">🏠 {event.venue}</p>
        )}
        {location && (
          <p className="truncate text-xs text-ink-muted">📍 {location}</p>
        )}
        {event.location_accuracy === 'approximate' && <p className="text-xs text-ink-soft">Approximate district location</p>}
        {event.lat == null && <p className="text-xs text-ink-soft">Location not mapped yet</p>}
        <Link onClick={e => e.stopPropagation()} className="inline-flex min-h-[44px] items-center text-sm text-pink underline" href={`/events/${encodeURIComponent(event.id)}`}>Event details</Link>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setCommentsOpen(true); }}
          aria-label={`Read comments about ${title}`}
          className="mt-1 inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-pink hover:underline"
        >
          <span aria-hidden="true">💬</span> {event.stats?.comment_count ?? 0} community posts
        </button>
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
            <span aria-hidden="true">👍</span>
            <span className="tabular-nums font-medium">{likes}</span>
          </span>
          <div className="ml-auto flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <SaveButton event={event} />
            <RegisterButton event={event} className="!min-h-[44px] !px-3 !py-1 !text-xs" />
          </div>
        </div>
      </div>
    </article>
    {commentsOpen && <CommentsDrawer eventId={event.id} open={commentsOpen} onClose={() => setCommentsOpen(false)} />}
    </>
  );
}
