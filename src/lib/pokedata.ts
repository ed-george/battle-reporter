import { Tournament } from '@/types/database';

export interface PokeDataTournamentItem {
  id: string;
  name: string;
  date: {
    start: string;
    end: string;
  };
  decklists: number;
  tournamentStatus: string;
  winners: {
    juniors: string | null;
    seniors: string | null;
    masters: string | null;
  };
  roundNumbers: {
    juniors: number;
    seniors: number;
    masters: number;
  };
  players: {
    juniors: number;
    seniors: number;
    masters: number;
  };
  lastUpdated?: string;
  rk9link?: string;
}

export interface PokeDataRoundMatch {
  round: number;
  table: number | null;
  player1Name: string;
  player1Country?: string;
  player2Name: string;
  player2Country?: string;
  result?: number; // 3: P1 win, 0: P1 loss, 1: tie
}

export interface PokeDataPlayerEntry {
  name: string;
  placing: number;
  record: { wins: number; losses: number; ties: number };
  decklist?: string[];
  rounds?: Record<string, { name: string; result: number; table: number | null }>;
}

const POKEDATA_BASE_URL = 'https://www.pokedata.ovh/apiv3';

/**
 * Fetch all Pokémon TCG tournaments from PokeData
 */
export async function fetchPokeDataTournaments(): Promise<Tournament[]> {
  const res = await fetch(`${POKEDATA_BASE_URL}/tournaments/tcg`, {
    next: { revalidate: 3600 }, // Cache for 1 hour in Next.js
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch tournaments from PokeData: ${res.statusText}`);
  }

  const json = await res.json();
  const rawList: PokeDataTournamentItem[] = json?.tcg?.data || [];

  return rawList.map((item) => {
    // Extract year/season from name or start date
    const yearMatch = item.name.match(/\b(202\d)\b/);
    const season = yearMatch ? `${yearMatch[1]} Season` : undefined;

    const startDate = item.date?.start || (yearMatch ? `${yearMatch[1]}-04-10` : '2026-04-10');
    const endDate = item.date?.end || startDate;

    return {
      id: item.id,
      name: item.name,
      season,
      start_date: startDate,
      end_date: endDate,
      rk9_link: item.rk9link,
      decklists_count: item.decklists || 0,
      total_players: item.players?.masters || 0,
      status: item.tournamentStatus || 'finished',
    };
  });
}

/**
 * Fetch tournament details including all players, standings, pairings, and decklists
 */
export async function fetchPokeDataTournamentDetail(
  tournamentId: string,
  division: 'masters' | 'seniors' | 'juniors' = 'masters'
): Promise<{
  tournament: Tournament;
  players: PokeDataPlayerEntry[];
}> {
  const res = await fetch(`${POKEDATA_BASE_URL}/division/${division}/tcg/id/${tournamentId}`, {
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch tournament detail for ID ${tournamentId}: ${res.statusText}`);
  }

  const json = await res.json();
  const rawTournament = json?.tournament;
  const rawData = json?.tournament_data?.[0]?.data || [];

  const tournament: Tournament = {
    id: rawTournament?.id || tournamentId,
    name: rawTournament?.name || 'Tournament',
    start_date: rawTournament?.date?.start || '',
    end_date: rawTournament?.date?.end || '',
    rk9_link: rawTournament?.rk9link,
    decklists_count: rawTournament?.decklists || 0,
    total_players: rawTournament?.players?.[division] || rawData.length,
    status: rawTournament?.tournamentStatus || 'finished',
  };

  return {
    tournament,
    players: rawData,
  };
}

/**
 * Extract clean player name and country code, e.g. "Edwyn Mesman [NL]" -> { name: "Edwyn Mesman", country: "NL" }
 */
export function parsePlayerCountry(fullNameWithCountry: string): { name: string; country?: string } {
  const match = fullNameWithCountry.match(/^(.*?)\s*\[([A-Z]{2})\]$/);
  if (match) {
    return { name: match[1].trim(), country: match[2] };
  }
  return { name: fullNameWithCountry.trim() };
}

/**
 * Extract pairings for a given round from the tournament players list
 */
export function extractRoundPairings(
  players: PokeDataPlayerEntry[],
  roundNumber: number
): PokeDataRoundMatch[] {
  const pairings: PokeDataRoundMatch[] = [];
  const processedPairs = new Set<string>();

  for (const player of players) {
    const roundData = player.rounds?.[String(roundNumber)];
    if (!roundData || !roundData.name) continue;

    const p1Parsed = parsePlayerCountry(player.name);
    const p2Parsed = parsePlayerCountry(roundData.name);

    // Create a normalized key so we don't duplicate (P1 vs P2) and (P2 vs P1)
    const pairKey = [p1Parsed.name.toLowerCase(), p2Parsed.name.toLowerCase()].sort().join('::');
    if (processedPairs.has(pairKey)) continue;
    processedPairs.add(pairKey);

    pairings.push({
      round: roundNumber,
      table: roundData.table,
      player1Name: p1Parsed.name,
      player1Country: p1Parsed.country,
      player2Name: p2Parsed.name,
      player2Country: p2Parsed.country,
      result: roundData.result,
    });
  }

  // Sort by table number ascending
  return pairings.sort((a, b) => (a.table || 9999) - (b.table || 9999));
}
