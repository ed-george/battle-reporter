import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  fetchGoogleSheetCsv,
  parseCsvText,
  parseMatchesFromRows,
  generateImportSql,
  ParsedMatchRow,
  ParsedGameRow,
} from '../src/lib/ingestion';

// Load .env.local if present
try {
  process.loadEnvFile?.('.env.local');
} catch {
  // Ignore if already loaded
}

interface CliOptions {
  sheetUrlOrId?: string;
  outputSqlPath: string;
  gid?: string;
  sheetName?: string;
  credentialsPath?: string;
  accessToken?: string;
  directInsert: boolean;
  dryRun: boolean;
  append: boolean;
}

function parseCliArgs(): CliOptions {
  const args = process.argv.slice(2);

  let sheetUrlOrId = process.env.GOOGLE_SHEET_URL || process.env.GOOGLE_SHEET_ID;
  let outputSqlPath = 'supabase/matches_import.sql';
  let gid = process.env.GOOGLE_SHEET_GID;
  let sheetName = process.env.GOOGLE_SHEET_NAME;
  let credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  let accessToken = process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
  let directInsert = false;
  let dryRun = false;
  let append = false;

  const positional: string[] = [];

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg === '--direct' || arg === '--db') {
      directInsert = true;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--append') {
      append = true;
    } else if (arg.startsWith('--gid=')) {
      gid = arg.split('=')[1];
    } else if (arg.startsWith('--sheet=')) {
      sheetName = arg.split('=')[1];
    } else if (arg.startsWith('--output=')) {
      outputSqlPath = arg.split('=')[1];
    } else if (arg.startsWith('--credentials=')) {
      credentialsPath = arg.split('=')[1];
    } else if (arg.startsWith('--token=')) {
      accessToken = arg.split('=')[1];
    } else if (!arg.startsWith('--')) {
      positional.push(arg);
    }
  }

  if (positional[0]) {
    sheetUrlOrId = positional[0];
  }
  if (positional[1]) {
    outputSqlPath = positional[1];
  }

  return {
    sheetUrlOrId,
    outputSqlPath: path.resolve(process.cwd(), outputSqlPath),
    gid,
    sheetName,
    credentialsPath,
    accessToken,
    directInsert,
    dryRun,
    append,
  };
}

function printHelp() {
  console.log(`
=== Google Sheets Ingestion Pipeline ===

Ingests Pokémon TCG broadcast stream matches directly from a Google Sheet.
Outputs clean SQL (identical to csv-to-sql) and can optionally insert directly into Supabase.

Usage:
  npm run sheets-to-sql [SHEET_URL_OR_ID] [OUTPUT_SQL_PATH] [OPTIONS]
  npm run ingest-sheets [SHEET_URL_OR_ID] [OPTIONS]

Arguments:
  SHEET_URL_OR_ID      Full Google Sheet URL or Spreadsheet ID
                       (Defaults to GOOGLE_SHEET_URL or GOOGLE_SHEET_ID from .env.local)
  OUTPUT_SQL_PATH      Path to write SQL file (Default: supabase/matches_import.sql)

Options:
  --direct, --db       Directly insert/upsert records into Supabase database
  --append             In direct mode, append without truncating existing matches
  --sheet=<name>       Target sheet/tab name
  --gid=<id>           Target sheet gid (tab id)
  --output=<path>      Specify output SQL file path
  --credentials=<path> Path to Google Service Account JSON key file
  --token=<token>      Bearer OAuth access token for private sheet
  --dry-run            Parse and validate without writing files or mutating database
  -h, --help           Show this help message

Environment Variables (.env.local):
  GOOGLE_SHEET_URL              Default Google Sheet URL
  GOOGLE_SHEET_ID               Default Spreadsheet ID
  GOOGLE_SHEET_GID              Default GID tab identifier
  GOOGLE_APPLICATION_CREDENTIALS Path to Service Account JSON key file
  GOOGLE_SERVICE_ACCOUNT_EMAIL  Service Account client email
  GOOGLE_PRIVATE_KEY            Service Account private key PEM
  GOOGLE_OAUTH_ACCESS_TOKEN     Direct OAuth access token
  GOOGLE_SHEETS_API_KEY         Optional Google Sheets API Key
  SUPABASE_SERVICE_ROLE_KEY     Supabase Service Role Key (for --direct mode)
  NEXT_PUBLIC_SUPABASE_URL      Supabase Project URL

Examples:
  # Ingest from URL and generate SQL
  npm run sheets-to-sql "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0"

  # Ingest using configured GOOGLE_SHEET_URL from .env.local
  npm run sheets-to-sql

  # Ingest and directly write to Supabase database
  npm run ingest-sheets --direct
`);
}

