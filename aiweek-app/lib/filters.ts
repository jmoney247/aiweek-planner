/**
 * Client-side event filtering and sorting.
 * All filter values are derived from real event data — nothing is hardcoded
 * except Core Week boundaries, which are computed from the dataset density.
 */
import type { EventWithStats } from "@/lib/api";
import type { Event } from "@/lib/types";

export type { EventWithStats };

export type DatePreset = "all" | "today" | "this_week" | "core_week" | "custom";

export type GallerySort = "soonest" | "most_liked" | "most_discussed";

export interface EventFilters {
  search: string;
  datePreset: DatePreset;
  customDate: string; // YYYY-MM-DD in America/New_York
  eventType: string;
  location: string;
}

export const DEFAULT_FILTERS: EventFilters = {
  search: "",
  datePreset: "all",
  customDate: "",
  eventType: "",
  location: "",
};

const TZ = "America/New_York";

/** Format a Date as YYYY-MM-DD in America/New_York. */
export function toDateKey(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

/** Parse an ISO start_at into a YYYY-MM-DD key in America/New_York. */
export function eventDateKey(startAt: string): string {
  const d = new Date(startAt);
  if (Number.isNaN(d.getTime())) return "";
  return toDateKey(d);
}

function eventOverlapsDay(event: Event, dateKey: string): boolean {
  return eventDateKey(event.start_at) === dateKey;
}

function eventInRange(event: Event, startKey: string, endKey: string): boolean {
  const k = eventDateKey(event.start_at);
  return k >= startKey && k <= endKey;
}

/** Monday–Sunday week containing `ref` in America/New_York. */
export function thisWeekRange(ref: Date = new Date()): { start: string; end: string } {
  const key = toDateKey(ref);
  const [y, m, d] = key.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
  }).format(utc);
  const daysFromMon: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  const offset = daysFromMon[weekday] ?? 0;
  const mon = new Date(utc);
  mon.setUTCDate(mon.getUTCDate() - offset);
  const sun = new Date(mon);
  sun.setUTCDate(sun.getUTCDate() + 6);
  return { start: toDateKey(mon), end: toDateKey(sun) };
}

/**
 * Core Week: the Monday–Sunday window with the highest event count in the
 * dataset. Falls back to Sep 21–27 2026 if the catalog is empty.
 */
export function computeCoreWeekRange(events: Event[]): { start: string; end: string } {
  if (events.length === 0) {
    return { start: "2026-09-21", end: "2026-09-27" };
  }
  const counts = new Map<string, number>();
  for (const e of events) {
    const k = eventDateKey(e.start_at);
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const sortedKeys = [...counts.keys()].sort();
  if (sortedKeys.length === 0) return { start: "2026-09-21", end: "2026-09-27" };

  const mondayFor = (key: string): string => {
    const [y, m, d] = key.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, 12));
    const day = date.getUTCDay();
    date.setUTCDate(date.getUTCDate() - (day === 0 ? 6 : day - 1));
    return toDateKey(date);
  };
  const mondayKeys = [...new Set(sortedKeys.map(mondayFor))].sort();
  let bestStart = mondayKeys[0];
  let bestCount = 0;
  for (const startKey of mondayKeys) {
    const [y, m, d] = startKey.split("-").map(Number);
    let weekCount = 0;
    const startDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setUTCDate(day.getUTCDate() + i);
      weekCount += counts.get(toDateKey(day)) ?? 0;
    }
    if (weekCount > bestCount) {
      bestCount = weekCount;
      bestStart = startKey;
    }
  }
  const [y, m, d] = bestStart.split("-").map(Number);
  const startDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + 6);
  return { start: toDateKey(startDate), end: toDateKey(endDate) };
}

