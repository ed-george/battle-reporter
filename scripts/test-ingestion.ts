import assert from 'assert';
import {
  parseGoogleSheetUrl,
  parseCsvText,
  parseTimestampToSeconds,
  extractYouTubeVideoId,
  parseMatchesFromRows,
  generateImportSql,
  convertValuesToCsv,
  getGoogleAccessToken,
  generateDeterministicUuid,
  generateMatchNaturalKey,
} from '../src/lib/ingestion';

console.log('--- Running Ingestion Engine Unit Tests ---');

// 1. Test parseTimestampToSeconds
assert.strictEqual(parseTimestampToSeconds('0:15:30'), 930);
assert.strictEqual(parseTimestampToSeconds('1:02:05'), 3725);
assert.strictEqual(parseTimestampToSeconds('45:10'), 2710);
assert.strictEqual(parseTimestampToSeconds('3600'), 3600);
assert.strictEqual(parseTimestampToSeconds(''), null);
assert.strictEqual(parseTimestampToSeconds(undefined), null);
assert.strictEqual(parseTimestampToSeconds('invalid'), null);
console.log('✓ parseTimestampToSeconds passed');

// 2. Test extractYouTubeVideoId
assert.strictEqual(
  extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
  'dQw4w9WgXcQ'
);
assert.strictEqual(
  extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ?t=120'),
  'dQw4w9WgXcQ'
);
assert.strictEqual(
  extractYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ'),
  'dQw4w9WgXcQ'
);
assert.strictEqual(extractYouTubeVideoId('not-a-url'), null);
console.log('✓ extractYouTubeVideoId passed');

