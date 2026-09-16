import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { applyAction, initialState, RULES, SCENARIO, validCommand } from '../src/game.ts';
import type { Command, State } from '../src/game.ts';

export function createSession(journal?: string) {
  let state = initialState();
  const accepted = new Map<string, string>();
  if (journal && existsSync(journal)) {
    const lines = readFileSync(journal, 'utf8').trim().split('\n').filter(Boolean);
    for (const line of lines) {
      const record = JSON.parse(line) as { command: Command; state: State };
      if (record.state.rules !== RULES || record.state.scenario !== SCENARIO) throw new Error('Journal version does not match this build. Archive data/session.jsonl before starting a new version.');
      state = record.state;
      accepted.set(record.command.id, JSON.stringify(record.command));
    }
  }
  return {
    getState: () => structuredClone(state),
    submit(value: unknown) {
      if (!validCommand(value)) return { status: 400, body: { error: 'Malformed command.', state } };
      const serialized = JSON.stringify(value);
      if (accepted.has(value.id)) {
        if (accepted.get(value.id) !== serialized) return { status: 409, body: { error: 'Command ID was already used for a different request.', state } };
        return { status: 200, body: { state, duplicate: true } };
      }
      if (value.revision !== state.revision) return { status: 409, body: { error: 'Another screen changed the exercise. Review the updated board and try again.', state } };
      try {
        const next = applyAction(state, value.action);
        if (journal) appendFileSync(journal, JSON.stringify({ command: value, state: next }) + '\n', { flush: true });
        state = next;
        accepted.set(value.id, serialized);
        return { status: 200, body: { state, duplicate: false } };
      } catch (error) { return { status: 422, body: { error: error instanceof Error ? error.message : 'Order failed.', state } }; }
    },
  };
}
