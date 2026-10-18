import { Tournament, StreamedMatch, DeckArchetype, Submission } from '@/types/database';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import seedTournaments from '@/data/seed-tournaments.json';
import seedMatches from '@/data/seed-matches.json';
import { POPULAR_ARCHETYPES } from '@/lib/limitless';

export interface MatchFilterParams {
  tournamentId?: string;
  playerName?: string;
  archetype?: string;
  round?: string;
  query?: string;
}

/**
 * Get all tournaments (grouped/ordered by start_date descending)
 */
export async function getTournaments(): Promise<Tournament[]> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('start_date', { ascending: false });

    if (!error && data && data.length > 0) {
      return data as Tournament[];
    }
  }

  // Fallback to seed data
  return seedTournaments as Tournament[];
}

/**
 * Get tournament by ID
 */
export async function getTournamentById(id: string): Promise<Tournament | null> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      return data as Tournament;
    }
  }

  const found = (seedTournaments as Tournament[]).find((t) => t.id === id);
  return found || null;
}

/**
 * Get all published streamed matches with optional multi-criteria filters
 */
export async function getStreamedMatches(filters: MatchFilterParams = {}): Promise<StreamedMatch[]> {
  const supabase = await createServerSupabaseClient();

  if (supabase) {
    let query = supabase
      .from('streamed_matches')
      .select('*, games:match_games(*), tournament:tournaments(*)')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (filters.tournamentId) {
      query = query.eq('tournament_id', filters.tournamentId);
    }
    if (filters.archetype) {
      query = query.or(`player1_deck_archetype.eq.${filters.archetype},player2_deck_archetype.eq.${filters.archetype}`);
    }
    if (filters.playerName) {
      query = query.or(`player1_name.ilike.%${filters.playerName}%,player2_name.ilike.%${filters.playerName}%`);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data as StreamedMatch[];
    }
  }

  // Fallback to local seed matches
  let matches = (seedMatches as unknown as StreamedMatch[]).map((match) => {
    const t = (seedTournaments as Tournament[]).find((item) => item.id === match.tournament_id);
    return { ...match, tournament: t };
  });

  if (filters.tournamentId) {
    matches = matches.filter((m) => m.tournament_id === filters.tournamentId);
  }

  if (filters.archetype) {
    const arch = filters.archetype.toLowerCase();
    matches = matches.filter(
      (m) =>
        m.player1_deck_archetype.toLowerCase().includes(arch) ||
        m.player2_deck_archetype.toLowerCase().includes(arch)
    );
  }

  if (filters.playerName) {
    const pName = filters.playerName.toLowerCase();
    matches = matches.filter(
      (m) =>
        m.player1_name.toLowerCase().includes(pName) ||
        m.player2_name.toLowerCase().includes(pName)
    );
  }

  if (filters.query) {
    const q = filters.query.toLowerCase();
    matches = matches.filter(
      (m) =>
        m.player1_name.toLowerCase().includes(q) ||
        m.player2_name.toLowerCase().includes(q) ||
        m.player1_deck_archetype.toLowerCase().includes(q) ||
        m.player2_deck_archetype.toLowerCase().includes(q) ||
        m.round_name.toLowerCase().includes(q) ||
        m.tournament?.name.toLowerCase().includes(q)
    );
  }

  return matches;
}

/**
 * Get a single streamed match by its ID
 */
export async function getStreamedMatchById(id: string): Promise<StreamedMatch | null> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('streamed_matches')
      .select('*, games:match_games(*), tournament:tournaments(*)')
      .eq('id', id)
      .single();

    if (!error && data) {
      return data as StreamedMatch;
    }
  }

  const match = (seedMatches as unknown as StreamedMatch[]).find((m) => m.id === id);
  if (!match) return null;

  const tournament = (seedTournaments as Tournament[]).find((t) => t.id === match.tournament_id);
  return { ...match, tournament };
}

/**
 * Get all archetypes
 */
export async function getDeckArchetypes(): Promise<DeckArchetype[]> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('deck_archetypes')
      .select('*')
      .order('priority', { ascending: false });

    if (!error && data && data.length > 0) {
      return data as DeckArchetype[];
    }
  }

  return POPULAR_ARCHETYPES;
}

/**
 * Get match history and statistics for a given player name
 */
export async function getPlayerStats(playerName: string) {
  const allMatches = await getStreamedMatches({ playerName });
  const normalizedTarget = playerName.toLowerCase().trim();

  let wins = 0;
  let losses = 0;
  const archetypesUsed = new Map<string, number>();

  allMatches.forEach((m) => {
    const isP1 = m.player1_name.toLowerCase().includes(normalizedTarget);
    const arch = isP1 ? m.player1_deck_archetype : m.player2_deck_archetype;
    archetypesUsed.set(arch, (archetypesUsed.get(arch) || 0) + 1);

    if (m.winner_player_name) {
      if (m.winner_player_name.toLowerCase().includes(normalizedTarget)) {
        wins++;
      } else {
        losses++;
      }
    }
  });

  return {
    name: playerName,
    totalStreamMatches: allMatches.length,
    wins,
    losses,
    winRate: allMatches.length > 0 ? Math.round((wins / (wins + losses || 1)) * 100) : 0,
    archetypesUsed: Array.from(archetypesUsed.entries()).map(([identifier, count]) => ({
      identifier,
      count,
    })),
    matches: allMatches,
  };
}

/**
 * Get match history and statistics for a given archetype
 */
export async function getArchetypeStats(archetypeIdentifier: string) {
  const allMatches = await getStreamedMatches({ archetype: archetypeIdentifier });
  const archetype = POPULAR_ARCHETYPES.find((a) => a.identifier === archetypeIdentifier) || {
    identifier: archetypeIdentifier,
    name: archetypeIdentifier.replace(/-/g, ' ').toUpperCase(),
    icons: [],
  };

  let totalAppearances = 0;
  let wins = 0;

  allMatches.forEach((m) => {
    const isP1 = m.player1_deck_archetype === archetypeIdentifier;
    const isP2 = m.player2_deck_archetype === archetypeIdentifier;

    if (isP1) totalAppearances++;
    if (isP2) totalAppearances++;

    if (m.winner_player_name) {
      if (isP1 && m.winner_player_name === m.player1_name) wins++;
      if (isP2 && m.winner_player_name === m.player2_name) wins++;
    }
  });

  return {
    archetype,
    totalAppearances,
    wins,
    winRate: totalAppearances > 0 ? Math.round((wins / totalAppearances) * 100) : 0,
    matches: allMatches,
  };
}

/**
 * Submit a new match for moderation
 */
export async function createMatchSubmission(submissionData: Omit<Submission, 'id' | 'created_at' | 'status'>) {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('submissions')
      .insert({
        match_data: submissionData.match_data,
        submitted_by: submissionData.submitted_by,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Fallback: mock return
  return {
    id: `sub-${Date.now()}`,
    match_data: submissionData.match_data,
    submitted_by: submissionData.submitted_by,
    status: 'pending',
    created_at: new Date().toISOString(),
  };
}
