import { readFileSync } from 'node:fs';
import { scoreLedger, validateLibrary } from '../scenarios/scoring.ts';

try {
  const libraries = [1, 2].map(version => JSON.parse(readFileSync(new URL(`../scenarios/maritime-crises.v${version}.json`, import.meta.url), 'utf8')));
  libraries.forEach(validateLibrary);
  const args = process.argv.slice(2);
  if (args.length !== 1) throw new Error('Usage: node scripts/score-scenarios.mjs --validate | <terminal-ledger.json>');
  if (args[0] === '--validate') {
    console.log(JSON.stringify({ valid: true, libraries: libraries.map(library => ({ scenarios: library.scenarios.length, version: library.version })), scope: 'Definitions only; no episodes simulated.' }, null, 2));
  } else {
    const ledger = JSON.parse(readFileSync(args[0], 'utf8'));
    const library = libraries.find(library => library.scenarios.some(s => s.id === ledger.scenarioId && s.version === ledger.scenarioVersion && s.rulesVersion === ledger.rulesVersion));
    if (!library) throw new Error('Unsupported ledger scenario/rules version.');
    console.log(JSON.stringify(scoreLedger(library, ledger), null, 2));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
