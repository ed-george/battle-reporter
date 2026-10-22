import * as fs from 'fs';
import * as path from 'path';
import {
  parseCsvText,
  parseMatchesFromRows,
  generateImportSql,
} from '../src/lib/ingestion';

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

  try {
    const { headers, rows } = parseCsvText(fileContent);
    console.log(`Parsed headers: ${headers.join(', ')}`);

    const result = parseMatchesFromRows(rows);

    if (result.skipped.length > 0) {
      console.warn(`\n⚠ Skipped ${result.skipped.length} invalid rows:`);
      result.skipped.forEach((s) => {
        console.warn(`  - Row ${s.rowNumber}: ${s.reason}`);
      });
    }

    if (result.warnings.length > 0) {
      console.warn(`\n⚠ Validation Warnings:`);
      result.warnings.forEach((w) => console.warn(`  - ${w}`));
    }

    if (result.matches.length === 0) {
      console.error('\nError: No valid matches found to convert.');
      process.exit(1);
    }

    const sql = generateImportSql(
      result.matches,
      result.games,
      path.basename(inputCsvPath)
    );

    fs.mkdirSync(path.dirname(outputSqlPath), { recursive: true });
    fs.writeFileSync(outputSqlPath, sql);

    console.log(`\n✓ Successfully converted ${result.matches.length} matches and ${result.games.length} game timestamps!`);
    console.log(`✓ Output SQL written to: ${outputSqlPath}`);
    console.log('\nYou can now copy the contents of that file and run it in Supabase SQL Editor.');
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error(`Error processing CSV: ${error.message}`);
    process.exit(1);
  }
}

main();
