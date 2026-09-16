import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { scoreLedger, validateLibrary } from '../scenarios/scoring.ts';
import type { Library, Ledger } from '../scenarios/scoring.ts';

const library: Library = JSON.parse(readFileSync(new URL('../scenarios/maritime-crises.v1.json', import.meta.url), 'utf8'));
function ledger(id: string, overrides: Record<string, number> = {}): Ledger {
  const s = library.scenarios.find(s => s.id === id)!;
  return { schema: 'xriegsspiel-terminal-ledger/1', scenarioId: id, scenarioVersion: s.version, rulesVersion: s.rulesVersion,
    status: 'completed', completedRounds: s.rounds, refereeModified: false,
    metrics: { ...Object.fromEntries(Object.entries(s.metrics).map(([k, m]) => [k, /_(ready|reports)$/.test(k) ? m.max : 0])), ...overrides } };
}
const result = (id: string, values: Record<string, number>) => scoreLedger(library, ledger(id, values));

test('eight definitions cover both types in all regions and resolve their provenance', () => {
  validateLibrary(library);
  const sources = readFileSync(new URL('../docs/scenarios/sources.md', import.meta.url), 'utf8');
  for (const s of library.scenarios) {
    assert.ok(existsSync(new URL(`../${s.brief.split('#')[0]}`, import.meta.url)));
    for (const id of s.sourceIds) assert.ok(sources.includes(`## ${id}\n`), id);
  }
  const bad = structuredClone(library);
  bad.scenarios[0].scorecards.blue[0].points += 1;
  assert.throws(() => validateLibrary(bad), /100/);
});

test('SPR-H01 thresholds are complete and mission wins cannot be bought with secondary points', () => {
  const outcomes = [0, 1, 2, 3, 4].map(delivered => result('SPR-H01', { delivered }).outcome);
  assert.deepEqual(outcomes, ['red_win', 'red_win', 'contested', 'blue_win', 'blue_win']);
  const r = result('SPR-H01', { delivered: 3, blue_ready: 0, blue_reports: 0, blue_incidents: 4 });
  assert.equal(r.outcome, 'blue_win');
  assert.equal(r.scores!.blue.total, 45);
  assert.equal(r.scores!.red.total, 55);
});

test('synthetic example computes the documented 85 to 55 without mutating input', () => {
  const l = JSON.parse(readFileSync(new URL('../scenarios/example-ledger.json', import.meta.url), 'utf8'));
  const before = structuredClone(l);
  const r = scoreLedger(library, l);
  assert.deepEqual([r.scores!.blue.total, r.scores!.red.total, r.outcome], [85, 55, 'blue_win']);
  assert.deepEqual(l, before);
});

test('medical, welfare and rescue gates override apparent mission achievement', () => {
  for (const [id, metrics] of [
    ['SPR-F01', { routine_delivered: 4 }], ['HOR-H01', { transited: 1 }],
    ['HOR-F01', { transited: 5, priority_transited: 1 }],
    ['BAB-H01', { transited: 2 }], ['BAB-F01', { transited: 4, aid_transited: 1 }],
    ['SEN-F01', { coordination: 1 }],
  ] as [string, Record<string, number>][]) assert.equal(result(id, metrics).outcome, 'shared_failure', id);
  assert.equal(result('SPR-F01', { routine_delivered: 2, medical_on_time: 1 }).scores!.blue.total, 77.5);
});

test('critical-breach precedence is symmetric and never awards both sides victory', () => {
  assert.equal(result('SPR-F01', { blue_critical: 1 }).outcome, 'red_win');
  assert.equal(result('SPR-F01', { red_critical: 1 }).outcome, 'blue_win');
  assert.equal(result('SPR-F01', { blue_critical: 1, red_critical: 1 }).outcome, 'double_failure');
});

test('joint success is reachable and a joint lead earns alternative rather than additive credit', () => {
  assert.equal(result('SEN-H01', { case_records: 3, handover: 1, released: 1, statement_filed: 1 }).outcome, 'joint_success');
  const r = result('SEN-F01', { rescued: 4, coordination: 3 });
  assert.equal(r.outcome, 'joint_success');
  assert.equal(r.scores!.blue.total, 85);
  assert.equal(r.scores!.red.total, 85);
  assert.equal(result('SEN-F01', { rescued: 4, coordination: 1 }).scores!.blue.total, 100);
});