// 3. Test parseGoogleSheetUrl
const url1 = parseGoogleSheetUrl('https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0');
assert.strictEqual(url1.spreadsheetId, '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
assert.strictEqual(url1.gid, '0');
assert.strictEqual(url1.isPublished, false);

const url2 = parseGoogleSheetUrl('https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?gid=98765#gid=98765');
assert.strictEqual(url2.spreadsheetId, '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
assert.strictEqual(url2.gid, '98765');

const url3 = parseGoogleSheetUrl('https://docs.google.com/spreadsheets/d/e/2PACX-1vR_sO0V0v9J-3Q9J8yV/pubhtml?gid=123');
assert.strictEqual(url3.spreadsheetId, '2PACX-1vR_sO0V0v9J-3Q9J8yV');
assert.strictEqual(url3.gid, '123');
assert.strictEqual(url3.isPublished, true);

const url4 = parseGoogleSheetUrl('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', { gid: '456' });
assert.strictEqual(url4.spreadsheetId, '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
assert.strictEqual(url4.gid, '456');

console.log('✓ parseGoogleSheetUrl passed');

// 4. Test parseCsvText
const sampleCsv = `tournament_id,round_name,division,table_number,player1_name,player1_country,player1_deck_archetype,player2_name,player2_country,player2_deck_archetype,youtube_url,match_start_time,match_end_time,winner_player_name,match_score,game1_start_time,game2_start_time,game3_start_time
1000075,Swiss Round 1,masters,1,"Dylan, Jr. Kasturi",US,charizard-ex,James Kowalski,US,gardevoir-ex,https://www.youtube.com/watch?v=dQw4w9WgXcQ,0:15:30,0:58:20,Dylan Kasturi,2-1,0:16:00,0:32:15,0:46:00
1000075,Swiss Round 2,masters,2,Player A,US,dragapult-ex,Player B,UK,gardevoir-ex,https://www.youtube.com/watch?v=dQw4w9WgXcQ,1:00:00,1:40:00,Tie,1-1,1:01:00,1:20:00,
`;

const parsedCsv = parseCsvText(sampleCsv);
assert.strictEqual(parsedCsv.rows.length, 2);
assert.strictEqual(parsedCsv.rows[0]['player1_name'], 'Dylan, Jr. Kasturi');
console.log('✓ parseCsvText passed');

// 5. Test parseMatchesFromRows and Deterministic UUID Generation
const parseResult = parseMatchesFromRows(parsedCsv.rows);
assert.strictEqual(parseResult.matches.length, 2);
assert.strictEqual(parseResult.games.length, 5); // 3 from row 1, 2 from row 2
assert.strictEqual(parseResult.matches[0].match_start_seconds, 930);
assert.strictEqual(parseResult.matches[0].match_end_seconds, 3500);
assert.strictEqual(parseResult.matches[0].youtube_video_id, 'dQw4w9WgXcQ');

// Verify deterministic UUID generation across independent runs with identical rows
const secondRunResult = parseMatchesFromRows(parsedCsv.rows);
assert.strictEqual(
  parseResult.matches[0].id,
  secondRunResult.matches[0].id,
  'First match ID must be identical across runs for identical rows'
);
assert.strictEqual(
  parseResult.matches[1].id,
  secondRunResult.matches[1].id,
  'Second match ID must be identical across runs for identical rows'
);

// Verify differing rows yield distinct match IDs
assert.notStrictEqual(
  parseResult.matches[0].id,
  parseResult.matches[1].id,
  'Differing match rows must yield distinct match IDs'
);

// Verify UUID format follows RFC 4122 UUID v5 (8-4-4-4-12 hex format with version 5 and variant 8..b)
const uuidV5Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
assert.ok(uuidV5Regex.test(parseResult.matches[0].id), 'Match 0 ID must match valid RFC 4122 UUID v5');
assert.ok(uuidV5Regex.test(parseResult.matches[1].id), 'Match 1 ID must match valid RFC 4122 UUID v5');

// Verify individual game IDs are deterministic and link cleanly to match_id
assert.strictEqual(
  parseResult.games[0].match_id,
  parseResult.matches[0].id,
  'Game 1 must link cleanly to match 0 ID'
);
assert.strictEqual(
  parseResult.games[0].id,
  secondRunResult.games[0].id,
  'Game ID must be identical across runs'
);
assert.notStrictEqual(
  parseResult.games[0].id,
  parseResult.games[1].id,
  'Game 1 and Game 2 within a match must have distinct IDs'
);
assert.ok(
  parseResult.games[0].id && uuidV5Regex.test(parseResult.games[0].id),
  'Game ID must be a valid RFC 4122 UUID'
);
assert.strictEqual(
  parseResult.games[3].match_id,
  parseResult.matches[1].id,
  'Game from second match must link cleanly to match 1 ID'
);
console.log('✓ parseMatchesFromRows & deterministic UUIDs passed');

// 6. Test generateDeterministicUuid & generateMatchNaturalKey directly
const key1 = generateMatchNaturalKey('1000075', 'Swiss Round 1', 'masters', 1, 'dQw4w9WgXcQ', 930);
const key2 = generateMatchNaturalKey('1000075', 'Swiss Round 1', 'masters', null, 'dQw4w9WgXcQ', 930);
assert.strictEqual(key1, '1000075|Swiss Round 1|masters|1|dQw4w9WgXcQ|930');
assert.strictEqual(key2, '1000075|Swiss Round 1|masters|na|dQw4w9WgXcQ|930');

const uuidA1 = generateDeterministicUuid(key1);
const uuidA2 = generateDeterministicUuid(key1);
const uuidB = generateDeterministicUuid(key2);
assert.strictEqual(uuidA1, uuidA2, 'Identical keys must produce identical UUIDs');
assert.notStrictEqual(uuidA1, uuidB, 'Different keys must produce distinct UUIDs');
assert.ok(uuidV5Regex.test(uuidA1), 'Direct UUID must match RFC 4122 UUID v5');
console.log('✓ generateDeterministicUuid & generateMatchNaturalKey passed');

// 7. Test generateImportSql
const sql = generateImportSql(parseResult.matches, parseResult.games, 'Test Source');
assert.ok(sql.includes('INSERT INTO public.streamed_matches'));
assert.ok(sql.includes('INSERT INTO public.match_games'));
assert.ok(sql.includes('Dylan, Jr. Kasturi'));
// Verify TRUNCATE TABLE is commented out by default
assert.ok(
  sql.includes('-- TRUNCATE TABLE public.match_games, public.streamed_matches CASCADE;'),
  'TRUNCATE TABLE must be commented out by default'
);
assert.ok(
  !sql.includes('\nTRUNCATE TABLE public.match_games, public.streamed_matches CASCADE;'),
  'Active TRUNCATE TABLE statement must not be executed'
);
// Verify ON CONFLICT clause is present to deduplicate re-imports
assert.ok(
  sql.includes('ON CONFLICT (id) DO UPDATE SET'),
  'ON CONFLICT (id) DO UPDATE SET must be included for deduplication'
);
console.log('✓ generateImportSql passed');

// 8. Test convertValuesToCsv
const values = [
  ['col1', 'col2', 'col3'],
  ['value 1', 'value, with comma', 'value "with" quotes'],
];
const csvOutput = convertValuesToCsv(values);
assert.ok(csvOutput.includes('"value, with comma"'));
assert.ok(csvOutput.includes('"value ""with"" quotes"'));
console.log('✓ convertValuesToCsv passed');

// 9. Test getGoogleAccessToken with direct token
async function testAuth() {
  const token = await getGoogleAccessToken({ accessToken: 'test-direct-token' });
  assert.strictEqual(token, 'test-direct-token');
  console.log('✓ getGoogleAccessToken (direct token) passed');
}

testAuth().then(() => {
  console.log('All tests passed successfully! 🎉');
});
