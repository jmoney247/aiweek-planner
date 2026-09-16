/** Minimal .ics (iCalendar) generation for My Plan downloads. */

function esc(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function stamp(d: Date): string {
  // YYYYMMDDTHHMMSSZ
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export interface IcsEventInput {
  id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  venue: string | null;
  address: string | null;
  official_url: string;
}

export function eventToIcs(ev: IcsEventInput): string {
  const start = new Date(ev.start_at);
  const end = ev.end_at ? new Date(ev.end_at) : new Date(start.getTime() + 60 * 60 * 1000);
  const location = [ev.venue, ev.address].filter(Boolean).join(", ");
  const lines = [
    "BEGIN:VEVENT",
    `UID:${ev.id}@boston-ai-week`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(ev.title)}`,
    location ? `LOCATION:${esc(location)}` : "",
    `URL:${esc(ev.official_url)}`,
    "END:VEVENT",
  ].filter(Boolean);
  return lines.join("\r\n");
}

export function buildIcsCalendar(events: IcsEventInput[]): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Boston AI Week//Community Planner//EN",
    ...events.map(eventToIcs),
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(filename: string, events: IcsEventInput[]): void {
  const blob = new Blob([buildIcsCalendar(events)], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
