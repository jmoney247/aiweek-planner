"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  deleteComment,
  fetchComments,
  patchComment,
  postComment,
  postReport,
} from "@/lib/api";
import { getStoredUser } from "@/lib/session";
import { useSessionGate } from "@/components/SessionGateProvider";
import type { EventComment } from "@/lib/types";

interface Props {
  eventId: string;
  open: boolean;
  onClose: () => void;
}

const MAX_BODY = 2000;

/**
 * Comments drawer: newest 3 top-level comments with "View all N comments",
 * composer, 1-level replies, edit/delete own, report. All user text is
 * rendered as React text nodes (HTML is escaped by default — no
 * dangerouslySetInnerHTML anywhere).
 */
export default function CommentsDrawer({ eventId, open, onClose }: Props) {
  const [comments, setComments] = useState<EventComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const { requireSession } = useSessionGate();
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const myUserId = getStoredUser()?.id ?? null;

  // Open/close lifecycle: focus mgmt, Escape, scroll lock.
  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }, 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
      openerRef.current?.focus?.();
    };
  }, [open, onClose]);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setComments(await fetchComments(eventId));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load comments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setShowAll(false);
      setDraft("");
      setNotice(null);
      void load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, eventId]);

  const { topLevel, repliesByParent } = useMemo(() => {
    const visible = comments.filter((c) => !c.is_deleted && c.moderation_state === "visible");
    const tops = visible
      .filter((c) => !c.parent_id)
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    const byParent = new Map<string, EventComment[]>();
    for (const c of visible.filter((c) => c.parent_id)) {
      const list = byParent.get(c.parent_id as string) ?? [];
      list.push(c);
      byParent.set(c.parent_id as string, list);
    }
    for (const list of byParent.values()) {
      list.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    }
    return { topLevel: tops, repliesByParent: byParent };
  }, [comments]);

  const shown = showAll ? topLevel : topLevel.slice(0, 3);

  const submitComment = async (body: string, parentId: string | null) => {
    const user = await requireSession();
    if (!user) return;
    const trimmed = body.trim();
    if (!trimmed) return;
    setPosting(true);
    setPostError(null);
    try {
      const created = await postComment(eventId, trimmed.slice(0, MAX_BODY), parentId);
      setComments((prev) => [...prev, created]);
      setDraft("");
      setReplyDraft("");
      setReplyTo(null);
      setNotice("Comment posted.");
    } catch (e) {
      setPostError(e instanceof Error ? e.message : "Could not post your comment.");
    } finally {
      setPosting(false);
    }
  };

  const submitEdit = async (commentId: string) => {
    const trimmed = editDraft.trim();
    if (!trimmed) return;
    try {
      const updated = await patchComment(commentId, trimmed.slice(0, MAX_BODY));
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
      setEditingId(null);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not save your edit.");
    }
  };

  const confirmDelete = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setDeletingId(null);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not delete your comment.");
      setDeletingId(null);
    }
  };

  const submitReport = async (commentId: string) => {
    try {
      await postReport("comment", commentId, reportReason.trim() || "Reported by an attendee");
      setNotice("Thanks — this comment was reported for review.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not submit your report.");
    } finally {
      setReportingId(null);
      setReportReason("");
    }
  };

  if (!open) return null;

  const renderComment = (c: EventComment, isReply: boolean) => {
    const mine = myUserId !== null && c.user_id === myUserId;
    const replies = repliesByParent.get(c.id) ?? [];
    return (
      <li key={c.id} className={isReply ? "ml-6 border-l-2 border-stone-200 pl-3" : ""}>
        <div className="rounded-xl bg-stone-50 p-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-semibold">{c.display_name_snapshot}</span>
            <time className="shrink-0 text-xs text-ink-soft" dateTime={c.created_at}>
              {new Date(c.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </time>
          </div>
          {editingId === c.id ? (
            <div className="mt-2">
              <label htmlFor={`edit-${c.id}`} className="sr-only">Edit comment</label>
              <textarea
                id={`edit-${c.id}`}
                value={editDraft}
                maxLength={MAX_BODY}
                rows={3}
                onChange={(e) => setEditDraft(e.target.value)}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => void submitEdit(c.id)}
                  className="min-h-[44px] rounded-full bg-primary-bright px-4 py-1.5 text-sm font-semibold text-white"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="min-h-[44px] rounded-full border border-stone-300 px-4 py-1.5 text-sm font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
            {!isReply && (
              <button
                type="button"
                onClick={() => {
                  setReplyTo(replyTo === c.id ? null : c.id);
                  setReplyDraft("");
                }}
                className="min-h-[44px] rounded-full px-3 font-semibold text-primary hover:bg-primary-soft"
              >
                Reply
              </button>
            )}
            {mine && editingId !== c.id && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(c.id);
                    setEditDraft(c.body);
                  }}
                  className="min-h-[44px] rounded-full px-3 font-semibold text-ink-soft hover:bg-stone-200"
                >
                  Edit
                </button>
                {deletingId === c.id ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="text-ink-soft">Delete?</span>
                    <button
                      type="button"
                      onClick={() => void confirmDelete(c.id)}
                      className="min-h-[44px] rounded-full bg-red-600 px-3 font-semibold text-white"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(null)}
                      className="min-h-[44px] rounded-full px-3 font-semibold text-ink-soft"
                    >
                      Keep
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeletingId(c.id)}
                    className="min-h-[44px] rounded-full px-3 font-semibold text-ink-soft hover:bg-stone-200"
                  >
                    Delete
                  </button>
                )}
              </>
            )}
            {reportingId === c.id ? (
              <span className="inline-flex flex-wrap items-center gap-1">
                <label htmlFor={`report-${c.id}`} className="sr-only">Reason for reporting</label>
                <input
                  id={`report-${c.id}`}
                  type="text"
                  value={reportReason}
                  maxLength={200}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Reason (optional)"
                  className="min-h-[44px] rounded-full border border-stone-300 px-3 text-xs"
                />
                <button
                  type="button"
                  onClick={() => void submitReport(c.id)}
                  className="min-h-[44px] rounded-full bg-red-600 px-3 font-semibold text-white"
                >
                  Report
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReportingId(null);
                    setReportReason("");
                  }}
                  className="min-h-[44px] rounded-full px-3 font-semibold text-ink-soft"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setReportingId(c.id)}
                className="min-h-[44px] rounded-full px-3 font-semibold text-ink-soft hover:bg-stone-200"
                aria-label={`Report comment by ${c.display_name_snapshot}`}
              >
                Report
              </button>
            )}
          </div>
        </div>
        {replyTo === c.id && (
          <div className="mt-2 ml-6">
            <label htmlFor={`reply-${c.id}`} className="sr-only">
              Reply to {c.display_name_snapshot}
            </label>
            <textarea
              id={`reply-${c.id}`}
              value={replyDraft}
              maxLength={MAX_BODY}
              rows={2}
              onChange={(e) => setReplyDraft(e.target.value)}
              placeholder={`Reply to ${c.display_name_snapshot}…`}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            <div className="mt-1.5 flex gap-2">
              <button
                type="button"
                disabled={posting || !replyDraft.trim()}
                onClick={() => void submitComment(replyDraft, c.id)}
                className="min-h-[44px] rounded-full bg-primary-bright px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {posting ? "Posting…" : "Post reply"}
              </button>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="min-h-[44px] rounded-full border border-stone-300 px-4 py-1.5 text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {replies.length > 0 && (
          <ul className="mt-2 space-y-2">
            {replies.map((r) => renderComment(r, true))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-stone-900/50"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="comments-title"
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-200 p-4">
          <h2 id="comments-title" className="text-lg font-bold">
            Comments
            {topLevel.length > 0 && (
              <span className="ml-2 text-sm font-medium text-ink-soft">({topLevel.length})</span>
            )}
          </h2>
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            aria-label="Close comments"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-xl hover:bg-stone-100"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <div className="border-b border-stone-200 p-4">
          <label htmlFor="comment-composer" className="text-sm font-semibold">
            Join the conversation
          </label>
          <textarea
            id="comment-composer"
            value={draft}
            maxLength={MAX_BODY}
            rows={3}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What did you think of this event?"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-ink-soft">
            Your display name and comment will be visible to everyone.
          </p>
          {postError && (
            <p role="alert" className="mt-1 text-xs text-red-700">
              {postError}
            </p>
          )}
          <button
            type="button"
            disabled={posting || !draft.trim()}
            onClick={() => void submitComment(draft, null)}
            className="mt-2 inline-flex min-h-[44px] items-center rounded-full bg-primary-bright px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {posting ? "Posting…" : "Post comment"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {notice && (
            <p role="status" className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
              {notice}
            </p>
          )}
          {loading && <p className="text-sm text-ink-soft">Loading comments…</p>}
          {loadError && (
            <div>
              <p role="alert" className="text-sm text-red-700">{loadError}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-2 min-h-[44px] rounded-full border border-stone-300 px-4 text-sm font-semibold"
              >
                Try again
              </button>
            </div>
          )}
          {!loading && !loadError && topLevel.length === 0 && (
            <p className="text-sm text-ink-soft">
              No comments yet — be the first to share what you think.
            </p>
          )}
          <ul className="space-y-3">
            {shown.map((c) => renderComment(c, false))}
          </ul>
          {!showAll && topLevel.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-4 inline-flex min-h-[44px] items-center rounded-full border border-stone-300 px-5 py-2 text-sm font-semibold hover:bg-stone-100"
            >
              View all {topLevel.length} comments
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
