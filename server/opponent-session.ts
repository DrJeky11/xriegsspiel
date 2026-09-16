import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, existsSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import type { CaptureStore } from './capture-store.ts';
import { OpponentCapture } from './opponent-capture.ts';
import { ensureOpponentTerrain } from './opponent-terrain.ts';
import { navigation } from '../src/opponent/geography.ts';
import { Worker } from 'node:worker_threads';
import { advanceRound, createGame, createGeographicGame, observe, resolveRound, result, terminalLedger, validateOrders } from '../src/opponent/rules.ts';
import { DIFFICULTIES, POLICY_VERSION } from '../src/opponent/policy.ts';
import { opposite } from '../src/opponent/types.ts';
import type { Difficulty, Game, Observation, Order, PolicyDecision, Side } from '../src/opponent/types.ts';

interface RoundRecord {
  before: Game; orders: Record<Side, Order[]>; observations: Record<Side, Observation>;
  decision: PolicyDecision | null; afterHash: string;
}
interface Run {
  schema: 'opponent-run/1'; id: string; branchId: string; parent: string | null; createdAt: string;
  revision: number; phase: 'planning' | 'review' | 'complete'; paused: boolean; humanSide: Side;
  difficulty: Difficulty; seed: number; game: Game; aiDecision: PolicyDecision | null;
  sealed: Partial<Record<Side, Order[]>>; takeover: boolean; refereeModified: boolean;
  contest: { eventId: string; reason: string } | null;
  audit: { revision: number; message: string; time: string }[]; rounds: RoundRecord[];
  credentials: { player: string; referee: string }; commands: Record<string, string>;
}
export type OpponentOperation =
  | { type: 'orders'; side: Side; orders: Order[] }
  | { type: 'next' }
  | { type: 'pause'; paused: boolean }
  | { type: 'takeover'; enabled: boolean }
  | { type: 'contest'; eventId: string; reason: string }
  | { type: 'ruling'; disposition: 'uphold' | 'replay'; reason: string };
export interface OpponentCommand { id: string; revision: number; operation: OpponentOperation; observationId?: string }
export interface RunView {
  observationId?: string; capture?: 'durable';
  id: string; branchId: string; parent: string | null; revision: number; phase: Run['phase']; paused: boolean;
  humanSide: Side; difficulty: Difficulty; takeover: boolean; refereeModified: boolean;
  observation: Observation; sealed: Record<Side, boolean>; ownOrders: Order[] | null;
  contest: Run['contest']; audit: Run['audit']; canReferee: boolean;
  result: ReturnType<typeof result> | null; review: { round: number; orders: Record<Side, Order[]>; decision: PolicyDecision | null; observation: Observation }[];
}
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const tokenHash = (value: string) => createHash('sha256').update(value).digest('hex');
function authorize(run: Run, token: string): 'player' | 'referee' {
  const hashed = tokenHash(token);
  if (hashed === run.credentials.player) return 'player';
  if (hashed === run.credentials.referee) return 'referee';
  throw new Error('A valid exercise invitation or referee key is required.');
}
export function verifyOpponentReplay(run: Run) {
  if (run.game.geography) ensureOpponentTerrain();
  let game = (run.game.geography ? createGeographicGame : createGame)(run.game.scenarioId, run.game.variant);
  for (const record of run.rounds) {
    if (hash(game) !== hash(record.before)) throw new Error('Opponent checkpoint does not match replay.');
    game = resolveRound(game, record.orders);
    if (hash(game) !== record.afterHash) throw new Error('Opponent round does not match replay.');
    if (record !== run.rounds.at(-1) || run.phase === 'planning') game = advanceRound(game);
  }
  if (hash(game) !== hash(run.game)) throw new Error('Opponent save does not match replay. Preserve the file for recovery.');
}
export type Planner = (observation: Observation, difficulty: Difficulty, seed: number) => Promise<PolicyDecision>;
export const workerPlanner: Planner = (observation, difficulty, seed) => new Promise(resolve => {
  const worker = new Worker(new URL('./opponent-worker.ts', import.meta.url), { workerData: { observation, difficulty, seed, navigation: observation.geography ? navigation(observation.geography.mapId) : undefined } });
  let settled = false;
  const fallback = (message: string): PolicyDecision => ({ version: observation.geography ? POLICY_VERSION : 'maritime-planner/1.0.0', difficulty, seed, orders: [], reason: 'Policy unavailable; held this round without spending resources.', fallback: message, considered: 0, transitions: 0, value: 0, alternatives: [] });
  const finish = (decision: PolicyDecision) => { if (settled) return; settled = true; clearTimeout(timer); void worker.terminate(); resolve(decision); };
  const deadline = observation.geography ? 3000 : 1000;
  const timer = setTimeout(() => finish(fallback(`${deadline / 1000}-second worker deadline exceeded.`)), deadline);
  worker.once('message', decision => finish(decision));
  worker.once('error', error => finish(fallback(error.message)));
  worker.once('exit', code => { if (!settled) finish(fallback(`Worker exited before returning a decision (${code}).`)); });
});

