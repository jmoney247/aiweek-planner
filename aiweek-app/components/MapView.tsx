"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { markerStyle } from '@/lib/map-marker-style';
import type { Event } from "@/lib/types";
import { clusterize, type MapCluster } from '@/lib/map-clusters';

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
function pinIcon(selected: boolean, hovered: boolean, live: boolean, approximate: boolean): L.DivIcon {
  const { size, color, hitSize } = markerStyle(1);
  return L.divIcon({
    className: "aiweek-pin",
    html: `<div style="width:${hitSize}px;height:${hitSize}px;display:flex;align-items:center;justify-content:center;">
      <span style="box-sizing:border-box;position:relative;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px ${approximate ? 'dashed' : 'solid'} white;box-shadow:0 1px 4px #2D211B66;${selected || hovered ? 'outline:3px solid #2D211B;outline-offset:3px;' : ''}">
      ${live ? '<span style="position:absolute;top:-4px;right:-4px;width:6px;height:6px;border-radius:50%;background:#23633E;border:1px solid white;"></span>' : ''}
      </span></div>`,
    iconSize: [hitSize, hitSize], iconAnchor: [hitSize / 2, hitSize / 2],
  });
}

function clusterIcon(count: number, active = false): L.DivIcon {
  const { size, color, hitSize } = markerStyle(count);
  return L.divIcon({
    className: "aiweek-cluster",
    html: `<div style="width:${hitSize}px;height:${hitSize}px;display:flex;align-items:center;justify-content:center;">
      <span style="box-sizing:border-box;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 5px #2D211B40;color:#2D211B;font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center;${active ? 'outline:3px solid #2D211B;outline-offset:2px;' : ''}">${count}</span></div>`,
    iconSize: [hitSize, hitSize], iconAnchor: [hitSize / 2, hitSize / 2],
  });
}

type Cluster = MapCluster<MappedEvent>;

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
  const framed = useRef(false);
  useEffect(() => {
    if (!framed.current && events.length) {
      map.fitBounds(L.latLngBounds(events.map(e => [e.lat, e.lng] as [number, number])), { padding: [36, 36], maxZoom: 14, animate: false });
      setZoom(map.getZoom());
      framed.current = true;
    }
  }, [map, events]);

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
    const bounds = L.latLngBounds(cluster.events.map(e => [e.lat, e.lng] as [number, number]));
    const target = Math.min(18, Math.max(map.getZoom() + 1, map.getBoundsZoom(bounds, false, L.point(60, 60))));
    map.setView(bounds.getCenter(), target, { animate: !reduceMotion() });
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
              isLive(c.events[0]),
              c.events[0].location_accuracy === 'approximate'
            )}
            title={`${c.events[0].display_title || c.events[0].title}${c.events[0].location_accuracy === 'approximate' ? ' — approximate district location' : ''}`}
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
  const [tilesFailed, setTilesFailed] = useState(false);
  const [tileRevision, setTileRevision] = useState(0);
  return (
    <div className="relative h-full w-full">
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
        key={tileRevision}
        eventHandlers={{ tileerror: () => setTilesFailed(true) }}
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
    {tilesFailed && <div role="status" className="absolute bottom-12 left-3 right-3 z-[500] rounded-xl border bg-white p-3 text-sm shadow">Some map tiles couldn’t load. Event cards are still available. <button className="min-h-[44px] underline" onClick={() => { setTilesFailed(false); setTileRevision(r => r+1); }}>Retry map tiles</button></div>}
    </div>
  );
}
