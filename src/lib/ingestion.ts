import { randomUUID } from 'crypto';
import { LIMITLESS_ARCHETYPES } from './limitless';

export interface ParsedMatchRow {
  id: string;
  tournament_id: string;
  round_name: string;
  division: string;
  table_number: number | null;
  player1_name: string;
  player1_country: string | null;
  player1_deck_archetype: string | null;
  player2_name: string;
  player2_country: string | null;
  player2_deck_archetype: string | null;
  youtube_url: string;
  youtube_video_id: string;
  match_start_seconds: number;
  match_end_seconds: number | null;
  winner_player_name: string | null;
  match_score: string | null;
  is_published: boolean;
}

export interface ParsedGameRow {
  match_id: string;
  game_number: number;
  start_seconds: number;
}

export interface ParseResult {
  matches: ParsedMatchRow[];
  games: ParsedGameRow[];
  warnings: string[];
  skipped: { rowNumber: number; reason: string; row: Record<string, string> }[];
  totalRows: number;
}

export interface GoogleSheetFetchOptions {
  urlOrId: string;
  gid?: string | number | null;
  sheetName?: string | null;
  apiKey?: string | null;
}

/**
 * Robust CSV Line Parser that handles quoted values with embedded commas and quotes
 */
export function parseCsvLine(text: string): string[] {
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
export function parseTimestampToSeconds(val?: string | null): number | null {
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
export function extractYouTubeVideoId(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  return match ? match[1] : null;
}

/**
 * Escape single quotes for SQL insertion
 */
export function escapeSql(str?: string | null): string {
  if (!str) return '';
  return str.replace(/'/g, "''");
}

/**
 * Parse full CSV text into headers and array of row records
 */
export function parseCsvText(fileContent: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const lines = fileContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('CSV data must contain a header row and at least one data row.');
  }

  const headers = parseCsvLine(lines[0]).map((h) =>
    h.toLowerCase().trim().replace(/[\s-]+/g, '_').replace(/[^\w_]/g, '')
  );

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && !values[0])) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] !== undefined ? values[idx].trim() : '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

/**
 * Parse raw rows (from CSV or Google Sheet) into strongly typed Match and Game records
 */
export function parseMatchesFromRows(rows: Record<string, string>[]): ParseResult {
  const matches: ParsedMatchRow[] = [];
  const games: ParsedGameRow[] = [];
  const warnings: string[] = [];
  const skipped: { rowNumber: number; reason: string; row: Record<string, string> }[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // Accounting for 1-based index and header row

    const tournamentId = row['tournament_id'];
    const roundName = row['round_name'] || 'Swiss Round';
    const division = (row['division'] || 'masters').toLowerCase();
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

    // Validation of mandatory fields
    if (!tournamentId) {
      skipped.push({ rowNumber, reason: 'Missing tournament_id', row });
      return;
    }
    if (!p1Name || !p2Name) {
      skipped.push({ rowNumber, reason: 'Missing player1_name or player2_name', row });
      return;
    }
    if (!youtubeUrl || !videoId) {
      skipped.push({ rowNumber, reason: 'Missing or invalid youtube_url', row });
      return;
    }

    // Archetype checks (non-fatal warning for typos)
    if (p1Archetype && !LIMITLESS_ARCHETYPES[p1Archetype]) {
      warnings.push(
        `Row ${rowNumber}: Player 1 archetype "${p1Archetype}" was not found in official Limitless TCG registry.`
      );
    }
    if (p2Archetype && !LIMITLESS_ARCHETYPES[p2Archetype]) {
      warnings.push(
        `Row ${rowNumber}: Player 2 archetype "${p2Archetype}" was not found in official Limitless TCG registry.`
      );
    }

    const matchId = randomUUID();

    matches.push({
      id: matchId,
      tournament_id: tournamentId,
      round_name: roundName,
      division,
      table_number: isNaN(Number(tableNumber)) ? null : tableNumber,
      player1_name: p1Name,
      player1_country: p1Country,
      player1_deck_archetype: p1Archetype,
      player2_name: p2Name,
      player2_country: p2Country,
      player2_deck_archetype: p2Archetype,
      youtube_url: youtubeUrl,
      youtube_video_id: videoId,
      match_start_seconds: startSeconds,
      match_end_seconds: endSeconds,
      winner_player_name: winnerName,
      match_score: matchScore,
      is_published: true,
    });

    // Optional per-game timestamps (Game 1, Game 2, Game 3)
    const g1Time = parseTimestampToSeconds(row['game1_start_time'] || row['game1_start_seconds']);
    const g2Time = parseTimestampToSeconds(row['game2_start_time'] || row['game2_start_seconds']);
    const g3Time = parseTimestampToSeconds(row['game3_start_time'] || row['game3_start_seconds']);

    if (g1Time !== null) {
      games.push({ match_id: matchId, game_number: 1, start_seconds: g1Time });
    }
    if (g2Time !== null) {
      games.push({ match_id: matchId, game_number: 2, start_seconds: g2Time });
    }
    if (g3Time !== null) {
      games.push({ match_id: matchId, game_number: 3, start_seconds: g3Time });
    }
  });

  return {
    matches,
    games,
    warnings,
    skipped,
    totalRows: rows.length,
  };
}

