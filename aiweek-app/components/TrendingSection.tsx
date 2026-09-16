"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CategoryTile,
  RegisterButton,
  displayTitle,
} from "@/components/EventCard";
import { formatEventDate, formatLocation } from "@/lib/format";
import { isSaved, onSavedChange, saveEvent, unsaveEvent } from "@/lib/saved";
import type { EventWithStats } from "@/lib/api";

interface Props {
  events: EventWithStats[];
}

function TrendingImage({ event }: { event: EventWithStats }) {
  const [failed, setFailed] = useState(false);
  const title = displayTitle(event);
  if (event.image_url && !failed) {
    return (
      <img
        src={event.image_url}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-36 w-full object-cover"
      />
    );
  }
  return <CategoryTile eventType={event.event_type} className="h-36 w-full" />;
}

function SaveStar({ event }: { event: EventWithStats }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setSaved(isSaved(event.id));
    return onSavedChange(() => setSaved(isSaved(event.id)));
  }, [event.id]);

  return (
    <button
      type="button"
      onClick={() => (saved ? unsaveEvent(event.id) : saveEvent(event))}
      aria-pressed={saved}
      aria-label={saved ? "Remove from My Plan" : "Save to My Plan"}
      className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full border border-zinc-200 text-xl hover:bg-canvas-soft"
    >
      <span aria-hidden="true" className={saved ? "text-pink" : "text-zinc-400"}>
        {saved ? "★" : "☆"}
      </span>
    </button>
  );
}

const RANK_STYLES = [
  "from-pink/20 to-lavender/20 border-pink/30",
  "from-lavender/15 to-indigo-100 border-lavender/30",
  "from-zinc-50 to-canvas-soft border-zinc-200",
];

export default function TrendingSection({ events }: Props) {
  if (events.length === 0) return null;

  return (
    <section aria-label="Trending events" className="mt-8">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-xl font-bold tracking-tight md:text-2xl">
          Trending at <span className="gradient-text">Boston AI Week</span>
        </h2>
        <Link
          href="/gallery"
          className="text-sm font-semibold text-pink hover:underline"
        >
          See all →
        </Link>
      </div>
      <ul className="grid gap-4 md:grid-cols-3">
        {events.map((e, i) => {
          const title = displayTitle(e);
          const location = formatLocation(e.city, e.neighborhood);
          const likes = e.stats?.likes ?? 0;
          return (
            <li
              key={e.id}
              className={`overflow-hidden rounded-2xl border bg-gradient-to-br shadow-card ${RANK_STYLES[i] ?? RANK_STYLES[2]}`}
            >
              <div className="relative overflow-hidden rounded-t-2xl">
                <TrendingImage event={e} />
                <span className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-sm font-extrabold text-plum shadow">
                  #{i + 1}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-bold leading-snug">{title}</h3>
                <p className="mt-1 text-sm text-ink-soft">
                  <time dateTime={e.start_at}>
                    {formatEventDate(e.start_at, e.end_at)}
                  </time>
                </p>
                {(e.venue || location) && (
                  <p className="mt-0.5 truncate text-sm text-ink-soft">
                    📍 {[e.venue, location].filter(Boolean).join(" · ")}
                  </p>
                )}
                <p className="mt-2 text-sm text-ink-soft">
                  <span aria-hidden="true">👍 </span>
                  <span className="font-semibold text-ink">{likes}</span>
                  {likes === 1 ? " like" : " likes"}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <RegisterButton event={e} className="flex-1" />
                  <SaveStar event={e} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
