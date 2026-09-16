"use client";

import { useState } from "react";
import { useSessionGate } from './SessionGateProvider';
import { communityRequest } from '@/lib/community-client';
import ProfilePanel from './ProfilePanel';

export default function SiteFooter() {
  const [kind, setKind] = useState<"review" | "improvement" | null>(null);
  const [message, setMessage] = useState("");
  const [openedEmail, setOpenedEmail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { requireSession } = useSessionGate();
  const openForm = (next: "review" | "improvement") => {
    setKind(next);
    setMessage("");
    setOpenedEmail(false);
    setError('');
  };
  const link = "inline-flex min-h-[44px] items-center text-sm font-semibold text-pink hover:underline";

  return (
    <footer className="border-t border-stone-200 bg-white/70 px-4 py-8 md:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div className="flex items-center gap-3">
            <img src="/images/joshua-portrait.png" alt="Joshua Solomon" width={56} height={56} loading="lazy" className="h-14 w-14 shrink-0 rounded-full object-cover object-center" />
            <div>
              <p className="text-sm font-semibold">Created by Joshua Solomon.</p>
              <p className="text-sm text-ink-soft">A little more connection. A better week.</p>
            </div>
          </div>
          <div>
            <h2 className="text-sm font-bold">Connect</h2>
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              <a className={link} href="mailto:joshua19solomon@gmail.com">Email Joshua</a>
              <a className={link} href="https://www.linkedin.com/in/joshua-solomon1/" target="_blank" rel="noopener noreferrer">LinkedIn <span className="sr-only">(opens in a new tab)</span></a>
              <button type="button" className={link} onClick={() => openForm("review")} aria-expanded={kind === "review"} aria-controls="site-feedback">Leave a review</button>
              <button type="button" className={link} onClick={() => openForm("improvement")} aria-expanded={kind === "improvement"} aria-controls="site-feedback">Suggest an improvement</button>
            </div>
          </div>
        </div>

        <details className="mt-5 max-w-3xl rounded-2xl border border-stone-200 bg-canvas px-5 py-3">
          <summary className="min-h-[44px] cursor-pointer py-2 text-sm font-semibold text-pink">What inspired this?</summary>
          <div className="space-y-4 pb-3 pt-2 text-base text-ink-soft">
            <p>I built this to help people find events worth going to—through honest comments, photos, and seeing who’s going.</p>
            <p className="text-sm">Thanks to <a className="font-semibold text-pink underline" href="https://x.com/natea" target="_blank" rel="noopener noreferrer">Nate Aune (@natea)</a>, whose embedded event maps inspired this project.</p>
          </div>
        </details>

        <div id="site-feedback">
          {kind && (
            <form className="mt-5 max-w-2xl rounded-2xl border border-stone-200 bg-white p-5" onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true); setError('');
              try {
                if (!await requireSession()) return;
                await communityRequest('/api/feedback', { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify({ kind, body: message.trim() }) });
                setOpenedEmail(true); setMessage('');
              } catch(e) { setError((e as Error).message); } finally { setBusy(false); }
            }}>
              <h2 className="text-lg font-bold">{kind === "review" ? "Review the website" : "Help make this better"}</h2>
              <p className="mt-1 text-sm text-ink-soft">This website feedback is saved privately for Joshua. For event experiences, use the community posts on that event.</p>
              <label htmlFor="site-feedback-message" className="mb-2 mt-4 block text-sm font-semibold">{kind === "review" ? "How was your experience using the planner?" : "What would you like to improve?"}</label>
              <textarea autoFocus id="site-feedback-message" value={message} onChange={(event) => { setMessage(event.target.value); setOpenedEmail(false); }} required minLength={3} maxLength={2000} rows={4} className="w-full rounded-xl border border-stone-300 p-3" />
              <div className="mt-3 flex flex-wrap gap-3">
                <button disabled={busy} className="min-h-[44px] rounded-full bg-pink px-5 font-semibold text-ink" type="submit">{busy ? 'Sending…' : 'Send feedback'}</button>
                <button className="min-h-[44px] rounded-full border border-stone-300 px-5" type="button" onClick={() => setKind(null)}>Close</button>
              </div>
              {openedEmail && <p role="status" className="mt-3 text-sm text-ink-soft">Thank you—your feedback has been saved for Joshua.</p>}
              {error && <p role="alert">{error}</p>}
            </form>
          )}
        </div>
        <div className="mt-6 max-w-2xl"><ProfilePanel /></div>
      </div>
    </footer>
  );
}
