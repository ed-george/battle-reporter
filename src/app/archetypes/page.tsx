import Link from 'next/link';
import { getStreamedArchetypesSummary } from '@/lib/data-repository';
import { ArchetypeIcon } from '@/components/ArchetypeIcon';
import { Layers } from 'lucide-react';

export const metadata = {
  title: 'Deck Archetypes — Battle Reporter',
  description: 'Browse all Pokémon TCG deck archetypes featured on tournament streams.',
};

export default async function ArchetypesDirectoryPage() {
  const streamedArchetypes = await getStreamedArchetypesSummary();

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

      {streamedArchetypes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {streamedArchetypes.map(({ archetype, streamMatchCount }) => {
            return (
              <Link
                key={archetype.identifier}
                href={`/archetype/${archetype.identifier}`}
                className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-red-300 dark:hover:border-red-500/50 rounded-xl p-4 shadow-xs hover:shadow-md transition-all flex items-center gap-3.5"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 p-1 group-hover:scale-105 transition-transform">
                  <ArchetypeIcon
                    icons={archetype.icons}
                    identifier={archetype.identifier}
                    className="w-10 h-10"
                    alt={archetype.name}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors truncate">
                    {archetype.name}
                  </h3>
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                    <strong className="font-bold">
                      {streamMatchCount} Stream {streamMatchCount === 1 ? 'Game' : 'Games'}
                    </strong>
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
