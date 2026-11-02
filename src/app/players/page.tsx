import { Suspense } from 'react';
import { getPlayersDirectoryData } from '@/lib/data-repository';
import { PlayersDirectoryView } from '@/components/PlayersDirectoryView';

export const metadata = {
  title: 'Stream Players Leaderboard — Battle Reporter',
  description: 'List of Pokémon TCG players featured on stream, ranked by matches played and broadcast wins.',
};

export default async function PlayersDirectoryPage() {
  const data = await getPlayersDirectoryData();

  return (
    <div className="space-y-8">
      {/* Page Title & Intro */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Stream Players Leaderboard
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Explore all Pokémon TCG competitors who have played on official tournament broadcasts, ranked by matches played and wins.
        </p>
      </div>

      <Suspense fallback={<div className="h-40 flex items-center justify-center text-sm text-slate-400">Loading players...</div>}>
        <PlayersDirectoryView data={data} />
      </Suspense>
    </div>
  );
}
