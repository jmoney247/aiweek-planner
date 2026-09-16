'use client';
import { useEffect, useState } from 'react';
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';

const EMAIL = 'joshua19solomon@gmail.com';
const labels: Record<string, string> = { events: 'Events', mapped_events: 'Events with coordinates', browser_profiles: 'Browser profiles', visible_comments: 'Visible comments', shared_photos: 'Shared photos', event_likes: 'Event likes', event_dislikes: 'Event dislikes', comment_likes: 'Comment likes', comment_dislikes: 'Comment dislikes', planned_attendance: 'Planned attendances', website_feedback: 'Website feedback submissions' };
const button = 'min-h-[44px] rounded-xl border border-stone-300 bg-white px-4 py-2 font-semibold disabled:opacity-50';

export default function AdminDashboard() {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [totals, setTotals] = useState<Record<string, number | string> | null>(null);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) { setMessage('Admin authentication is not configured yet.'); setReady(true); return; }
    const sb = createClient(url, key, { auth: { flowType: 'pkce', storageKey: 'aiweek-admin-auth', persistSession: true, detectSessionInUrl: true } });
    setClient(sb);
    let active = true;
    const { data: listener } = sb.auth.onAuthStateChange((_event, value) => { if (active) { setSession(value); setTotals(null); } });
    sb.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      setSession(data.session); setReady(true);
      if (error) setMessage('This sign-in link could not be used. Request a fresh link and open it in this browser.');
      if (new URLSearchParams(window.location.search).has('code')) window.history.replaceState({}, '', '/admin');
    }).catch(() => { if (active) { setReady(true); setMessage('Could not check your sign-in. Refresh to try again.'); } });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    let active = true;
    if (!client || !session) return;
    setMessage('Checking admin access…');
    (async () => {
      const verified = await client.auth.getUser();
      if (verified.error || !verified.data.user) throw new Error('Please sign in again.');
      // The database, not this display check, decides authorization.
      const { data, error } = await client.rpc('admin_analytics');
      if (error) throw new Error('Admin access is unavailable. Your verified Joshua account must be enrolled and the admin database setup must be applied.');
      if (active) { setTotals(data); setMessage(''); }
    })().catch(error => { if (active) { setTotals(null); setMessage(error.message); } });
    return () => { active = false; };
  }, [client, session, revision]);
  const signIn = async (method: 'link' | 'password') => {
    if (!client || busy) return;
    setBusy(true); setMessage('');
    try {
      const result = method === 'link'
        ? await client.auth.signInWithOtp({ email: EMAIL, options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/admin` } })
        : await client.auth.signInWithPassword({ email: EMAIL, password });
      if (result.error) throw new Error('Sign-in could not be completed. Check your account setup or password, or wait before requesting another link.');
      setPassword('');
      if (method === 'link') setMessage('Check Joshua’s email for a one-time sign-in link. Open it in this same browser.');
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  };
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
    <header><h1 className="text-3xl font-extrabold">Joshua Solomon · Admin</h1><p className="mt-2 text-ink-soft">Private event and community analytics. Supabase authentication required.</p></header>
    {!ready ? <p role="status">Checking sign-in…</p> : !session ? <section className="max-w-lg space-y-4 rounded-2xl border bg-white p-5">
      <h2 className="text-xl font-bold">Admin sign-in</h2><p>{EMAIL}</p>
      <button className={`${button} !bg-pink`} disabled={!client || busy} onClick={() => void signIn('link')}>Email me a one-time sign-in link</button>
      <details><summary className="min-h-[44px] cursor-pointer py-3 underline">Or use your admin password</summary><form className="space-y-3" onSubmit={e => { e.preventDefault(); void signIn('password'); }}>
        <input type="text" name="username" autoComplete="username" value={EMAIL} readOnly className="sr-only" />
        <label className="block">Password<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full rounded-xl border p-3" /></label><button className={button} disabled={!client || busy}>Sign in securely</button>
      </form></details><p className="text-sm text-ink-soft">This is separate from public visitor profiles. No public admin signup is available.</p>
    </section> : <div className="flex flex-wrap gap-3"><button className={button} onClick={() => { setTotals(null); setRevision(r => r + 1); }}>Refresh analytics</button><button className={button} onClick={async () => { setTotals(null); const result = await client?.auth.signOut({ scope: 'local' }); setMessage(result?.error ? 'Sign-out failed. Please try again.' : 'Signed out.'); }}>Sign out</button></div>}
    {message && <p role="status" className="rounded-xl border bg-white p-4">{message}</p>}
    {totals && <><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(labels).map(([key, label]) => <section className="rounded-2xl border bg-white p-5" key={key}><h2 className="text-sm font-semibold text-ink-soft">{label}</h2><p className="mt-2 text-3xl font-bold">{Number(totals[key] ?? 0).toLocaleString()}</p></section>)}</div><p className="text-sm text-ink-soft">All-time totals, refreshed {new Date(String(totals.generated_at)).toLocaleString()}. Browser profiles are not verified people or unique visitors. Attendance counts event selections, not unique attendees. No page-view tracking has been added.</p></>}
  </main>;
}
