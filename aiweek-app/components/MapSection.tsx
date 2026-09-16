"use client";

import EventMap from "@/components/EventMap";

/**
 * Homepage map section: full-width, ~70vh. The anchor target for the
 * "Find events near you" feature card.
 */
export default function MapSection() {
  return (
    <div className="w-full">
      <div className="gradient-ring overflow-hidden md:rounded-2xl">
        <EventMap />
      </div>
    </div>
  );
}
