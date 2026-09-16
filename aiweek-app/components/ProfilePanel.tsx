"use client";
import { useState } from 'react';
import { useSessionGate } from './SessionGateProvider';
export default function ProfilePanel() {
  const { user, editName } = useSessionGate();
  const [name, setName] = useState(''); const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  if (!user) return <p className="text-sm text-ink-soft">Browse freely. Your first contribution creates a friendly display name—no signup needed.</p>;
  return <section aria-label="Your browser profile" className="rounded-xl bg-canvas-soft p-4 text-sm">
    <p>You’re posting as <strong>{user.display_name}</strong>. <button className="min-h-[44px] underline" onClick={() => { setName(user.display_name); setEditing(!editing); }}>Edit name</button></p>
    <p>Your profile is saved on this browser.</p><p className="mt-1 text-xs">This is not a verified identity and does not sync across devices. Clearing browser cookies can remove access. Earlier posts keep the name used when posted.</p>
    {editing && <form onSubmit={async e => { e.preventDefault(); setBusy(true); try { await editName(name); setEditing(false); setMessage('Name saved.'); } catch(e) { setMessage((e as Error).message); } finally { setBusy(false); } }}>
      <label className="mt-3 block">Display name<input className="ml-2 min-h-[44px] rounded-lg border p-2" required maxLength={40} value={name} onChange={e => setName(e.target.value)} /></label>
      <button disabled={busy} className="mt-2 min-h-[44px] rounded-full bg-pink px-4 text-ink">{busy ? 'Saving…' : 'Save name'}</button>
    </form>}{message && <p role="status">{message}</p>}
  </section>;
}
