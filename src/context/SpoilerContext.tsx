'use client';

import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';

interface SpoilerContextType {
  spoilersHidden: boolean;
  toggleSpoilers: () => void;
  revealedMatchIds: Set<string>;
  revealMatch: (matchId: string) => void;
  isMatchRevealed: (matchId: string) => boolean;
}

const SpoilerContext = createContext<SpoilerContextType>({
  spoilersHidden: true,
  toggleSpoilers: () => {},
  revealedMatchIds: new Set(),
  revealMatch: () => {},
  isMatchRevealed: () => false,
});

let isHydrated = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((cb) => cb());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'ptcg_spoilers_hidden') {
      notify();
    }
  };
  window.addEventListener('storage', handleStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', handleStorage);
  };
}

function getSnapshot(): boolean {
  if (!isHydrated || typeof window === 'undefined') {
    return true;
  }
  try {
    const saved = localStorage.getItem('ptcg_spoilers_hidden');
    return saved !== null ? saved === 'true' : true;
  } catch {
    return true;
  }
}

function getServerSnapshot(): boolean {
  return true;
}

export function SpoilerProvider({ children }: { children: React.ReactNode }) {
  const spoilersHidden = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [revealedMatchIds, setRevealedMatchIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isHydrated) {
      isHydrated = true;
      notify();
    }
  }, []);

  const toggleSpoilers = () => {
    const current = getSnapshot();
    try {
      localStorage.setItem('ptcg_spoilers_hidden', String(!current));
    } catch {}
    notify();
  };

  const revealMatch = (matchId: string) => {
    setRevealedMatchIds((prev) => new Set(prev).add(matchId));
  };

  const isMatchRevealed = (matchId: string) => {
    if (!spoilersHidden) return true;
    return revealedMatchIds.has(matchId);
  };

  return (
    <SpoilerContext.Provider
      value={{
        spoilersHidden,
        toggleSpoilers,
        revealedMatchIds,
        revealMatch,
        isMatchRevealed,
      }}
    >
      {children}
    </SpoilerContext.Provider>
  );
}

export function useSpoilers() {
  return useContext(SpoilerContext);
}




