"use client";

import { useEffect, useRef, useState } from "react";
import { createSession, type SessionUser } from "@/lib/api";

interface Props {
  open: boolean;
  onDone: (user: SessionUser | null) => void;
}

/**
 * Display-name gate: shown before the first like / dislike / comment.
 * "Choose a display name" -> Continue -> POST /api/session (sets the
 * httpOnly session cookie). Escape / Cancel dismisses without a session.
 */
export default function DisplayNameGate({ open, onDone }: Props) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setBusy(false);
      setError(null);
      // Focus the input when the modal opens.
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open ]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone(null);
      // Minimal focus trap: keep Tab inside the panel.
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onDone]);

  if (!open) return null;

  const submit = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("Pick a display name with at least 2 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const user = await createSession(trimmed.slice(0, 40));
      onDone(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create your session.");
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-stone-900/50 p-4"
      role="presentation"
      onClick={() => {
        if (!busy) onDone(null);
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="display-name-title"
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="display-name-title" className="text-xl font-bold">
          Choose a display name
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          This is how other attendees will see you when you like, dislike, or
          comment.
        </p>
        <label htmlFor="display-name-input" className="mt-4 block text-sm font-semibold">
          Display name
        </label>
        <input
          ref={inputRef}
          id="display-name-input"
          type="text"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
          placeholder="e.g. Curious Builder"
          className="mt-1 min-h-[44px] w-full rounded-lg border border-stone-300 px-3 py-2 text-base"
          autoComplete="off"
        />
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            className="min-h-[44px] flex-1 rounded-full bg-primary-bright px-5 py-2.5 font-semibold text-white shadow hover:bg-primary-ink disabled:opacity-60"
          >
            {busy ? "Saving…" : "Continue"}
          </button>
          <button
            type="button"
            onClick={() => onDone(null)}
            disabled={busy}
            className="min-h-[44px] rounded-full border border-stone-300 px-5 py-2.5 font-semibold text-ink-soft hover:bg-stone-100 disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
