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

// 5. Test parseMatchesFromRows
const parseResult = parseMatchesFromRows(parsedCsv.rows);
assert.strictEqual(parseResult.matches.length, 2);
assert.strictEqual(parseResult.games.length, 5); // 3 from row 1, 2 from row 2
assert.strictEqual(parseResult.matches[0].match_start_seconds, 930);
assert.strictEqual(parseResult.matches[0].match_end_seconds, 3500);
assert.strictEqual(parseResult.matches[0].youtube_video_id, 'dQw4w9WgXcQ');
console.log('✓ parseMatchesFromRows passed');

// 6. Test generateImportSql
const sql = generateImportSql(parseResult.matches, parseResult.games, 'Test Source');
assert.ok(sql.includes('INSERT INTO public.streamed_matches'));
assert.ok(sql.includes('INSERT INTO public.match_games'));
assert.ok(sql.includes('Dylan, Jr. Kasturi'));
console.log('✓ generateImportSql passed');

// 7. Test convertValuesToCsv
const values = [
  ['col1', 'col2', 'col3'],
  ['value 1', 'value, with comma', 'value "with" quotes'],
];
const csvOutput = convertValuesToCsv(values);
assert.ok(csvOutput.includes('"value, with comma"'));
assert.ok(csvOutput.includes('"value ""with"" quotes"'));
console.log('✓ convertValuesToCsv passed');

// 8. Test getGoogleAccessToken with direct token
async function testAuth() {
  const token = await getGoogleAccessToken({ accessToken: 'test-direct-token' });
  assert.strictEqual(token, 'test-direct-token');
  console.log('✓ getGoogleAccessToken (direct token) passed');
}

testAuth().then(() => {
  console.log('All tests passed successfully! 🎉');
});
