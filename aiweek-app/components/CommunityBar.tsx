"use client";

import { useEffect, useRef, useState } from "react";
import { useEventStats } from "@/lib/useEventStats";
import { useSessionGate } from "@/components/SessionGateProvider";
import CommentsDrawer from "@/components/CommentsDrawer";
import type { ReactionKind } from "@/lib/types";

interface Props {
  eventId: string;
  /** Defer stats loading until the bar scrolls into view (gallery perf). */
  lazy?: boolean;
}

/**
 * Community bar: 👍 like count, 👎 dislike count, 💬 comment count,
 * "Write a comment" button. Live counts via Supabase Realtime on
 * `event_stats` with a 15s poll fallback. Gated actions open the
 * display-name gate when there is no session.
 */
export default function CommunityBar({ eventId, lazy = true }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(!lazy);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { requireSession } = useSessionGate();

  useEffect(() => {
    if (!lazy) return;
    const el = rootRef.current;
    if (!el) {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setVisible(true);
      },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [lazy]);

  return (
    <div ref={rootRef}>
      {visible ? (
        <CommunityBarInner
          eventId={eventId}
          onComment={() => setDrawerOpen(true)}
          requireSession={requireSession}
        />
      ) : (
        <div aria-hidden="true" className="flex h-[44px] items-center gap-4 text-sm text-stone-300">
          <span>👍 –</span>
          <span>👎 –</span>
          <span>💬 –</span>
        </div>
      )}
      <CommentsDrawer
        eventId={eventId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}

function CommunityBarInner({
  eventId,
  onComment,
  requireSession,
}: {
  eventId: string;
  onComment: () => void;
  requireSession: () => Promise<{ id: string; display_name: string } | null>;
}) {
  const { stats, myReaction, error, apply } = useEventStats(eventId);
  const [busy, setBusy] = useState(false);

  const handleReact = async (kind: ReactionKind) => {
    if (busy) return;
    const user = await requireSession();
    if (!user) return; // gate dismissed
    setBusy(true);
    try {
      // Clicking the active reaction again removes it.
      await apply(myReaction === kind ? null : kind);
    } finally {
      setBusy(false);
    }
  };

  const handleCommentClick = async () => {
    const user = await requireSession();
    if (!user) return;
    onComment();
  };

  const btn =
    "inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-sm font-medium hover:bg-canvas-soft";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Community reactions">
        <button
          type="button"
          onClick={() => void handleReact("like")}
          aria-pressed={myReaction === "like"}
          aria-label={`Like this event, ${stats.likes} likes`}
          className={`${btn} ${myReaction === "like" ? "bg-canvas-soft text-pink" : "text-ink-soft"}`}
        >
          <span aria-hidden="true" className="text-base">👍</span>
          <span className="tabular-nums">{stats.likes}</span>
        </button>
        <button
          type="button"
          onClick={() => void handleReact("dislike")}
          aria-pressed={myReaction === "dislike"}
          aria-label={`Dislike this event, ${stats.dislikes} dislikes`}
          className={`${btn} ${myReaction === "dislike" ? "bg-zinc-200 text-ink" : "text-ink-soft"}`}
        >
          <span aria-hidden="true" className="text-base">👎</span>
          <span className="tabular-nums">{stats.dislikes}</span>
        </button>
        <button
          type="button"
          onClick={onComment}
          aria-label={`View comments, ${stats.comment_count} comments`}
          className={`${btn} text-ink-soft`}
        >
          <span aria-hidden="true" className="text-base">💬</span>
          <span className="tabular-nums">{stats.comment_count}</span>
          <span>Comments</span>
        </button>
        <button
          type="button"
          onClick={() => void handleCommentClick()}
          className="ml-auto inline-flex min-h-[44px] items-center rounded-full px-3 text-sm font-semibold text-pink hover:bg-canvas-soft"
        >
          Write a comment
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
