import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

/**
 * Robust CSV Line Parser that handles quoted values with commas
 */
function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}

/**
 * Converts HH:MM:SS, MM:SS, or raw seconds string into integer seconds
 */
function parseTimestampToSeconds(val?: string | null): number | null {
  if (!val || !val.trim()) return null;
  const cleaned = val.trim();

  // If already pure integer
  if (/^\d+$/.test(cleaned)) {
    return parseInt(cleaned, 10);
  }

  // If HH:MM:SS or MM:SS
  const parts = cleaned.split(':').map((p) => parseInt(p, 10));
  if (parts.some(isNaN)) return null;

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    return parts[0];
  }
  return null;
}

/**
 * Extracts 11-char YouTube Video ID from standard URLs
 */
function extractYouTubeVideoId(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  return match ? match[1] : null;
}

function escapeSql(str?: string | null): string {
  if (!str) return '';
  return str.replace(/'/g, "''");
}

function main() {
  const args = process.argv.slice(2);
  const inputCsvPath = path.resolve(
    process.cwd(),
    args[0] || (fs.existsSync('matches.csv') ? 'matches.csv' : 'matches_template.csv')
  );
  const outputSqlPath = path.resolve(
    process.cwd(),
    args[1] || 'supabase/matches_import.sql'
  );

  console.log('=== CSV to Supabase SQL Converter ===');
  console.log(`Reading CSV from: ${inputCsvPath}`);

  if (!fs.existsSync(inputCsvPath)) {
    console.error(`Error: File not found: ${inputCsvPath}`);
    console.log('Usage: npm run csv-to-sql [path/to/matches.csv] [path/to/output.sql]');
    process.exit(1);
  }

  const fileContent = fs.readFileSync(inputCsvPath, 'utf-8');
  const lines = fileContent.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    console.error('Error: CSV file must contain a header row and at least one data row.');
    process.exit(1);
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'));
  console.log(`Parsed headers: ${headers.join(', ')}`);

  const matchInserts: string[] = [];
  const gameInserts: string[] = [];

  let rowCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const rowValues = parseCsvLine(lines[i]);
    if (rowValues.length === 0 || (rowValues.length === 1 && !rowValues[0])) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = rowValues[idx] || '';
    });

    const tournamentId = row['tournament_id'];
    const roundName = row['round_name'] || 'Swiss Round';
    const division = row['division'] || 'masters';
    const tableNumber = row['table_number'] ? parseInt(row['table_number'], 10) : null;

    const p1Name = row['player1_name'];
    const p1Country = row['player1_country'] || null;
    const p1Archetype = row['player1_deck_archetype'] || null;

    const p2Name = row['player2_name'];
    const p2Country = row['player2_country'] || null;
    const p2Archetype = row['player2_deck_archetype'] || null;

    const youtubeUrl = row['youtube_url'];
    const videoId = row['youtube_video_id'] || extractYouTubeVideoId(youtubeUrl);

    const startSeconds =
      parseTimestampToSeconds(row['match_start_time'] || row['match_start_seconds']) ?? 0;
    const endSeconds = parseTimestampToSeconds(
      row['match_end_time'] || row['match_end_seconds']
    );

    const winnerName = row['winner_player_name'] || null;
    const matchScore = row['match_score'] || null;

    if (!tournamentId || !p1Name || !p2Name || !youtubeUrl || !videoId) {
      console.warn(
        `Row ${i + 1} skipped: Missing mandatory fields (tournament_id, player1_name, player2_name, or valid youtube_url)`
      );
      continue;
    }

    // Generate UUID per match row so match_games can reference it
    const matchId = randomUUID();

    const matchRowSql = `  ('${matchId}', '${escapeSql(tournamentId)}', '${escapeSql(roundName)}', '${escapeSql(division)}', ${tableNumber !== null ? tableNumber : 'NULL'}, '${escapeSql(p1Name)}', ${p1Country ? `'${escapeSql(p1Country)}'` : 'NULL'}, ${p1Archetype ? `'${escapeSql(p1Archetype)}'` : 'NULL'}, '${escapeSql(p2Name)}', ${p2Country ? `'${escapeSql(p2Country)}'` : 'NULL'}, ${p2Archetype ? `'${escapeSql(p2Archetype)}'` : 'NULL'}, '${escapeSql(youtubeUrl)}', '${escapeSql(videoId)}', ${startSeconds}, ${endSeconds !== null ? endSeconds : 'NULL'}, ${winnerName ? `'${escapeSql(winnerName)}'` : 'NULL'}, ${matchScore ? `'${escapeSql(matchScore)}'` : 'NULL'}, TRUE)`;

    matchInserts.push(matchRowSql);

    // Optional per-game timestamps (Game 1, Game 2, Game 3)
    const g1Time = parseTimestampToSeconds(row['game1_start_time'] || row['game1_start_seconds']);
    const g2Time = parseTimestampToSeconds(row['game2_start_time'] || row['game2_start_seconds']);
    const g3Time = parseTimestampToSeconds(row['game3_start_time'] || row['game3_start_seconds']);

    if (g1Time !== null) {
      gameInserts.push(`  ('${matchId}', 1, ${g1Time})`);
    }
    if (g2Time !== null) {
      gameInserts.push(`  ('${matchId}', 2, ${g2Time})`);
    }
    if (g3Time !== null) {
      gameInserts.push(`  ('${matchId}', 3, ${g3Time})`);
    }

    rowCount++;
  }

  if (matchInserts.length === 0) {
    console.error('No valid matches found to convert.');
    process.exit(1);
  }

  let sql = '-- ==============================================================================\n';
  sql += `-- Stream Matches & Games Import Script (Generated from ${path.basename(inputCsvPath)})\n`;
  sql += `-- Matches: ${rowCount} | Individual Games: ${gameInserts.length}\n`;
  sql += '-- Run this script in your Supabase SQL Editor.\n';
  sql += '-- ==============================================================================\n\n';

  sql += '-- Optional: Clear existing stream matches and games before importing new batch\n';
  sql += 'TRUNCATE TABLE public.match_games, public.streamed_matches CASCADE;\n\n';

  sql += '-- 1. Insert Stream Matches\n';
  sql += 'INSERT INTO public.streamed_matches (\n';
  sql += '  id,\n';
  sql += '  tournament_id,\n';
  sql += '  round_name,\n';
  sql += '  division,\n';
  sql += '  table_number,\n';
  sql += '  player1_name,\n';
  sql += '  player1_country,\n';
  sql += '  player1_deck_archetype,\n';
  sql += '  player2_name,\n';
  sql += '  player2_country,\n';
  sql += '  player2_deck_archetype,\n';
  sql += '  youtube_url,\n';
  sql += '  youtube_video_id,\n';
  sql += '  match_start_seconds,\n';
  sql += '  match_end_seconds,\n';
  sql += '  winner_player_name,\n';
  sql += '  match_score,\n';
  sql += '  is_published\n';
  sql += ')\nVALUES\n';
  sql += matchInserts.join(',\n') + ';\n\n';

  if (gameInserts.length > 0) {
    sql += '-- 2. Insert Game Timestamps (Game 1, Game 2, Game 3)\n';
    sql += 'INSERT INTO public.match_games (\n';
    sql += '  match_id,\n';
    sql += '  game_number,\n';
    sql += '  start_seconds\n';
    sql += ')\nVALUES\n';
    sql += gameInserts.join(',\n') + ';\n\n';
  }

  fs.mkdirSync(path.dirname(outputSqlPath), { recursive: true });
  fs.writeFileSync(outputSqlPath, sql);

  console.log(`✓ Successfully converted ${rowCount} matches and ${gameInserts.length} game timestamps!`);
  console.log(`✓ Output SQL written to: ${outputSqlPath}`);
  console.log('\nYou can now copy the contents of that file and run it in Supabase SQL Editor.');
}

main();
