"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import DisplayNameGate from "@/components/DisplayNameGate";
import { getStoredUser, storeUser } from "@/lib/session";
import type { SessionUser } from "@/lib/api";

interface SessionGateContextValue {
  /** Resolve the current user, or prompt for a display name first. */
  requireSession: () => Promise<SessionUser | null>;
  user: SessionUser | null;
}

const SessionGateContext = createContext<SessionGateContextValue>({
  requireSession: async () => null,
  user: null,
});

export function useSessionGate(): SessionGateContextValue {
  return useContext(SessionGateContext);
}

/**
 * Hosts the display-name gate modal. Wrap the app in this (client) provider;
 * any component can call `requireSession()` before a gated action (like,
 * dislike, comment). The pending action resumes after the user continues.
 */
export function SessionGateProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => getStoredUser());
  const [gateOpen, setGateOpen] = useState(false);
  const resolverRef = useRef<((u: SessionUser | null) => void) | null>(null);

  const requireSession = useCallback(async (): Promise<SessionUser | null> => {
    const existing = getStoredUser();
    if (existing) {
      setUser(existing);
      return existing;
    }
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setGateOpen(true);
    });
  }, []);

  const handleDone = useCallback((u: SessionUser | null) => {
    setGateOpen(false);
    if (u) {
      storeUser(u);
      setUser(u);
    }
    resolverRef.current?.(u);
    resolverRef.current = null;
  }, []);

  return (
    <SessionGateContext.Provider value={{ requireSession, user }}>
      {children}
      <DisplayNameGate open={gateOpen} onDone={handleDone} />
    </SessionGateContext.Provider>
  );
}
