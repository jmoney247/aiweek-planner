"use client";
import { useEffect, useRef } from 'react';
import CommunityFeed from './CommunityFeed';
interface Props { eventId: string; open: boolean; onClose: () => void }
export default function CommentsDrawer({ eventId, open, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!open) { dialog.current?.close(); return; }
    const opener = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.showModal();
    return () => { document.body.style.overflow = overflow; dialog.current?.close(); opener?.focus(); };
  }, [open]);
  return <dialog ref={dialog} aria-label="Event Hype discussion" onCancel={onClose} className="m-auto max-h-[90dvh] w-[min(960px,95vw)] overflow-y-auto rounded-2xl bg-canvas p-4 text-ink backdrop:bg-black/40 md:p-6">
    <button autoFocus type="button" className="mb-4 min-h-[44px] rounded-full border bg-white px-5 font-semibold" onClick={onClose}>Close Hype</button>
    {open && <CommunityFeed key={eventId} eventId={eventId} />}
  </dialog>;
}
