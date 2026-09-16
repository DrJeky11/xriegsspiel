import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFileSync, mkdirSync, existsSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import type { SQLInputValue } from 'node:sqlite';
import type { Exercise, Event, Preview } from '../src/scenario/rules.ts';
import type { GeographicRules } from '../src/scenario/rules.ts';
import type { Annotation, CapturedCommand, CapturedObservation, CaptureContext, CompactExercise, InterfaceMode, RunReview, RunSummary } from '../src/capture/types.ts';
import { CAPTURE_SCHEMA } from '../src/capture/types.ts';

export const digest = (value: unknown) => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const now = () => new Date().toISOString();
type Row = Record<string, any>;
export function compact(exercise: Exercise): CompactExercise { const { events: _events, ...state } = exercise; return state; }

/** Local exercise authority. All mutations use one explicit transaction; no secondary analytics log. */
export class CaptureStore {
  readonly db: DatabaseSync;
  readonly artifactHash: string;
  readonly path: string;
  private transactionDepth = 0;
  constructor(path: string, rules?: GeographicRules) {
    this.path = path;
    if (rules && path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path, { readOnly: !rules });
    if (rules && path !== ':memory:') chmodSync(path, 0o600);
    this.db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;');
    if (rules) this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;');
    const version = Number(this.one('PRAGMA user_version')?.user_version ?? 0);
    if (version > 2) { this.db.close(); throw new Error('Exercise database schema is newer than this application.'); }
    if (!rules) {
      if (version < 1) { this.db.close(); throw new Error('Exercise capture has not been initialized.'); }
      this.artifactHash = this.one('SELECT hash FROM artifacts ORDER BY rowid DESC LIMIT 1')?.hash ?? '';
      return;
    }
    if (version === 0) this.transaction(() => {
      this.db.exec(`
        CREATE TABLE artifacts(hash TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE principals(id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL);
        CREATE TABLE runs(id TEXT PRIMARY KEY, map_id TEXT NOT NULL, label TEXT NOT NULL, manifest TEXT NOT NULL,
          artifact_hash TEXT NOT NULL REFERENCES artifacts(hash), created_at TEXT, archived_at TEXT, status TEXT NOT NULL,
          end_reason TEXT, origin TEXT NOT NULL, parent_run_id TEXT REFERENCES runs(id), source_hash TEXT,
          initial_events TEXT NOT NULL, initial_revision INTEGER NOT NULL, current_revision INTEGER NOT NULL,
          objective TEXT NOT NULL DEFAULT '', quality TEXT NOT NULL);
        CREATE TABLE active_maps(map_id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id), revision INTEGER NOT NULL);
        CREATE TABLE participants(id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id), principal_id TEXT,
          label TEXT NOT NULL, kind TEXT NOT NULL, UNIQUE(run_id,principal_id));
        CREATE TABLE states(hash TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE checkpoints(run_id TEXT NOT NULL REFERENCES runs(id), revision INTEGER NOT NULL,
          state_hash TEXT NOT NULL REFERENCES states(hash), turn INTEGER NOT NULL, created_at TEXT,
          PRIMARY KEY(run_id,revision));
        CREATE TABLE observations(id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id), participant_id TEXT NOT NULL REFERENCES participants(id),
          revision INTEGER NOT NULL, state_hash TEXT NOT NULL REFERENCES states(hash), projection TEXT NOT NULL,
          issued_at TEXT NOT NULL, delivered_at TEXT, presented_at TEXT, client_time TEXT, interface TEXT NOT NULL);
        CREATE TABLE command_results(id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id), participant_id TEXT NOT NULL REFERENCES participants(id),
          command_id TEXT NOT NULL, fingerprint TEXT NOT NULL, operation TEXT NOT NULL, received_at TEXT, committed_at TEXT,
          interface TEXT NOT NULL, status INTEGER NOT NULL, reason_code TEXT NOT NULL, explanation TEXT NOT NULL,
          expected_revision INTEGER NOT NULL, validated_revision INTEGER NOT NULL,
          observation_id TEXT REFERENCES observations(id), validation_observation_id TEXT REFERENCES observations(id),
          before_hash TEXT NOT NULL REFERENCES states(hash), after_hash TEXT NOT NULL REFERENCES states(hash),
          next_run_id TEXT REFERENCES runs(id), retries INTEGER NOT NULL DEFAULT 0, source TEXT NOT NULL, guidance TEXT,
          UNIQUE(run_id,participant_id,command_id));
        CREATE TABLE events(id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id), sequence INTEGER NOT NULL,
          kind TEXT NOT NULL, participant_id TEXT REFERENCES participants(id), result_id TEXT REFERENCES command_results(id),
          revision INTEGER, server_time TEXT, payload TEXT NOT NULL, UNIQUE(run_id,sequence));
        CREATE TABLE annotations(id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id), result_id TEXT REFERENCES command_results(id),
          participant_id TEXT NOT NULL REFERENCES participants(id), kind TEXT NOT NULL, text TEXT NOT NULL,
          audience TEXT NOT NULL, created_at TEXT NOT NULL, timing TEXT NOT NULL, rubric TEXT);
        CREATE TABLE telemetry(id TEXT NOT NULL, run_id TEXT NOT NULL REFERENCES runs(id), participant_id TEXT NOT NULL REFERENCES participants(id),
          type TEXT NOT NULL, server_time TEXT NOT NULL, client_time TEXT, interface TEXT NOT NULL, payload TEXT NOT NULL,
          PRIMARY KEY(run_id,participant_id,id));
        CREATE TABLE migrations(source_hash TEXT PRIMARY KEY, source_path TEXT NOT NULL, imported_at TEXT NOT NULL,
          record_count INTEGER NOT NULL, status TEXT NOT NULL, detail TEXT NOT NULL);
        CREATE INDEX runs_map ON runs(map_id,created_at);
        CREATE INDEX commands_run ON command_results(run_id,validated_revision);
        CREATE INDEX events_run ON events(run_id,revision);
        CREATE INDEX observations_run ON observations(run_id,participant_id,revision);
        CREATE INDEX annotations_run ON annotations(run_id);
        PRAGMA user_version=1;
      `);
    });
    if(version<2)this.transaction(()=>this.db.exec(`
      CREATE TABLE opponent_states(id TEXT PRIMARY KEY,revision INTEGER NOT NULL,branch_id TEXT NOT NULL,data TEXT NOT NULL,artifact_hash TEXT NOT NULL);
      CREATE TABLE opponent_artifacts(hash TEXT PRIMARY KEY,data TEXT NOT NULL);
      CREATE TABLE opponent_branches(id TEXT PRIMARY KEY,run_id TEXT NOT NULL,data TEXT NOT NULL);
      CREATE TABLE opponent_views(id TEXT PRIMARY KEY,run_id TEXT NOT NULL,branch_id TEXT NOT NULL,role TEXT NOT NULL,revision INTEGER NOT NULL,data TEXT NOT NULL,issued_at TEXT NOT NULL,presented_at TEXT);
      CREATE TABLE opponent_decisions(id TEXT PRIMARY KEY,run_id TEXT NOT NULL,branch_id TEXT NOT NULL,role TEXT NOT NULL,command_id TEXT NOT NULL,
        fingerprint TEXT NOT NULL,command TEXT NOT NULL,expected_revision INTEGER NOT NULL,validated_revision INTEGER NOT NULL,status TEXT NOT NULL,
        reason_code TEXT NOT NULL,explanation TEXT NOT NULL,observation_id TEXT,validation_view TEXT NOT NULL,result_revision INTEGER NOT NULL,
        recorded_at TEXT NOT NULL,retries INTEGER NOT NULL DEFAULT 0,UNIQUE(run_id,role,command_id));
      CREATE TABLE opponent_notes(id TEXT PRIMARY KEY,run_id TEXT NOT NULL,role TEXT NOT NULL,decision_id TEXT,kind TEXT NOT NULL,text TEXT NOT NULL,created_at TEXT NOT NULL);
      CREATE INDEX opponent_decisions_run ON opponent_decisions(run_id,validated_revision);
      PRAGMA user_version=2;
    `));
    const sourcePaths = ['src/scenario/rules.ts', 'src/scenario/maps.ts', 'src/pieces.ts', 'src/pacific/terrain.ts', 'src/centcom/terrain.ts', 'src/centcom/regions.ts', 'src/centcom/coastlines.json', 'src/scenario/variant-review.json', 'package.json', 'package-lock.json'];
    const artifact = { schema: CAPTURE_SCHEMA, catalog: rules.catalog, profiles: rules.profiles,
      maps: [...rules.maps.values()].map(({ byKey: _index, ...map }) => map),
      sources: Object.fromEntries(sourcePaths.filter(existsSync).map(path => [path, readFileSync(path, 'utf8')])) };
    this.artifactHash = digest(artifact);
    this.run('INSERT OR IGNORE INTO artifacts VALUES(?,?)', this.artifactHash, JSON.stringify(artifact));
  }
  one(sql: string, ...params: SQLInputValue[]): Row | undefined { return this.db.prepare(sql).get(...params); }
  all(sql: string, ...params: SQLInputValue[]): Row[] { return this.db.prepare(sql).all(...params); }
  run(sql: string, ...params: SQLInputValue[]) { return this.db.prepare(sql).run(...params); }
  transaction<T>(fn: () => T): T {
    const depth = this.transactionDepth++, savepoint = `capture_${depth}`;
    try { this.db.exec(depth ? `SAVEPOINT ${savepoint}` : 'BEGIN IMMEDIATE'); }
    catch (error) { this.transactionDepth--; throw error; }
    try { const result = fn(); this.db.exec(depth ? `RELEASE ${savepoint}` : 'COMMIT'); return result; }
    catch (error) {
      // SQLITE_FULL and similar failures can roll back the transaction themselves.
      if (this.db.isTransaction) this.db.exec(depth ? `ROLLBACK TO ${savepoint}; RELEASE ${savepoint}` : 'ROLLBACK');
      throw error;
    } finally { this.transactionDepth--; }
  }
  close() { this.db.close(); }
  state(hash: string): CompactExercise {
    const row = this.one('SELECT data FROM states WHERE hash=?', hash);
    if (!row || digest(row.data) !== hash) throw new Error('Captured state failed its integrity check.');
    return JSON.parse(row.data);
  }
  checkpoint(runId: string, revision: number, exercise: Exercise, timestamp: string | null = now()) {
    const state = compact(exercise), hash = digest(state);
    this.run('INSERT OR IGNORE INTO states VALUES(?,?)', hash, JSON.stringify(state));
    this.run('INSERT INTO checkpoints VALUES(?,?,?,?,?)', runId, revision, hash, exercise.turn, timestamp);
    this.run('UPDATE runs SET current_revision=? WHERE id=?', revision, runId);
    return hash;
  }
  startRun(exercise: Exercise, revision: number, options: { origin?: string; parent?: string; sourceHash?: string; legacy?: boolean } = {}) {
    const id = randomUUID(), mapId = exercise.manifest.mapId, legacy = !!options.legacy;
    const label = mapId.replaceAll('/', ' · ') + ' / ' + exercise.year;
    this.run(`INSERT INTO runs(id,map_id,label,manifest,artifact_hash,created_at,status,origin,parent_run_id,source_hash,initial_events,initial_revision,current_revision,quality)
      VALUES(?,?,?,?,?,?,'active',?,?,?,?,?,?,?)`, id, mapId, label, JSON.stringify(exercise.manifest), this.artifactHash,
      legacy ? null : now(), options.origin ?? 'live', options.parent ?? null, options.sourceHash ?? null,
      JSON.stringify(exercise.events), revision, revision, JSON.stringify(legacy ? ['legacy: actor, decision time and presented information unknown'] : options.origin==='import' ? ['Inherited history is not a new set of participant decisions.'] : []));
    this.checkpoint(id, revision, exercise, legacy ? null : now());
    this.event(id, 'run.started', null, null, revision, { origin: options.origin ?? 'live', inheritedEvents: exercise.events.length }, legacy);
    return id;
  }
  archive(runId: string, reason: string, legacy = false) {
    this.run("UPDATE runs SET status='archived',archived_at=?,end_reason=? WHERE id=?", legacy ? null : now(), reason, runId);
  }
  active(mapId: string) { return this.one('SELECT * FROM active_maps WHERE map_id=?', mapId); }
  exercise(runId: string, revision?: number): Exercise {
    const run = this.one('SELECT * FROM runs WHERE id=?', runId); if (!run) throw new Error('Unknown exercise.');
    const target = revision ?? run.current_revision;
    const cp = this.one('SELECT * FROM checkpoints WHERE run_id=? AND revision=?', runId, target);
    if (!cp) throw new Error('Unknown exercise checkpoint.');
    const initial: Event[] = JSON.parse(run.initial_events);
    const events: Event[] = this.all("SELECT payload FROM events WHERE run_id=? AND kind='game.action' AND revision<=? ORDER BY revision", runId, target).map(row => JSON.parse(row.payload).event);
    return { ...this.state(cp.state_hash), events: [...initial, ...events] };
  }
  event(runId: string, kind: string, participantId: string | null, resultId: string | null, revision: number | null, payload: unknown, legacy = false) {
    const sequence = Number(this.one('SELECT COALESCE(MAX(sequence),0)+1 AS n FROM events WHERE run_id=?', runId)!.n);
    const id = randomUUID();
    this.run('INSERT INTO events VALUES(?,?,?,?,?,?,?,?,?)', id, runId, sequence, kind, participantId, resultId, revision, legacy ? null : now(), JSON.stringify(payload));
    return id;
  }
  join(token?: string) {
    if (token && /^[A-Za-z0-9_-]{32}$/.test(token)) {
      const principal = this.one('SELECT id FROM principals WHERE token_hash=?', digest(token));
      if (principal) return { principalId: principal.id as string, token };
    }
    const nextToken = randomBytes(24).toString('base64url'), principalId = randomUUID();
    this.run('INSERT INTO principals VALUES(?,?,?)', principalId, digest(nextToken), now());
    return { principalId, token: nextToken };
  }
  authenticate(token?: string): string | null {
    if (!token || token.length !== 32) return null;
    return this.one('SELECT id FROM principals WHERE token_hash=?', digest(token))?.id ?? null;
  }
  participant(runId: string, context?: CaptureContext, legacy = false) {
    const principal = legacy ? 'legacy-unknown' : context?.principalId ?? 'scripted-fixture';
    const existing = this.one('SELECT * FROM participants WHERE run_id=? AND principal_id=?', runId, principal);
    if (existing) return existing;
    if (context && !this.one('SELECT id FROM principals WHERE id=?', principal)) throw new Error('Unknown participant.');
    const id = randomUUID(), n = Number(this.one('SELECT COUNT(*) AS n FROM participants WHERE run_id=?', runId)!.n) + 1;
    const label = legacy ? 'Legacy · unknown actor' : context ? `Participant ${n}` : 'Scripted fixture';
    this.run('INSERT INTO participants VALUES(?,?,?,?,?)', id, runId, principal, label, legacy ? 'unknown' : context ? 'human' : 'script');
    return this.one('SELECT * FROM participants WHERE id=?', id)!;
  }
  observe(runId: string, revision: number, context: CaptureContext) {
    const participant = this.participant(runId, context), cp = this.one('SELECT * FROM checkpoints WHERE run_id=? AND revision=?', runId, revision);
    if (!cp) throw new Error('Unknown observation checkpoint.');
    const id = randomUUID();
    this.run('INSERT INTO observations VALUES(?,?,?,?,?,?,?,NULL,NULL,NULL,?)', id, runId, participant.id, revision, cp.state_hash, 'geographic-full-information/1', now(), context.interface);
    return { id, participantId: participant.id as string, participantLabel: participant.label as string };
  }
  delivered(observationId: string) { this.run('UPDATE observations SET delivered_at=COALESCE(delivered_at,?) WHERE id=?', now(), observationId); }
  presented(observationId: string, context: CaptureContext, clientTime: string | null) {
    const row = this.one('SELECT o.id FROM observations o JOIN participants p ON p.id=o.participant_id WHERE o.id=? AND p.principal_id=?', observationId, context.principalId);
    if (!row) throw new Error('Observation does not belong to this participant.');
    this.run('UPDATE observations SET presented_at=COALESCE(presented_at,?),client_time=COALESCE(client_time,?) WHERE id=?', now(), clientTime?.slice(0,40) ?? null, observationId);
  }
  command(row: Row): CapturedCommand {
    return { id: row.id, runId: row.run_id, participantId: row.participant_id, participantLabel: row.label,
      commandId: row.command_id, operation: JSON.parse(row.operation), receivedAt: row.received_at, committedAt: row.committed_at,
      interface: row.interface, status: row.status, reasonCode: row.reason_code, explanation: row.explanation,
      expectedRevision: row.expected_revision, validatedRevision: row.validated_revision, observationId: row.observation_id,
      validationObservationId: row.validation_observation_id, beforeHash: row.before_hash, afterHash: row.after_hash,
      nextRunId: row.next_run_id, retries: row.retries, source: row.source, guidance: row.guidance ? JSON.parse(row.guidance) : null };
  }
  commands(runId: string) { return this.all('SELECT c.*,p.label FROM command_results c JOIN participants p ON p.id=c.participant_id WHERE c.run_id=? ORDER BY c.rowid', runId).map(r => this.command(r)); }
  summary(row: Row): RunSummary {
    return { id: row.id, mapId: row.map_id, label: row.label, createdAt: row.created_at, archivedAt: row.archived_at,
      status: row.status, endReason: row.end_reason, origin: row.origin, parentRunId: row.parent_run_id,
      parentRevision: row.parent_run_id ? this.one("SELECT json_extract(operation,'$.save.capture.serviceRevision') AS revision FROM command_results WHERE next_run_id=? AND json_extract(operation,'$.save.capture.runId')=? LIMIT 1",row.id,row.parent_run_id)?.revision ?? null : null,
      sourceHash: row.source_hash,
      initialRevision: row.initial_revision, currentRevision: row.current_revision, manifest: JSON.parse(row.manifest),
      artifactHash: row.artifact_hash, objective: row.objective, quality: JSON.parse(row.quality),
      accepted: Number(row.accepted ?? 0), rejected: Number(row.rejected ?? 0), notes: Number(row.notes ?? 0) };
  }
  listRuns() {
    return this.all(`SELECT r.*, (SELECT COUNT(*) FROM command_results c WHERE c.run_id=r.id AND c.status=200) accepted,
      (SELECT COUNT(*) FROM command_results c WHERE c.run_id=r.id AND c.status<>200) rejected,
      (SELECT COUNT(*) FROM annotations a WHERE a.run_id=r.id AND a.audience='exercise') notes
      FROM runs r ORDER BY r.rowid DESC`).map(r => this.summary(r));
  }
  annotations(runId: string, principalId: string): Annotation[] {
    return this.all(`SELECT a.*,p.label FROM annotations a JOIN participants p ON p.id=a.participant_id WHERE a.run_id=? AND (a.audience='exercise' OR p.principal_id=?) ORDER BY a.rowid`, runId, principalId)
      .map(r => ({ id: r.id, runId: r.run_id, commandId: r.result_id, author: r.participant_id, authorLabel: r.label, kind: r.kind, text: r.text, audience: r.audience, createdAt: r.created_at, timing: r.timing, rubric: r.rubric }));
  }
  review(runId: string, principalId: string): RunReview {
    const run = this.listRuns().find(r => r.id === runId); if (!run) throw new Error('Unknown exercise.');
    const observations: CapturedObservation[] = this.all(`SELECT * FROM observations WHERE run_id=? OR id IN
      (SELECT validation_observation_id FROM command_results WHERE run_id=?) ORDER BY rowid`, runId,runId)
      .map(r => ({ id: r.id, runId: r.run_id, participantId: r.participant_id, revision: r.revision, stateHash: r.state_hash, projection: r.projection, issuedAt: r.issued_at, deliveredAt: r.delivered_at, presentedAt: r.presented_at, clientTime: r.client_time, interface: r.interface }));
    return { run, commands: this.commands(runId), observations, annotations: this.annotations(runId, principalId),
      checkpoints: this.all('SELECT * FROM checkpoints WHERE run_id=? ORDER BY revision', runId).map(r => ({ revision: r.revision, stateHash: r.state_hash, turn: r.turn, createdAt: r.created_at })),
      initialEvents: JSON.parse(this.one('SELECT initial_events FROM runs WHERE id=?', runId)!.initial_events),
      participants: this.all('SELECT id,label,kind FROM participants WHERE run_id=?', runId) as RunReview['participants'],
      telemetry: this.all('SELECT type,COUNT(*) AS count FROM telemetry WHERE run_id=? GROUP BY type', runId) as RunReview['telemetry'] };
  }
  annotate(runId: string, context: CaptureContext, input: { commandId?: string; kind: Annotation['kind']; text: string; audience: Annotation['audience']; rubric?: string; id?: string }) {
    if (!input || !['intent','assumption','reflection','assessment'].includes(input.kind) || !['exercise','private'].includes(input.audience) || typeof input.text !== 'string' || !input.text.trim() || input.text.length > 2000) throw new Error('Choose a note type, audience and text (up to 2,000 characters).');
    const run = this.one('SELECT * FROM runs WHERE id=?', runId); if (!run) throw new Error('Unknown exercise.');
    if (input.commandId && !this.one('SELECT id FROM command_results WHERE id=? AND run_id=?', input.commandId, runId)) throw new Error('The decision belongs to another exercise.');
    const participant = this.participant(runId, context), id = input.id && /^[a-f0-9-]{36}$/.test(input.id) ? input.id : randomUUID();
    const existing = this.one('SELECT * FROM annotations WHERE id=?', id);
    if (existing) {
      if (existing.participant_id !== participant.id || existing.run_id !== runId || existing.text !== input.text.trim() || existing.kind !== input.kind || existing.audience !== input.audience || existing.result_id !== (input.commandId ?? null) || existing.rubric !== (typeof input.rubric === 'string' ? input.rubric.slice(0,200) : null)) throw new Error('Note ID conflicts with another note.');
      return id;
    }
    this.run('INSERT INTO annotations VALUES(?,?,?,?,?,?,?,?,?,?)', id, runId, input.commandId ?? null, participant.id, input.kind, input.text.trim(), input.audience, now(), input.commandId || run.status === 'archived' ? 'retrospective' : 'during-exercise', typeof input.rubric === 'string' ? input.rubric.slice(0,200) : null);
    return id;
  }
  telemetry(runId: string, context: CaptureContext, batch: unknown) {
    if (!Array.isArray(batch) || batch.length > 50) throw new Error('Telemetry batches allow at most 50 events.');
    const types = ['preview','restriction','cancel','help','ready','disconnect','reconnect','xr-start','xr-end','dropped'];
    const clean = batch.map(item => {
      if (!item || typeof item.id !== 'string' || !/^[a-f0-9-]{36}$/.test(item.id) || !types.includes(item.type)) throw new Error('Invalid telemetry event.');
      const data = item.data && typeof item.data === 'object' ? item.data : {};
      return { id: item.id, type: item.type, clientTime: typeof item.clientTime === 'string' ? item.clientTime.slice(0,40) : null,
        payload: { reasonCode: typeof data.reasonCode === 'string' ? data.reasonCode.slice(0,80) : null,
          action: typeof data.action === 'string' ? data.action.slice(0,40) : null,
          count: Number.isSafeInteger(data.count) && data.count >= 0 ? Math.min(data.count,100000) : null } };
    });
    this.transaction(() => {
      const p = this.participant(runId, context);
      for (const item of clean) this.run('INSERT OR IGNORE INTO telemetry VALUES(?,?,?,?,?,?,?,?)', item.id, runId, p.id, item.type, now(), item.clientTime, context.interface, JSON.stringify(item.payload));
    });
  }
  exportRun(runId: string, principalId: string) {
    const review = this.review(runId, principalId), artifact = this.one('SELECT data FROM artifacts WHERE hash=?', review.run.artifactHash)!.data;
    if (digest(artifact) !== review.run.artifactHash) throw new Error('Pinned content failed its integrity check.');
    const hashes=new Set([...review.checkpoints.map(cp=>cp.stateHash),...review.commands.flatMap(c=>[c.beforeHash,c.afterHash]),...review.observations.map(o=>o.stateHash)]);
    const body = { schema: CAPTURE_SCHEMA, purpose: 'exercise-review', trainingPermission: 'unspecified', exportedAt: now(), review,
      states: Object.fromEntries([...hashes].map(hash => [hash, this.state(hash)])),
      artifact: JSON.parse(artifact), events: this.all('SELECT id,sequence,kind,participant_id,result_id,revision,server_time,payload FROM events WHERE run_id=? ORDER BY sequence', runId).map(r => ({ ...r, payload: JSON.parse(r.payload) })),
      telemetry: this.all('SELECT * FROM telemetry WHERE run_id=? ORDER BY rowid',runId).map(r=>({...r,payload:JSON.parse(r.payload)})) };
    return { ...body, artifactDigest: digest(body) };
  }
  backup(path: string) {
    if (existsSync(path)) throw new Error('Backup destination already exists.');
    mkdirSync(dirname(path), { recursive: true });
    // VACUUM INTO produces a consistent standalone copy, including committed WAL records.
    this.db.prepare('VACUUM INTO ?').run(path); chmodSync(path, 0o600);
    const backup = new DatabaseSync(path, { readOnly: true });
    try { if (backup.prepare('PRAGMA integrity_check').get()?.integrity_check !== 'ok') throw new Error('Backup integrity check failed.'); }
    finally { backup.close(); }
    return { path, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') };
  }
}
