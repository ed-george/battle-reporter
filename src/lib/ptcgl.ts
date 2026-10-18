export interface ParsedDeckCard {
  count: number;
  set: string;
  number: string;
  category?: 'pokemon' | 'trainer' | 'energy';
}

const BASIC_ENERGY_SETS: Record<string, string> = {
  'CRZ 158': 'Basic Psychic Energy',
  'CRZ 152': 'Basic Grass Energy',
  'CRZ 153': 'Basic Fire Energy',
  'CRZ 154': 'Basic Water Energy',
  'CRZ 155': 'Basic Lightning Energy',
  'CRZ 156': 'Basic Fighting Energy',
  'CRZ 157': 'Basic Darkness Energy',
  'CRZ 159': 'Basic Metal Energy',
  'SVE 1': 'Basic Grass Energy',
  'SVE 2': 'Basic Fire Energy',
  'SVE 3': 'Basic Water Energy',
  'SVE 4': 'Basic Lightning Energy',
  'SVE 5': 'Basic Psychic Energy',
  'SVE 6': 'Basic Fighting Energy',
  'SVE 7': 'Basic Darkness Energy',
  'SVE 8': 'Basic Metal Energy',
};

/**
 * Parses raw decklist strings like ["2 MEG 86", "4 PAF 235", "7 CRZ 158"]
 */
export function parseDecklist(decklist: string[] = []): ParsedDeckCard[] {
  return decklist.map((item) => {
    const parts = item.trim().split(/\s+/);
    if (parts.length >= 3) {
      const count = parseInt(parts[0], 10) || 1;
      const set = parts[1];
      const number = parts.slice(2).join(' ');
      return { count, set, number };
    }
    return { count: 1, set: '', number: item };
  });
}

/**
 * Formats a decklist into the standard Pokémon TCG Live text export format
 */
export function formatForPTCGL(decklist: string[] = []): string {
  const parsed = parseDecklist(decklist);
  if (parsed.length === 0) return '';

  const totalCards = parsed.reduce((sum, c) => sum + c.count, 0);

  const lines: string[] = [];
  lines.push(`Total Cards: ${totalCards}\n`);

  parsed.forEach((card) => {
    const cardKey = `${card.set} ${card.number}`;
    const cardName = BASIC_ENERGY_SETS[cardKey] || card.set;
    lines.push(`${card.count} ${cardName} ${card.set} ${card.number}`.trim());
  });

  return lines.join('\n');
}

/**
 * Returns a card image URL from the Pokémon TCG IO or Limitless card CDN
 */
export function getCardImageUrl(setCode: string, cardNumber: string): string {
  if (!setCode || !cardNumber) return '';
  return `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/${setCode.toUpperCase()}/${setCode.toUpperCase()}_${cardNumber.padStart(3, '0')}_R_EN.png`;
}
