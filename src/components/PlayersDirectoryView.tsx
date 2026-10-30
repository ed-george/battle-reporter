'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { PlayerLeaderboardEntry, PlayersDirectoryData } from '@/lib/data-repository';
import { getLimitlessPlayerUrl } from '@/lib/limitless';
import { ArchetypeBadge } from '@/components/ArchetypeBadge';
import { formatRecord } from '@/lib/matches';
import { TAG_MATCH_URL } from '@/config';
import {
  Table,
  LayoutGrid,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Video,
  Trophy,
  Percent,
  ChevronRight,
  ChevronDown,
  Calendar,
  User,
  ExternalLink,
  Medal,
  PlusCircle,
  X,
} from 'lucide-react';

interface PlayersDirectoryViewProps {
  data?: PlayersDirectoryData | PlayerLeaderboardEntry[];
  players?: PlayerLeaderboardEntry[];
  initialSeason?: string;
  initialSort?: 'matches' | 'wins' | 'winrate';
  initialQuery?: string;
}

type ViewMode = 'table' | 'cards';
type SortField = 'rank' | 'name' | 'matches' | 'wins' | 'winRate';
type SortDirection = 'asc' | 'desc';

export function PlayersDirectoryView({
  data,
  players,
  initialSeason = 'all',
  initialSort = 'wins',
  initialQuery = '',
}: PlayersDirectoryViewProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Normalize data safely whether received as new structure { all, bySeason, availableSeasons } or legacy array
  const directoryData: PlayersDirectoryData = useMemo(() => {
    if (data && !Array.isArray(data) && 'all' in data && Array.isArray(data.all)) {
      return {
        all: data.all || [],
        bySeason: data.bySeason || {},
        availableSeasons: data.availableSeasons || Object.keys(data.bySeason || {}).sort().reverse(),
      };
    }
    const rawList = Array.isArray(data) ? data : Array.isArray(players) ? players : [];
    return {
      all: rawList,
      bySeason: {},
      availableSeasons: [],
    };
  }, [data, players]);

  // Table is the default view as requested
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedSeason, setSelectedSeason] = useState<string>(initialSeason || 'all');
  const [searchQuery, setSearchQuery] = useState(initialQuery || '');
  const [sortField, setSortField] = useState<SortField>(
    initialSort === 'wins' ? 'wins' : initialSort === 'winrate' ? 'winRate' : 'matches'
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Handle season filter change and update URL params without full page reload
  const handleSeasonChange = (newSeason: string) => {
    setSelectedSeason(newSeason);
    const search = typeof window !== 'undefined' ? window.location.search : '';
    const params = new URLSearchParams(search);
    if (newSeason && newSeason !== 'all') {
      params.set('season', newSeason);
    } else {
      params.delete('season');
    }
    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(newUrl, { scroll: false });
  };

  const currentPlayers: PlayerLeaderboardEntry[] = useMemo(() => {
    if (selectedSeason === 'all' || !directoryData.bySeason[selectedSeason]) {
      return directoryData.all || [];
    }
    return directoryData.bySeason[selectedSeason] || [];
  }, [directoryData, selectedSeason]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      // Alphabetical or rank defaults to asc, numerical metrics default to desc
      setSortDirection(field === 'name' || field === 'rank' ? 'asc' : 'desc');
    }
  };

  const filteredPlayers = useMemo(() => {
    const list = currentPlayers || [];
    if (!Array.isArray(list)) return [];

    let filtered = list;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p?.name?.toLowerCase().includes(q) ||
          (p?.country && p.country.toLowerCase().includes(q))
      );
    }

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = (a?.name || '').localeCompare(b?.name || '', undefined, { sensitivity: 'base' });
      } else if (sortField === 'matches') {
        comparison = (a?.matchesPlayed || 0) - (b?.matchesPlayed || 0);
      } else if (sortField === 'wins') {
        comparison = (a?.wins || 0) - (b?.wins || 0);
      } else if (sortField === 'winRate') {
        comparison = (a?.winRate || 0) - (b?.winRate || 0);
      }

      // Tiebreaker: sort by matchesPlayed desc, then wins desc, then name asc
      if (comparison === 0) {
        if (sortField !== 'matches') {
          comparison = (b?.matchesPlayed || 0) - (a?.matchesPlayed || 0);
        }
        if (comparison === 0 && sortField !== 'wins') {
          comparison = (b?.wins || 0) - (a?.wins || 0);
        }
        if (comparison === 0) {
          comparison = (a?.name || '').localeCompare(b?.name || '', undefined, { sensitivity: 'base' });
        }
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [currentPlayers, searchQuery, sortField, sortDirection]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
    );
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-black text-xs border border-amber-300 dark:border-amber-700/50 shrink-0">
          <Medal className="w-4 h-4 text-amber-500 dark:text-amber-400" />
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-xs border border-slate-300 dark:border-slate-700 shrink-0">
          2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/10 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 font-black text-xs border border-amber-600/30 dark:border-amber-700/40 shrink-0">
          3
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs shrink-0">
        {rank}
      </span>
    );
  };

  if (!directoryData.all || directoryData.all.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-12 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
          <User className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">No Stream Players Recorded Yet</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          Competitors will automatically appear here once broadcast stream matches featuring them have been tagged.
        </p>
        <div className="pt-2">
          <a
            href={TAG_MATCH_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Tag a Stream Match</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls Bar: Search, Season Filter & View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search player or country..."
              className="w-full pl-9 pr-9 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Season Filter Dropdown */}
          {directoryData.availableSeasons && directoryData.availableSeasons.length > 0 && (
            <div className="relative shrink-0">
              <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <select
                value={selectedSeason}
                onChange={(e) => handleSeasonChange(e.target.value)}
                aria-label="Filter by season"
                className="pl-8 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 appearance-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all"
              >
                <option value="all">All Seasons</option>
                {directoryData.availableSeasons.map((season) => (
                  <option key={season} value={season}>
                    {season}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          )}
        </div>

        {/* View Mode Toggle Button Group & Count */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <span className="text-xs text-slate-400 dark:text-slate-500 hidden md:inline mr-1">
            {filteredPlayers.length} {filteredPlayers.length === 1 ? 'Player' : 'Players'}
          </span>

          <div
            role="group"
            aria-label="View layout toggle"
            className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700"
          >
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="Table View (Default)"
              aria-label="Table View"
              aria-pressed={viewMode === 'table'}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="Card View"
              aria-label="Card View"
              aria-pressed={viewMode === 'cards'}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
          </div>
        </div>
      </div>

      {/* No Results from Filter */}
      {filteredPlayers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {searchQuery
              ? `No stream players match "${searchQuery}"${
                  selectedSeason !== 'all' ? ` in ${selectedSeason}` : ''
                }`
              : `No broadcast competitors found for ${selectedSeason}`}
          </p>
          <div className="flex items-center justify-center gap-2">
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
              >
                Clear Search
              </button>
            )}
            {selectedSeason !== 'all' && (
              <button
                type="button"
                onClick={() => handleSeasonChange('all')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
              >
                Reset Season to All
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW (DEFAULT) */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/60 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
                  <th scope="col" className="py-3.5 pl-4 sm:pl-6 pr-2 w-12 text-center">
                    #
                  </th>
                  <th scope="col" className="py-3.5 px-3">
                    <button
                      type="button"
                      onClick={() => handleSort('name')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      <span>Player</span>
                      {renderSortIcon('name')}
                    </button>
                  </th>
                  <th scope="col" className="py-3.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort('matches')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors ml-auto"
                    >
                      <span>Matches</span>
                      {renderSortIcon('matches')}
                    </button>
                  </th>
                  <th scope="col" className="py-3.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort('wins')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors ml-auto"
                    >
                      <span>Record / Wins</span>
                      {renderSortIcon('wins')}
                    </button>
                  </th>
                  <th scope="col" className="py-3.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort('winRate')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors ml-auto"
                    >
                      <span>Win %</span>
                      {renderSortIcon('winRate')}
                    </button>
                  </th>
                  <th scope="col" className="py-3.5 px-3">
                    <span>Decks Used</span>
                  </th>
                  <th scope="col" className="py-3.5 pl-3 pr-4 sm:pr-6 text-right w-24">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                {filteredPlayers.map((player, index) => {
                  const rank = index + 1;
                  const recordStr = formatRecord(player.wins, player.losses, player.ties);

                  const winRateColor =
                    player.winRate >= 55
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : player.winRate >= 45
                      ? 'text-slate-700 dark:text-slate-300'
                      : 'text-rose-600 dark:text-rose-400';

                  const progressColor =
                    player.winRate >= 55
                      ? 'bg-emerald-500'
                      : player.winRate >= 45
                      ? 'bg-blue-500'
                      : 'bg-rose-500';

                  return (
                    <tr
                      key={player.name}
                      className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Rank # */}
                      <td className="py-3.5 pl-4 sm:pl-6 pr-2 text-center">
                        <div className="flex items-center justify-center">
                          {getRankBadge(rank)}
                        </div>
                      </td>

                      {/* Player Name, Country, Limitless Profile */}
                      <td className="py-3.5 px-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/player/${player.slug}`}
                              className="font-bold text-slate-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 transition-colors truncate"
                            >
                              {player.name}
                            </Link>
                            {player.country && (
                              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                                {player.country}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5">
                            <a
                              href={getLimitlessPlayerUrl(player.name)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                            >
                              <span>Limitless Profile</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* Matches Played */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                          <Video className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span>{player.matchesPlayed}</span>
                        </div>
                      </td>

                      {/* Wins & Record */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                          <Trophy className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                          <span>{player.wins}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-0.5">
                          {recordStr}
                        </span>
                      </td>

                      {/* Win Percentage */}
                      <td className="py-3.5 px-3 text-right">
                        <div className={`inline-flex items-center gap-1 font-extrabold text-sm ${winRateColor}`}>
                          <Percent className="w-3.5 h-3.5 opacity-80" />
                          <span>{player.winRate}%</span>
                        </div>
                        <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden ml-auto mt-1">
                          <div
                            className={`h-full rounded-full ${progressColor}`}
                            style={{ width: `${Math.min(100, Math.max(0, player.winRate))}%` }}
                          />
                        </div>
                      </td>

                      {/* Decks Used */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
                          {player.archetypes.slice(0, 3).map((arch) => (
                            <ArchetypeBadge key={arch} identifier={arch} size="sm" />
                          ))}
                          {player.archetypes.length > 3 && (
                            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                              +{player.archetypes.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action Link */}
                      <td className="py-3.5 pl-3 pr-4 sm:pr-6 text-right">
                        <Link
                          href={`/player/${player.slug}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title={`View matches for ${player.name}`}
                        >
                          <span>Games</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARDS VIEW */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredPlayers.map((player, idx) => {
              const rank = idx + 1;
              return (
                <div
                  key={player.name}
                  className="p-4 sm:p-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left: Rank, Player Name & Profile */}
                  <div className="flex items-center gap-3.5 min-w-0 md:w-72">
                    {getRankBadge(rank)}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/player/${player.slug}`}
                          className="font-extrabold text-base text-slate-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 transition-colors truncate"
                        >
                          {player.name}
                        </Link>
                        {player.country && (
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                            {player.country}
                          </span>
                        )}
                      </div>
                      <div className="mt-1">
                        <a
                          href={getLimitlessPlayerUrl(player.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                        >
                          <span>Limitless Profile</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Stats (Matches, Record, Win Rate) */}
                  <div className="grid grid-cols-3 gap-1 text-xs md:w-80 shrink-0">
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[11px]">Matches</span>
                      <div className="flex items-center gap-1 font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                        <Video className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
                        <span>{player.matchesPlayed}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[11px]">Record</span>
                      <div className="flex items-center gap-1 font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                        <Trophy className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                        <span>{formatRecord(player.wins, player.losses, player.ties)}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[11px]">Win Rate</span>
                      <div className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">
                        <Percent className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                        <span>{player.winRate}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Archetypes Used */}
                  <div className="flex-1 flex flex-wrap items-center gap-1.5 min-w-0">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold mr-1 hidden lg:inline">
                      Decks:
                    </span>
                    {player.archetypes.map((arch) => (
                      <ArchetypeBadge key={arch} identifier={arch} size="sm" />
                    ))}
                  </div>

                  {/* Right: View Matches Link */}
                  <div className="shrink-0 flex items-center justify-end">
                    <Link
                      href={`/player/${player.slug}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      <span>View Games</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
