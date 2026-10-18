import { getTournaments, getDeckArchetypes } from '@/lib/data-repository';
import { StreamTaggingStudio } from '@/components/StreamTaggingStudio';

interface PageProps {
  searchParams: Promise<{
    tournamentId?: string;
  }>;
}

export const metadata = {
  title: 'Tag a Stream Match — Battle Reporter',
  description: 'Contribute and tag official Pokémon TCG stream matches with accurate game timestamps.',
};

export default async function SubmitPage({ searchParams }: PageProps) {
  const { tournamentId } = await searchParams;
  const [tournaments, archetypes] = await Promise.all([
    getTournaments(),
    getDeckArchetypes(),
  ]);

  return (
    <StreamTaggingStudio
      tournaments={tournaments}
      archetypes={archetypes}
      initialTournamentId={tournamentId}
    />
  );
}
