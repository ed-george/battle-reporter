import Link from 'next/link';
import { getStreamPlayers } from '@/lib/data-repository';
import { getLimitlessPlayerUrl } from '@/lib/limitless';
import { ArchetypeBadge } from '@/components/ArchetypeBadge';
import { formatRecord } from '@/lib/matches';
import { User, Trophy, Video, Percent, Search, ExternalLink, Medal, ArrowUpDown } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{
    q?: string;
    sort?: 'matches' | 'wins' | 'winrate';
  }>;
}

export const metadata = {
  title: 'Stream Players Leaderboard — Battle Reporter',
  description: 'List of Pokémon TCG players featured on stream, ranked by matches played and broadcast wins.',
};

export default async function PlayersDirectoryPage({ searchParams }: PageProps) {
  const { q, sort = 'matches' } = await searchParams;

  const players = await getStreamPlayers({
    query: q,
    sortBy: sort,
  });

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-black text-xs border border-amber-300 dark:border-amber-700/50">
          <Medal className="w-4 h-4 text-amber-500 dark:text-amber-400" />
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-xs border border-slate-300 dark:border-slate-700">
          2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/10 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 font-black text-xs border border-amber-600/30 dark:border-amber-700/40">
          3
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs">
        {rank}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Page Title & Intro */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Stream Players Leaderboard
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Explore all Pokémon TCG competitors who have played on official tournament broadcasts, ranked by matches played and wins.
        </p>
      </div>

      {/* Filter and Sort Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <form method="GET" action="/players" className="relative w-full sm:max-w-md">
          <input
            type="text"
            name="q"
            defaultValue={q || ''}
            placeholder="Search player by name or country..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
          />
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
          {sort && <input type="hidden" name="sort" value={sort} />}
        </form>

        {/* Sort Options Pills */}
        <div className="flex items-center gap-1.5 self-start sm:self-center text-xs">
          <span className="text-slate-400 dark:text-slate-500 font-semibold flex items-center gap-1 mr-1">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Sort by:</span>
          </span>
          <Link
            href={`/players?sort=matches${q ? `&q=${encodeURIComponent(q)}` : ''}`}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              sort === 'matches'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Matches Played
          </Link>
          <Link
            href={`/players?sort=wins${q ? `&q=${encodeURIComponent(q)}` : ''}`}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              sort === 'wins'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Most Wins
          </Link>
          <Link
            href={`/players?sort=winrate${q ? `&q=${encodeURIComponent(q)}` : ''}`}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              sort === 'winrate'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Win Rate
          </Link>
        </div>
      </div>

      {/* Players Leaderboard Table / Cards */}
      {players.length > 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {players.map((player, idx) => {
              const rank = idx + 1;
              return (
                <div
                  key={player.name}
                  className="p-4 sm:p-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left: Rank, Avatar & Player Name */}
                  <div className="flex items-center gap-3.5 min-w-0 md:w-72">
                    {getRankBadge(rank)}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/player/${encodeURIComponent(player.name)}`}
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
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        >
                          <span>Limitless Profile</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Stats (Matches, Record, Win Rate) */}
                  <div className="grid grid-cols-3 gap-4 text-xs md:w-64 shrink-0">
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
                      href={`/player/${encodeURIComponent(player.name)}`}
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
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
            <User className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Stream Players Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            No broadcast competitors matched your search query.
          </p>
          <div className="pt-2">
            <Link
              href="/players"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Reset Search
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
