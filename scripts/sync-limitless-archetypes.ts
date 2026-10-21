import * as fs from 'fs';
import * as path from 'path';

// Load .env.local if present
try {
  process.loadEnvFile?.('.env.local');
} catch {}

interface LimitlessDeck {
  identifier: string;
  name: string;
  icons?: string[];
  priority?: number;
  variants?: {
    identifier: string;
    name: string;
    icon?: string;
    cards?: unknown[];
  }[];
}

async function syncLimitlessArchetypes() {
  const apiKey = process.env.LIMITLESS_API_KEY;
  if (!apiKey) {
    throw new Error('LIMITLESS_API_KEY not found in environment.');
  }

  console.log('Fetching official decks and variants from Limitless TCG API...');
  const res = await fetch('https://play.limitlesstcg.com/api/games/PTCG/decks', {
    headers: {
      'X-Access-Key': apiKey,
    },
  });

  if (!res.ok) {
    throw new Error(`Limitless API error: ${res.status} ${res.statusText}`);
  }

  const decks: LimitlessDeck[] = await res.json();
  if (!Array.isArray(decks) || decks.length === 0) {
    throw new Error('Empty response from Limitless API.');
  }

  console.log(`✓ Fetched ${decks.length} top-level decks from Limitless API.`);

  // Map all identifiers to their official Limitless name and icon list
  const registry: Record<string, { name: string; icons: string[]; priority?: number }> = {};

  for (const deck of decks) {
    if (!deck || !deck.identifier || !deck.name) continue;

    const baseIcons = Array.isArray(deck.icons) && deck.icons.length > 0
      ? deck.icons
      : [deck.identifier.split('-')[0]];

    registry[deck.identifier] = {
      name: deck.name.trim(),
      icons: baseIcons,
      priority: deck.priority,
    };

    // Include all official variants from Limitless API
    if (Array.isArray(deck.variants)) {
      for (const variant of deck.variants) {
        if (!variant || !variant.identifier || !variant.name) continue;

        const variantIcons = variant.icon
          ? [variant.icon]
          : baseIcons;

        registry[variant.identifier] = {
          name: variant.name.trim(),
          icons: variantIcons,
          priority: deck.priority,
        };
      }
    }
  }

  const outDir = path.join(process.cwd(), 'src', 'data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, 'limitless-archetypes.json');
  fs.writeFileSync(outPath, JSON.stringify(registry, null, 2), 'utf8');

  console.log(`✓ Successfully saved ${Object.keys(registry).length} authoritative archetypes & variants to ${outPath}`);
  console.log('Sample verification:');
  console.log('  dragapult-blaziken =>', registry['dragapult-blaziken']);
  console.log('  dragapult-ex       =>', registry['dragapult-ex']);
  console.log('  n-zoroark          =>', registry['n-zoroark']);
  console.log('  festival-lead      =>', registry['festival-lead']);
}

syncLimitlessArchetypes().catch((err) => {
  console.error('Failed to sync Limitless archetypes:', err);
  process.exit(1);
});
