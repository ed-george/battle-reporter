import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPlayerStats } from '@/lib/data-repository';
import { MatchCard } from '@/components/MatchCard';
import { ArchetypeBadge } from '@/components/ArchetypeBadge';
import { formatRecord } from '@/lib/matches';
import { User, Trophy, Video, ArrowLeft, Percent } from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const playerName = decodeURIComponent(slug);

  return {
    title: `${playerName} — Stream Match Profile — Battle Reporter`,
    description: `Browse all Pokémon TCG broadcast stream matches featuring ${playerName}.`,
  };
}

export default async function PlayerProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const playerName = decodeURIComponent(slug);
  const stats = await getPlayerStats(playerName);

  if (stats.totalStreamMatches === 0) {
    notFound();
  }

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
              Competitive Pokémon TCG Broadcast Stream Record
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
            <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Stream Record</span>
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

      {/* Streamed Matches List */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Streamed Matches Featuring {stats.name}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">All broadcast games on record</p>
        </div>

        <div className="space-y-3">
          {stats.matches.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      </section>
    </div>
  );
}
