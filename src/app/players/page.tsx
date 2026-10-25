import { getPlayersDirectoryData } from '@/lib/data-repository';
import { PlayersDirectoryView } from '@/components/PlayersDirectoryView';

interface PageProps {
  searchParams: Promise<{
    season?: string;
    q?: string;
    sort?: 'matches' | 'wins' | 'winrate';
  }>;
}

export const metadata = {
  title: 'Stream Players Leaderboard — Battle Reporter',
  description: 'List of Pokémon TCG players featured on stream, ranked by matches played and broadcast wins.',
};

export default async function PlayersDirectoryPage({ searchParams }: PageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const { season, q, sort } = resolvedParams;
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

      <PlayersDirectoryView
        data={data}
        initialSeason={season || 'all'}
        initialSort={sort}
        initialQuery={q}
      />
    </div>
  );
}
