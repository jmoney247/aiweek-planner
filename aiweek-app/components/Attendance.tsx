"use client";
import { useEffect, useState } from 'react';
import { communityRequest } from '@/lib/community-client';
import { useSessionGate } from './SessionGateProvider';
export default function Attendance({ eventId, startAt }: { eventId: string; startAt: string }) {
  const { requireSession } = useSessionGate(); const [state,setState] = useState<{count:number;going:boolean} | null>(null);
  const [error,setError] = useState(''); const [busy,setBusy] = useState(false);
  const url = `/api/events/${encodeURIComponent(eventId)}/attendance`;
  useEffect(() => { let active=true; communityRequest<{count:number;going:boolean}>(url).then(s => { if(active) setState(s); }).catch(e => { if(active) setError(e.message); }); return () => { active=false; }; },[url]);
  if (Date.parse(startAt) <= Date.now()) return null;
  return <section className="rounded-2xl bg-canvas-soft p-4"><p className="font-bold">Planning to attend?</p><p className="mt-1 text-sm">{state ? `${state.count} ${state.count === 1 ? 'person is' : 'people are'} planning to go.` : 'Loading attendance…'} This is interest—not registration or an attendee review.</p><button disabled={busy || !state} aria-pressed={state?.going ?? false} className="mt-3 min-h-[44px] rounded-full bg-pink px-5 font-bold" onClick={async () => { setBusy(true); setError(''); try { if(!await requireSession()) return; await communityRequest(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({going:!state?.going})}); setState(await communityRequest(url)); } catch(e) { setError((e as Error).message); } finally { setBusy(false); } }}>{busy ? 'Saving…' : state?.going ? '✓ I’m going — undo' : 'I’m going'}</button>{error && <p role="alert">{error}</p>}</section>;
}
