import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createScenarioSession } from './scenario-session.ts';
import type { GeographicRules } from '../src/scenario/rules.ts';

/** One authority and append-only journal per map. Visiting a map never resets it. */
export function createMapSessions(rules: GeographicRules, directory: string) {
  const root = join(directory, 'maps');
  mkdirSync(root, { recursive: true });
  const legacyPath = join(directory, 'geographic-session.jsonl');
  // Replay the old journal without modifying it; migrate its active exercise once.
  const legacy = existsSync(legacyPath) ? createScenarioSession(rules, legacyPath).getState().exercise : null;
  const sessions = new Map<string, ReturnType<typeof createScenarioSession>>();
  for (const mapId of rules.maps.keys()) {
    const path = join(root, `${mapId.replaceAll('/', '--')}.jsonl`);
    const migrate = !existsSync(path) && legacy?.manifest.mapId === mapId;
    const session = createScenarioSession(rules, path, mapId);
    if (migrate) {
      const result = session.submit({ id: 'migrate-geographic-baseline', revision: 0, operation: { type: 'import', save: rules.export(legacy!) } });
      if (result.status !== 200) throw new Error(`Could not migrate ${mapId}: ${result.body.error}`);
    }
    sessions.set(mapId, session);
  }
  return sessions;
}
