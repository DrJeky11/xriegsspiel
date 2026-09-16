import { join } from 'node:path';
import { CaptureStore } from './capture-store.ts';
import { createCapturedSession, initializeCapture } from './captured-session.ts';
import { verifyCaptureRun } from './capture-verify.ts';
import type { GeographicRules } from '../src/scenario/rules.ts';

/** Six independent map authorities backed by one transactional exercise archive. */
export function createMapSessions(rules: GeographicRules, directory: string) {
  const capture = new CaptureStore(join(directory, 'exercises.sqlite'), rules);
  try {
    initializeCapture(rules, capture, directory);
    for(const row of capture.all('SELECT run_id FROM active_maps'))verifyCaptureRun(capture,row.run_id);
  } catch (error) { capture.close(); throw error; }
  const sessions = new Map<string, ReturnType<typeof createCapturedSession>>();
  for (const mapId of rules.maps.keys()) {
    sessions.set(mapId, createCapturedSession(rules, capture, mapId));
  }
  return Object.assign(sessions, { capture });
}
