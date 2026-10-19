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

/**
 * Converts a player name into a clean, URL-safe slug:
 * lowercase, spaces replaced with a dash, and URL encoded.
 * e.g., "Tord Reklev" -> "tord-reklev"
 * e.g., "Tomás Malaca" -> "tom%C3%A1s-malaca"
 */
export function playerNameToSlug(name?: string | null): string {
  if (!name) return '';
  const lowerWithDashes = name.trim().toLowerCase().replace(/\s+/g, '-');
  return encodeURIComponent(lowerWithDashes);
}

/**
 * Normalizes either a player name or an existing slug into the canonical slug format.
 * Handles pre-encoded URLs, spaces, dashes, etc.
 */
export function normalizePlayerSlug(slugOrName?: string | null): string {
  if (!slugOrName) return '';
  let str = slugOrName;
  try {
    str = decodeURIComponent(slugOrName);
  } catch {
    // ignore
  }
  return playerNameToSlug(str);
}

/**
 * Checks whether a given player name matches a target player slug or name.
 */
export function isPlayerSlugMatch(playerName?: string | null, targetSlugOrName?: string | null): boolean {
  if (!playerName || !targetSlugOrName) return false;
  return normalizePlayerSlug(playerName) === normalizePlayerSlug(targetSlugOrName);
}

