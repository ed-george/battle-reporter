import Link from 'next/link';
import { getArchetypeStats } from '@/lib/data-repository';
import { ArchetypeIcon } from '@/components/ArchetypeIcon';
import { MatchCard } from '@/components/MatchCard';
import { formatRecord } from '@/lib/matches';
import { Video, Trophy, Percent, ArrowLeft } from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const stats = await getArchetypeStats(slug);

  return {
    title: `${stats.archetype.name} — Stream Matches — Battle Reporter`,
    description: `Browse all Pokémon TCG broadcast stream matches featuring ${stats.archetype.name}.`,
  };
}

export default async function ArchetypeDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const stats = await getArchetypeStats(slug);

  return (
    <div className="space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/archetypes"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Archetypes</span>
        </Link>
      </div>

      {/* Archetype Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-2 shrink-0">
            <ArchetypeIcon
              icons={stats.archetype.icons}
              identifier={stats.archetype.identifier}
              className="w-12 h-12"
              alt={stats.archetype.name}
            />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {stats.archetype.name}
            </h1>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Stream Games</span>
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100 text-base">
              <Video className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
              <span>{stats.totalAppearances}</span>
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
            <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Stream Win Rate</span>
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100 text-base">
              <Percent className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
              <span>{stats.winRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Matches List */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Stream Matches
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Every recorded game played by this deck on stream</p>
        </div>

        {stats.matches.length > 0 ? (
          <div className="space-y-3">
            {stats.matches.map((m) => (
              <MatchCard key={m.id} match={m} displayTournament={true} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-10 text-center text-xs text-slate-500 dark:text-slate-400">
            No stream matches currently archived for this archetype.
          </div>
        )}
      </section>
    </div>
  );
}
