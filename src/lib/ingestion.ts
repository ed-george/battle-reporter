import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
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
  id?: string;
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
  serviceAccountEmail?: string | null;
  privateKey?: string | null;
  credentialsPath?: string | null;
  accessToken?: string | null;
}

/**
 * Generates a deterministic RFC 4122 UUID (version 5 variant) from an input string using SHA-256.
 * Output is formatted as 8-4-4-4-12 hex characters.
 */
export function generateDeterministicUuid(key: string, namespace: string = 'battle-reporter'): string {
  const hash = crypto.createHash('sha256').update(`${namespace}:${key}`).digest();
  const buf = Buffer.from(hash.subarray(0, 16));

  // Set RFC 4122 version 5 (0101xxxx in high nibble of byte 6)
  buf[6] = (buf[6] & 0x0f) | 0x50;
  // Set RFC 4122 variant (10xxxxxx in high 2 bits of byte 8)
  buf[8] = (buf[8] & 0x3f) | 0x80;

  return [
    buf.subarray(0, 4).toString('hex'),
    buf.subarray(4, 6).toString('hex'),
    buf.subarray(6, 8).toString('hex'),
    buf.subarray(8, 10).toString('hex'),
    buf.subarray(10, 16).toString('hex'),
  ].join('-');
}

/**
 * Builds a stable composite natural key for a streamed match to ensure reproducible deduplication.
 */
