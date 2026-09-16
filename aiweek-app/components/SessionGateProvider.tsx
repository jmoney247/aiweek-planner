"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { storeUser, clearStoredUser } from '@/lib/session';
import { communityRequest } from '@/lib/community-client';
import type { SessionUser } from '@/lib/api';
interface Context { requireSession: () => Promise<SessionUser | null>; user: SessionUser | null; editName: (name: string) => Promise<void> }
const SessionContext = createContext<Context>({ requireSession: async () => null, user: null, editName: async () => {} });
export const useSessionGate = () => useContext(SessionContext);
export function SessionGateProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState('');
  const pending = useRef<Promise<SessionUser | null> | null>(null);
  useEffect(() => { fetch('/api/session', { cache: 'no-store' }).then(async res => {
    if (res.ok) { const data = await res.json(); storeUser(data.user); setUser(data.user); }
    else if (res.status === 401) clearStoredUser();
  }).catch(() => {}); }, []);
  const requireSession = useCallback(() => {
    if (!pending.current) pending.current = communityRequest<{ user: SessionUser }>('/api/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
      .then(({ user }) => { setUser(user); storeUser(user); setError(''); return user; })
      .catch((error: Error) => { setError(error.message); return null; }).finally(() => { pending.current = null; });
    return pending.current;
  }, []);
  const editName = async (display_name: string) => {
    const result = await communityRequest<{ user: SessionUser }>('/api/session', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ display_name }) });
    storeUser(result.user); setUser(result.user);
  };
  return <SessionContext.Provider value={{ user, requireSession, editName }}>{children}{error && <div role="alert" className="fixed bottom-4 left-4 right-4 z-[1000] rounded-xl border bg-white p-4 shadow-lg">{error}<button className="ml-4 min-h-[44px] underline" onClick={() => setError('')}>Dismiss</button></div>}</SessionContext.Provider>;
}
