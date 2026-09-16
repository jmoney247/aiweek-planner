"use client";

import type { EventFilters as Filters, DatePreset } from "@/lib/filters";
import { computeCoreWeekRange } from "@/lib/filters";
import type { Event } from "@/lib/types";

interface Props {
  filters: Filters;
  onChange: (next: Filters) => void;
  eventTypes: string[];
  locations: string[];
  events: Event[];
  compact?: boolean;
}

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "core_week", label: "Core Week" },
  { value: "all", label: "All Dates" },
  { value: "custom", label: "Choose Date" },
];

export default function EventFiltersBar({
  filters,
  onChange,
  eventTypes,
  locations,
  events,
  compact = false,
}: Props) {
  const core = computeCoreWeekRange(events);

  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  const clear = () =>
    onChange({
      search: "",
      datePreset: "all",
      customDate: "",
      eventType: "",
      location: "",
    });

  const selectClass =
    "min-h-[40px] rounded-xl border border-zinc-200 bg-white px-3 text-sm text-ink focus:border-pink focus:outline-none focus:ring-2 focus:ring-pink/20";

  return (
    <div
      className={`rounded-2xl border border-zinc-200/80 bg-white shadow-card ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-2">
        <div className="flex-1">
          <label htmlFor="event-search" className="mb-1 block text-sm font-semibold">
            Search events
          </label>
          <input
            id="event-search"
            type="search"
            placeholder="Search events…"
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            className="min-h-[40px] w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm placeholder:text-ink-muted focus:border-pink focus:outline-none focus:ring-2 focus:ring-pink/20"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => set({ datePreset: p.value })}
              aria-pressed={filters.datePreset === p.value}
              title={
                p.value === "core_week"
                  ? `${core.start} – ${core.end}`
                  : undefined
              }
              className={`min-h-[40px] rounded-xl px-3 text-sm font-medium transition-colors ${
                filters.datePreset === p.value
                  ? "bg-pink text-white shadow-sm"
                  : "border border-zinc-200 bg-white text-ink-soft hover:border-pink/40 hover:text-ink"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {filters.datePreset === "custom" && (
        <div className="mt-3">
          <label htmlFor="custom-date" className="sr-only">
            Choose date
          </label>
          <input
            id="custom-date"
            type="date"
            value={filters.customDate}
            onChange={(e) => set({ customDate: e.target.value })}
            className={selectClass}
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label htmlFor="filter-type" className="text-sm font-semibold">
          Event type
        </label>
        <select
          id="filter-type"
          value={filters.eventType}
          onChange={(e) => set({ eventType: e.target.value })}
          className={selectClass}
        >
          <option value="">Event Type</option>
          {eventTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <label htmlFor="filter-location" className="text-sm font-semibold">
          Location
        </label>
        <select
          id="filter-location"
          value={filters.location}
          onChange={(e) => set({ location: e.target.value })}
          className={selectClass}
        >
          <option value="">Location / Neighborhood</option>
          {locations.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={clear}
          className="min-h-[40px] rounded-xl px-3 text-sm font-semibold text-ink-soft hover:bg-canvas-soft hover:text-pink"
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}
