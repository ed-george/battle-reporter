import Link from 'next/link';
import { getArchetypeStats } from '@/lib/data-repository';
import { ArchetypeIcon } from '@/components/ArchetypeIcon';
import { MatchCard } from '@/components/MatchCard';
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

  const icon = stats.archetype.icons?.[0] || stats.archetype.identifier.split('-')[0];

  return (
    <div className="space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/archetypes"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-red-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Archetypes</span>
        </Link>
      </div>

      {/* Archetype Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center p-2 shrink-0">
            <ArchetypeIcon icon={icon} className="w-12 h-12" />
          </div>
          <div>
            <span className="text-xs font-bold text-red-600 uppercase tracking-wider">
              Canonical Deck Archetype
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {stats.archetype.name}
            </h1>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Stream Games</span>
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-base">
              <Video className="w-4 h-4 text-red-500 shrink-0" />
              <span>{stats.totalAppearances}</span>
            </div>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Stream Wins</span>
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-base">
              <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{stats.wins}</span>
            </div>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Stream Win Rate</span>
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-base">
              <Percent className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{stats.winRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Matches List */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Stream Matches Featuring {stats.archetype.name}
          </h2>
          <p className="text-xs text-slate-500">Every recorded game played by this deck on broadcast</p>
        </div>

        {stats.matches.length > 0 ? (
          <div className="space-y-3">
            {stats.matches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center text-xs text-slate-500">
            No stream matches currently archived for this archetype.
          </div>
        )}
      </section>
    </div>
  );
}
