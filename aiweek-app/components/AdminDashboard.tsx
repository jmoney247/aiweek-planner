'use client';
import { useEffect, useState } from 'react';
const labels: Record<string, string> = { events: 'Events', mapped_events: 'Events with coordinates', browser_profiles: 'Browser profiles', visible_comments: 'Visible comments', shared_photos: 'Shared photos', event_likes: 'Event likes', event_dislikes: 'Event dislikes', comment_likes: 'Comment likes', comment_dislikes: 'Comment dislikes', planned_attendance: 'Planned attendances', website_feedback: 'Website feedback submissions' };
const button = 'min-h-[44px] rounded-xl border border-stone-300 bg-white px-4 py-2 font-semibold disabled:opacity-50';
export default function AdminDashboard() {
  const [totals, setTotals] = useState<Record<string, number | string> | null>(null);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin/analytics', { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (response.status === 401) { setSignedIn(false); setTotals(null); return; }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load analytics.');
      setSignedIn(true); setTotals(result); setMessage('');
    }).catch(error => { if (!controller.signal.aborted) setMessage(error.message); }).finally(() => { if (!controller.signal.aborted) setReady(true); });
    return () => controller.abort();
  }, [revision]);
  async function signIn() {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/admin/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Sign-in failed.');
      setPassword(''); setSignedIn(true); setRevision(r => r + 1);
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
    <header><h1 className="text-3xl font-extrabold">Joshua Solomon · Admin</h1><p className="mt-2 text-ink-soft">Your private event and community dashboard.</p></header>
    {!ready ? <p role="status">Checking sign-in…</p> : !signedIn ? <form className="max-w-md space-y-4 rounded-2xl border bg-white p-5" onSubmit={e => { e.preventDefault(); void signIn(); }}>
      <label className="block font-semibold">Admin password<input autoFocus type="password" autoComplete="current-password" required maxLength={256} value={password} onChange={e => setPassword(e.target.value)} className="mt-2 block w-full rounded-xl border p-3" /></label>
      <button className={button + ' !bg-pink'} disabled={busy}>{busy ? 'Signing in…' : 'Open dashboard'}</button>
    </form> : <div className="flex flex-wrap gap-3"><button className={button} onClick={() => { setTotals(null); setRevision(r => r + 1); }}>Refresh data</button><button disabled={busy} className={button} onClick={async () => { setBusy(true); try { const result = await fetch('/api/admin/session', { method: 'DELETE' }); if (!result.ok) throw new Error('Could not sign out. Try again.'); setRevision(r => r + 1); setTotals(null); setSignedIn(false); setMessage('Signed out.'); } catch(error) { setMessage((error as Error).message); } finally { setBusy(false); } }}>Sign out</button></div>}
    {message && <p role="status" className="rounded-xl border bg-white p-4">{message}</p>}
    {totals && <><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(labels).map(([key, label]) => <section className="rounded-2xl border bg-white p-5" key={key}><h2 className="text-sm font-semibold text-ink-soft">{label}</h2><p className="mt-2 text-3xl font-bold">{Number(totals[key] ?? 0).toLocaleString()}</p></section>)}</div><p className="text-sm text-ink-soft">All-time totals, refreshed {new Date(String(totals.generated_at)).toLocaleString()}. Browser profiles are not unique visitors. Attendance counts event selections. Page views are not tracked.</p></>}
  </main>;
}
