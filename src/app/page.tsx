import Link from 'next/link';
import { getTournaments, getStreamedMatches } from '@/lib/data-repository';
import { TournamentCard } from '@/components/TournamentCard';
import { MatchCard } from '@/components/MatchCard';
import { Trophy, Video, Sparkles, ArrowRight, User } from 'lucide-react';

export default async function HomePage() {
  const [tournaments, allMatches] = await Promise.all([
    getTournaments(),
    getStreamedMatches(),
  ]);

  // Count stream matches per tournament
  const streamCounts = new Map<string, number>();
  allMatches.forEach((m) => {
    streamCounts.set(m.tournament_id, (streamCounts.get(m.tournament_id) || 0) + 1);
  });

  // Group tournaments by season/year
  const groupedTournaments = tournaments.reduce((acc, t) => {
    const season = t.season || (t.start_date ? `${t.start_date.slice(0, 4)} Season` : 'Past Tournaments');
    if (!acc[season]) acc[season] = [];
    acc[season].push(t);
    return acc;
  }, {} as Record<string, typeof tournaments>);

  const seasons = Object.keys(groupedTournaments).sort().reverse();
  const recentMatches = allMatches.slice(0, 3);

  const uniquePlayers = [...new Set(allMatches.map(item => Array.of(item.player1_name, item.player2_name)).flat())]

  return (
    <div className="space-y-10">
      {/* Hero Banner */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-red-950 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-bold border border-red-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Stream Game Archive</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Rewatch Every Pokémon TCG Stream Match
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Browse official tournament stream games, search by deck archetype or player, and jump directly to Game 1, 2, or 3.
          </p>

          {/* Quick Metrics */}
          <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span><strong>{tournaments.length}</strong> Tournaments Indexed</span>
            </div>
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-red-400" />
              <span><strong>{allMatches.length}</strong> Streamed Matches Archived</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-green-400" />
              <span><strong>{uniquePlayers.length}</strong> Unique Players</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Stream Matches Feed */}
      {recentMatches.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Recent Stream Matches</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Latest broadcast games added to the archive</p>
            </div>
            <Link
              href="/matches"
              className="inline-flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline"
            >
              <span>View All Matches</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentMatches.map((match) => (
              <MatchCard key={match.id} match={match} displayTournament={true} />
            ))}
          </div>
        </section>
      )}

      {/* Tournaments Directory Grouped by Season */}
      <section className="space-y-8">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Tournaments Directory</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Browse official premier events from PokeData.ovh</p>
        </div>

        {seasons.map((season) => (
          <div key={season} className="space-y-4">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-black text-slate-800 dark:text-slate-200 tracking-tight">{season}</h3>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                {groupedTournaments[season].length} Events
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedTournaments[season].map((t) => (
                <TournamentCard
                  key={t.id}
                  tournament={t}
                  streamMatchCount={streamCounts.get(t.id) || 0}
                />
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
