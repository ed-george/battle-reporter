import { fetchPokeDataTournaments } from '../src/lib/pokedata';
import { fetchLimitlessDecks } from '../src/lib/limitless';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('--- Pokémon TCG Stream Archive Seeding ---');

  console.log('1. Fetching tournaments from PokeData.ovh...');
  try {
    const tournaments = await fetchPokeDataTournaments();
    console.log(`✓ Fetched ${tournaments.length} tournaments from PokeData.`);

    const targetTournamentsPath = path.join(__dirname, '../src/data/seed-tournaments.json');
    // Save top 20 most recent tournaments
    const topTournaments = tournaments.slice(0, 20);
    fs.writeFileSync(targetTournamentsPath, JSON.stringify(topTournaments, null, 2));
    console.log(`✓ Saved ${topTournaments.length} tournaments to ${targetTournamentsPath}`);
  } catch (err) {
    console.warn('Could not fetch from PokeData:', err);
  }

  console.log('2. Fetching deck archetypes from Limitless TCG...');
  try {
    const decks = await fetchLimitlessDecks(process.env.LIMITLESS_API_KEY);
    console.log(`✓ Loaded ${decks.length} archetypes.`);
  } catch (err) {
    console.warn('Could not fetch Limitless decks:', err);
  }

  console.log('--- Seeding Complete! ---');
}

main().catch(console.error);