async function directInsertToSupabase(
  matches: ParsedMatchRow[],
  games: ParsedGameRow[],
  append: boolean
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      'Cannot perform direct database insert: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in environment/.env.local.'
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`\nConnecting to Supabase at: ${supabaseUrl}...`);

  if (!append) {
    console.log('Clearing existing matches and games before importing new batch...');
    const { error: delGamesErr } = await supabase.from('match_games').delete().neq('match_id', '00000000-0000-0000-0000-000000000000');
    if (delGamesErr) {
      console.warn(`Note on clearing match_games: ${delGamesErr.message}`);
    }
    const { error: delMatchesErr } = await supabase.from('streamed_matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (delMatchesErr) {
      console.warn(`Note on clearing streamed_matches: ${delMatchesErr.message}`);
    }
  }

  // Insert matches in batches of 50
  console.log(`Inserting ${matches.length} matches into streamed_matches table...`);
  const MATCH_BATCH_SIZE = 50;
  for (let i = 0; i < matches.length; i += MATCH_BATCH_SIZE) {
    const batch = matches.slice(i, i + MATCH_BATCH_SIZE);
    const { error } = await supabase.from('streamed_matches').upsert(batch, { onConflict: 'id' });
    if (error) {
      throw new Error(`Failed to insert matches batch [${i}..${i + batch.length}]: ${error.message}`);
    }
  }
  console.log(`✓ Successfully inserted ${matches.length} matches.`);

  // Insert games in batches of 100
  if (games.length > 0) {
    console.log(`Inserting ${games.length} individual game timestamps into match_games table...`);
    const GAME_BATCH_SIZE = 100;
    for (let i = 0; i < games.length; i += GAME_BATCH_SIZE) {
      const batch = games.slice(i, i + GAME_BATCH_SIZE);
      const { error } = await supabase.from('match_games').upsert(batch, { onConflict: 'match_id,game_number' });
      if (error) {
        throw new Error(`Failed to insert games batch [${i}..${i + batch.length}]: ${error.message}`);
      }
    }
    console.log(`✓ Successfully inserted ${games.length} individual games.`);
  }
}

