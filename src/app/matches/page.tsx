import { getStreamedMatches, getTournaments, getDeckArchetypes } from '@/lib/data-repository';
import { MatchCard } from '@/components/MatchCard';
import { Video, Search } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  searchParams: Promise<{
    q?: string;
    tournamentId?: string;
    archetype?: string;
    player?: string;
  }>;
}

export const metadata = {
  title: 'Stream Matches Archive — Battle Reporter',
  description: 'Search Pokémon TCG stream matches by player, archetype, or tournament.',
};

export default async function MatchesExplorerPage({ searchParams }: PageProps) {
  const { q, tournamentId, archetype, player } = await searchParams;

  const [matches, tournaments, archetypes] = await Promise.all([
    getStreamedMatches({
      query: q,
      tournamentId,
      archetype,
      playerName: player,
    }),
    getTournaments(),
    getDeckArchetypes(),
  ]);

  const sortedArchetypes = [...archetypes].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
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
        {/* Search input form */}
        <form method="GET" action="/matches" className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              name="q"
              defaultValue={q || ''}
              placeholder="Search by player name, archetype, or tournament..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
            />
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
          </div>

          <select
            name="tournamentId"
            defaultValue={tournamentId || ''}
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
            name="archetype"
            defaultValue={archetype || ''}
            className="px-3 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500 font-medium sm:max-w-xs"
          >
            <option value="">All Archetypes</option>
            {sortedArchetypes.map((a) => (
              <option key={a.identifier} value={a.identifier}>
                {a.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>
          Showing <strong>{matches.length}</strong> {matches.length === 1 ? 'match' : 'matches'}
        </span>
        {(q || tournamentId || archetype || player) && (
          <Link href="/matches" className="text-red-600 dark:text-red-400 hover:underline font-bold">
            Clear all filters
          </Link>
        )}
      </div>

      {/* Matches List */}
      {matches.length > 0 ? (
        <div className="space-y-3">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} showTournament={true} />
          ))}
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
            <Link
              href="/matches"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Reset Filters
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
