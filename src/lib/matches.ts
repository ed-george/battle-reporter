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
    return `${wins}-${losses}-${ties}`;
  }
  return `${wins}-${losses}`;
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

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function parseDateParts(dateStr?: string | null): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    return {
      year: parseInt(match[1], 10),
      month: parseInt(match[2], 10) - 1,
      day: parseInt(match[3], 10),
    };
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth(),
      day: d.getUTCDate(),
    };
  }
  return null;
}

/**
 * Deterministic and timezone-safe date range formatter.
 * e.g., "Oct 17 - 18, 2026" or "May 16 - 18, 2026"
 */
export function formatDateRange(start?: string | null, end?: string | null): string {
  const s = parseDateParts(start);
  if (!s) return 'Dates TBD';
  const e = parseDateParts(end) || s;

  const startMonth = MONTH_NAMES[s.month] || '';
  const endMonth = MONTH_NAMES[e.month] || '';

  if (s.month === e.month && s.year === e.year) {
    if (s.day === e.day) {
      return `${startMonth} ${s.day}, ${s.year}`;
    }
    return `${startMonth} ${s.day} - ${e.day}, ${s.year}`;
  }

  if (s.year === e.year) {
    return `${startMonth} ${s.day} - ${endMonth} ${e.day}, ${s.year}`;
  }

  return `${startMonth} ${s.day}, ${s.year} - ${endMonth} ${e.day}, ${s.year}`;
}