/** Unique sorted event types from the catalog. */
export function deriveEventTypes(events: Event[]): string[] {
  const set = new Set<string>();
  for (const e of events) {
    if (e.event_type?.trim()) set.add(e.event_type.trim());
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Unique location labels: "City · Neighborhood" or city alone. */
export function deriveLocations(events: Event[]): string[] {
  const set = new Set<string>();
  for (const e of events) {
    const city = e.city?.trim();
    const hood = e.neighborhood?.trim();
    if (city && hood) set.add(`${city} · ${hood}`);
    else if (city) set.add(city);
    else if (hood) set.add(hood);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function eventMatchesLocation(event: Event, location: string): boolean {
  if (!location) return true;
  const city = event.city?.trim();
  const hood = event.neighborhood?.trim();
  const label =
    city && hood ? `${city} · ${hood}` : city ?? hood ?? "";
  return label === location;
}

export function filterEvents(
  events: EventWithStats[],
  filters: EventFilters,
  coreWeek?: { start: string; end: string }
): EventWithStats[] {
  const core = coreWeek ?? computeCoreWeekRange(events);
  const q = filters.search.trim().toLowerCase();
  const week = thisWeekRange();
  const todayKey = toDateKey(new Date());

  return events.filter((e) => {
    if (q) {
      const hay = [
        e.title,
        e.display_title,
        e.description,
        e.summary,
        e.hosted_by,
        e.venue,
        e.city,
        e.neighborhood,
        e.event_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }

    if (filters.eventType && e.event_type !== filters.eventType) return false;
    if (!eventMatchesLocation(e, filters.location)) return false;

    switch (filters.datePreset) {
      case "today":
        if (!eventOverlapsDay(e, todayKey)) return false;
        break;
      case "this_week":
        if (!eventInRange(e, week.start, week.end)) return false;
        break;
      case "core_week":
        if (!eventInRange(e, core.start, core.end)) return false;
        break;
      case "custom":
        if (filters.customDate && !eventOverlapsDay(e, filters.customDate)) return false;
        break;
      default:
        break;
    }

    return true;
  });
}

export function sortEvents(
  events: EventWithStats[],
  sort: GallerySort
): EventWithStats[] {
  const copy = events.slice();
  switch (sort) {
    case "most_liked":
      copy.sort((a, b) => {
        const la = a.stats?.likes ?? 0;
        const lb = b.stats?.likes ?? 0;
        if (lb !== la) return lb - la;
        const ca = a.stats?.comment_count ?? 0;
        const cb = b.stats?.comment_count ?? 0;
        if (cb !== ca) return cb - ca;
        return +new Date(a.start_at) - +new Date(b.start_at);
      });
      break;
    case "most_discussed":
      copy.sort((a, b) => {
        const ca = a.stats?.comment_count ?? 0;
        const cb = b.stats?.comment_count ?? 0;
        if (cb !== ca) return cb - ca;
        const la = a.stats?.likes ?? 0;
        const lb = b.stats?.likes ?? 0;
        if (lb !== la) return lb - la;
        return +new Date(a.start_at) - +new Date(b.start_at);
      });
      break;
    case "soonest":
    default:
      copy.sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at));
      break;
  }
  return copy;
}

/** Upcoming events: start_at >= now (or today start). */
export function upcomingEvents(events: EventWithStats[]): EventWithStats[] {
  const now = Date.now();
  return events.filter((e) => {
    const t = new Date(e.start_at).getTime();
    return Number.isFinite(t) && t >= now - 12 * 60 * 60 * 1000; // include events started today
  });
}

/** Top 3 upcoming events: likes → comments → soonest start. */
export function trendingEvents(events: EventWithStats[], limit = 3): EventWithStats[] {
  const sorted = upcomingEvents(events).sort((a, b) => {
    const la = a.stats?.likes ?? 0;
    const lb = b.stats?.likes ?? 0;
    if (lb !== la) return lb - la;
    const ca = a.stats?.comment_count ?? 0;
    const cb = b.stats?.comment_count ?? 0;
    if (cb !== ca) return cb - ca;
    return +new Date(a.start_at) - +new Date(b.start_at);
  });
  return sorted.slice(0, limit);
}

export function hasActiveFilters(filters: EventFilters): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.datePreset !== "all" ||
    filters.eventType !== "" ||
    filters.location !== ""
  );
}