test('scenario-specific end states distinguish priorities, passage, custody and negotiated pauses', () => {
  assert.equal(result('HOR-H01', { transited: 1, welfare_checks: 2 }).outcome, 'blue_win');
  assert.equal(result('HOR-H01', { detained: 1, welfare_checks: 2 }).outcome, 'red_win');
  assert.equal(result('HOR-F01', { transited: 4, welfare_complete: 1 }).outcome, 'contested');
  assert.equal(result('HOR-F01', { transited: 4, priority_transited: 1, welfare_complete: 1 }).outcome, 'blue_win');
  assert.equal(result('BAB-H01', { rescued: 3 }).outcome, 'contested');
  assert.equal(result('BAB-H01', { rescued: 3, standdown: 1 }).outcome, 'red_win');
  assert.equal(result('BAB-F01', { transited: 3, rescued_on_time: 2 }).outcome, 'contested');
  assert.equal(result('BAB-F01', { transited: 3, aid_transited: 1, rescued_on_time: 2 }).outcome, 'blue_win');
});

test('contradictory objective ledgers reject instead of silently clamping', () => {
  for (const [id, values] of [
    ['SEN-H01', { case_records: 2, handover: 1 }],
    ['HOR-H01', { transited: 1, detained: 1 }], ['HOR-H01', { on_time: 1 }],
    ['HOR-F01', { priority_transited: 1 }], ['HOR-F01', { transited: 5 }],
    ['BAB-F01', { aid_transited: 1 }], ['BAB-F01', { transited: 4 }],
  ] as [string, Record<string, number>][]) assert.throws(() => result(id, values), /Inconsistent/);
});

test('invalid counts, missing metrics, foreign fields and version drift reject', () => {
  for (const value of [-1, 5, 1.5, NaN, Infinity, '3', true, null]) {
    const l = ledger('SPR-H01'); (l.metrics as Record<string, unknown>).delivered = value;
    assert.throws(() => scoreLedger(library, l), /integer bounds/);
  }
  const missing = ledger('SPR-H01'); delete missing.metrics!.delivered;
  assert.throws(() => scoreLedger(library, missing), /missing/);
  assert.throws(() => result('SPR-H01', { invented: 1 }), /Unknown/);
  const old = ledger('SPR-H01'); old.rulesVersion = 'different';
  assert.throws(() => scoreLedger(library, old), /version/);
});

test('unfinished and aborted runs have no scores, while referee changes remain disclosed', () => {
  const l = ledger('SPR-H01', { delivered: 4 });
  l.status = 'aborted';
  assert.equal(scoreLedger(library, l).scores, null);
  l.status = 'pending';
  assert.equal(scoreLedger(library, l).outcome, 'incomplete');
  l.status = 'completed'; l.completedRounds -= 1;
  assert.equal(scoreLedger(library, l).outcome, 'incomplete');
  l.completedRounds += 1; l.refereeModified = true;
  assert.equal(scoreLedger(library, l).refereeModified, true);
  assert.equal(scoreLedger(library, l).outcome, 'blue_win');
});

test('exhaustive objective-metric combinations stay bounded and outcomes are deterministic', () => {
  for (const s of library.scenarios) {
    const objectiveMetrics = Object.keys(s.metrics).filter(k => !/^(blue|red)_/.test(k));
    const visit = (i: number, values: Record<string, number>) => {
      if (i < objectiveMetrics.length) {
        const key = objectiveMetrics[i];
        for (let n = 0; n <= s.metrics[key].max; n++) visit(i + 1, { ...values, [key]: n });
        return;
      }
      try {
        const r = result(s.id, values);
        for (const side of ['blue', 'red'] as const) assert.ok(r.scores![side].total >= 0 && r.scores![side].total <= 100);
        assert.deepEqual(result(s.id, values), r);
      } catch (error) {
        if (!(error instanceof Error && error.message.startsWith('Inconsistent terminal ledger'))) throw error;
      }
    };
    visit(0, {});
  }
});
