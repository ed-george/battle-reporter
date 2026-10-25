'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { StreamedArchetypeSummary, ArchetypesDirectoryData } from '@/lib/data-repository';
import { ArchetypeIcon } from '@/components/ArchetypeIcon';
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
  Layers,
  X,
} from 'lucide-react';

interface ArchetypesDirectoryViewProps {
  data?: ArchetypesDirectoryData | StreamedArchetypeSummary[];
  archetypes?: StreamedArchetypeSummary[];
  initialSeason?: string;
}

type ViewMode = 'table' | 'grid';
type SortField = 'games' | 'wins' | 'winRate' | 'name';
type SortDirection = 'asc' | 'desc';

export function ArchetypesDirectoryView({
  data,
  archetypes,
  initialSeason = 'all',
}: ArchetypesDirectoryViewProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Normalize data safely whether received as new structure { all, bySeason, availableSeasons } or legacy array
  const directoryData: ArchetypesDirectoryData = useMemo(() => {
    if (data && !Array.isArray(data) && 'all' in data && Array.isArray(data.all)) {
      return {
        all: data.all || [],
        bySeason: data.bySeason || {},
        availableSeasons: data.availableSeasons || Object.keys(data.bySeason || {}).sort().reverse(),
      };
    }
    const rawList = Array.isArray(data) ? data : Array.isArray(archetypes) ? archetypes : [];
    return {
      all: rawList,
      bySeason: {},
      availableSeasons: [],
    };
  }, [data, archetypes]);

  // Default view is table as requested
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedSeason, setSelectedSeason] = useState<string>(initialSeason || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('games');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Handle season filter change and update URL params without reload
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

  const currentArchetypes: StreamedArchetypeSummary[] = useMemo(() => {
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
      // Alphabetical defaults to asc, numerical defaults to desc
      setSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  };

  const filteredArchetypes = useMemo(() => {
    const list = currentArchetypes || [];

    if (!Array.isArray(list)) {
      return [];
    }

    let filtered = list;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((item) => item?.archetype?.name?.toLowerCase().includes(q));
    }

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = (a?.archetype?.name || '').localeCompare(b?.archetype?.name || '', undefined, { sensitivity: 'base' });
      } else if (sortField === 'games') {
        comparison = (a?.gamesPlayed || 0) - (b?.gamesPlayed || 0);
      } else if (sortField === 'wins') {
        comparison = (a?.wins || 0) - (b?.wins || 0);
      } else if (sortField === 'winRate') {
        comparison = (a?.winRate || 0) - (b?.winRate || 0);
      }

      // Tiebreaker: sort by games played desc, then name asc
      if (comparison === 0) {
        if (sortField !== 'games') {
          comparison = (b?.gamesPlayed || 0) - (a?.gamesPlayed || 0);
        }
        if (comparison === 0) {
          comparison = (a?.archetype?.name || '').localeCompare(b?.archetype?.name || '', undefined, { sensitivity: 'base' });
        }
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [currentArchetypes, searchQuery, sortField, sortDirection]);

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

  if (!directoryData.all || directoryData.all.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-12 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
          <Layers className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">No Stream Matches Recorded Yet</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          Archetypes will automatically appear here once broadcast stream matches featuring them have been tagged.
        </p>
        <div className="pt-2">
          <Link
            href="/submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors"
          >
            Tag a Stream Match
          </Link>
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
              placeholder="Search archetypes..."
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
            {filteredArchetypes.length} {filteredArchetypes.length === 1 ? 'Archetype' : 'Archetypes'}
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
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="Grid View"
              aria-label="Grid View"
              aria-pressed={viewMode === 'grid'}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* No Results from Filter */}
      {filteredArchetypes.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {searchQuery
              ? `No deck archetypes match "${searchQuery}"${
                  selectedSeason !== 'all' ? ` in ${selectedSeason}` : ''
                }`
              : `No broadcast matches found for ${selectedSeason}`}
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
            <table className="w-full text-left border-collapse min-w-[640px]">
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
                      <span>Deck Archetype</span>
                      {renderSortIcon('name')}
                    </button>
                  </th>
                  <th scope="col" className="py-3.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort('games')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors ml-auto"
                    >
                      <span>Games Played</span>
                      {renderSortIcon('games')}
                    </button>
                  </th>
                  <th scope="col" className="py-3.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort('wins')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors ml-auto"
                    >
                      <span>Wins</span>
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
                  <th scope="col" className="py-3.5 pl-3 pr-4 sm:pr-6 text-right w-28">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                {filteredArchetypes.map((item, index) => {
                  const recordStr =
                    item.ties > 0
                      ? `${item.wins}W - ${item.losses}L - ${item.ties}T`
                      : `${item.wins}W - ${item.losses}L`;

                  const winRateColor =
                    item.winRate >= 55
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : item.winRate >= 45
                      ? 'text-slate-700 dark:text-slate-300'
                      : 'text-rose-600 dark:text-rose-400';

                  const progressColor =
                    item.winRate >= 55
                      ? 'bg-emerald-500'
                      : item.winRate >= 45
                      ? 'bg-blue-500'
                      : 'bg-rose-500';

                  return (
                    <tr
                      key={item.archetype.identifier}
                      className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Rank # */}
                      <td className="py-3.5 pl-4 sm:pl-6 pr-2 text-xs font-semibold text-slate-400 dark:text-slate-500 text-center">
                        {index + 1}
                      </td>

                      {/* Archetype Icon & Name */}
                      <td className="py-3.5 px-3">
                        <Link
                          href={`/archetype/${item.archetype.identifier}`}
                          className="flex items-center gap-3 group/link"
                        >
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 p-1 group-hover/link:scale-105 transition-transform">
                            <ArchetypeIcon
                              icons={item.archetype.icons}
                              identifier={item.archetype.identifier}
                              className="w-8 h-8"
                              alt={item.archetype.name}
                            />
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white group-hover/link:text-red-600 dark:group-hover/link:text-red-400 transition-colors">
                            {item.archetype.name}
                          </span>
                        </Link>
                      </td>

                      {/* Games Played */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                          <Video className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span>{item.gamesPlayed}</span>
                        </div>
                      </td>

                      {/* Wins & Record */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                          <Trophy className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                          <span>{item.wins}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-0.5">
                          {recordStr}
                        </span>
                      </td>

                      {/* Win Percentage */}
                      <td className="py-3.5 px-3 text-right">
                        <div className={`inline-flex items-center gap-1 font-extrabold text-sm ${winRateColor}`}>
                          <Percent className="w-3.5 h-3.5 opacity-80" />
                          <span>{item.winRate}%</span>
                        </div>
                        <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden ml-auto mt-1">
                          <div
                            className={`h-full rounded-full ${progressColor}`}
                            style={{ width: `${Math.min(100, Math.max(0, item.winRate))}%` }}
                          />
                        </div>
                      </td>

                      {/* Action Link */}
                      <td className="py-3.5 pl-3 pr-4 sm:pr-6 text-right">
                        <Link
                          href={`/archetype/${item.archetype.identifier}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title={`View stream matches for ${item.archetype.name}`}
                        >
                          <span>Matches</span>
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
        /* GRID VIEW (ORIGINAL CARD VIEW) */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredArchetypes.map(({ archetype, streamMatchCount, wins, losses, ties, winRate }) => {
            const recordStr = ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;

            return (
              <Link
                key={archetype.identifier}
                href={`/archetype/${archetype.identifier}`}
                className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-red-300 dark:hover:border-red-500/50 rounded-xl p-4 shadow-xs hover:shadow-md transition-all flex items-center gap-3.5"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 p-1 group-hover:scale-105 transition-transform">
                  <ArchetypeIcon
                    icons={archetype.icons}
                    identifier={archetype.identifier}
                    className="w-10 h-10"
                    alt={archetype.name}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors truncate">
                    {archetype.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                      <strong className="font-bold">
                        {streamMatchCount} {streamMatchCount === 1 ? 'Game' : 'Games'}
                      </strong>
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {winRate}% WR ({recordStr})
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