async function main() {
  const options = parseCliArgs();

  console.log('====================================================');
  console.log('      Pokémon TCG Google Sheets Ingestion Pipeline  ');
  console.log('====================================================');

  if (!options.sheetUrlOrId) {
    console.error('\nError: No Google Sheet URL or ID provided.');
    console.error('Please pass a URL as an argument, or set GOOGLE_SHEET_URL in .env.local.');
    console.log('\nExample:');
    console.log('  npm run sheets-to-sql "https://docs.google.com/spreadsheets/d/.../edit#gid=0"');
    console.log('\nRun "npm run sheets-to-sql --help" for all available options.\n');
    process.exit(1);
  }

  console.log(`1. Target Sheet: ${options.sheetUrlOrId}`);
  if (options.gid) console.log(`   Tab GID: ${options.gid}`);
  if (options.sheetName) console.log(`   Sheet Name: ${options.sheetName}`);

  // 1. Fetch CSV directly from Google Sheets
  console.log('\n2. Fetching CSV directly from Google Sheets...');
  let csvText: string;
  try {
    csvText = await fetchGoogleSheetCsv({
      urlOrId: options.sheetUrlOrId,
      gid: options.gid,
      sheetName: options.sheetName,
      apiKey: process.env.GOOGLE_SHEETS_API_KEY,
      credentialsPath: options.credentialsPath,
      accessToken: options.accessToken,
    });
    console.log(`✓ Successfully retrieved ${csvText.length} bytes of CSV data.`);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error(`\n❌ Ingestion Failed: ${error.message}`);
    process.exit(1);
  }

  // 2. Parse CSV
  console.log('\n3. Parsing spreadsheet rows & headers...');
  let headers: string[];
  let rows: Record<string, string>[];
  try {
    const parsed = parseCsvText(csvText);
    headers = parsed.headers;
    rows = parsed.rows;
    console.log(`✓ Headers found (${headers.length}): ${headers.slice(0, 8).join(', ')}...`);
    console.log(`✓ Found ${rows.length} total data rows.`);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error(`\n❌ CSV Parsing Error: ${error.message}`);
    process.exit(1);
  }

  // 3. Process into typed Match and Game records
  console.log('\n4. Validating and transforming matches...');
  const result = parseMatchesFromRows(rows);

  if (result.skipped.length > 0) {
    console.warn(`\n⚠ Skipped ${result.skipped.length} invalid/empty rows:`);
    result.skipped.slice(0, 10).forEach((s) => {
      console.warn(`  - Row ${s.rowNumber}: ${s.reason}`);
    });
    if (result.skipped.length > 10) {
      console.warn(`  ...and ${result.skipped.length - 10} more skipped rows.`);
    }
  }

  if (result.warnings.length > 0) {
    console.warn(`\n⚠ Archetype Registry Warnings (${result.warnings.length}):`);
    result.warnings.slice(0, 10).forEach((w) => console.warn(`  - ${w}`));
    if (result.warnings.length > 10) {
      console.warn(`  ...and ${result.warnings.length - 10} more warnings.`);
    }
  }

  if (result.matches.length === 0) {
    console.error('\n❌ Error: No valid matches found in Google Sheet to import.');
    process.exit(1);
  }

  console.log(`\n✓ Valid matches ready to ingest: ${result.matches.length}`);
  console.log(`✓ Individual game timestamps ready: ${result.games.length}`);

  if (options.dryRun) {
    console.log('\n[Dry Run] Skipping file write and database insertion.');
    console.log('✓ Validation passed completely.');
    return;
  }

  // 4. Generate SQL Output (Identical to CSV step)
  console.log('\n5. Generating Supabase SQL file...');
  const sql = generateImportSql(
    result.matches,
    result.games,
    `Google Sheet (${options.sheetUrlOrId})`
  );

  fs.mkdirSync(path.dirname(options.outputSqlPath), { recursive: true });
  fs.writeFileSync(options.outputSqlPath, sql);
  console.log(`✓ Output SQL written to: ${options.outputSqlPath}`);

  // 5. Direct Supabase Ingestion (Optional)
  if (options.directInsert) {
    console.log('\n6. Executing direct database ingestion to Supabase...');
    try {
      await directInsertToSupabase(result.matches, result.games, options.append);
      console.log('✓ Direct database import complete!');
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error(`\n❌ Direct Supabase Insert Failed: ${error.message}`);
      console.log('Note: You can still run the generated SQL file directly in the Supabase SQL Editor.');
      process.exit(1);
    }
  } else {
    console.log('\n----------------------------------------------------');
    console.log('Next Steps:');
    console.log(`1. Copy ${path.relative(process.cwd(), options.outputSqlPath)} into your Supabase SQL Editor.`);
    console.log('2. Or run with --direct to insert straight into your Supabase database:');
    console.log('   npm run sheets-to-sql --direct');
    console.log('----------------------------------------------------');
  }

  console.log('\n🎉 Pipeline completed successfully!\n');
}

main().catch((err) => {
  console.error('Fatal pipeline error:', err);
  process.exit(1);
});
