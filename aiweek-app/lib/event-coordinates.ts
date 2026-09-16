import verifiedLocations from "./event-coordinates.json";

type Location = { lat: number; lng: number; address: string | null; venue: string | null; city: string | null; location_accuracy?: string };
const locations: Record<string, Location> = verifiedLocations;

/** Public, address-matched coordinates; never reuse a pin after a venue changes. */
export function eventCoordinates(event: Record<string, unknown>): { lat: number | null; lng: number | null; location_accuracy: string | null } {
  const { lat, lng } = event;
  if (typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    return { lat, lng, location_accuracy: typeof event.location_accuracy === 'string' ? event.location_accuracy : 'address' };
  }
  const saved = locations[String(event.id)];
  if (saved && saved.address === event.address && saved.venue === event.venue && saved.city === event.city) {
    return { lat: saved.lat, lng: saved.lng, location_accuracy: saved.location_accuracy ?? 'address' };
  }
  return { lat: null, lng: null, location_accuracy: null };
}