export function createOpponentSessions(directory: string, planner: Planner = workerPlanner, capture?: CaptureStore) {
  const recorder=capture?new OpponentCapture(capture):null;
  const root = join(directory, 'opponents'); mkdirSync(root, { recursive: true, mode: 0o700 });
  const cache = new Map<string, Run>(), queues = new Map<string, Promise<unknown>>();
  const file = (id: string) => { if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Unknown exercise.'); return join(root, `${id}.json`); };
  const save = (run: Run, write?:()=>void, branch?:Run, expectedRevision?:number) => {
    if(recorder){recorder.persist(run,write,branch,expectedRevision);cache.set(run.id,run);return;}
    const target = file(run.id), temporary = `${target}.tmp`;
    writeFileSync(temporary, JSON.stringify(run), { mode: 0o600, flush: true }); renameSync(temporary, target); cache.set(run.id, run);
  };
  const load = (id: string) => {
    if (cache.has(id)&&!recorder) return cache.get(id)!;
    const path = file(id),stored=recorder?.load(id);if(!stored&&!existsSync(path))throw new Error('Unknown exercise.');
    const run = JSON.parse(stored??readFileSync(path,'utf8')) as Run;
    if (run.schema !== 'opponent-run/1' || run.id !== id) throw new Error('Incompatible opponent save.');
    verifyOpponentReplay(run);
    if(recorder&&!stored){
      const branches:Run[]=[];let parent=run.parent;const seen=new Set<string>();
      while(parent){if(seen.has(parent)||!/^[a-f0-9-]{36}$/.test(parent))throw new Error('Invalid scenario branch lineage.');seen.add(parent);const branch=JSON.parse(readFileSync(join(root,'branches',parent+'.json'),'utf8')) as Run;if(branch.id!==id||branch.branchId!==parent)throw new Error('Scenario branch identity differs.');verifyOpponentReplay(branch);branches.push(branch);parent=branch.parent;}
      capture!.transaction(()=>{for(const branch of branches)recorder.persist(run,undefined,branch);recorder.persist(run);});
    }
    cache.set(id, run); return run;
  };
  const note = (run: Run, message: string) => run.audit.push({ revision: run.revision, message, time: new Date().toISOString() });
  const prepare = async (run: Run) => {
    if (run.takeover) { run.aiDecision = null; return; }
    const ai = opposite(run.humanSide), observation = observe(run.game, ai);
    let decision = await planner(observation, run.difficulty, (run.seed + run.game.round * 997) >>> 0);
    try { validateOrders(run.game, ai, decision.orders); }
    catch { decision = { version: run.game.geography ? POLICY_VERSION : 'maritime-planner/1.0.0', difficulty: run.difficulty, seed: run.seed, orders: [], reason: 'Invalid policy output replaced with Hold.', fallback: 'Invalid policy output', considered: 0, transitions: 0, value: 0, alternatives: [] }; }
    run.aiDecision = decision; run.sealed[ai] = structuredClone(decision.orders);
    if (decision.fallback) note(run, `AI fallback: ${decision.fallback}`);
  };
  const view = (run: Run, token: string, requested?: Side): RunView => {
    const role = authorize(run, token), side = role === 'referee' && requested && (run.takeover || run.phase === 'complete') ? requested : run.humanSide;
    const resultView:RunView = {
      id: run.id, branchId: run.branchId, parent: run.parent, revision: run.revision, phase: run.phase, paused: run.paused,
      humanSide: run.humanSide, difficulty: run.difficulty, takeover: run.takeover, refereeModified: run.refereeModified,
      observation: observe(run.game, side), sealed: { blue: !!run.sealed.blue, red: !!run.sealed.red }, ownOrders: structuredClone(run.sealed[side] ?? null),
      contest: structuredClone(run.contest), audit: structuredClone(run.audit), canReferee: role === 'referee',
      result: run.phase === 'complete' ? result(run.game, run.refereeModified) : null,
      review: run.rounds.map(r => ({ round: r.before.round, observation: structuredClone(r.observations[side]), orders: { blue: structuredClone(r.orders.blue.filter(o => side === 'blue' || run.phase === 'complete' || o.type !== 'verify')), red: structuredClone(r.orders.red.filter(o => side === 'red' || run.phase === 'complete' || o.type !== 'verify')) }, decision: run.phase === 'complete' ? structuredClone(r.decision) : null })),
    };
    if(recorder){resultView.observationId=recorder.observation(resultView,role);resultView.capture='durable';}
    return resultView;
  };
  return {
    async create(input: { scenarioId: string; difficulty: Difficulty; humanSide: Side; seed?: number; variant?: 'short-window/1'; geographic?: boolean }) {
      if (!input || !Object.hasOwn(DIFFICULTIES, input.difficulty) || !['blue', 'red'].includes(input.humanSide)) throw new Error('Choose a scenario, side and difficulty.');
      if (input.geographic) ensureOpponentTerrain();
      const playerToken = randomBytes(24).toString('base64url'), refereeToken = randomBytes(24).toString('base64url');
      const run: Run = { schema: 'opponent-run/1', id: randomUUID(), branchId: randomUUID(), parent: null, createdAt: new Date().toISOString(), revision: 0, phase: 'planning', paused: false, humanSide: input.humanSide, difficulty: input.difficulty, seed: input.seed === undefined ? randomBytes(4).readUInt32LE() : input.seed >>> 0, game: (input.geographic ? createGeographicGame : createGame)(input.scenarioId, input.variant), aiDecision: null, sealed: {}, takeover: false, refereeModified: false, contest: null, audit: [], rounds: [], credentials: { player: tokenHash(playerToken), referee: tokenHash(refereeToken) }, commands: {} };
      await prepare(run); save(run);
      return { playerToken, refereeToken, state: view(run, playerToken) };
    },
    get(id: string, token: string, side?: Side) { return view(load(id), token, side); },
    async submit(id: string, token: string, command: OpponentCommand, requestedSide?: Side) {
      // Serialize each run through persistence and planning; independent runs have independent queues.
      const prior = queues.get(id) ?? Promise.resolve();
      const operation = prior.catch(() => {}).then(async () => {
        const existing = load(id), role = authorize(existing, token);
        if (!command || typeof command.id !== 'string' || !/^[a-zA-Z0-9-]{1,100}$/.test(command.id) || !Number.isSafeInteger(command.revision) || !command.operation || typeof command.operation !== 'object') throw new Error('Malformed command.');
        const captured=recorder?.prior(id,role,command);
        if(captured){recorder!.retry(captured.id);if(captured.status==='rejected')throw new Error(captured.explanation);}
        const serialized = JSON.stringify({ role, command });
        if (existing.commands[command.id]) {
          if (existing.commands[command.id] !== serialized) throw new Error('Command ID already belongs to a different request.');
          return { state: view(existing, token, requestedSide), duplicate: true };
        }
        const decisionView=view(existing,token,requestedSide);let persisting=false,archivedBranch:Run|undefined;
        try {
        if(command.observationId&&recorder&&!recorder.observationMatches(command.observationId,id,role,command.revision))throw new Error('The decision view does not match this exercise and role. Refresh before ordering.');
        if (command.revision !== existing.revision) throw new Error('Another participant changed this exercise. Refresh and review your plan.');
        const run = structuredClone(existing), op = command.operation;
        run.revision++;
        const referee = () => { if (role !== 'referee') throw new Error('This action requires the referee key.'); };
        if (op.type === 'orders') {
          if (run.paused || run.contest || run.phase !== 'planning') throw new Error('Orders are closed while paused, contested or reviewing results.');
          if (op.side !== run.humanSide && !(role === 'referee' && run.takeover && op.side === opposite(run.humanSide))) throw new Error('This side is controlled by the opponent.');
          if (run.sealed[op.side]) throw new Error('This side has already sealed its orders.');
          validateOrders(run.game, op.side, op.orders); run.sealed[op.side] = structuredClone(op.orders);
          if (run.sealed.blue && run.sealed.red) {
            const orders = run.sealed as Record<Side, Order[]>;
            const record: RoundRecord = { before: structuredClone(run.game), orders: structuredClone(orders), observations: { blue: observe(run.game, 'blue'), red: observe(run.game, 'red') }, decision: structuredClone(run.aiDecision), afterHash: '' };
            run.game = resolveRound(run.game, orders); record.afterHash = hash(run.game); run.rounds.push(record); run.phase = 'review';
          }
        } else if (op.type === 'next') {
          if (run.phase !== 'review' || run.paused || run.contest) throw new Error('Finish the result review and resolve any contest before continuing.');
          if (run.game.finished) run.phase = 'complete';
          else { run.game = advanceRound(run.game); run.phase = 'planning'; run.sealed = {}; await prepare(run); }
        } else if (op.type === 'pause') {
          if (typeof op.paused !== 'boolean') throw new Error('Invalid pause state.');
          run.paused = op.paused; note(run, op.paused ? 'Exercise paused.' : 'Exercise resumed.');
        } else if (op.type === 'takeover') {
          referee(); if (run.phase !== 'planning' || typeof op.enabled !== 'boolean') throw new Error('Change control before sealing this round.');
          if (run.sealed[run.humanSide]) throw new Error('Resolve the sealed human plan before changing control.');
          run.takeover = op.enabled; run.refereeModified = true; run.sealed = {}; run.aiDecision = null;
          note(run, op.enabled ? 'Referee took control of the AI side. This is a teaching run.' : 'Referee restored AI control.');
          await prepare(run);
        } else if (op.type === 'contest') {
          if (run.phase !== 'review' || run.contest) throw new Error('Contest a resolved event during its round review.');
          if (typeof op.reason !== 'string' || !op.reason.trim() || op.reason.length > 1000 || !observe(run.game, run.humanSide).events.some(e => e.id === op.eventId && e.round === run.game.round)) throw new Error('Choose a visible event and supply a short reason.');
          run.contest = { eventId: op.eventId, reason: op.reason.trim() }; note(run, `Contested ${op.eventId}: ${op.reason.trim()}`);
        } else if (op.type === 'ruling') {
          referee(); if (!run.contest || typeof op.reason !== 'string' || !op.reason.trim() || op.reason.length > 1000 || !['uphold', 'replay'].includes(op.disposition)) throw new Error('A pending contest and recorded ruling are required.');
          run.refereeModified = true; note(run, `Referee ${op.disposition}: ${op.reason.trim()}`);
          if (op.disposition === 'replay') {
            archivedBranch=existing;
            if(!recorder){
            const archive = join(root, 'branches'); mkdirSync(archive, { recursive: true, mode: 0o700 });
            const archiveFile = join(archive, `${run.branchId}.json`);
            // A crash after archiving but before the new branch is saved can be retried.
            if (existsSync(archiveFile)) {
              if (readFileSync(archiveFile, 'utf8') !== JSON.stringify(existing)) throw new Error('Archived branch differs from this checkpoint. Preserve both records for recovery.');
            } else writeFileSync(archiveFile, JSON.stringify(existing), { mode: 0o600, flag: 'wx', flush: true });
            }
            run.parent = run.branchId; run.branchId = randomUUID(); run.game = run.rounds.pop()!.before;
            run.phase = 'planning'; run.sealed = {}; run.aiDecision = null; run.paused = false;
            note(run, 'Replaying the disputed round as a new branch. Previously revealed orders cannot be forgotten; excluded from clean benchmarks.');
            await prepare(run);
          }
          run.contest = null;
        } else throw new Error('Unknown opponent command.');
        run.commands[command.id] = serialized;persisting=true;
        let committedView:RunView|undefined;
        save(run,()=>{committedView=view(run,token,requestedSide);recorder?.decision(decisionView,role,command,'accepted','Command committed.',run.revision,'command.accepted',committedView);},archivedBranch,existing.revision);
        return { state: committedView??view(run, token, requestedSide), duplicate: false };
        }catch(error){
          if(persisting)throw Object.assign(new Error('Scenario storage could not confirm this order. Retry the same command ID.'),{storageFailure:true});
          if(recorder&&!captured)recorder.decision(decisionView,role,command,'rejected',error instanceof Error?error.message:'Command rejected.',existing.revision,command.revision!==existing.revision?'revision.stale':command.operation.type==='orders'?'orders.restricted':'control.restricted');
          throw error;
        }
      });
      queues.set(id, operation); try { return await operation; } finally { if (queues.get(id) === operation) queues.delete(id); }
    },
    presented(id:string,token:string,observationId:string){const run=load(id),role=authorize(run,token);recorder?.presented(observationId,id,role);},
    learning(id:string,token:string){const run=load(id),role=authorize(run,token);if(!recorder)throw new Error('This service has no exercise database.');return {state:view(run,token),learning:recorder.learning(id,role,run.phase==='complete')};},
    annotate(id:string,token:string,input:{id:string;decisionId?:string;kind:string;text:string}){const run=load(id),role=authorize(run,token);if(!recorder)throw new Error('This service has no exercise database.');return recorder.note(id,role,input);},
    export(id: string, token: string) {
      const run = load(id); authorize(run, token);
      if (run.phase !== 'complete') throw new Error('Complete the exercise and its final review before exporting the full after-action record.');
      verifyOpponentReplay(run);
      return { schema: 'xriegsspiel-opponent-replay/1', id: run.id, branchId: run.branchId, parent: run.parent, createdAt: run.createdAt, variant: run.game.variant ?? 'baseline', difficulty: run.difficulty, seed: run.seed, refereeModified: run.refereeModified, audit: structuredClone(run.audit), rounds: structuredClone(run.rounds), ledger: terminalLedger(run.game, run.refereeModified), result: result(run.game, run.refereeModified), learning:recorder?.learning(id,authorize(run,token),true), disclosure: 'Completed exercise: includes both sides’ historical observations and the AI’s recorded decision factors. Generated game records, not expert human demonstrations.' };
    },
  };
}
