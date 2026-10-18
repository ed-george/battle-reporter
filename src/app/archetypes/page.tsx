import Link from 'next/link';
import { getDeckArchetypes, getStreamedMatches } from '@/lib/data-repository';
import { ArchetypeIcon } from '@/components/ArchetypeIcon';

export const metadata = {
  title: 'Deck Archetypes — Battle Reporter',
  description: 'Browse all Pokémon TCG deck archetypes featured on tournament streams.',
};

export default async function ArchetypesDirectoryPage() {
  const [archetypes, matches] = await Promise.all([
    getDeckArchetypes(),
    getStreamedMatches(),
  ]);

  // Count matches per archetype
  const matchCounts = new Map<string, number>();
  matches.forEach((m) => {
    matchCounts.set(m.player1_deck_archetype, (matchCounts.get(m.player1_deck_archetype) || 0) + 1);
    matchCounts.set(m.player2_deck_archetype, (matchCounts.get(m.player2_deck_archetype) || 0) + 1);
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Deck Archetypes
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Explore canonical decks defined via Limitless TCG and their appearances on stream.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {archetypes.map((arch) => {
          const count = matchCounts.get(arch.identifier) || 0;
          const icon = arch.icons?.[0] || arch.identifier.split('-')[0];

          return (
            <Link
              key={arch.identifier}
              href={`/archetype/${arch.identifier}`}
              className="group bg-white border border-slate-200 hover:border-red-300 rounded-xl p-4 shadow-xs hover:shadow-md transition-all flex items-center gap-3.5"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 p-1 group-hover:scale-105 transition-transform">
                <ArchetypeIcon icon={icon} className="w-10 h-10" />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition-colors truncate">
                  {arch.name}
                </h3>
                <span className="text-xs font-semibold text-slate-400">
                  {count > 0 ? (
                    <strong className="text-red-600 font-bold">{count} Stream Matches</strong>
                  ) : (
                    'Archived'
                  )}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
