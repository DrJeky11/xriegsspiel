import { readFileSync } from 'node:fs';
import { scoreLedger, validateLibrary } from '../scenarios/scoring.ts';

try {
  const library = JSON.parse(readFileSync(new URL('../scenarios/maritime-crises.v1.json', import.meta.url), 'utf8'));
  validateLibrary(library);
  const args = process.argv.slice(2);
  if (args.length !== 1) throw new Error('Usage: node scripts/score-scenarios.mjs --validate | <terminal-ledger.json>');
  if (args[0] === '--validate') {
    console.log(JSON.stringify({ valid: true, scenarios: library.scenarios.length, version: library.version, scope: 'Definitions only; no episodes simulated.' }, null, 2));
  } else {
    console.log(JSON.stringify(scoreLedger(library, JSON.parse(readFileSync(args[0], 'utf8'))), null, 2));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
