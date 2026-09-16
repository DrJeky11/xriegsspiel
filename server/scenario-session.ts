import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { GeographicRules, validAction } from '../src/scenario/rules.ts';
import type { Action, Exercise, Setup, Save } from '../src/scenario/rules.ts';
import { scenarioMaps } from '../src/scenario/maps.ts';
import type { PieceCatalog, PieceRules } from '../src/pieces.ts';
import type { Geography } from '../src/pacific/terrain.ts';

export type Operation = { type: 'action'; action: Action } | { type: 'new'; setup: Setup } | { type: 'import'; save: Save };
export interface ScenarioCommand { id: string; revision: number; operation: Operation }
export interface ScenarioState { revision: number; exercise: Exercise }
export function loadGeographicRules() {
  const json = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8'));
  return new GeographicRules(json<PieceCatalog>('catalog/pieces.json'), json<PieceRules>('catalog/rules.json'), scenarioMaps({
    regional: json<Geography>('public/terrain/pacific/regional-land.json'), shoal: json<Geography>('public/terrain/pacific/shoal-detail.json'), senkaku: json<Geography>('public/terrain/pacific/senkaku-detail.json'),
  }));
}
function validCommand(v: unknown): v is ScenarioCommand {
  if (!v || typeof v !== 'object') return false;
  const c = v as ScenarioCommand;
  if (typeof c.id !== 'string' || c.id.length < 1 || c.id.length > 120 || !Number.isSafeInteger(c.revision) || c.revision < 0 || !c.operation) return false;
  return c.operation.type === 'action' ? validAction(c.operation.action)
    : c.operation.type === 'new' ? !!c.operation.setup && typeof c.operation.setup.mapId === 'string' && typeof c.operation.setup.demo === 'boolean' && Number.isInteger(c.operation.setup.year)
    : c.operation.type === 'import' && !!c.operation.save;
}
export function createScenarioSession(rules: GeographicRules, journal?: string, mapId?: string) {
  let state: ScenarioState = { revision: 0, exercise: rules.create(mapId ? { mapId, year: 2026, demo: false } : undefined) };
  const accepted = new Map<string, string>();
  const nextState = (command: ScenarioCommand): ScenarioState => {
    const op = command.operation;
    const exercise = op.type === 'new' ? rules.create(op.setup) : op.type === 'import' ? rules.import(op.save) : rules.apply(state.exercise, op.action);
    if (mapId && exercise.manifest.mapId !== mapId) throw new Error('This save or setup belongs to another map. Open that map before restoring it.');
    return { revision: state.revision + 1, exercise };
  };
  if (journal && existsSync(journal)) {
    for (const line of readFileSync(journal, 'utf8').split('\n').filter(Boolean)) {
      const record = JSON.parse(line) as { command: ScenarioCommand; state: ScenarioState };
      if (!validCommand(record.command) || record.command.revision !== state.revision || accepted.has(record.command.id)) throw new Error('Geographic journal command/revision mismatch. Preserve data/geographic-session.jsonl for recovery.');
      const replay = nextState(record.command);
      if (JSON.stringify(replay) !== JSON.stringify(record.state)) throw new Error('Geographic journal replay/version mismatch. Preserve data/geographic-session.jsonl for recovery.');
      state = replay; accepted.set(record.command.id, JSON.stringify(record.command));
    }
  }
  return {
    getState: () => structuredClone(state),
    submit(value: unknown) {
      if (!validCommand(value)) return { status: 400, body: { error: 'Malformed geographic command.', state: structuredClone(state), duplicate: false } };
      const serialized = JSON.stringify(value);
      if (accepted.has(value.id)) return accepted.get(value.id) === serialized
        ? { status: 200, body: { state: structuredClone(state), duplicate: true } }
        : { status: 409, body: { error: 'This command ID belongs to a different request.', state: structuredClone(state), duplicate: false } };
      if (value.revision !== state.revision) return { status: 409, body: { error: 'Another screen changed this exercise. Review the refreshed state and preview again.', state: structuredClone(state), duplicate: false } };
      try {
        const next = nextState(value);
        if (journal) appendFileSync(journal, JSON.stringify({ command: value, state: next }) + '\n', { flush: true });
        state = next; accepted.set(value.id, serialized);
        return { status: 200, body: { state: structuredClone(state), duplicate: false } };
      } catch (error) { return { status: 422, body: { error: error instanceof Error ? error.message : 'Order failed.', state: structuredClone(state), duplicate: false } }; }
    },
  };
}
