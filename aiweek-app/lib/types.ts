/**
 * TypeScript types mirroring the Supabase schema.
 * Keep in sync with the migration SQL (see ARCHITECTURE.md).
 */

export type ReactionKind = "like" | "dislike";

export type ModerationState = "visible" | "flagged" | "hidden";

export interface Event {
  id: string;
  title: string;
  /** Short human-friendly title when available; falls back to `title`. */
  display_title: string | null;
  /** One-sentence summary when available; falls back to trimmed description. */
  summary: string | null;
  registration_url: string | null;
  registration_is_direct: boolean;
  start_at: string; // ISO 8601
  end_at: string | null; // ISO 8601
  venue: string | null;
  address: string | null;
  city: string | null;
  neighborhood: string | null;
  event_type: string | null;
  hosted_by: string | null;
  speakers: Speaker[];
  description: string | null;
  about: string | null;
  official_url: string;
  /** Final served image URL (Supabase Storage or validated original). */
  image_url: string | null;
  /** 'official' | 'organizer_logo' | 'fallback' | 'none' */
  image_kind: string | null;
  /** Page where the image was found (provenance). */
  image_source_url: string | null;
  image_attribution: string | null;
  image_verified_at: string | null;
  image_width: number | null;
  image_height: number | null;
  /**
   * Venue coordinates. Populated by the geocoding pipeline (separate step);
   * null until then. The UI must never invent coordinates.
   */
  lat: number | null;
  lng: number | null;
  location_accuracy?: string | null;
}

export interface Speaker {
  name: string;
  title?: string;
  company?: string;
}

export interface AnonUser {
  id: string; // uuid
  display_name: string;
}

export interface Reaction {
  event_id: string;
  user_id: string;
  reaction: ReactionKind;
}

export interface EventComment {
  id: string;
  event_id: string;
  user_id: string;
  display_name_snapshot: string;
  body: string;
  parent_id: string | null;
  created_at: string;
  is_deleted: boolean;
  moderation_state: ModerationState;
}

export interface EventStats {
  event_id: string;
  likes: number;
  dislikes: number;
  comment_count: number;
}

/** Event + denormalized community counts for list/map rendering. */
export interface EventWithStats extends Event {
  stats: EventStats;
}
