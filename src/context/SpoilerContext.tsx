'use client';

import React, { createContext, useContext, useState, useSyncExternalStore } from 'react';

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

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getSnapshot(): boolean {
  if (typeof window === 'undefined') return true;
  const saved = localStorage.getItem('ptcg_spoilers_hidden');
  return saved !== null ? saved === 'true' : true;
}

function getServerSnapshot(): boolean {
  return true;
}

export function SpoilerProvider({ children }: { children: React.ReactNode }) {
  const spoilersHidden = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [revealedMatchIds, setRevealedMatchIds] = useState<Set<string>>(new Set());

  const toggleSpoilers = () => {
    const current = getSnapshot();
    localStorage.setItem('ptcg_spoilers_hidden', String(!current));
    window.dispatchEvent(new Event('storage'));
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
