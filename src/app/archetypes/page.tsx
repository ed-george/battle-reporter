import Link from 'next/link';
import { getDeckArchetypes, getStreamedMatches } from '@/lib/data-repository';
import { ArchetypeIcon } from '@/components/ArchetypeIcon';
import { Layers } from 'lucide-react';
import { DeckArchetype } from '@/types/database';

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
    if (m.player1_deck_archetype) {
      matchCounts.set(m.player1_deck_archetype, (matchCounts.get(m.player1_deck_archetype) || 0) + 1);
    }
    if (m.player2_deck_archetype) {
      matchCounts.set(m.player2_deck_archetype, (matchCounts.get(m.player2_deck_archetype) || 0) + 1);
    }
  });

  // Only show archetypes if at least one stream match exists for it
  const archetypeMap = new Map<string, DeckArchetype>();
  archetypes.forEach((a) => archetypeMap.set(a.identifier, a));

  const streamedArchetypes: DeckArchetype[] = [];
  matchCounts.forEach((count, identifier) => {
    if (count > 0) {
      const existing = archetypeMap.get(identifier);
      if (existing) {
        streamedArchetypes.push(existing);
      } else {
        streamedArchetypes.push({
          identifier,
          name: identifier.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          icons: [identifier.split('-')[0]],
        });
      }
    }
  });

  const sortedArchetypes = streamedArchetypes.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Deck Archetypes
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Explore decks featured on official Pokémon TCG tournament broadcasts.
        </p>
      </div>

      {sortedArchetypes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sortedArchetypes.map((arch) => {
            const count = matchCounts.get(arch.identifier) || 0;
            const icon = arch.icons?.[0] || arch.identifier.split('-')[0];

            return (
              <Link
                key={arch.identifier}
                href={`/archetype/${arch.identifier}`}
                className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-red-300 dark:hover:border-red-500/50 rounded-xl p-4 shadow-xs hover:shadow-md transition-all flex items-center gap-3.5"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 p-1 group-hover:scale-105 transition-transform">
                  <ArchetypeIcon icon={icon} className="w-10 h-10" />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors truncate">
                    {arch.name}
                  </h3>
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                    <strong className="font-bold">{count} Stream {count === 1 ? 'Match' : 'Matches'}</strong>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
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
      )}
    </div>
  );
}
