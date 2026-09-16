import libraryData from '../../scenarios/maritime-crises.v1.json' with { type: 'json' };
import { validateLibrary } from '../../scenarios/scoring.ts';
import type { Library } from '../../scenarios/scoring.ts';
import type { Asset, Side, Game } from './types.ts';

validateLibrary(libraryData);
export const library: Library = libraryData;
export const scenario = (id: string) => {
  const s = library.scenarios.find(s => s.id === id);
  if (!s) throw new Error('Unknown maritime scenario.');
  return s;
};
export interface Spec {
  sectors: string[]; edges: [string, string][]; roster: Asset[];
  objectives: Record<Side, string>; guidance: string[]; agreements: string[]; q2: number;
}
const asset = (id: string, side: Side, kind: Asset['kind'], sector: string, cargo: string[] = [], capacity = kind === 'merchant' || kind === 'staff' ? 0 : 2): Asset =>
  ({ id, side, kind, sector, cargo, capacity, ready: true, name: `${id} · ${kind === 'staff' ? 'Coordination team' : kind === 'rescue' ? 'Response launch' : kind === 'merchant' ? 'Merchant vessel' : 'Supply transport'}` });
const staff = (count = 2) => Array.from({ length: count }, (_, i) => asset(`R${i + 1}`, 'red', 'staff', 'Staff'));
const chain = (sectors: string[]): [string, string][] => sectors.slice(1).map((s, i) => [sectors[i], s]);
const response = (count: number, sector: string, side: Side = 'blue') => Array.from({ length: count }, (_, i) => asset(`${side === 'blue' ? 'B' : 'R'}${i + 1}`, side, 'rescue', sector));
const merchants = (count: number, sector: string) => Array.from({ length: count }, (_, i) => asset(`T${i + 1}`, 'blue', 'merchant', sector));

export function specification(id: string): Spec {
  const s = scenario(id);
  let sectors: string[], roster: Asset[], objectives: Record<Side, string>, agreements: string[] = [], guidance: string[] = [];
  if (id.startsWith('SPR')) {
    sectors = ['Staging', 'Approach', 'Outpost'];
    roster = [asset('B1', 'blue', 'transport', 'Staging', ['S1', 'S2']), asset('B2', 'blue', 'transport', 'Staging', ['S3', 'S4']), asset('B3', 'blue', 'rescue', id === 'SPR-F01' ? 'Approach' : 'Staging', id === 'SPR-F01' ? ['M1'] : [], id === 'SPR-F01' ? 1 : 2), ...staff()];
    objectives = { blue: `Deliver at least three routine manifests by round ${s.rounds}.${id === 'SPR-F01' ? ' Deliver medical M1 by round 5; it is protected from challenge.' : ''}`, red: 'Keep routine deliveries to one or fewer. Pressure is finite; each manifest can be delayed at most twice.' };
    guidance = ['Reaching Outpost does not deliver cargo. Each delivery uses the transport’s action and 1 CP.', 'Assurance and Challenge target the exact action listed. Ties favor the mission action. Changing the declared lead cargo does not change a vessel’s movement target.'];
    if (id === 'SPR-F01') guidance.push('B2 is unavailable in rounds 3–4. M1 on time is a shared requirement; B3 carries only medical cargo.');
  } else if (id === 'SEN-H01') {
    sectors = ['Incident', 'Review', 'Exit']; roster = [...response(2, 'Incident'), ...response(1, 'Review', 'red')];
    objectives = { blue: 'Verify case records E1, E2 and E3, then hand them to the investigator.', red: 'Secure an accepted release agreement and file your statement of position (round 2 onward). Both missions can succeed.' };
    agreements = ['release_after_record', 'release_now'];
    guidance = ['Verify three case records before Handover. Handover uses staff effort, not a vessel action.', 'A proposal can only be accepted by the other side in a later round. Release never erases evidence.', 'Only investigator handover may be challenged. Crew welfare and evidence are protected.'];
  } else if (id === 'SEN-F01') {
    sectors = ['West Staging', 'Casualty', 'East Staging']; roster = [...response(2, 'East Staging'), ...response(2, 'West Staging', 'red')];
    objectives = { blue: 'Rescue at least three groups collectively; agree Blue or joint coordination.', red: 'Rescue at least three groups collectively; agree Red or joint coordination.' };
    agreements = ['blue_lead', 'red_lead', 'joint_lead'];
    guidance = ['Each rescue launch holds two groups. Move to Casualty before rescuing.', 'Both teams share rescue credit. Duplicate rescue orders spend effort but rescue the group only once.', 'Blue has first resolution priority on odd rounds; Red on even rounds, for both duplicate-rescue custody and competing coordination acceptances. B2 and R2 unavailable in round 3.', 'First accepted coordination agreement is binding. Joint coordination can satisfy both missions.'];
  } else if (id === 'HOR-H01') {
    sectors = ['Eastern Approach', 'Gate', 'Western Exit']; roster = [...merchants(1, 'Eastern Approach'), ...response(1, 'Gate'), ...staff()];
    objectives = { blue: 'Complete T1’s transit; passage by round 4 earns timeliness points. Complete two shared welfare checks on different rounds.', red: 'Achieve custody by two consecutive successful departure delays; complete the shared welfare checks.' };
    guidance = ['Only Gate → Western Exit can be challenged. Skipping a departure attempt resets the consecutive-delay count.', 'B1 becomes available in round 3. Before then, Assurance is limited to 1 CP; afterward it may use 2.', 'This teaching scenario favors a cautious, assured passage. It is not a balanced competitive ranking.'];
  } else if (id === 'HOR-F01') {
    sectors = ['Holding', 'Approach', 'Gate', 'Exit']; roster = [...merchants(5, 'Holding'), ...response(2, 'Holding'), ...staff()];
    objectives = { blue: 'Exit at least four merchants, including priority T1; perform a response-asset welfare intervention at Holding by round 4.', red: 'Keep transits to two or fewer while preserving the shared welfare requirement.' };
    guidance = ['Verify B-Q1 before an exit can be ordered in a later round. Only Gate → Exit is challengeable.', 'B2 unavailable in rounds 2–3. Welfare uses a ready response asset at Holding, with no permanent capacity cost.'];
  } else if (id === 'BAB-H01') {
    sectors = ['Southern Staging', 'Casualty', 'Northern Exit']; roster = [...response(3, 'Southern Staging'), ...merchants(2, 'Southern Staging'), ...staff()];
    objectives = { blue: 'Rescue at least three groups and exit at least one merchant.', red: 'Keep both merchant passages paused and obtain an accepted noninterference statement. At least three groups must be rescued.' };
    agreements = ['noninterference'];
    guidance = ['Swift is already disabled in the scenario. Rescue and response-asset movement are protected.', 'B3 unavailable in round 3. Noninterference proposals open in round 5; acceptance takes a later round.', 'Only merchant Casualty → Northern Exit moves can be challenged.'];
  } else {
    sectors = ['Southern Staging', 'Gate', 'Northern Exit', 'Distress']; roster = [...response(3, 'Southern Staging'), ...merchants(4, 'Southern Staging'), ...staff()];
    objectives = { blue: 'Exit at least three merchants including aid vessel T1, and recover both distress groups by round 6.', red: 'Keep merchant passages to one or fewer while meeting the shared rescue obligation.' };
    guidance = ['Distress groups appear in round 3 at Distress. Both must reach safe custody by round 6.', 'Route: Southern Staging ↔ Gate ↔ Northern Exit; Gate ↔ Distress.', 'Response assets and rescue are protected. Only merchant Gate → Northern Exit can be challenged.'];
  }
  return { sectors, edges: id === 'BAB-F01' ? [['Southern Staging', 'Gate'], ['Gate', 'Northern Exit'], ['Gate', 'Distress']] : chain(sectors), roster, objectives, agreements, guidance, q2: id === 'SEN-F01' || id.startsWith('BAB') ? 4 : 3 };
}

