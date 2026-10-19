/**
 * Shared utility functions for stream matches, results, and records.
 */

/**
 * Determines whether a match ended in a tie or draw based on winner_player_name and/or match_score.
 */
export function isMatchTie(winnerName?: string | null, score?: string | null): boolean {
  const w = winnerName?.trim().toLowerCase();
  if (w === 'tie' || w === 'draw' || w === 'tied' || w === 'tie / draw') {
    return true;
  }

  const s = score?.trim().toLowerCase();
  if (s) {
    if (s === 'tie' || s === 'draw' || s === 'tied' || s === 'tie / draw') {
      return true;
    }
    // Pattern for score ties: 1-1, 0-0, 1-1-1, or score starting with 1-1 (like "1-1 (Tie)")
    if (s === '1-1' || s === '0-0' || s === '1-1-1' || s.startsWith('1-1') || s.includes('tie') || s.includes('draw')) {
      // If winner is unset or matches generic tie indicator
      if (!w || w === 'tie' || w === 'draw' || w === 'undecided') {
        return true;
      }
    }
  }

  return false;
}

/**
 * Formats a player's or archetype's record string.
 * e.g., "5W - 2L - 1T" or "5W - 2L"
 */
export function formatRecord(wins: number, losses: number, ties: number = 0): string {
  if (ties > 0) {
    return `${wins}W - ${losses}L - ${ties}T`;
  }
  return `${wins}W - ${losses}L`;
}
