import { notFound } from 'next/navigation';
import { getStreamedMatchById, getStreamedMatches } from '@/lib/data-repository';
import { MatchTheaterView } from '@/components/MatchTheaterView';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const match = await getStreamedMatchById(id);

  if (!match) {
    return { title: 'Match Not Found — Battle Reporter' };
  }

  return {
    title: `${match.player1_name} vs ${match.player2_name} (${match.round_name}) — Battle Reporter`,
    description: `Watch ${match.player1_name} (${match.player1_deck_archetype}) vs ${match.player2_name} (${match.player2_deck_archetype}) from ${match.tournament?.name || 'Tournament'} on official broadcast stream.`,
  };
}

export default async function MatchPage({ params }: PageProps) {
  const { id } = await params;
  const match = await getStreamedMatchById(id);

  if (!match) {
    notFound();
  }

  // Get related matches from the same tournament
  const allTournamentMatches = await getStreamedMatches({ tournamentId: match.tournament_id });
  const relatedMatches = allTournamentMatches.filter((m) => m.id !== match.id);

  return <MatchTheaterView match={match} relatedMatches={relatedMatches} />;
}
