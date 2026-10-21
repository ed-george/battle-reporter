import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPlayerStats } from '@/lib/data-repository';
import { MatchCard } from '@/components/MatchCard';
import { ArchetypeBadge } from '@/components/ArchetypeBadge';
import { formatRecord, formatDateRange } from '@/lib/matches';
import { Tournament, StreamedMatch } from '@/types/database';
import { User, Trophy, Video, ArrowLeft, Percent, Calendar, MapPin } from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const stats = await getPlayerStats(slug);

  return {
    title: `${stats.name} — Stream Match Profile — Battle Reporter`,
    description: `Browse all Pokémon TCG broadcast stream matches featuring ${stats.name}.`,
  };
}

interface TournamentGroup {
  tournamentId: string;
  tournament: Tournament | null;
  matches: StreamedMatch[];
}

export default async function PlayerProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const stats = await getPlayerStats(slug);

  if (stats.totalStreamMatches === 0) {
    notFound();
  }

  // Group matches by tournament and preserve match order within each tournament
  const groupMap = new Map<string, TournamentGroup>();

  for (const m of stats.matches) {
    const tourId = m.tournament_id || 'unknown';
    let group = groupMap.get(tourId);
    if (!group) {
      group = {
        tournamentId: tourId,
        tournament: m.tournament || null,
        matches: [],
      };
      groupMap.set(tourId, group);
    }
    group.matches.push(m);
  }

  // Sort tournaments: latest at the top, oldest at the bottom
  const tournamentGroups = Array.from(groupMap.values()).sort((a, b) => {
    const dateA = a.tournament?.start_date || a.tournament?.end_date || '';
    const dateB = b.tournament?.start_date || b.tournament?.end_date || '';

    if (dateA && dateB) {
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA); // descending (latest at top)
      }
    } else if (dateA && !dateB) {
      return -1; // known date comes first
    } else if (!dateA && dateB) {
      return 1;
    }

    // Secondary sort by tournament name
    const nameA = a.tournament?.name || a.tournamentId;
    const nameB = b.tournament?.name || b.tournamentId;
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="space-y-8">
      {/* Back Link */}
      <div>
        <Link
          href="/matches"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Matches</span>
        </Link>
      </div>

      {/* Player Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 shadow-xs shrink-0">
            <User className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {stats.name}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Broadcast Stream Record
            </p>
          </div>
        </div>

        {/* Player Stats Grid */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Stream Matches</span>
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100 text-base">
              <Video className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
              <span>{stats.totalStreamMatches}</span>
            </div>
          </div>

          <div>
            <span className="text-slate-400 dark:text-slate-500 block mb-0.5">On Stream Record</span>
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100 text-base">
              <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
              <span>{formatRecord(stats.wins, stats.losses, stats.ties)}</span>
            </div>
          </div>

          <div>
            <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Win Rate on Stream</span>
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100 text-base">
              <Percent className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
              <span>{stats.winRate}%</span>
            </div>
          </div>

          <div>
            <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Archetypes Played</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {stats.archetypesUsed.map((item) => (
                <ArchetypeBadge key={item.identifier} identifier={item.identifier} size="sm" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Streamed Matches List Grouped by Tournament */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Streamed Matches Featuring {stats.name}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            All broadcast games on record, grouped by tournament from latest to oldest
          </p>
        </div>

        <div className="space-y-8">
          {tournamentGroups.map((group, index) => {
            const tournamentName = group.tournament?.name || 'Tournament';
            const dateStr = formatDateRange(group.tournament?.start_date, group.tournament?.end_date);
            const isFirst = index === 0;

            return (
              <div key={group.tournamentId} className="space-y-4">
                {/* Divider between tournaments */}
                {!isFirst && (
                  <div className="pt-6 pb-2" role="separator" aria-label="Tournament divider">
                    <div className="relative flex items-center justify-center">
                      <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                      <span className="absolute bg-slate-50 dark:bg-slate-950 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                        <span>Tournament Divider</span>
                      </span>
                    </div>
                  </div>
                )}

                {/* Tournament Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-100/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/tournament/${group.tournamentId}`}
                        className="font-bold text-sm sm:text-base text-slate-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 transition-colors truncate block"
                      >
                        {tournamentName}
                      </Link>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap mt-0.5">
                        {dateStr !== 'Dates TBD' && (
                          <span className="flex items-center gap-1 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                            <span>{dateStr}</span>
                          </span>
                        )}
                        {group.tournament?.location && (
                          <span className="flex items-center gap-1 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                            <span>{group.tournament.location}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {group.matches.length} {group.matches.length === 1 ? 'Match' : 'Matches'}
                    </span>
                    <Link
                      href={`/tournament/${group.tournamentId}`}
                      className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline inline-flex items-center gap-1 ml-1"
                    >
                      <span>View Event</span>
                    </Link>
                  </div>
                </div>

                {/* Match Cards for this tournament */}
                <div className="space-y-3">
                  {group.matches.map((m) => (
                    <MatchCard key={m.id} match={m} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