export function generateMatchNaturalKey(
  tournamentId: string,
  roundName: string,
  division: string,
  tableNumber: number | null,
  videoId: string,
  startSeconds: number
): string {
  const table = tableNumber !== null && !isNaN(tableNumber) ? tableNumber : 'na';
  return `${tournamentId}|${roundName}|${division}|${table}|${videoId}|${startSeconds}`;
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
    const rawTableNumber = row['table_number'] ? parseInt(row['table_number'], 10) : null;
    const tableNumber = rawTableNumber !== null && !isNaN(rawTableNumber) ? rawTableNumber : null;

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

    const naturalKey = generateMatchNaturalKey(
      tournamentId,
      roundName,
      division,
      tableNumber,
      videoId,
      startSeconds
    );
    const matchId = generateDeterministicUuid(naturalKey);

    matches.push({
      id: matchId,
      tournament_id: tournamentId,
      round_name: roundName,
      division,
      table_number: tableNumber,
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
      games.push({
        id: generateDeterministicUuid(`${matchId}|game|1`),
        match_id: matchId,
        game_number: 1,
        start_seconds: g1Time,
      });
    }
    if (g2Time !== null) {
      games.push({
        id: generateDeterministicUuid(`${matchId}|game|2`),
        match_id: matchId,
        game_number: 2,
        start_seconds: g2Time,
      });
    }
    if (g3Time !== null) {
      games.push({
        id: generateDeterministicUuid(`${matchId}|game|3`),
        match_id: matchId,
        game_number: 3,
        start_seconds: g3Time,
      });
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
  sql += '-- TRUNCATE TABLE public.match_games, public.streamed_matches CASCADE;\n\n';

  if (matches.length > 0) {
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
    sql += matchInserts.join(',\n') + '\n';
    sql += 'ON CONFLICT (id) DO UPDATE SET\n';
    sql += '  tournament_id = EXCLUDED.tournament_id,\n';
    sql += '  round_name = EXCLUDED.round_name,\n';
    sql += '  division = EXCLUDED.division,\n';
    sql += '  table_number = EXCLUDED.table_number,\n';
    sql += '  player1_name = EXCLUDED.player1_name,\n';
    sql += '  player1_country = EXCLUDED.player1_country,\n';
    sql += '  player1_deck_archetype = EXCLUDED.player1_deck_archetype,\n';
    sql += '  player2_name = EXCLUDED.player2_name,\n';
    sql += '  player2_country = EXCLUDED.player2_country,\n';
    sql += '  player2_deck_archetype = EXCLUDED.player2_deck_archetype,\n';
    sql += '  youtube_url = EXCLUDED.youtube_url,\n';
    sql += '  youtube_video_id = EXCLUDED.youtube_video_id,\n';
    sql += '  match_start_seconds = EXCLUDED.match_start_seconds,\n';
    sql += '  match_end_seconds = EXCLUDED.match_end_seconds,\n';
    sql += '  winner_player_name = EXCLUDED.winner_player_name,\n';
    sql += '  match_score = EXCLUDED.match_score,\n';
    sql += '  is_published = EXCLUDED.is_published;\n\n';
  }

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
 * Converts 2D array of sheet values into CSV string
 */
export function convertValuesToCsv(
  values: (string | number | boolean | null | undefined)[][]
): string {
  return values
    .map((row) =>
      row
        .map((cell) => {
          const str = cell !== undefined && cell !== null ? String(cell) : '';
          if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    )
    .join('\n');
}

/**
 * Resolves a Google OAuth 2.0 Access Token from:
 * 1. Direct Bearer access token (options.accessToken or GOOGLE_OAUTH_ACCESS_TOKEN)
 * 2. Service Account Key JSON file (options.credentialsPath or GOOGLE_APPLICATION_CREDENTIALS)
 * 3. Service Account Credentials via env (options.serviceAccountEmail/privateKey or GOOGLE_SERVICE_ACCOUNT_EMAIL/GOOGLE_PRIVATE_KEY)
 * 4. OAuth Refresh Token (GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_REFRESH_TOKEN)
 */
export async function getGoogleAccessToken(
  options?: Partial<GoogleSheetFetchOptions>
): Promise<string | null> {
  // 1. Direct Access Token
  const directToken = options?.accessToken || process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
  if (directToken) {
    return directToken.trim();
  }

  // 2. Service Account from JSON File
  let serviceEmail = options?.serviceAccountEmail || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = options?.privateKey || process.env.GOOGLE_PRIVATE_KEY;

  const credentialsPath =
    options?.credentialsPath || process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (credentialsPath && (!serviceEmail || !privateKey)) {
    const resolvedPath = path.resolve(/*turbopackIgnore: true*/ process.cwd(), credentialsPath);
    if (fs.existsSync(resolvedPath)) {
      try {
        const fileContent = fs.readFileSync(resolvedPath, 'utf-8');
        const creds = JSON.parse(fileContent);
        if (creds.client_email && creds.private_key) {
          serviceEmail = creds.client_email;
          privateKey = creds.private_key;
        }
      } catch (err) {
        console.warn(`Warning: Could not read Google credentials file at ${resolvedPath}:`, err);
      }
    }
  }

  // 3. Mint JWT using Service Account and exchange for Google OAuth access token
  if (serviceEmail && privateKey) {
    try {
      const now = Math.floor(Date.now() / 1000);
      const header = { alg: 'RS256', typ: 'JWT' };
      const claimSet = {
        iss: serviceEmail,
        scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now,
      };

      const base64UrlEncode = (obj: object) =>
        Buffer.from(JSON.stringify(obj))
          .toString('base64')
          .replace(/=/g, '')
          .replace(/\+/g, '-')
          .replace(/\//g, '_');

      const encodedHeader = base64UrlEncode(header);
      const encodedClaimSet = base64UrlEncode(claimSet);
      const signInput = `${encodedHeader}.${encodedClaimSet}`;

      const formattedKey = privateKey.replace(/\\n/g, '\n');
      const signer = crypto.createSign('RSA-SHA256');
      signer.update(signInput);
      signer.end();
      const signature = signer
        .sign(formattedKey)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

      const jwt = `${signInput}.${signature}`;

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
        }).toString(),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        throw new Error(`Google OAuth error (${tokenRes.status}): ${errText}`);
      }

      const tokenData = await tokenRes.json();
      if (tokenData.access_token) {
        return tokenData.access_token;
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.warn(`Warning: Failed to mint Google Service Account token: ${error.message}`);
    }
  }

  // 4. OAuth 2.0 User Refresh Token
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (clientId && clientSecret && refreshToken) {
    try {
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }).toString(),
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json();
        if (data.access_token) {
          return data.access_token;
        }
      }
    } catch (err) {
      console.warn('Warning: Failed to refresh Google OAuth token:', err);
    }
  }

  return null;
}

/**
 * Fetches CSV data directly from Google Sheets via HTTP export endpoints or Sheets API
 */
export async function fetchGoogleSheetCsv(options: GoogleSheetFetchOptions): Promise<string> {
  const { spreadsheetId, isPublished, gid, sheetName } = parseGoogleSheetUrl(
    options.urlOrId,
    { gid: options.gid, sheetName: options.sheetName }
  );

  // 1. Check for authenticated Access Token (Service Account or OAuth)
  const accessToken = await getGoogleAccessToken(options);

  if (accessToken && !isPublished) {
    try {
      // Determine the target sheet title
      let targetSheetName = sheetName;

      // If we don't have a sheet name, or if we need to resolve a gid to a sheet title
      if (!targetSheetName) {
        const metaRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (metaRes.ok) {
          const meta = await metaRes.json();
          if (Array.isArray(meta.sheets) && meta.sheets.length > 0) {
            if (gid) {
              interface SheetMeta {
                properties?: {
                  sheetId?: number | string;
                  title?: string;
                };
              }
              const matchedSheet = meta.sheets.find(
                (s: SheetMeta) => String(s.properties?.sheetId) === String(gid)
              );
              if (matchedSheet?.properties?.title) {
                targetSheetName = matchedSheet.properties.title;
              }
            }
            if (!targetSheetName && meta.sheets[0]?.properties?.title) {
              targetSheetName = meta.sheets[0].properties.title;
            }
          }
        }
      }

      // Fetch values using Sheets API v4
      const range = targetSheetName ? encodeURIComponent(targetSheetName) : 'A:Z';
      const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
      const dataRes = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (dataRes.ok) {
        const data = await dataRes.json();
        if (Array.isArray(data.values) && data.values.length > 0) {
          return convertValuesToCsv(data.values);
        }
      }
    } catch (err) {
      console.warn('Sheets API v4 values fetch failed, falling back to export endpoint:', err);
    }
  }

  // 2. If Google Sheets API Key is provided and not a published sheet, we can use the v4 API
  if (options.apiKey && !isPublished) {
    try {
      const range = sheetName ? encodeURIComponent(sheetName) : 'A:Z';
      const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${options.apiKey}`;
      const res = await fetch(apiUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.values && Array.isArray(data.values) && data.values.length > 0) {
          return convertValuesToCsv(data.values);
        }
      }
    } catch {
      // Fall through to public export endpoints
    }
  }

  // 3. Build candidate CSV export URLs
  const candidateUrls: string[] = [];

  if (isPublished) {
    candidateUrls.push(
      `https://docs.google.com/spreadsheets/d/e/${spreadsheetId}/pub?output=csv${
        gid ? `&gid=${gid}` : ''
      }`
    );
  } else {
    // Google Visualization CSV export (handles both gid and sheet name)
    const gvizParams = new URLSearchParams({ tqx: 'out:csv' });
    if (gid) gvizParams.set('gid', gid);
    if (sheetName) gvizParams.set('sheet', sheetName);
    candidateUrls.push(
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?${gvizParams.toString()}`
    );

    // Standard export endpoint
    const exportParams = new URLSearchParams({ format: 'csv' });
    if (gid) exportParams.set('gid', gid);
    candidateUrls.push(
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?${exportParams.toString()}`
    );
  }

  let lastError: Error | null = null;

  for (const url of candidateUrls) {
    try {
      const reqHeaders: Record<string, string> = {
        'Accept': 'text/csv, text/plain, */*',
        'User-Agent': 'BattleReporter-IngestionPipeline/1.0',
      };
      if (accessToken) {
        reqHeaders['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(url, {
        headers: reqHeaders,
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
            'This means the spreadsheet is private and not authorized.\n\n' +
            'To authorize access to this non-public Google Sheet:\n\n' +
            '1. Google Cloud Service Account (Recommended for automated pipelines):\n' +
            '   a) Create a Service Account in Google Cloud Console.\n' +
            '   b) In your private Google Sheet, click "Share" and add the Service Account email as "Viewer".\n' +
            '   c) In .env.local, set:\n' +
            '      GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account.json"\n' +
            '      OR\n' +
            '      GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account@project.iam.gserviceaccount.com"\n' +
            '      GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n..."\n\n' +
            '2. OAuth 2.0 User Credentials:\n' +
            '   Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in .env.local\n' +
            '   OR set temporary GOOGLE_OAUTH_ACCESS_TOKEN="ya29..."\n\n' +
            '3. Alternatively, share with "Anyone with the link" as "Viewer".'
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