/**
 * Generate Supabase import SQL from parsed matches and games
 */
export function generateImportSql(
  matches: ParsedMatchRow[],
  games: ParsedGameRow[],
  sourceLabel: string = 'Import'
): string {
  const matchInserts = matches.map((m) => {
    return `  ('${m.id}', '${escapeSql(m.tournament_id)}', '${escapeSql(m.round_name)}', '${escapeSql(m.division)}', ${m.table_number !== null ? m.table_number : 'NULL'}, '${escapeSql(m.player1_name)}', ${m.player1_country ? `'${escapeSql(m.player1_country)}'` : 'NULL'}, ${m.player1_deck_archetype ? `'${escapeSql(m.player1_deck_archetype)}'` : 'NULL'}, '${escapeSql(m.player2_name)}', ${m.player2_country ? `'${escapeSql(m.player2_country)}'` : 'NULL'}, ${m.player2_deck_archetype ? `'${escapeSql(m.player2_deck_archetype)}'` : 'NULL'}, '${escapeSql(m.youtube_url)}', '${escapeSql(m.youtube_video_id)}', ${m.match_start_seconds}, ${m.match_end_seconds !== null ? m.match_end_seconds : 'NULL'}, ${m.winner_player_name ? `'${escapeSql(m.winner_player_name)}'` : 'NULL'}, ${m.match_score ? `'${escapeSql(m.match_score)}'` : 'NULL'}, TRUE)`;
  });

  const gameInserts = games.map((g) => {
    return `  ('${g.match_id}', ${g.game_number}, ${g.start_seconds})`;
  });

  let sql = '-- ==============================================================================\n';
  sql += `-- Stream Matches & Games Import Script (Generated from ${sourceLabel})\n`;
  sql += `-- Matches: ${matches.length} | Individual Games: ${games.length}\n`;
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

  return sql;
}

/**
 * Extracts spreadsheet ID and optional GID from Google Sheets URL
 */
