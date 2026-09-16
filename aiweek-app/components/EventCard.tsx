"use client";

import { useEffect, useState } from "react";
import CommunityBar from "@/components/CommunityBar";
import { formatEventDate, formatLocation, isLiveNow, trimText } from "@/lib/format";
import { isSaved, saveEvent, unsaveEvent, onSavedChange } from "@/lib/saved";
import type { Event } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Category tile: designed gradient + type icon. Never a fake photo,  */
/* and the event title is never rendered inside the artwork.          */
/* ------------------------------------------------------------------ */

const TYPE_STYLE: Record<string, { icon: string; gradient: string }> = {
  Talk: { icon: "🎤", gradient: "linear-gradient(135deg,#FCAF45,#FD5949)" },
  Panel: { icon: "💬", gradient: "linear-gradient(135deg,#FD5949,#E1306C)" },
  Workshop: { icon: "🛠️", gradient: "linear-gradient(135deg,#F97316,#E1306C)" },
  Meetup: { icon: "🤝", gradient: "linear-gradient(135deg,#FCAF45,#F97316)" },
  Conference: { icon: "🎪", gradient: "linear-gradient(135deg,#E1306C,#833AB4)" },
  Community: { icon: "🌐", gradient: "linear-gradient(135deg,#F97316,#833AB4)" },
  Hackathon: { icon: "💻", gradient: "linear-gradient(135deg,#833AB4,#4F46E5)" },
  Summit: { icon: "🏔️", gradient: "linear-gradient(135deg,#FD5949,#833AB4)" },
  Keynote: { icon: "🎙️", gradient: "linear-gradient(135deg,#FCAF45,#E1306C)" },
  Competition: { icon: "🏆", gradient: "linear-gradient(135deg,#F97316,#FCAF45)" },
  Career: { icon: "💼", gradient: "linear-gradient(135deg,#E1306C,#4F46E5)" },
};

const FALLBACK_STYLE = { icon: "✨", gradient: "linear-gradient(135deg,#FCAF45,#FD5949)" };

export function CategoryTile({ eventType, className = "" }: { eventType: string | null; className?: string }) {
  const style = (eventType && TYPE_STYLE[eventType]) || FALLBACK_STYLE;
  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center ${className}`}
      style={{ background: style.gradient }}
    >
      <span className="text-5xl drop-shadow-sm" role="img" aria-hidden="true">
        {style.icon}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Register button: label by destination. A non-direct link is NEVER   */
/* labeled "Register" — it becomes "Event details".                   */
/* ------------------------------------------------------------------ */

function registerLabel(url: string | null): string {
  if (!url) return "Event details";
  const u = url.toLowerCase();
  if (u.includes("eventbrite")) return "Get tickets";
  if (u.includes("luma") || u.includes("lu.ma")) return "RSVP";
  if (u.includes("meetup.com")) return "RSVP";
  if (u.includes("apply") || u.includes("typeform") || u.includes("forms") || u.includes("airtable"))
    return "Apply";
  return "Register";
}

export function RegisterButton({ event, className = "" }: { event: Event; className?: string }) {
  const direct = event.registration_is_direct && !!event.registration_url;
  const label = direct ? registerLabel(event.registration_url) : "Event details";
  const href = direct
    ? (event.registration_url as string)
    : event.official_url || event.registration_url || "#";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-[44px] items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold shadow ${
        direct
          ? "bg-primary-bright text-white hover:bg-primary-ink"
          : "border border-primary-bright/60 bg-white text-primary hover:bg-primary-soft"
      } ${className}`}
    >
      {label}
      <span aria-hidden="true" className="ml-1.5 text-xs">↗</span>
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* Save star (localStorage; session-only is fine for the slice).       */
/* ------------------------------------------------------------------ */

function SaveStar({ event }: { event: Event }) {
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
      aria-label={saved ? `Remove "${event.display_title || event.title}" from My Plan` : `Save "${event.display_title || event.title}" to My Plan`}
      title={saved ? "Saved to My Plan" : "Save to My Plan"}
      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-stone-300 bg-white text-2xl leading-none hover:bg-stone-100"
    >
      <span aria-hidden="true" className={saved ? "text-primary-bright" : "text-stone-400"}>
        {saved ? "★" : "☆"}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Event card                                                          */
/* ------------------------------------------------------------------ */

export function displayTitle(event: Event): string {
  return event.display_title?.trim() || event.title;
}

export function displaySummary(event: Event): string | null {
  const s = event.summary?.trim();
  if (s) return s;
  const d = event.description?.trim();
  if (d) return trimText(d, 140); // never invented — official description only
  return null;
}

function registrationBadge(event: Event): string | null {
  if (event.registration_is_direct && event.registration_url) return "Direct registration";
  if (event.registration_url) return "External signup";
  return null;
}

/* ------------------------------------------------------------------ */
/* Event image: verified image when available, branded tile otherwise. */
/* Per docs/image-contract.md — 16:9, object-fit cover, lazy, alt text;*/
/* onError swaps to the fallback tile (never a broken-image glyph).    */
/* ------------------------------------------------------------------ */

function EventImage({ event }: { event: Event }) {
  const [failed, setFailed] = useState(false);
  const title = displayTitle(event);
  const className = "h-32 w-full shrink-0";
  if (event.image_url && !failed) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <img
          src={event.image_url}
          alt={title}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    );
  }
  return <CategoryTile eventType={event.event_type} className={className} />;
}

export default function EventCard({ event }: { event: Event }) {
  const title = displayTitle(event);
  const summary = displaySummary(event);
  const location = formatLocation(event.city, event.neighborhood);
  const live = isLiveNow(event.start_at, event.end_at);
  const regBadge = registrationBadge(event);
  const headingId = `event-${event.id}-title`;

  return (
    <article
      aria-labelledby={headingId}
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <EventImage event={event} />
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {event.event_type && (
            <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary">
              {event.event_type}
            </span>
          )}
          {live && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
              <span aria-hidden="true" className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-600" />
              </span>
              Live now
            </span>
          )}
          {regBadge && (
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-ink-soft">
              {regBadge}
            </span>
          )}
        </div>

        <h3 id={headingId} className="text-base font-bold leading-snug">
          {title}
        </h3>
        {summary && <p className="mt-1.5 text-sm text-ink-soft">{summary}</p>}

        <dl className="mt-3 space-y-1 text-sm text-ink-soft">
          <div className="flex gap-2">
            <dt className="sr-only">Date and time</dt>
            <dd>
              <span aria-hidden="true">🕒 </span>
              <time dateTime={event.start_at}>{formatEventDate(event.start_at, event.end_at)}</time>
            </dd>
          </div>
          {location && (
            <div className="flex gap-2">
              <dt className="sr-only">Location</dt>
              <dd>
                <span aria-hidden="true">📍 </span>
                {location}
              </dd>
            </div>
          )}
          {event.hosted_by && (
            <div className="flex gap-2">
              <dt className="sr-only">Hosted by</dt>
              <dd className="truncate">
                <span aria-hidden="true">🏠 </span>
                {event.hosted_by}
              </dd>
            </div>
          )}
        </dl>

        <div className="mt-4 flex items-center gap-2">
          <RegisterButton event={event} className="flex-1" />
          <SaveStar event={event} />
        </div>

        <div className="mt-3 border-t border-stone-100 pt-2">
          <CommunityBar eventId={event.id} />
        </div>
      </div>
    </article>
  );
}
