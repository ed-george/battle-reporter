import { Tournament, StreamedMatch, DeckArchetype, Submission } from '@/types/database';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { POPULAR_ARCHETYPES } from '@/lib/limitless';

function getArchetypeDisplayName(identifier: string): string {
  const found = POPULAR_ARCHETYPES.find((x) => x.identifier === identifier);
  return found?.name || identifier.replace(/-/g, ' ');
}

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
  if (!supabase) {
    console.error('Supabase client not initialized. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    return [];
  }

  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('start_date', { ascending: false });

  if (error) {
    console.error('Error fetching tournaments from Supabase:', error);
    return [];
  }

  return (data || []) as Tournament[];
}

/**
 * Get tournament by ID
 */
export async function getTournamentById(id: string): Promise<Tournament | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    console.error('Supabase client not initialized.');
    return null;
  }

  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error(`Error fetching tournament ${id} from Supabase:`, error);
    }
    return null;
  }

  return (data as Tournament) || null;
}

/**
 * Get all published streamed matches with optional multi-criteria filters
 */
export async function getStreamedMatches(filters: MatchFilterParams = {}): Promise<StreamedMatch[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    console.error('Supabase client not initialized.');
    return [];
  }

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
  if (error) {
    console.error('Error fetching streamed matches from Supabase:', error);
    return [];
  }

  let matches = (data || []) as StreamedMatch[];

  if (filters.query) {
    const q = filters.query.toLowerCase();
    matches = matches.filter(
      (m) =>
        m.player1_name.toLowerCase().includes(q) ||
        m.player2_name.toLowerCase().includes(q) ||
        m.player1_deck_archetype?.toLowerCase().includes(q) ||
        m.player2_deck_archetype?.toLowerCase().includes(q) ||
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
  if (!supabase) {
    console.error('Supabase client not initialized.');
    return null;
  }

  const { data, error } = await supabase
    .from('streamed_matches')
    .select('*, games:match_games(*), tournament:tournaments(*)')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error(`Error fetching streamed match ${id} from Supabase:`, error);
    }
    return null;
  }

  return (data as StreamedMatch) || null;
}

export interface StreamedArchetypeSummary {
  archetype: DeckArchetype;
  streamMatchCount: number;
}

// In-memory caches with TTL to drastically reduce database load and avoid Supabase rate limits
let cachedDeckArchetypes: { data: DeckArchetype[]; expiresAt: number } | null = null;
let cachedStreamedArchetypes: { data: StreamedArchetypeSummary[]; expiresAt: number } | null = null;

export function clearStreamedArchetypesCache() {
  cachedStreamedArchetypes = null;
  cachedDeckArchetypes = null;
}

/**
 * Highly efficient query for the /archetypes overview:
 * 1. Checks short in-memory cache (30s TTL).
 * 2. Queries ONLY player1_deck_archetype and player2_deck_archetype from published streamed_matches.
 * 3. If no matches exist, returns [] immediately (zero queries to deck_archetypes).
 * 4. Only queries deck_archetypes for the specific identifiers present in matches,
 *    selecting only identifier, name, and icons (avoiding large JSONB payloads).
 */
export async function getStreamedArchetypesSummary(): Promise<StreamedArchetypeSummary[]> {
  if (cachedStreamedArchetypes && cachedStreamedArchetypes.expiresAt > Date.now()) {
    return cachedStreamedArchetypes.data;
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    console.error('Supabase client not initialized.');
    return [];
  }

  // 1. Fetch only the archetype columns from published matches (no heavy joins)
  const { data: matches, error: matchError } = await supabase
    .from('streamed_matches')
    .select('player1_deck_archetype, player2_deck_archetype')
    .eq('is_published', true);

  if (matchError) {
    console.error('Error fetching stream matches for archetypes:', matchError);
    return cachedStreamedArchetypes?.data || [];
  }

  if (!matches || matches.length === 0) {
    cachedStreamedArchetypes = { data: [], expiresAt: Date.now() + 30_000 };
    return [];
  }

  // 2. Count matches per archetype
  const matchCounts = new Map<string, number>();
  for (const m of matches) {
    if (m.player1_deck_archetype) {
      matchCounts.set(m.player1_deck_archetype, (matchCounts.get(m.player1_deck_archetype) || 0) + 1);
    }
    if (m.player2_deck_archetype) {
      matchCounts.set(m.player2_deck_archetype, (matchCounts.get(m.player2_deck_archetype) || 0) + 1);
    }
  }

  const activeIdentifiers = Array.from(matchCounts.keys()).filter(Boolean);
  if (activeIdentifiers.length === 0) {
    cachedStreamedArchetypes = { data: [], expiresAt: Date.now() + 30_000 };
    return [];
  }

  // 3. Only query deck_archetypes for the active identifiers, selecting only lightweight columns
  const { data: archetypesData, error: archError } = await supabase
    .from('deck_archetypes')
    .select('identifier, name, icons')
    .in('identifier', activeIdentifiers);

  if (archError) {
    console.error('Error fetching archetype details:', archError);
  }

  const archetypeMap = new Map((archetypesData || []).map((a) => [a.identifier, a]));

  const result: StreamedArchetypeSummary[] = activeIdentifiers
    .map((identifier) => {
      const meta = archetypeMap.get(identifier);
      return {
        archetype: {
          identifier,
          name: meta?.name || identifier.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          icons: meta?.icons || [identifier.split('-')[0]],
        },
        streamMatchCount: matchCounts.get(identifier) || 0,
      };
    })
    .sort((a, b) => {
      if (b.streamMatchCount !== a.streamMatchCount) {
        return b.streamMatchCount - a.streamMatchCount;
      }
      return a.archetype.name.localeCompare(b.archetype.name, undefined, { sensitivity: 'base' });
    });

  cachedStreamedArchetypes = {
    data: result,
    expiresAt: Date.now() + 30_000,
  };

  return result;
}

