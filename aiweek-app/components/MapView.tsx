"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import type { Event } from "@/lib/types";

export interface MappedEvent extends Event {
  lat: number;
  lng: number;
}

function useLeafletIconFix() {
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);
}

function IconFix() {
  useLeafletIconFix();
  return null;
}

function ResizeFix() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

const BOSTON: [number, number] = [42.3601, -71.0589];
const PINK = "#FF8A3D";
const HERO = "linear-gradient(135deg,#FF8A3D,#FFE2CC,#FFF0B3)";

function pinIcon(selected: boolean, hovered: boolean, live: boolean): L.DivIcon {
  const size = selected || hovered ? 40 : 32;
  const liveDot = live
    ? `<span style="position:absolute;top:-3px;right:-3px;width:12px;height:12px;border-radius:9999px;background:#23633E;border:2px solid #fff;"></span>`
    : "";
  return L.divIcon({
    className: "aiweek-pin",
    html:
      `<div style="position:relative;width:${size}px;height:${size}px;">` +
      `<div style="width:${size}px;height:${size}px;border-radius:9999px;` +
      `background:${selected ? HERO : PINK};` +
      `border:3px solid #fff;box-shadow:0 2px 8px rgba(58,24,62,.25);` +
      `display:flex;align-items:center;justify-content:center;` +
      `${selected ? "outline:3px solid rgba(109,59,25,.45);outline-offset:2px;" : ""}">` +
      `<span style="width:10px;height:10px;border-radius:9999px;background:#fff;"></span>` +
      `</div>${liveDot}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function clusterIcon(count: number, active = false): L.DivIcon {
  const size = count >= 10 ? 52 : 44;
  return L.divIcon({
    className: "aiweek-cluster",
    html:
      `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${active ? HERO : PINK};` +
      `${active ? "outline:3px solid #A63D12;outline-offset:2px;" : ""}` +
      `border:3px solid #fff;box-shadow:0 2px 8px rgba(58,24,62,.25);color:#2D211B;` +
      `font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center;">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

interface Cluster {
  key: string;
  lat: number;
  lng: number;
  events: MappedEvent[];
}

function gridSizeForZoom(zoom: number): number | null {
  if (zoom < 12) return 0.06;
  if (zoom < 14) return 0.02;
  if (zoom < 16) return 0.008;
  return null;
}

function clusterize(events: MappedEvent[], zoom: number): Cluster[] {
  const grid = gridSizeForZoom(zoom);
  const cells = new Map<string, MappedEvent[]>();
  for (const e of events) {
    // Exact coordinates stay grouped even at maximum zoom: no overlapping pins.
    const key = grid === null ? `venue:${e.lat}:${e.lng}` : `${Math.round(e.lat / grid)}:${Math.round(e.lng / grid)}`;
    const list = cells.get(key) ?? [];
    list.push(e);
    cells.set(key, list);
  }
  return [...cells.entries()].map(([key, list]) => ({
    key,
    lat: list.reduce((s, e) => s + e.lat, 0) / list.length,
    lng: list.reduce((s, e) => s + e.lng, 0) / list.length,
    events: list,
  }));
}

function ClusterLayer({
  events,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
}: {
  events: MappedEvent[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (e: MappedEvent) => void;
  onHover: (id: string | null) => void;
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    const update = () => setZoom(map.getZoom());
    map.on("zoomend", update);
    return () => {
      map.off("zoomend", update);
    };
  }, [map]);

  const clusters = useMemo(() => clusterize(events, zoom), [events, zoom]);
  const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const selected = events.find((event) => event.id === selectedId);
    if (selected) map.setView([selected.lat, selected.lng], Math.max(map.getZoom(), 16), { animate: !reduceMotion() });
  }, [map, selectedId, events]);

  const activateCluster = (cluster: Cluster) => {
    map.setView([cluster.lat, cluster.lng], Math.min(map.getZoom() + 1, 18), { animate: !reduceMotion() });
  };

  const sameLocation = (cluster: Cluster) => cluster.events.every((event) => event.lat === cluster.events[0].lat && event.lng === cluster.events[0].lng);

  return (
    <>
      {clusters.map((c) =>
        c.events.length === 1 ? (
          <Marker
            key={c.events[0].id}
            position={[c.events[0].lat, c.events[0].lng]}
            icon={pinIcon(
              selectedId === c.events[0].id,
              hoveredId === c.events[0].id,
              isLive(c.events[0])
            )}
            title={c.events[0].display_title || c.events[0].title}
            alt={`Event: ${c.events[0].display_title || c.events[0].title}`}
            keyboard
            eventHandlers={{
              click: () => onSelect(c.events[0]),
              mouseover: () => onHover(c.events[0].id),
              mouseout: () => onHover(null),
              keydown: (event) => {
                if (event.originalEvent.key === " ") {
                  event.originalEvent.preventDefault();
                  onSelect(c.events[0]);
                }
              },
            }}
          />
        ) : (
          <Marker
            key={c.key}
            position={[c.lat, c.lng]}
            icon={clusterIcon(c.events.length, c.events.some((event) => event.id === selectedId || event.id === hoveredId))}
            title={`${c.events.length} events — ${sameLocation(c) ? "choose an event" : "activate to zoom in"}`}
            alt={`${c.events.length} events — ${sameLocation(c) ? "choose an event" : "activate to zoom in"}`}
            keyboard
            eventHandlers={{
              click: () => { if (!sameLocation(c)) activateCluster(c); },
              keydown: (event) => {
                if (event.originalEvent.key === " ") {
                  event.originalEvent.preventDefault();
                  if (sameLocation(c)) event.target.openPopup();
                  else activateCluster(c);
                }
              },
            }}
          >
            {sameLocation(c) && <Popup>
              <p className="font-semibold">{c.events.length} events at this location</p>
              <ul className="max-h-60 space-y-2 overflow-y-auto">
                {c.events.map((event) => <li key={event.id}>
                  <button type="button" onClick={() => { onSelect(event); map.closePopup(); }} className="min-h-[44px] w-full rounded-lg px-2 py-2 text-left font-semibold text-pink hover:bg-canvas-soft">
                    {event.display_title || event.title}
                    <span className="block text-xs font-normal text-ink-soft">{new Date(event.start_at).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                  </button>
                </li>)}
              </ul>
            </Popup>}
          </Marker>
        )
      )}
    </>
  );
}

function isLive(e: Event): boolean {
  const now = Date.now();
  const start = new Date(e.start_at).getTime();
  if (Number.isNaN(start) || now < start || !e.end_at) return false;
  const end = new Date(e.end_at).getTime();
  return Number.isFinite(end) && now <= end;
}

interface Props {
  events: MappedEvent[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (e: MappedEvent) => void;
  onHover: (id: string | null) => void;
}

export default function MapView({ events, selectedId, hoveredId, onSelect, onHover }: Props) {
  return (
    <MapContainer
      center={BOSTON}
      zoom={13}
      maxZoom={18}
      scrollWheelZoom
      className="h-full w-full rounded-2xl"
      aria-label="Map of Boston AI Week event locations"
    >
      <IconFix />
      <ResizeFix />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClusterLayer
        events={events}
        selectedId={selectedId}
        hoveredId={hoveredId}
        onSelect={onSelect}
        onHover={onHover}
      />
    </MapContainer>
  );
}
