/**
 * Saved events ("My Plan") — localStorage store for the slice.
 * Stores full event snapshots so the plan page works offline from the API.
 */
import type { Event } from "@/lib/types";

const KEY = "aiweek_saved_events";
const CHANGE_EVENT = "aiweek:saved-changed";

function read(): Record<string, Event> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Event>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function write(map: Record<string, Event>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function getSavedEvents(): Event[] {
  return Object.values(read()).sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  );
}

export function isSaved(eventId: string): boolean {
  return eventId in read();
}

export function savedCount(): number {
  return Object.keys(read()).length;
}

export function saveEvent(event: Event): void {
  const map = read();
  map[event.id] = event;
  write(map);
}

export function unsaveEvent(eventId: string): void {
  const map = read();
  delete map[eventId];
  write(map);
}

/** Subscribe to saved-changes (fires on save/unsave in any component/tab). */
export function onSavedChange(cb: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