/** Referee truth stays in the authoritative engine, never in candidate text or an unverified observation. */
export function reportText(game: Game, side: Side, index: number): { claim: string; truth: string } {
  const id = game.scenarioId;
  if (index === 1) return { claim: id.startsWith('SPR') ? 'The manifest identifies the declared cargo and any medical exception.' : id === 'HOR-F01' ? 'The initial navigation picture is unreliable; verification establishes the exercise’s navigation procedure.' : id.startsWith('BAB') || id === 'SEN-F01' ? 'The briefing identifies the unique mission subjects and protected response assets.' : 'The initial identity and crew-welfare record is available.', truth: 'Confirmed against the exercise record.' };
  if (id === 'BAB-H01' && side === 'red') return { claim: 'All four groups were recovered by the end of round 3.', truth: game.items.filter(i => i.kind === 'survivor' && i.completed !== null && i.completed <= 3).length === 4 ? 'Confirmed at the end of round 3.' : 'False at the end of round 3; recovery was incomplete.' };
  if (id === 'BAB-F01' && side === 'red') return { claim: 'Aid vessel T1 had exited by the end of round 3.', truth: game.assets.find(a => a.id === 'T1')?.sector === 'Exited' ? 'Confirmed at the end of round 3.' : 'False at the end of round 3.' };
  const claims: Record<string, [string, string]> = {
    'SPR-H01': ['S4 was already received.', 'A fifth supply manifest exists.'],
    'SPR-F01': ['Notification acknowledgment is on file.', 'M1 contains routine cargo.'],
    'SEN-H01': ['A circulated video is the complete incident record.', 'Release requires admission of fault.'],
    'SEN-F01': ['An additional rescue group exists.', 'An additional rescue group exists.'],
    'HOR-H01': ['T1 has already altered destination.', 'All support remains unavailable.'],
    'HOR-F01': ['A broadcast diversion instruction is authenticated.', 'A broadcast diversion instruction is authenticated.'],
    'BAB-H01': ['The disabled transport has sunk.', ''], 'BAB-F01': ['The distress call is fabricated.', ''],
  };
  return { claim: claims[id][side === 'blue' ? 0 : 1], truth: 'False according to the pinned exercise truth card.' };
}
