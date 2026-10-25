import { DeckArchetype } from '@/types/database';
import limitlessArchetypesRaw from '@/data/limitless-archetypes.json';

const LIMITLESS_API_BASE = 'https://play.limitlesstcg.com/api';
const LIMITLESS_ICON_CDN = 'https://r2.limitlesstcg.net/pokemon/gen9';

export interface LimitlessArchetypeRecord {
  name: string;
  icons: string[];
  priority?: number;
}

/**
 * Authoritative registry of all deck archetypes and variants sourced directly
 * from the official Limitless TCG Play API (https://play.limitlesstcg.com/api).
 */
export const LIMITLESS_ARCHETYPES: Record<string, LimitlessArchetypeRecord> =
  limitlessArchetypesRaw as Record<string, LimitlessArchetypeRecord>;

/**
 * Returns the official display name from the Limitless API for a deck identifier.
 * Example: 'dragapult-blaziken' -> 'Dragapult Blaziken'
 */
export function getArchetypeDisplayName(identifier?: string | null): string {
  if (!identifier) return 'Unknown Archetype';
  const found = LIMITLESS_ARCHETYPES[identifier];
  if (found && found.name) {
    return found.name;
  }
  // Safe fallback formatted cleanly as title case
  return identifier
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Returns the official icons array from the Limitless API for a deck identifier.
 */
export function getArchetypeIcons(identifier?: string | null): string[] {
  if (!identifier) return ['default'];
  const found = LIMITLESS_ARCHETYPES[identifier];
  if (found && Array.isArray(found.icons) && found.icons.length > 0) {
    return found.icons;
  }
  return [identifier.split('-')[0]];
}

/**
 * Returns the primary sprite icon name for a deck archetype.
 */
export function getArchetypePrimaryIcon(identifier?: string | null): string {
  const icons = getArchetypeIcons(identifier);
  return icons[0] || 'default';
}

/**
 * All official Limitless archetypes and variants as an array sorted alphabetically by name.
 */
export const ALL_LIMITLESS_ARCHETYPES: DeckArchetype[] = Object.entries(LIMITLESS_ARCHETYPES)
  .map(([identifier, data]) => ({
    identifier,
    name: data.name,
    icons: data.icons,
    priority: data.priority ?? 10,
  }))
  .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

/**
 * Fetch deck definitions and rules from the official Limitless TCG Play API
 */
export async function fetchLimitlessDecks(apiKey?: string): Promise<DeckArchetype[]> {
  const key = apiKey || process.env.LIMITLESS_API_KEY;

  if (!key) {
    console.error('LIMITLESS_API_KEY not found');
    return [];
  }

  try {
    const res = await fetch(`${LIMITLESS_API_BASE}/games/PTCG/decks`, {
      headers: {
        'X-Access-Key': key,
      },
      next: { revalidate: 1800 }, // Cache for 30 mins
    });

    if (!res.ok) {
      console.warn(`Limitless API responded with status ${res.status}: ${res.statusText}`);
      return [];
    }

    const result: DeckArchetype[] = await res.json();
    return result
      .filter((d) => d && d.identifier && d.name)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  } catch (error) {
    console.error('Error fetching Limitless decks:', error);
    return [];
  }
}

/**
 * Returns the public sprite URL for a Pokémon icon name
 */
export function getArchetypeIconUrl(iconName?: string | null): string {
  if (!iconName || typeof iconName !== 'string') {
    return `${LIMITLESS_ICON_CDN}/default.png`;
  }
  // Normalize icon name (e.g. lowercase, remove special characters)
  const clean = iconName.toLowerCase().trim();
  return `${LIMITLESS_ICON_CDN}/${clean}.png`;
}

/**
 * Match a raw card decklist against Limitless archetypes to find best matching archetype
 */
export function classifyDecklist(
  decklist: string[] | undefined | null,
  archetypes: DeckArchetype[],
): DeckArchetype | undefined {
  if (!decklist || !Array.isArray(decklist) || decklist.length === 0) {
    return undefined;
  }

  const deckString = decklist.join(' ').toLowerCase();

  // Search through archetypes with matching card rules first
  for (const arch of archetypes) {
    if (arch.cards && arch.cards.length > 0) {
      const allMatched = arch.cards.every((rule) => {
        // Match card set and name if provided
        if (rule.set) {
          return deckString.includes(rule.set.toLowerCase());
        }
        return false;
      });
      if (allMatched) return arch;
    }
  }

  // Fallback: check if archetype name matches keywords in the decklist
  for (const arch of archetypes) {
    const mainPokemon = arch.name.split('/')[0].split(' ')[0].toLowerCase();
    if (deckString.includes(mainPokemon)) {
      return arch;
    }
  }

  return undefined;
}

/**
 * Returns the Limitless TCG search URL for a player
 */
export function getLimitlessPlayerUrl(playerName: string): string {
  if (!playerName) return 'https://limitlesstcg.com/players';
  return `https://limitlesstcg.com/players?q=${encodeURIComponent(playerName.trim())}`;
}
