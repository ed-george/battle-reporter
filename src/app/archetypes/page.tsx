import { Suspense } from 'react';
import { getArchetypesDirectoryData } from '@/lib/data-repository';
import { ArchetypesDirectoryView } from '@/components/ArchetypesDirectoryView';

export const metadata = {
  title: 'Deck Archetypes — Battle Reporter',
  description: 'Browse all Pokémon TCG deck archetypes featured on tournament streams, with games played, win counts, and win rates by season.',
};

export default async function ArchetypesDirectoryPage() {
  const data = await getArchetypesDirectoryData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Deck Archetypes
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Explore deck performance, game counts, and overall win rates from official Pokémon TCG broadcasts.
        </p>
      </div>

      <Suspense fallback={<div className="h-40 flex items-center justify-center text-sm text-slate-400">Loading archetypes...</div>}>
        <ArchetypesDirectoryView data={data} />
      </Suspense>
    </div>
  );
}
