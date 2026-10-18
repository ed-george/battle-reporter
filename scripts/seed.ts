import { fetchPokeDataTournaments } from '../src/lib/pokedata';
import { POPULAR_ARCHETYPES } from '../src/lib/limitless';
import { createClient } from '@supabase/supabase-js';

async function main() {
  console.log('--- Pokémon TCG Stream Archive Supabase Seeding ---');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('1. Upserting deck archetypes to Supabase...');
  const { error: archError } = await supabase
    .from('deck_archetypes')
    .upsert(
      POPULAR_ARCHETYPES.map((a) => ({
        identifier: a.identifier,
        name: a.name,
        icons: a.icons || [],
        priority: a.priority || 10,
      })),
      { onConflict: 'identifier' }
    );

  if (archError) {
    console.warn('Archetypes upsert note/error:', archError.message);
  } else {
    console.log(`✓ Upserted ${POPULAR_ARCHETYPES.length} deck archetypes.`);
  }

  console.log('2. Fetching tournaments from PokeData.ovh and syncing to Supabase...');
  try {
    const tournaments = await fetchPokeDataTournaments();
    console.log(`✓ Fetched ${tournaments.length} tournaments from PokeData.`);

    const topTournaments = tournaments.slice(0, 25).map((t) => ({
      id: t.id,
      name: t.name,
      season: t.season,
      start_date: t.start_date,
      end_date: t.end_date,
      location: t.location || null,
      region: t.region || null,
      rk9_link: t.rk9_link || null,
      decklists_count: t.decklists_count || 0,
      total_players: t.total_players || 0,
      status: t.status || 'finished',
    }));

    const { error: tournError } = await supabase
      .from('tournaments')
      .upsert(topTournaments, { onConflict: 'id' });

    if (tournError) {
      console.warn('Tournaments upsert note/error:', tournError.message);
    } else {
      console.log(`✓ Synced ${topTournaments.length} tournaments to Supabase.`);
    }
  } catch (err) {
    console.warn('Could not fetch from PokeData:', err);
  }

  console.log('--- Supabase Seeding Complete! ---');
}

main().catch(console.error);
