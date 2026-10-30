import { Tournament, StreamedMatch, DeckArchetype } from '@/types/database';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  ALL_LIMITLESS_ARCHETYPES,
  getArchetypeDisplayName,
  getArchetypeIcons,
  getArchetypePrimaryIcon,
} from '@/lib/limitless';
import { isMatchTie, formatRecord, playerNameToSlug, isPlayerSlugMatch, normalizePlayerSlug } from '@/lib/matches';

export {
  isMatchTie,
  formatRecord,
  playerNameToSlug,
  isPlayerSlugMatch,
  normalizePlayerSlug,
  getArchetypeDisplayName,
  getArchetypeIcons,
  getArchetypePrimaryIcon,
};

/**
 * Safely sanitizes user input values before interpolating into PostgREST filter strings (.or(), .eq(), etc.).
 * Strips characters that break PostgREST filter syntax, such as commas, parentheses, quotes, and backslashes.
 */
export function sanitizePostgrestValue(value?: string | null): string {
  if (!value) return '';
  return value.replace(/[,()'"\\]/g, '').trim();
}

/**
 * Sanitizes input for PostgREST ILIKE search patterns.
 * Replaces characters that break PostgREST syntax (commas, parentheses, quotes, backslashes)
 * and separators with the SQL wildcard `%`, ensuring searches like "O'Connor" or "Smith, Jr."
 * match safely without syntax errors.
 */
export function sanitizePostgrestSearchPattern(value?: string | null): string {
  if (!value) return '';
  return value
    .replace(/[-_\s'"`(),.]+/g, '%')
    .replace(/%{2,}/g, '%')
    .replace(/^%+/, '')
    .replace(/%+$/, '')
    .trim();
}

/**
 * Returns all distinct seasons that have streamed matches, ordered descending.
 */
export async function getStreamedSeasons(): Promise<string[]> {
  const data = await getArchetypesDirectoryData();
  return data.availableSeasons;
}

export interface MatchFilterParams {
  tournamentId?: string;
  playerName?: string;
  archetype?: string;
  round?: string;
  query?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedMatchesResult {
  matches: StreamedMatch[];
  data: StreamedMatch[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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
 * Executes a filtered query for streamed matches against Supabase.
 * Applies multi-criteria filters and optional pagination range.
 */
async function fetchStreamedMatchesWithFilters(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  filters: MatchFilterParams = {},
  range?: { from: number; to: number }
) {
  let query = supabase
    .from('streamed_matches')
    .select('*, games:match_games(*), tournament:tournaments(*)', { count: 'exact' })
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (filters.tournamentId) {
    const safeTourneyId = sanitizePostgrestValue(filters.tournamentId);
    if (safeTourneyId) {
      query = query.eq('tournament_id', safeTourneyId);
    }
  }

  if (filters.archetype) {
    const safeArchetype = sanitizePostgrestValue(filters.archetype);
    if (safeArchetype) {
      query = query.or(`player1_deck_archetype.eq.${safeArchetype},player2_deck_archetype.eq.${safeArchetype}`);
    }
  }

  if (filters.playerName) {
    const safePlayer = sanitizePostgrestSearchPattern(filters.playerName);
    if (safePlayer) {
      query = query.or(`player1_name.ilike.%${safePlayer}%,player2_name.ilike.%${safePlayer}%`);
    }
  }

  if (filters.round) {
    const safeRound = sanitizePostgrestSearchPattern(filters.round);
    if (safeRound) {
      query = query.ilike('round_name', `%${safeRound}%`);
    }
  }

  if (filters.query) {
    const safeQ = sanitizePostgrestSearchPattern(filters.query);
    if (safeQ) {
      const orConditions: string[] = [
        `player1_name.ilike.%${safeQ}%`,
        `player2_name.ilike.%${safeQ}%`,
        `player1_deck_archetype.ilike.%${safeQ}%`,
        `player2_deck_archetype.ilike.%${safeQ}%`,
        `round_name.ilike.%${safeQ}%`,
      ];

      // Match tournaments by name
      try {
        const { data: matchingTourneys } = await supabase
          .from('tournaments')
          .select('id')
          .ilike('name', `%${safeQ}%`);
        if (matchingTourneys && matchingTourneys.length > 0) {
          matchingTourneys.forEach((t: { id: string }) => {
            const safeId = sanitizePostgrestValue(t.id);
            if (safeId) {
              orConditions.push(`tournament_id.eq.${safeId}`);
            }
          });
        }
      } catch {
        // ignore tournament lookup error
      }

      // Match archetypes by display name
      const cleanLowerQ = filters.query.toLowerCase().trim();
      const matchingArchs = ALL_LIMITLESS_ARCHETYPES.filter((a) =>
        a.name.toLowerCase().includes(cleanLowerQ)
      );
      for (const arch of matchingArchs) {
        const safeArchId = sanitizePostgrestValue(arch.identifier);
        if (safeArchId) {
          orConditions.push(`player1_deck_archetype.eq.${safeArchId}`);
          orConditions.push(`player2_deck_archetype.eq.${safeArchId}`);
        }
      }

      if (orConditions.length > 0) {
        query = query.or(orConditions.join(','));
      }
    }
  }

  if (range) {
    query = query.range(range.from, range.to);
  }

  return await query;
}

/**
 * Get published streamed matches with server-side pagination and total match counts.
 * Uses Supabase .range((page - 1) * pageSize, page * pageSize - 1) with { count: 'exact' }.
 */
export async function getPaginatedStreamedMatches(
  filters: MatchFilterParams = {}
): Promise<PaginatedMatchesResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.max(1, filters.pageSize ?? 25);
  const from = (page - 1) * pageSize;
  const to = page * pageSize - 1;

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    console.error('Supabase client not initialized.');
    return {
      matches: [],
      data: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  try {
    const { data, count, error } = await fetchStreamedMatchesWithFilters(supabase, filters, {
      from,
      to,
    });

    if (error) {
      console.error('Error fetching paginated streamed matches from Supabase:', error);
      return {
        matches: [],
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }

    const matches = (data || []) as StreamedMatch[];
    const total = count ?? matches.length;
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

    return {
      matches,
      data: matches,
      total,
      page,
      pageSize,
      totalPages,
    };
  } catch (err) {
    console.error('Unexpected error fetching paginated streamed matches:', err);
    return {
      matches: [],
      data: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }
}

/**
 * Get all published streamed matches with optional multi-criteria filters.
 * Supports server-side pagination via filters.page and filters.pageSize (default pageSize: 25).
 * Preserves backwards compatibility for callers that do not specify pagination.
 */
export async function getStreamedMatches(filters: MatchFilterParams = {}): Promise<StreamedMatch[]> {
  if (filters.page !== undefined) {
    const result = await getPaginatedStreamedMatches(filters);
    return result.matches;
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    console.error('Supabase client not initialized.');
    return [];
  }

  try {
    const { data, error } = await fetchStreamedMatchesWithFilters(supabase, filters);
    if (error) {
      console.error('Error fetching streamed matches from Supabase:', error);
      return [];
    }

    return (data || []) as StreamedMatch[];
  } catch (err) {
    console.error('Unexpected error fetching streamed matches:', err);
    return [];
  }
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

  const match = (data as StreamedMatch) || null;
  if (match && Array.isArray(match.games)) {
    match.games.sort((a, b) => a.game_number - b.game_number);
  }

  return match;
}

export interface StreamedArchetypeSummary {
  archetype: DeckArchetype;
  streamMatchCount: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
}

// In-memory caches with TTL to drastically reduce database load and avoid Supabase rate limits
let cachedDeckArchetypes: { data: DeckArchetype[]; expiresAt: number } | null = null;
let cachedArchetypesDirectoryData: { data: ArchetypesDirectoryData; expiresAt: number } | null = null;
let cachedPlayersDirectoryData: { data: PlayersDirectoryData; expiresAt: number } | null = null;

export function clearStreamedArchetypesCache() {
  cachedDeckArchetypes = null;
  cachedArchetypesDirectoryData = null;
  cachedPlayersDirectoryData = null;
}

export interface ArchetypesDirectoryData {
  all: StreamedArchetypeSummary[];
  bySeason: Record<string, StreamedArchetypeSummary[]>;
  availableSeasons: string[];
}

/**
 * Builds an aggregated list of archetype statistics from match records.
 */
function buildArchetypeSummaryList(
  matches: {
    player1_deck_archetype?: string | null;
    player2_deck_archetype?: string | null;
    player1_name: string;
    player2_name: string;
    winner_player_name?: string | null;
    match_score?: string | null;
  }[]
): StreamedArchetypeSummary[] {
  interface ArchetypeAccumulator {
    gamesPlayed: number;
    wins: number;
    losses: number;
    ties: number;
  }

  const statsMap = new Map<string, ArchetypeAccumulator>();
  const getOrCreate = (id: string): ArchetypeAccumulator => {
    let entry = statsMap.get(id);
    if (!entry) {
      entry = { gamesPlayed: 0, wins: 0, losses: 0, ties: 0 };
      statsMap.set(id, entry);
    }
    return entry;
  };

  for (const m of matches) {
    const isTie = isMatchTie(m.winner_player_name, m.match_score);
    const winnerLower = m.winner_player_name?.trim().toLowerCase();
    const p1Lower = m.player1_name?.trim().toLowerCase();
    const p2Lower = m.player2_name?.trim().toLowerCase();

    if (m.player1_deck_archetype) {
      const stats = getOrCreate(m.player1_deck_archetype);
      stats.gamesPlayed++;
      if (isTie) {
        stats.ties++;
      } else if (winnerLower) {
        if (p1Lower && winnerLower === p1Lower) {
          stats.wins++;
        } else {
          stats.losses++;
        }
      }
    }

    if (m.player2_deck_archetype) {
      const stats = getOrCreate(m.player2_deck_archetype);
      stats.gamesPlayed++;
      if (isTie) {
        stats.ties++;
      } else if (winnerLower) {
        if (p2Lower && winnerLower === p2Lower) {
          stats.wins++;
        } else {
          stats.losses++;
        }
      }
    }
  }

  const activeIdentifiers = Array.from(statsMap.keys()).filter(Boolean);
  if (activeIdentifiers.length === 0) return [];

  return activeIdentifiers
    .map((identifier) => {
      const stats = statsMap.get(identifier)!;
      const totalDecided = stats.wins + stats.losses + stats.ties;
      const winRate = totalDecided > 0 ? Math.round((stats.wins / totalDecided) * 100) : 0;

      return {
        archetype: {
          identifier,
          name: getArchetypeDisplayName(identifier),
          icons: getArchetypeIcons(identifier),
        },
        streamMatchCount: stats.gamesPlayed,
        gamesPlayed: stats.gamesPlayed,
        wins: stats.wins,
        losses: stats.losses,
        ties: stats.ties,
        winRate,
      };
    })
    .sort((a, b) => {
      if (b.gamesPlayed !== a.gamesPlayed) {
        return b.gamesPlayed - a.gamesPlayed;
      }
      return a.archetype.name.localeCompare(b.archetype.name, undefined, { sensitivity: 'base' });
    });
}

/**
 * Fetches all streamed archetypes grouped by season and overall
 */
export async function getArchetypesDirectoryData(): Promise<ArchetypesDirectoryData> {
  if (cachedArchetypesDirectoryData && cachedArchetypesDirectoryData.expiresAt > Date.now()) {
    return cachedArchetypesDirectoryData.data;
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { all: [], bySeason: {}, availableSeasons: [] };
  }

  const { data: matches, error: matchError } = await supabase
    .from('streamed_matches')
    .select('tournament_id, player1_deck_archetype, player2_deck_archetype, player1_name, player2_name, winner_player_name, match_score')
    .eq('is_published', true);

  if (matchError || !matches || matches.length === 0) {
    return { all: [], bySeason: {}, availableSeasons: [] };
  }

  const tournaments = await getTournaments();
  const tourneyMap = new Map<string, Tournament>(tournaments.map((t) => [t.id, t]));

  const seasonsSet = new Set<string>();
  const matchesBySeason = new Map<string, typeof matches>();

  matches.forEach((m) => {
    const t = tourneyMap.get(m.tournament_id);
    const season = t?.season || (t?.start_date ? `${t.start_date.slice(0, 4)} Season` : null);
    if (season) {
      seasonsSet.add(season);
      let list = matchesBySeason.get(season);
      if (!list) {
        list = [];
        matchesBySeason.set(season, list);
      }
      list.push(m);
    }
  });

  const availableSeasons = Array.from(seasonsSet).sort().reverse();
  const all = buildArchetypeSummaryList(matches);
  const bySeason: Record<string, StreamedArchetypeSummary[]> = {};

  availableSeasons.forEach((season) => {
    const seasonMatches = matchesBySeason.get(season) || [];
    bySeason[season] = buildArchetypeSummaryList(seasonMatches);
  });

  const result: ArchetypesDirectoryData = {
    all,
    bySeason,
    availableSeasons,
  };

  cachedArchetypesDirectoryData = {
    data: result,
    expiresAt: Date.now() + 30_000,
  };

  return result;
}

/**
 * Highly efficient query for the /archetypes overview:
 * Supports optional season filtering. Defaults to all seasons.
 */
export async function getStreamedArchetypesSummary(options?: { season?: string }): Promise<StreamedArchetypeSummary[]> {
  const data = await getArchetypesDirectoryData();
  if (options?.season && options.season !== 'all') {
    return data.bySeason[options.season] || [];
  }
  return data.all;
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
    return ALL_LIMITLESS_ARCHETYPES;
  }

  const { data, error } = await supabase
    .from('deck_archetypes')
    .select('identifier, name, icons, priority, variants');

  if (error || !data || data.length === 0) {
    return ALL_LIMITLESS_ARCHETYPES;
  }

  // Combine top-level and variants from Supabase and Limitless dictionary
  const deckMap = new Map<string, DeckArchetype>();
  for (const arch of ALL_LIMITLESS_ARCHETYPES) {
    deckMap.set(arch.identifier, arch);
  }

  for (const d of data as Array<{
    identifier?: string;
    name?: string;
    icons?: string[];
    priority?: number;
    variants?: Array<{ identifier?: string; name?: string; icon?: string }>;
  }>) {
    if (d.identifier && d.name) {
      deckMap.set(d.identifier, {
        identifier: d.identifier,
        name: d.name,
        icons: Array.isArray(d.icons) ? d.icons : [d.identifier.split('-')[0]],
        priority: d.priority ?? 10,
      });
    }
    if (Array.isArray(d.variants)) {
      for (const v of d.variants) {
        if (v && v.identifier && v.name) {
          deckMap.set(v.identifier, {
            identifier: v.identifier,
            name: v.name,
            icons: v.icon ? [v.icon] : (Array.isArray(d.icons) ? d.icons : [v.identifier.split('-')[0]]),
            priority: d.priority ?? 10,
          });
        }
      }
    }
  }

  const sorted = Array.from(deckMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );

  cachedDeckArchetypes = {
    data: sorted,
    expiresAt: Date.now() + 5 * 60_000,
  };

  return sorted;
}

/**
 * Get match history and statistics for a given player name or slug
 */
export async function getPlayerStats(playerSlugOrName: string) {
  let decoded = playerSlugOrName;
  try {
    decoded = decodeURIComponent(playerSlugOrName);
  } catch {
    // ignore
  }

  // Generate candidate search query by replacing dashes, spaces, quotes, and punctuation with wildcards
  const searchPattern = sanitizePostgrestSearchPattern(decoded);
  const candidateMatches = searchPattern
    ? await getStreamedMatches({ playerName: searchPattern })
    : [];

  // Use candidate matches if found, otherwise fall back to all streamed matches
  const matchesToSearch = candidateMatches.length > 0 ? candidateMatches : await getStreamedMatches();

  const checkPlayerMatch = (name?: string | null) => {
    if (!name) return false;
    return (
      isPlayerSlugMatch(name, playerSlugOrName) ||
      normalizePlayerSlug(name).replace(/['"-]/g, '') === normalizePlayerSlug(playerSlugOrName).replace(/['"-]/g, '')
    );
  };

  let canonicalName = '';
  const playerMatches: StreamedMatch[] = [];

  for (const m of matchesToSearch) {
    const isP1 = checkPlayerMatch(m.player1_name);
    const isP2 = checkPlayerMatch(m.player2_name);
    if (isP1 || isP2) {
      playerMatches.push(m);
      if (!canonicalName) {
        canonicalName = isP1 ? m.player1_name : m.player2_name;
      }
    }
  }

  // If no canonical name was found in matches, reconstruct a presentable display name from the slug
  if (!canonicalName) {
    canonicalName = decoded
      .trim()
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  let wins = 0;
  let losses = 0;
  let ties = 0;
  const archetypesUsed = new Map<string, number>();

  playerMatches.forEach((m) => {
    const isP1 = checkPlayerMatch(m.player1_name);
    const arch = isP1 ? m.player1_deck_archetype : m.player2_deck_archetype;
    if (arch) {
      archetypesUsed.set(arch, (archetypesUsed.get(arch) || 0) + 1);
    }

    if (isMatchTie(m.winner_player_name, m.match_score)) {
      ties++;
    } else if (m.winner_player_name) {
      if (checkPlayerMatch(m.winner_player_name)) {
        wins++;
      } else {
        losses++;
      }
    }
  });

  const totalRecorded = wins + losses + ties;

  return {
    name: canonicalName,
    slug: playerNameToSlug(canonicalName),
    totalStreamMatches: playerMatches.length,
    wins,
    losses,
    ties,
    winRate: totalRecorded > 0 ? Math.round((wins / totalRecorded) * 100) : 0,
    archetypesUsed: Array.from(archetypesUsed.entries())
      .map(([identifier, count]) => ({
        identifier,
        name: getArchetypeDisplayName(identifier),
        count,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    matches: playerMatches,
  };
}

export interface PlayerLeaderboardEntry {
  name: string;
  slug: string;
  country?: string | null;
  matchesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
  archetypes: string[];
}

export interface PlayersDirectoryData {
  all: PlayerLeaderboardEntry[];
  bySeason: Record<string, PlayerLeaderboardEntry[]>;
  availableSeasons: string[];
}

/**
 * Aggregates match records into a ranked player leaderboard.
 */
function buildPlayerLeaderboardList(
  matches: StreamedMatch[],
  options: { sortBy?: 'matches' | 'wins' | 'winrate'; query?: string } = {}
): PlayerLeaderboardEntry[] {
  const playerMap = new Map<string, {
    country?: string | null;
    matchesPlayed: number;
    wins: number;
    losses: number;
    ties: number;
    archetypes: Set<string>;
  }>();

  for (const m of matches) {
    const isTie = isMatchTie(m.winner_player_name, m.match_score);

    // Process Player 1
    const p1 = m.player1_name?.trim();
    if (p1) {
      if (!playerMap.has(p1)) {
        playerMap.set(p1, {
          country: m.player1_country,
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          ties: 0,
          archetypes: new Set(),
        });
      }
      const entry = playerMap.get(p1)!;
      entry.matchesPlayed++;
      if (m.player1_deck_archetype) entry.archetypes.add(m.player1_deck_archetype);
      if (isTie) {
        entry.ties++;
      } else if (m.winner_player_name) {
        if (m.winner_player_name.trim().toLowerCase() === p1.toLowerCase()) {
          entry.wins++;
        } else {
          entry.losses++;
        }
      }
    }

    // Process Player 2
    const p2 = m.player2_name?.trim();
    if (p2) {
      if (!playerMap.has(p2)) {
        playerMap.set(p2, {
          country: m.player2_country,
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          ties: 0,
          archetypes: new Set(),
        });
      }
      const entry = playerMap.get(p2)!;
      entry.matchesPlayed++;
      if (m.player2_deck_archetype) entry.archetypes.add(m.player2_deck_archetype);
      if (isTie) {
        entry.ties++;
      } else if (m.winner_player_name) {
        if (m.winner_player_name.trim().toLowerCase() === p2.toLowerCase()) {
          entry.wins++;
        } else {
          entry.losses++;
        }
      }
    }
  }

  let list: PlayerLeaderboardEntry[] = Array.from(playerMap.entries()).map(([name, data]) => {
    const totalRecorded = data.wins + data.losses + data.ties;
    const winRate = totalRecorded > 0 ? Math.round((data.wins / totalRecorded) * 100) : 0;
    return {
      name,
      slug: playerNameToSlug(name),
      country: data.country,
      matchesPlayed: data.matchesPlayed,
      wins: data.wins,
      losses: data.losses,
      ties: data.ties,
      winRate,
      archetypes: Array.from(data.archetypes).sort((a, b) => {
        const nameA = getArchetypeDisplayName(a);
        const nameB = getArchetypeDisplayName(b);
        return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
      }),
    };
  });

  if (options.query) {
    const q = options.query.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.country && p.country.toLowerCase().includes(q))
    );
  }

  // Sort
  const sortBy = options.sortBy || 'matches';
  list.sort((a, b) => {
    if (sortBy === 'wins') {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.matchesPlayed !== a.matchesPlayed) return b.matchesPlayed - a.matchesPlayed;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    }
    if (sortBy === 'winrate') {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    }
    // Default 'matches'
    if (b.matchesPlayed !== a.matchesPlayed) return b.matchesPlayed - a.matchesPlayed;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.ties - a.ties;
  });

  return list;
}

/**
 * Fetches all streamed players leaderboard grouped by season and overall
 */
export async function getPlayersDirectoryData(): Promise<PlayersDirectoryData> {
  if (cachedPlayersDirectoryData && cachedPlayersDirectoryData.expiresAt > Date.now()) {
    return cachedPlayersDirectoryData.data;
  }

  const allMatches = await getStreamedMatches();
  const seasonsSet = new Set<string>();
  const matchesBySeason = new Map<string, StreamedMatch[]>();

  allMatches.forEach((m) => {
    const season = m.tournament?.season || (m.tournament?.start_date ? `${m.tournament.start_date.slice(0, 4)} Season` : null);
    if (season) {
      seasonsSet.add(season);
      let list = matchesBySeason.get(season);
      if (!list) {
        list = [];
        matchesBySeason.set(season, list);
      }
      list.push(m);
    }
  });

  const availableSeasons = Array.from(seasonsSet).sort().reverse();
  const all = buildPlayerLeaderboardList(allMatches);
  const bySeason: Record<string, PlayerLeaderboardEntry[]> = {};

  availableSeasons.forEach((season) => {
    const seasonMatches = matchesBySeason.get(season) || [];
    bySeason[season] = buildPlayerLeaderboardList(seasonMatches);
  });

  const result: PlayersDirectoryData = {
    all,
    bySeason,
    availableSeasons,
  };

  cachedPlayersDirectoryData = {
    data: result,
    expiresAt: Date.now() + 30_000,
  };

  return result;
}

/**
 * Get all players who have appeared on stream, ranked by matches played and wins.
 * Supports optional season, query, and sorting options. Defaults to all seasons.
 */
export async function getStreamPlayers(options: {
  sortBy?: 'matches' | 'wins' | 'winrate';
  query?: string;
  season?: string;
} = {}): Promise<PlayerLeaderboardEntry[]> {
  const data = await getPlayersDirectoryData();
  let list = options.season && options.season !== 'all' ? data.bySeason[options.season] || [] : data.all;

  if (options.query) {
    const q = options.query.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.country && p.country.toLowerCase().includes(q))
    );
  }

  if (options.sortBy && options.sortBy !== 'matches') {
    const sortBy = options.sortBy;
    list = [...list].sort((a, b) => {
      if (sortBy === 'wins') {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.matchesPlayed !== a.matchesPlayed) return b.matchesPlayed - a.matchesPlayed;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      }
      if (sortBy === 'winrate') {
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      }
      return b.matchesPlayed - a.matchesPlayed;
    });
  }

  return list;
}

/**
 * Get match history and statistics for a given archetype
 */
export async function getArchetypeStats(archetypeIdentifier: string) {
  const allMatches = await getStreamedMatches({ archetype: archetypeIdentifier });
  const archetypeName = getArchetypeDisplayName(archetypeIdentifier);
  const icons = getArchetypeIcons(archetypeIdentifier);

  const archetype: DeckArchetype = {
    identifier: archetypeIdentifier,
    name: archetypeName,
    icons,
  };

  let totalAppearances = 0;
  let wins = 0;
  let losses = 0;
  let ties = 0;

  allMatches.forEach((m) => {
    const isP1 = m.player1_deck_archetype === archetypeIdentifier;
    const isP2 = m.player2_deck_archetype === archetypeIdentifier;
    const isTie = isMatchTie(m.winner_player_name, m.match_score);

    if (isP1) {
      totalAppearances++;
      if (isTie) {
        ties++;
      } else if (m.winner_player_name) {
        if (m.winner_player_name === m.player1_name) wins++;
        else losses++;
      }
    }
    if (isP2) {
      totalAppearances++;
      if (isTie) {
        ties++;
      } else if (m.winner_player_name) {
        if (m.winner_player_name === m.player2_name) wins++;
        else losses++;
      }
    }
  });

  const totalRecorded = wins + losses + ties;

  return {
    archetype,
    totalAppearances,
    wins,
    losses,
    ties,
    winRate: totalRecorded > 0 ? Math.round((wins / totalRecorded) * 100) : 0,
    matches: allMatches,
  };
}


