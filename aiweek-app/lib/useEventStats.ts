"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import {
  deleteReaction,
  fetchEventStats,
  fetchMyReaction,
  postReaction,
} from "@/lib/api";
import type { EventStats, ReactionKind } from "@/lib/types";

/**
 * Live community counts for one event.
 * - Reads initial stats + my reaction from the API.
 * - Subscribes to Supabase Realtime on the `event_stats` row.
 * - Polls /api/events/[id]/stats every 15s as a fallback.
 */
export function useEventStats(eventId: string) {
  const [stats, setStats] = useState<EventStats>({
    event_id: eventId,
    likes: 0,
    dislikes: 0,
    comment_count: 0,
  });
  const [myReaction, setMyReaction] = useState<ReactionKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const statsRef = useRef(stats);
  statsRef.current = stats;

  const refresh = useCallback(async () => {
    try {
      const [s, mine] = await Promise.all([
        fetchEventStats(eventId),
        fetchMyReaction(eventId),
      ]);
      setStats(s);
      setMyReaction(mine);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load counts");
    }
  }, [eventId]);

  useEffect(() => {
    let cancelled = false;
    const sbRef: { client: SupabaseClient | null; channel: RealtimeChannel | null } = {
      client: null,
      channel: null,
    };
    refresh();

    // Realtime: event_stats is trigger-maintained, one row per event.
    // The Supabase client module is imported lazily inside the effect so
    // server-side prerendering never evaluates client env validation.
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        if (cancelled) return;
        const supabase = createClient();
        sbRef.client = supabase;
        sbRef.channel = supabase
          .channel(`event-stats-${eventId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "event_stats",
              filter: `event_id=eq.${eventId}`,
            },
            (payload) => {
              if (cancelled) return;
              const next = payload.new as Partial<EventStats> | null;
              if (next && typeof next.likes === "number") {
                setStats({
                  event_id: eventId,
                  likes: next.likes ?? 0,
                  dislikes: next.dislikes ?? 0,
                  comment_count: next.comment_count ?? 0,
                });
              } else {
                void refresh();
              }
            }
          )
          .subscribe();
      } catch {
        // Realtime unavailable (e.g. no env) — the 15s poll covers updates.
      }
    })();

    // 15s poll fallback (also covers environments without Realtime).
    const timer = setInterval(() => {
      if (!cancelled) void refresh();
    }, 15_000);

    return () => {
      cancelled = true;
      clearInterval(timer);
      if (sbRef.client && sbRef.channel) void sbRef.client.removeChannel(sbRef.channel);
    };
  }, [eventId, refresh]);

  const apply = useCallback(
    async (kind: ReactionKind | null) => {
      setError(null);
      const prevStats = statsRef.current;
      const prevMine = myReaction;

      // Optimistic update.
      setMyReaction(kind);
      setStats((s) => {
        let { likes, dislikes } = s;
        if (prevMine === "like") likes -= 1;
        if (prevMine === "dislike") dislikes -= 1;
        if (kind === "like") likes += 1;
        if (kind === "dislike") dislikes += 1;
        return { ...s, likes: Math.max(0, likes), dislikes: Math.max(0, dislikes) };
      });

      try {
        const next = kind === null ? await deleteReaction(eventId) : await postReaction(eventId, kind);
        setStats(next);
      } catch (e) {
        // Revert; keep the user informed.
        setStats(prevStats);
        setMyReaction(prevMine);
        setError(e instanceof Error ? e.message : "Reaction failed");
      }
    },
    [eventId, myReaction]
  );

  return { stats, myReaction, error, apply, refresh };
}
