import { fetchPokeDataTournaments } from '../src/lib/pokedata';
import { fetchLimitlessDecks } from '../src/lib/limitless';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Attempt to load .env.local if present
try {
  process.loadEnvFile?.('.env.local');
} catch {
  // Ignore if not found or already in env
}

async function main() {
  console.log('=== Pokémon TCG Database Seeding (Tournaments & Archetypes Only) ===');

  // 1. Fetch tournaments from PokeData API
  console.log('1. Fetching official tournaments from PokeData API...');
  const allTournaments = await fetchPokeDataTournaments();
  const validTournaments = allTournaments.filter((t) => t.id && t.name);
  console.log(`✓ Fetched ${validTournaments.length} valid tournaments from PokeData.`);

  // 2. Fetch deck archetypes from Limitless TCG API
  console.log('2. Fetching deck archetypes from Limitless TCG API...');
  const allDecks = await fetchLimitlessDecks(process.env.LIMITLESS_API_KEY);

  // Deduplicate and filter valid decks
  const deckMap = new Map();
  for (const deck of allDecks) {
    if (!deck || !deck.identifier || !deck.name) continue;
    // Prefer higher generation / priority if duplicate identifier
    if (!deckMap.has(deck.identifier) || (deck.generation && deck.generation >= (deckMap.get(deck.identifier).generation || 0))) {
      deckMap.set(deck.identifier, deck);
    }
  }
  const validDecks = Array.from(deckMap.values());
  console.log(`✓ Loaded and deduplicated ${validDecks.length} deck archetypes.`);

  // 3. Generate clean supabase/seed.sql
  console.log('3. Generating supabase/seed.sql (strictly Tournaments + Archetypes, no video/player data)...');

  let sql = '-- ==========================================\n';
  sql += '-- 1. Table Grants & Access Privileges\n';
  sql += '-- ==========================================\n';
  sql += 'GRANT USAGE ON SCHEMA public TO anon, authenticated;\n';
  sql += 'GRANT SELECT ON public.tournaments TO anon, authenticated;\n';
  sql += 'GRANT SELECT ON public.deck_archetypes TO anon, authenticated;\n';
  sql += 'GRANT SELECT ON public.streamed_matches TO anon, authenticated;\n';
  sql += 'GRANT SELECT ON public.match_games TO anon, authenticated;\n';
  sql += 'GRANT SELECT, INSERT ON public.submissions TO anon, authenticated;\n';
  sql += 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon, authenticated;\n\n';

  sql += '-- Make tournament dates nullable in case of unannounced or missing dates from APIs\n';
  sql += 'ALTER TABLE public.tournaments ALTER COLUMN start_date DROP NOT NULL;\n';
  sql += 'ALTER TABLE public.tournaments ALTER COLUMN end_date DROP NOT NULL;\n\n';

  sql += '-- Allow public/anon to insert match submissions (for community tagging)\n';
  sql += 'DO $$\nBEGIN\n';
  sql += '  IF NOT EXISTS (\n';
  sql += "    SELECT 1 FROM pg_policies WHERE tablename = 'submissions' AND policyname = 'Public insert submissions'\n";
  sql += '  ) THEN\n';
  sql += '    CREATE POLICY "Public insert submissions" ON public.submissions FOR INSERT TO anon, authenticated WITH CHECK (true);\n';
  sql += '  END IF;\n';
  sql += 'END $$;\n\n';

  sql += '-- Ensure clean slate for video/player data (all matches/videos entered by user)\n';
  sql += 'DELETE FROM public.match_games;\n';
  sql += 'DELETE FROM public.streamed_matches;\n\n';

  sql += '-- ==========================================\n';
  sql += '-- 2. Seed Deck Archetypes (Fetched from Limitless API)\n';
  sql += '-- ==========================================\n';
  sql += 'INSERT INTO public.deck_archetypes (identifier, name, icons, priority, cards, variants)\nVALUES\n';

  const escapeSql = (str: string) => (str ? str.replace(/'/g, "''") : '');

  sql +=
    validDecks
      .map((d) => {
        const iconsJson = escapeSql(JSON.stringify(d.icons || []));
        const cardsJson = escapeSql(JSON.stringify(d.cards || []));
        const variantsJson = escapeSql(JSON.stringify(d.variants || []));
        return `  ('${escapeSql(d.identifier)}', '${escapeSql(d.name)}', '${iconsJson}'::jsonb, ${d.priority || 10}, '${cardsJson}'::jsonb, '${variantsJson}'::jsonb)`;
      })
      .join(',\n') +
    '\nON CONFLICT (identifier) DO UPDATE SET\n  name = EXCLUDED.name,\n  icons = EXCLUDED.icons,\n  priority = EXCLUDED.priority,\n  cards = EXCLUDED.cards,\n  variants = EXCLUDED.variants;\n\n';

  sql += '-- ==========================================\n';
  sql += '-- 3. Seed Tournaments (Fetched from PokeData API)\n';
  sql += '-- ==========================================\n';
  sql += 'INSERT INTO public.tournaments (id, name, season, start_date, end_date, rk9_link, decklists_count, total_players, status)\nVALUES\n';

  sql +=
    validTournaments
      .map((t) => {
        const sDate = t.start_date ? `'${escapeSql(t.start_date)}'` : 'NULL';
        const eDate = t.end_date ? `'${escapeSql(t.end_date)}'` : 'NULL';
        return `  ('${escapeSql(t.id)}', '${escapeSql(t.name)}', ${t.season ? `'${escapeSql(t.season)}'` : 'NULL'}, ${sDate}, ${eDate}, ${t.rk9_link ? `'${escapeSql(t.rk9_link)}'` : 'NULL'}, ${t.decklists_count || 0}, ${t.total_players || 0}, '${escapeSql(t.status || 'finished')}')`;
      })
      .join(',\n') +
    '\nON CONFLICT (id) DO UPDATE SET\n  name = EXCLUDED.name,\n  season = EXCLUDED.season,\n  start_date = EXCLUDED.start_date,\n  end_date = EXCLUDED.end_date,\n  rk9_link = EXCLUDED.rk9_link,\n  decklists_count = EXCLUDED.decklists_count,\n  total_players = EXCLUDED.total_players,\n  status = EXCLUDED.status;\n';

  const seedSqlPath = path.join(__dirname, '../supabase/seed.sql');
  fs.writeFileSync(seedSqlPath, sql);
  console.log(`✓ Wrote ${validTournaments.length} tournaments and ${validDecks.length} archetypes to ${seedSqlPath}`);

  // 4. If Supabase credentials are present, attempt direct database sync
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    console.log('4. Connecting directly to Supabase to upsert API data...');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Upsert archetypes in batches of 100
    console.log('   Syncing deck archetypes in batches...');
    for (let i = 0; i < validDecks.length; i += 100) {
      const batch = validDecks.slice(i, i + 100).map((d) => ({
        identifier: d.identifier,
        name: d.name,
        icons: d.icons || [],
        priority: d.priority || 10,
        cards: d.cards || [],
        variants: d.variants || [],
      }));

      const { error } = await supabase.from('deck_archetypes').upsert(batch, { onConflict: 'identifier' });
      if (error) {
        console.warn(`   Archetypes batch ${i / 100 + 1} note/error:`, error.message);
        break;
      }
    }
    console.log(`   ✓ Synced deck archetypes.`);

    // Upsert tournaments
    console.log('   Syncing tournaments...');
    const tournamentBatch = validTournaments.map((t) => ({
      id: t.id,
      name: t.name,
      season: t.season || null,
      start_date: t.start_date,
      end_date: t.end_date,
      rk9_link: t.rk9_link || null,
      decklists_count: t.decklists_count || 0,
      total_players: t.total_players || 0,
      status: t.status || 'finished',
    }));

    const { error: tErr } = await supabase.from('tournaments').upsert(tournamentBatch, { onConflict: 'id' });
    if (tErr) {
      console.warn('   Tournaments upsert note/error:', tErr.message);
    } else {
      console.log(`   ✓ Synced ${validTournaments.length} tournaments directly to Supabase.`);
    }

    // Clean any dummy matches / games from database
    console.log('   Ensuring streamed_matches & match_games are clean for user entry...');
    const { error: mErr } = await supabase.from('streamed_matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (mErr) {
      console.warn('   Match cleanup note:', mErr.message);
    } else {
      console.log('   ✓ Cleared match records from Supabase.');
    }
  } else {
    console.log('Supabase credentials not configured in environment; run supabase/seed.sql in your Supabase SQL editor.');
  }

  console.log('=== Database Seeding Complete! ===');
}

main().catch(console.error);
