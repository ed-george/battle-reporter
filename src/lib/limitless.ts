import { DeckArchetype } from '@/types/database';

const LIMITLESS_API_BASE = 'https://play.limitlesstcg.com/api';
const LIMITLESS_ICON_CDN = 'https://r2.limitlesstcg.net/pokemon/gen9';

// Default popular current archetypes sorted alphabetically by name
export const POPULAR_ARCHETYPES: DeckArchetype[] = [
  {
    identifier: 'charizard-ex',
    name: 'Charizard ex',
    icons: ['charizard'],
    priority: 100,
  },
  {
    identifier: 'dragapult-ex',
    name: 'Dragapult ex',
    icons: ['dragapult'],
    priority: 90,
  },
  {
    identifier: 'gardevoir-ex',
    name: 'Gardevoir ex',
    icons: ['gardevoir'],
    priority: 95,
  },
  {
    identifier: 'gholdengo-ex',
    name: 'Gholdengo Palkia',
    icons: ['gholdengo', 'palkia-origin'],
    priority: 75,
  },
  {
    identifier: 'iron-thorns-ex',
    name: 'Iron Thorns ex',
    icons: ['iron-thorns'],
    priority: 70,
  },
  {
    identifier: 'lugia-vstar',
    name: 'Lugia Archeops',
    icons: ['lugia', 'archeops'],
    priority: 85,
  },
  {
    identifier: 'miraidon-ex',
    name: 'Miraidon ex',
    icons: ['miraidon'],
    priority: 80,
  },
  {
    identifier: 'raging-bolt-ogerpon',
    name: 'Raging Bolt / Ogerpon',
    icons: ['raging-bolt', 'ogerpon-teal'],
    priority: 90,
  },
  {
    identifier: 'regidrago-vstar',
    name: 'Regidrago VSTAR',
    icons: ['regidrago'],
    priority: 85,
  },
  {
    identifier: 'roaring-moon',
    name: 'Roaring Moon',
    icons: ['roaring-moon'],
    priority: 75,
  },
  {
    identifier: 'snorlax-stall',
    name: 'Snorlax Stall',
    icons: ['snorlax'],
    priority: 70,
  },
  {
    identifier: 'terapagos-ex',
    name: 'Terapagos ex / Dusknoir',
    icons: ['terapagos-terastal', 'dusknoir'],
    priority: 80,
  },
];

/**
 * Fetch deck definitions and rules from the official Limitless TCG Play API
 */
export async function fetchLimitlessDecks(apiKey?: string): Promise<DeckArchetype[]> {
  const key = apiKey || process.env.LIMITLESS_API_KEY;

  if (!key) {
    console.warn('LIMITLESS_API_KEY not found; using fallback archetypes.');
    return POPULAR_ARCHETYPES;
  }

  try {
    const res = await fetch(`${LIMITLESS_API_BASE}/games/PTCG/decks`, {
      headers: {
        'X-Access-Key': key,
      },
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!res.ok) {
      console.warn(`Limitless API responded with status ${res.status}: ${res.statusText}`);
      return POPULAR_ARCHETYPES;
    }

    const data: DeckArchetype[] = await res.json();
    const result = Array.isArray(data) && data.length > 0 ? data : POPULAR_ARCHETYPES;
    return result
      .filter((d) => d && d.identifier && d.name)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  } catch (error) {
    console.error('Error fetching Limitless decks:', error);
    return [...POPULAR_ARCHETYPES].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
  }
}

/**
 * Returns the public sprite URL for a Pokémon icon name
 */
export function getArchetypeIconUrl(iconName: string): string {
  // Normalize icon name (e.g. lowercase, remove special characters)
  const clean = iconName.toLowerCase().trim();
  return `${LIMITLESS_ICON_CDN}/${clean}.png`;
}

/**
 * Match a raw card decklist against Limitless archetypes to find best matching archetype
 */
export function classifyDecklist(
  decklist: string[] | undefined | null,
  archetypes: DeckArchetype[] = POPULAR_ARCHETYPES
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
 * Returns the official Limitless TCG URL for an archetype or deck
 */
export function getLimitlessDeckUrl(archetypeIdentifier: string): string {
  if (!archetypeIdentifier) return 'https://limitlesstcg.com/decks';
  return `https://play.limitlesstcg.com/decks/${encodeURIComponent(archetypeIdentifier)}`;
}

/**
 * Returns the Limitless TCG search URL for a player
 */
export function getLimitlessPlayerUrl(playerName: string): string {
  if (!playerName) return 'https://limitlesstcg.com/players';
  return `https://limitlesstcg.com/players?q=${encodeURIComponent(playerName.trim())}`;
}
