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

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Stream Matches Explorer
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Search and filter all archived broadcast matches by tournament, player, or deck archetype.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Search input form */}
        <form method="GET" action="/matches" className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              name="q"
              defaultValue={q || ''}
              placeholder="Search by player name, archetype, or tournament..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
            />
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <select
            name="tournamentId"
            defaultValue={tournamentId || ''}
            className="px-3 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500 font-medium sm:max-w-xs"
          >
            <option value="">All Tournaments</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
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

        {/* Quick filter links */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="font-bold text-slate-500">Popular Archetypes:</span>
          {archetypes.slice(0, 6).map((arch) => {
            const isSelected = archetype === arch.identifier;
            return (
              <Link
                key={arch.identifier}
                href={isSelected ? '/matches' : `/matches?archetype=${arch.identifier}`}
                className={`px-2.5 py-1 rounded-lg border font-medium transition-all ${
                  isSelected
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {arch.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <strong>{matches.length}</strong> {matches.length === 1 ? 'match' : 'matches'}
        </span>
        {(q || tournamentId || archetype || player) && (
          <Link href="/matches" className="text-red-600 hover:underline font-bold">
            Clear all filters
          </Link>
        )}
      </div>

      {/* Matches List */}
      {matches.length > 0 ? (
        <div className="space-y-3">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Video className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Stream Matches Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search terms or filter criteria.
          </p>
          <div className="pt-2">
            <Link
              href="/matches"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Reset Filters
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
