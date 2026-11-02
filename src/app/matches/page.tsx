import { Suspense } from 'react';
import { getStreamedMatches, getTournaments, getDeckArchetypes } from '@/lib/data-repository';
import { MatchesExplorerView } from '@/components/MatchesExplorerView';

export const metadata = {
  title: 'Stream Matches Archive — Battle Reporter',
  description: 'Search Pokémon TCG stream matches by player, archetype, or tournament.',
};

export default async function MatchesExplorerPage() {
  const [allMatches, tournaments, archetypes] = await Promise.all([
    getStreamedMatches(),
    getTournaments(),
    getDeckArchetypes(),
  ]);

  return (
    <Suspense
      fallback={
        <div className="h-40 flex items-center justify-center text-sm text-slate-400">
          Loading match explorer...
        </div>
      }
    >
      <MatchesExplorerView
        allMatches={allMatches}
        tournaments={tournaments}
        archetypes={archetypes}
      />
    </Suspense>
  );
}