export function parseGoogleSheetUrl(
  input: string,
  options?: { gid?: string | number | null; sheetName?: string | null }
): {
  spreadsheetId: string;
  isPublished: boolean;
  gid: string | null;
  sheetName: string | null;
} {
  const trimmed = input.trim();

  let spreadsheetId = '';
  let isPublished = false;
  let gid: string | null = options?.gid !== undefined && options?.gid !== null ? String(options.gid) : null;
  const sheetName: string | null = options?.sheetName || null;

  // Check if it's a published web URL: /d/e/2PACX-.../pub...
  const pubMatch = trimmed.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/);
  if (pubMatch) {
    spreadsheetId = pubMatch[1];
    isPublished = true;
  } else {
    // Standard edit URL: /spreadsheets/d/([a-zA-Z0-9-_]+)
    const stdMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (stdMatch) {
      spreadsheetId = stdMatch[1];
    } else if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
      // Direct spreadsheet ID without URL prefix
      spreadsheetId = trimmed;
    }
  }

  if (!spreadsheetId) {
    throw new Error(
      `Invalid Google Sheet URL or ID: "${input}". Please provide a full Google Sheets URL or valid spreadsheet ID.`
    );
  }

  // Extract GID from URL if not already provided
  if (!gid) {
    const gidMatch = trimmed.match(/[?&#]gid=([0-9]+)/);
    if (gidMatch) {
      gid = gidMatch[1];
    }
  }

  return { spreadsheetId, isPublished, gid, sheetName };
}

/**
 * Fetches CSV data directly from Google Sheets via HTTP export endpoints or Sheets API
 */
export async function fetchGoogleSheetCsv(options: GoogleSheetFetchOptions): Promise<string> {
  const { spreadsheetId, isPublished, gid, sheetName } = parseGoogleSheetUrl(
    options.urlOrId,
    { gid: options.gid, sheetName: options.sheetName }
  );

  // If Google Sheets API Key is provided and not a published sheet, we can use the v4 API
  if (options.apiKey && !isPublished) {
    try {
      const range = sheetName ? encodeURIComponent(sheetName) : 'A:Z';
      const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${options.apiKey}`;
      const res = await fetch(apiUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.values && Array.isArray(data.values) && data.values.length > 0) {
          // Convert 2D array to CSV text
          return data.values
            .map((row: (string | number | null | undefined)[]) =>
              row
                .map((cell) => {
                  const str = cell !== undefined && cell !== null ? String(cell) : '';
                  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                  }
                  return str;
                })
                .join(',')
            )
            .join('\n');
        }
      }
    } catch {
      // Fall through to public export endpoints
    }
  }

  // Build candidate CSV export URLs
  const candidateUrls: string[] = [];

  if (isPublished) {
    candidateUrls.push(
      `https://docs.google.com/spreadsheets/d/e/${spreadsheetId}/pub?output=csv${
        gid ? `&gid=${gid}` : ''
      }`
    );
  } else {
    // 1. Google Visualization CSV export (handles both gid and sheet name)
    const gvizParams = new URLSearchParams({ tqx: 'out:csv' });
    if (gid) gvizParams.set('gid', gid);
    if (sheetName) gvizParams.set('sheet', sheetName);
    candidateUrls.push(
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?${gvizParams.toString()}`
    );

    // 2. Standard export endpoint
    const exportParams = new URLSearchParams({ format: 'csv' });
    if (gid) exportParams.set('gid', gid);
    candidateUrls.push(
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?${exportParams.toString()}`
    );
  }

  let lastError: Error | null = null;

  for (const url of candidateUrls) {
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'text/csv, text/plain, */*',
          'User-Agent': 'BattleReporter-IngestionPipeline/1.0',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        continue;
      }

      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();

      // Check if Google returned an HTML page (e.g. login/permission screen) instead of CSV
      const trimmed = text.trim();
      if (
        contentType.includes('text/html') ||
        trimmed.startsWith('<!DOCTYPE html') ||
        trimmed.startsWith('<html')
      ) {
        throw new Error(
          'Google Sheet returned an HTML login page instead of CSV data.\n' +
            'This means the spreadsheet is currently private.\n\n' +
            'To resolve this:\n' +
            '1. Open the Google Sheet\n' +
            '2. Click "Share" (top-right)\n' +
            '3. Under General access, change to "Anyone with the link" as "Viewer"\n' +
            '4. Alternatively, use File -> Share -> Publish to web -> select CSV format'
        );
      }

      return text;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (lastError.message.includes('Google Sheet returned an HTML login page')) {
        throw lastError;
      }
    }
  }

  throw (
    lastError ||
    new Error(
      `Failed to download CSV from Google Sheet ID: ${spreadsheetId}. Please check the URL and permissions.`
    )
  );
}
