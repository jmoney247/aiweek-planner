"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
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
    const t = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

const BOSTON: [number, number] = [42.3601, -71.0589];
const PINK = "#FF4FA3";
const HERO = "linear-gradient(135deg,#FF4FA3,#A855F7,#6366F1)";

function pinIcon(selected: boolean, hovered: boolean, live: boolean): L.DivIcon {
  const size = selected || hovered ? 40 : 32;
  const liveDot = live
    ? `<span style="position:absolute;top:-3px;right:-3px;width:12px;height:12px;border-radius:9999px;background:#22C55E;border:2px solid #fff;"></span>`
    : "";
  return L.divIcon({
    className: "aiweek-pin",
    html:
      `<div style="position:relative;width:${size}px;height:${size}px;">` +
      `<div style="width:${size}px;height:${size}px;border-radius:9999px;` +
      `background:${selected ? HERO : PINK};` +
      `border:3px solid #fff;box-shadow:0 2px 8px rgba(58,24,62,.25);` +
      `display:flex;align-items:center;justify-content:center;` +
      `${selected ? "outline:3px solid rgba(255,79,163,.45);outline-offset:2px;" : ""}">` +
      `<span style="width:10px;height:10px;border-radius:9999px;background:#fff;"></span>` +
      `</div>${liveDot}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function clusterIcon(count: number): L.DivIcon {
  return L.divIcon({
    className: "aiweek-cluster",
    html:
      `<div style="width:44px;height:44px;border-radius:9999px;background:${PINK};` +
      `border:3px solid #fff;box-shadow:0 2px 8px rgba(58,24,62,.25);color:#fff;` +
      `font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center;">${count}</div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
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
    const key = grid === null ? `p:${e.id}` : `${Math.round(e.lat / grid)}:${Math.round(e.lng / grid)}`;
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
            }}
          />
        ) : (
          <Marker
            key={c.key}
            position={[c.lat, c.lng]}
            icon={clusterIcon(c.events.length)}
            title={`${c.events.length} events — click to zoom in`}
            alt={`${c.events.length} events clustered — activate to zoom in`}
            keyboard
            eventHandlers={{
              click: () => map.setView([c.lat, c.lng], Math.min(map.getZoom() + 2, 18)),
            }}
          />
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
