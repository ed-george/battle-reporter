'use client';

import React, { useState, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { StreamedMatch, Tournament, DeckArchetype } from '@/types/database';
import { MatchCard } from '@/components/MatchCard';
import { isPlayerSlugMatch } from '@/lib/matches';
import { Video, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { analytics, trackEvent } from '@/lib/analytics';

interface MatchesExplorerViewProps {
  allMatches: StreamedMatch[];
  tournaments: Tournament[];
  archetypes: DeckArchetype[];
}

export function MatchesExplorerView({
  allMatches = [],
  tournaments = [],
  archetypes = [],
}: MatchesExplorerViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlQ = searchParams?.get('q') || '';
  const urlTournamentId = searchParams?.get('tournamentId') || '';
  const urlArchetype = searchParams?.get('archetype') || '';
  const urlPlayer = searchParams?.get('player') || '';
  const urlPage = Number(searchParams?.get('page')) || 1;

  const [query, setQuery] = useState(urlQ);
  const [selectedTournament, setSelectedTournament] = useState(urlTournamentId);
  const [selectedArchetype, setSelectedArchetype] = useState(urlArchetype);
  const [selectedPlayer, setSelectedPlayer] = useState(urlPlayer);
  const [page, setPage] = useState(urlPage > 0 ? urlPage : 1);

  const pageSize = 25;

  const updateFilters = (newParams: {
    q?: string;
    tournamentId?: string;
    archetype?: string;
    player?: string;
    page?: number;
  }) => {
    const nextQ = newParams.q !== undefined ? newParams.q : query;
    const nextTour = newParams.tournamentId !== undefined ? newParams.tournamentId : selectedTournament;
    const nextArch = newParams.archetype !== undefined ? newParams.archetype : selectedArchetype;
    const nextPlayer = newParams.player !== undefined ? newParams.player : selectedPlayer;
    const nextPage = newParams.page !== undefined ? newParams.page : 1;

    setQuery(nextQ);
    setSelectedTournament(nextTour);
    setSelectedArchetype(nextArch);
    setSelectedPlayer(nextPlayer);
    setPage(nextPage);

    if (newParams.q !== undefined && newParams.q.trim()) {
      analytics.search(newParams.q.trim(), 'matches_explorer');
    }
    if (newParams.tournamentId !== undefined || newParams.archetype !== undefined || newParams.player !== undefined) {
      analytics.filterMatches({
        tournamentId: nextTour,
        archetype: nextArch,
        player: nextPlayer,
      });
    }
    if (newParams.page !== undefined && newParams.page !== page) {
      trackEvent('paginate_matches', { page: nextPage });
    }

    const params = new URLSearchParams();
    if (nextQ.trim()) params.set('q', nextQ.trim());
    if (nextTour) params.set('tournamentId', nextTour);
    if (nextArch) params.set('archetype', nextArch);
    if (nextPlayer) params.set('player', nextPlayer);
    if (nextPage > 1) params.set('page', nextPage.toString());

    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const handleReset = () => {
    trackEvent('reset_matches_filters');
    setQuery('');
    setSelectedTournament('');
    setSelectedArchetype('');
    setSelectedPlayer('');
    setPage(1);
    router.replace(pathname, { scroll: false });
  };

  const sortedArchetypes = useMemo(() => {
    return [...archetypes].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
  }, [archetypes]);

  const filteredMatches = useMemo(() => {
    return allMatches.filter((m) => {
      if (selectedTournament && m.tournament_id !== selectedTournament) {
        return false;
      }
      if (selectedArchetype) {
        const matchesArch =
          m.player1_deck_archetype === selectedArchetype ||
          m.player2_deck_archetype === selectedArchetype;
        if (!matchesArch) return false;
      }
      if (selectedPlayer) {
        const matchesPlayer =
          isPlayerSlugMatch(m.player1_name, selectedPlayer) ||
          isPlayerSlugMatch(m.player2_name, selectedPlayer) ||
          m.player1_name.toLowerCase().includes(selectedPlayer.toLowerCase()) ||
          m.player2_name.toLowerCase().includes(selectedPlayer.toLowerCase());
        if (!matchesPlayer) return false;
      }
      if (query.trim()) {
        const q = query.toLowerCase().trim();
        const matchesQ =
          m.player1_name.toLowerCase().includes(q) ||
          m.player2_name.toLowerCase().includes(q) ||
          (m.tournament?.name && m.tournament.name.toLowerCase().includes(q)) ||
          (m.player1_deck_archetype && m.player1_deck_archetype.toLowerCase().includes(q)) ||
          (m.player2_deck_archetype && m.player2_deck_archetype.toLowerCase().includes(q)) ||
          (m.round_name && m.round_name.toLowerCase().includes(q));
        if (!matchesQ) return false;
      }
      return true;
    });
  }, [allMatches, selectedTournament, selectedArchetype, selectedPlayer, query]);

  const total = filteredMatches.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const paginatedMatches = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMatches.slice(start, start + pageSize);
  }, [filteredMatches, currentPage, pageSize]);

  const startRange = total > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endRange = total > 0 ? Math.min(currentPage * pageSize, total) : 0;

  const hasActiveFilters = Boolean(
    query.trim() || selectedTournament || selectedArchetype || selectedPlayer || currentPage > 1
  );

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Stream Matches Explorer
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Search and filter all archived broadcast matches by tournament, player, or deck archetype.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateFilters({ page: 1 });
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          {selectedPlayer && <input type="hidden" name="player" value={selectedPlayer} />}

          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => updateFilters({ q: e.target.value, page: 1 })}
              placeholder="Search by player name, archetype, or tournament..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
            />
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
            {query && (
              <button
                type="button"
                onClick={() => updateFilters({ q: '', page: 1 })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={selectedTournament}
            onChange={(e) => updateFilters({ tournamentId: e.target.value, page: 1 })}
            className="px-3 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500 font-medium sm:max-w-xs"
          >
            <option value="">All Tournaments</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <select
            value={selectedArchetype}
            onChange={(e) => updateFilters({ archetype: e.target.value, page: 1 })}
            className="px-3 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500 font-medium sm:max-w-xs"
          >
            <option value="">All Archetypes</option>
            {sortedArchetypes.map((a) => (
              <option key={a.identifier} value={a.identifier}>
                {a.name}
              </option>
            ))}
          </select>
        </form>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>
          {total > 0 ? (
            <>
              Showing <strong>{startRange}-{endRange}</strong> of <strong>{total}</strong>{' '}
              {total === 1 ? 'match' : 'matches'}
            </>
          ) : (
            <>
              Showing <strong>0</strong> matches
            </>
          )}
          {selectedPlayer && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
              Player: {selectedPlayer}
            </span>
          )}
        </span>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="text-red-600 dark:text-red-400 hover:underline font-bold"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Matches List */}
      {paginatedMatches.length > 0 ? (
        <div className="space-y-4">
          <div className="space-y-3">
            {paginatedMatches.map((match) => (
              <MatchCard key={match.id} match={match} displayTournament={true} />
            ))}
          </div>

          {/* Pagination Controls */}
          {total > pageSize && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400 order-2 sm:order-1">
                Page <strong className="text-slate-900 dark:text-white font-semibold">{currentPage}</strong> of{' '}
                <strong className="text-slate-900 dark:text-white font-semibold">{totalPages}</strong>
              </div>

              <div className="flex items-center gap-2 order-1 sm:order-2">
                {currentPage > 1 ? (
                  <button
                    type="button"
                    onClick={() => updateFilters({ page: currentPage - 1 })}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors shadow-2xs cursor-pointer"
                    aria-label="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>
                ) : (
                  <span
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-800/50 text-slate-400 dark:text-slate-600 cursor-not-allowed select-none"
                    aria-disabled="true"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </span>
                )}

                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 px-2 py-1">
                  {currentPage} / {totalPages}
                </span>

                {currentPage < totalPages ? (
                  <button
                    type="button"
                    onClick={() => updateFilters({ page: currentPage + 1 })}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors shadow-2xs cursor-pointer"
                    aria-label="Next Page"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <span
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-800/50 text-slate-400 dark:text-slate-600 cursor-not-allowed select-none"
                    aria-disabled="true"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
            <Video className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Stream Matches Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Try adjusting your search terms or filter criteria.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
