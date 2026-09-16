/** Date/time + text formatting helpers. All event times render in America/New_York. */

const TZ = "America/New_York";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  weekday: "short",
  month: "short",
  day: "numeric",
});

const timeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hour: "numeric",
  minute: "2-digit",
});

const monthDayFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  month: "short",
  day: "numeric",
});

export function formatEventDate(startAt: string, endAt: string | null): string {
  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) return "Date TBA";
  let out = dateFmt.format(start);
  out += ` · ${timeFmt.format(start)}`;
  if (endAt) {
    const end = new Date(endAt);
    if (!Number.isNaN(end.getTime())) {
      // Same-day: "Wed, Sep 23 · 5:30–8:30 PM". Multi-day: append end date.
      const sameDay = monthDayFmt.format(start) === monthDayFmt.format(end);
      out += sameDay ? `–${timeFmt.format(end)}` : ` – ${dateFmt.format(end)} · ${timeFmt.format(end)}`;
    }
  }
  return out;
}

/** True when the event is happening right now. */
export function isLiveNow(startAt: string, endAt: string | null): boolean {
  const now = Date.now();
  const start = new Date(startAt).getTime();
  if (Number.isNaN(start) || now < start) return false;
  if (!endAt) return false;
  const end = new Date(endAt).getTime();
  return Number.isFinite(end) && now <= end;
}

/** Trim text to ~maxChars at a word boundary, adding an ellipsis. */
export function trimText(text: string, maxChars = 140): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return clean;
  const cut = clean.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

/** City/neighborhood line, e.g. "Boston · Back Bay". Empty string if unknown. */
export function formatLocation(city: string | null, neighborhood: string | null): string {
  const parts = [city, neighborhood].filter(Boolean) as string[];
  return parts.join(" · ");
}