/**
 * Get all archetypes (optimized: selects lightweight columns and caches for 5 minutes)
 */
export async function getDeckArchetypes(): Promise<DeckArchetype[]> {
  if (cachedDeckArchetypes && cachedDeckArchetypes.expiresAt > Date.now()) {
    return cachedDeckArchetypes.data;
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    console.error('Supabase client not initialized.');
    return [];
  }

  const { data, error } = await supabase
    .from('deck_archetypes')
    .select('identifier, name, icons, priority')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching deck archetypes from Supabase:', error);
    return cachedDeckArchetypes?.data || [];
  }

  const sorted = ((data || []) as DeckArchetype[]).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );

  cachedDeckArchetypes = {
    data: sorted,
    expiresAt: Date.now() + 5 * 60_000,
  };

  return sorted;
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
    archetypesUsed: Array.from(archetypesUsed.entries())
      .map(([identifier, count]) => ({
        identifier,
        name: getArchetypeDisplayName(identifier),
        count,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    matches: allMatches,
  };
}

export interface PlayerLeaderboardEntry {
  name: string;
  country?: string | null;
  matchesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  archetypes: string[];
}

/**
 * Get all players who have appeared on stream, ranked by matches played and wins
 */
export async function getStreamPlayers(options: {
  sortBy?: 'matches' | 'wins' | 'winrate';
  query?: string;
} = {}): Promise<PlayerLeaderboardEntry[]> {
  const allMatches = await getStreamedMatches();
  const playerMap = new Map<string, {
    country?: string | null;
    matchesPlayed: number;
    wins: number;
    losses: number;
    archetypes: Set<string>;
  }>();

  for (const m of allMatches) {
    // Process Player 1
    const p1 = m.player1_name.trim();
    if (p1) {
      if (!playerMap.has(p1)) {
        playerMap.set(p1, {
          country: m.player1_country,
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          archetypes: new Set(),
        });
      }
      const entry = playerMap.get(p1)!;
      entry.matchesPlayed++;
      if (m.player1_deck_archetype) entry.archetypes.add(m.player1_deck_archetype);
      if (m.winner_player_name) {
        if (m.winner_player_name.trim().toLowerCase() === p1.toLowerCase()) {
          entry.wins++;
        } else {
          entry.losses++;
        }
      }
    }

    // Process Player 2
    const p2 = m.player2_name.trim();
    if (p2) {
      if (!playerMap.has(p2)) {
        playerMap.set(p2, {
          country: m.player2_country,
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          archetypes: new Set(),
        });
      }
      const entry = playerMap.get(p2)!;
      entry.matchesPlayed++;
      if (m.player2_deck_archetype) entry.archetypes.add(m.player2_deck_archetype);
      if (m.winner_player_name) {
        if (m.winner_player_name.trim().toLowerCase() === p2.toLowerCase()) {
          entry.wins++;
        } else {
          entry.losses++;
        }
      }
    }
  }

  let list: PlayerLeaderboardEntry[] = Array.from(playerMap.entries()).map(([name, data]) => {
    const totalDecided = data.wins + data.losses;
    const winRate = totalDecided > 0 ? Math.round((data.wins / totalDecided) * 100) : 0;
    return {
      name,
      country: data.country,
      matchesPlayed: data.matchesPlayed,
      wins: data.wins,
      losses: data.losses,
      winRate,
      archetypes: Array.from(data.archetypes).sort((a, b) => {
        const nameA = getArchetypeDisplayName(a);
        const nameB = getArchetypeDisplayName(b);
        return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
      }),
    };
  });

  // Optional text filter
  if (options.query) {
    const q = options.query.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.country && p.country.toLowerCase().includes(q))
    );
  }

  // Sort by matches played and wins
  const sortBy = options.sortBy || 'matches';
  list.sort((a, b) => {
    if (sortBy === 'wins') {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.matchesPlayed - a.matchesPlayed;
    }
    if (sortBy === 'winrate') {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.matchesPlayed - a.matchesPlayed;
    }
    // Default: 'matches' (ranked by matches played, then wins)
    if (b.matchesPlayed !== a.matchesPlayed) return b.matchesPlayed - a.matchesPlayed;
    return b.wins - a.wins;
  });

  return list;
}

/**
 * Get match history and statistics for a given archetype
 */
export async function getArchetypeStats(archetypeIdentifier: string) {
  const allMatches = await getStreamedMatches({ archetype: archetypeIdentifier });
  const supabase = await createServerSupabaseClient();
  let archetypeName = archetypeIdentifier.replace(/-/g, ' ').toUpperCase();
  let icons: string[] = [];

  if (supabase) {
    const { data } = await supabase
      .from('deck_archetypes')
      .select('name, icons')
      .eq('identifier', archetypeIdentifier)
      .single();

    if (data) {
      archetypeName = data.name;
      icons = data.icons || [];
    }
  }

  const archetype: DeckArchetype = {
    identifier: archetypeIdentifier,
    name: archetypeName,
    icons,
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
  if (!supabase) {
    throw new Error('Supabase client not initialized. Cannot submit match.');
  }

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
