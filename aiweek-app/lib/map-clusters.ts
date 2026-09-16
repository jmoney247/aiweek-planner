export interface MapPoint { lat: number; lng: number }
export interface MapCluster<T extends MapPoint> { key: string; lat: number; lng: number; events: T[] }
export function clusterize<T extends MapPoint>(events: T[], zoom: number): MapCluster<T>[] {
  const grid = zoom < 12 ? 0.06 : zoom < 14 ? 0.02 : zoom < 16 ? 0.008 : null;
  const cells = new Map<string, T[]>();
  for (const event of events) {
    const key = grid === null ? `venue:${event.lat}:${event.lng}` : `${Math.round(event.lat / grid)}:${Math.round(event.lng / grid)}`;
    const list = cells.get(key) ?? []; list.push(event); cells.set(key, list);
  }
  return [...cells.entries()].map(([key, list]) => ({ key,
    lat: list.reduce((sum, e) => sum + e.lat, 0) / list.length,
    lng: list.reduce((sum, e) => sum + e.lng, 0) / list.length,
    events: list,
  }));
}
