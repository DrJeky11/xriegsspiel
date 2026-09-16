import definitions from '../../scenarios/maritime-crises.v2.json' with { type: 'json' };
import { validateLibrary, scoreLedger } from '../../scenarios/scoring.ts';
import type { Library } from '../../scenarios/scoring.ts';
import * as sector from './sector-rules.ts';
import { specification } from './content.ts';
import { batchError, orderKey, orderCost, describeOrder, opposite } from './types.ts';
import type { Asset, Candidate, Game, Observation, Order, Side } from './types.ts';
import { assertGeography, atGoal, cellsFor, geographicRoutes, geographicSetup, goal, goalDistance, separation, tileLabel } from './geography.ts';

export const ENGINE_VERSION = 'maritime-engine/2';
validateLibrary(definitions); export const library: Library = definitions;
export const scenario = (id: string) => { const s = library.scenarios.find(s=>s.id===id); if(!s)throw new Error('Unknown geographic scenario.');return s; };
const sides: Side[] = ['blue','red'];
function event(game: Game, type: string, message: string, side: Side | null = null, order?: Order, audience: 'public' | Side = 'public') {
  game.events.push({id:`r${game.round}-e${game.events.length+1}`,round:game.round,type,message,side,audience,rule:`maritime-geographic-rules/1.0.0:${type}`,...(order?{order:structuredClone(order)}:{})});
}
export function exitGoal(id: string) { return id==='HOR-H01'?'Western Exit':id==='HOR-F01'?'Exit':'Northern Exit'; }
function syncLocations(game: Game) {
  for(const a of game.assets){
    if(!a.tileId||a.sector==='Holding custody')continue;
    a.sector=game.geography!.goals.find(g=>g.tileIds.includes(a.tileId!))?.id??'At sea';
  }
}
export function createGame(id: string, variant?: 'short-window/1'): Game {
  const game=sector.createGame(id,variant),s=scenario(id),{setup,positions}=geographicSetup(id);
  game.schema=ENGINE_VERSION;game.scenarioVersion=s.version;game.rulesVersion=s.rulesVersion;game.geography=setup;
  for(const a of game.assets){
    if(a.kind==='staff'){a.kind='patrol';a.name=`${a.id} · Patrol vessel`;}
    a.tileId=positions[a.id];a.movement=a.kind==='patrol'?setup.patrolMovement:setup.movement;
  }
  syncLocations(game); game.events=[];
  event(game,'deployment','Ships deployed on the existing water hexes. Land, reef, lagoon and mixed coast are excluded. Positions are authored exercise starts.');
  event(game,'round',`Round 1: 3 CP per side. Ships move up to ${setup.movement} connected water hexes per action. Red interceptions require an assigned ship beside the route.`);
  sector.refreshMetrics(game);return game;
}
export function advanceRound(game: Game) {
  const next=sector.advanceRound(game);
  for(const a of next.assets) a.movement=a.kind==='patrol'?next.geography!.patrolMovement:next.geography!.movement;
  for(const e of next.events.filter(e=>e.round===next.round))e.rule=`${next.rulesVersion}:${e.type}`;
  return next;
}
function canDelay(game: Game, a: Asset) {
  if(a.side!=='blue'||!a.ready||!a.tileId)return false;
  if(a.kind==='merchant')return (game.delays[a.id]??0)<2;
  return a.kind==='transport'&&a.cargo.length>0&&a.cargo.every(id=>game.items.some(i=>i.id===id&&i.kind==='supply')&&(game.delays[id]??0)<2);
}
const range = (game: Game, a: Asset, tile: string) => !!a.tileId&&(a.tileId===tile||cellsFor(game.geography!.mapId).get(a.tileId)!.neighbors.includes(tile));
function eligibleTarget(game:Game, target:string){return target==='handover'?(game.scenarioId==='SEN-H01'&&!game.metrics.handover&&(game.delays.handover??0)<2):game.assets.some(a=>a.id===target&&canDelay(game,a));}

export function legalCandidates(game: Game, side: Side): Candidate[] {
  if(game.finished)return [];assertGeography(game.geography!);
  const setup=game.geography!,orders:Candidate[]=[];
  const add=(order:Order,label=describeOrder(order),details:Partial<Candidate>={})=>orders.push({id:orderKey(order),order,label,cost:orderCost(order),group:'asset'in order&&order.asset?order.asset:'Staff',...details});
  for(const a of game.assets.filter(a=>a.side===side&&a.ready&&a.tileId)){
    for(const [target,route]of geographicRoutes(game,a)){
      if(!route.cost)continue;
      if(game.scenarioId==='HOR-F01'&&a.kind==='merchant'&&goal(setup,'Exit').tileIds.includes(target)&&!game.reports.blue.some(r=>r.id==='B-Q1'&&r.verified!==null))continue;
      const threatened=side==='blue'&&canDelay(game,a)&&game.assets.some(r=>r.side==='red'&&r.ready&&r.tileId&&route.path.some(tile=>range(game,r,tile)));
      add({type:'move',asset:a.id,target},`${a.id} → hex ${tileLabel(setup.mapId,target)} · ${route.cost} MP${threatened?' · patrol nearby':''}`,{asset:a.id,path:route.path,movementCost:route.cost,...(threatened?{warning:'A Red ship is beside this route and may commit an interception.'}:{})});
    }
    if(game.scenarioId.startsWith('SPR')&&atGoal(setup,a,'Outpost'))for(const item of game.items.filter(i=>i.location===a.id&&i.completed===null&&i.kind!=='survivor'))add({type:'deliver',asset:a.id,target:item.id},`${a.id}: deliver ${item.id} at Sierra Madre transfer area`,{asset:a.id});
    if(a.kind==='transport'&&a.cargo.length<a.capacity)for(const donor of game.assets.filter(d=>d.id!==a.id&&d.side===side&&d.ready&&d.kind==='transport'&&separation(setup,a.tileId,d.tileId)<=1))for(const item of donor.cargo)add({type:'transfer',asset:a.id,from:donor.id,target:item},undefined,{asset:a.id});
    if(a.kind==='rescue'&&a.cargo.length<a.capacity)for(const item of game.items.filter(i=>i.kind==='survivor'&&i.completed===null&&i.available<=game.round&&atGoal(setup,a,i.location)))add({type:'rescue',asset:a.id,target:item.id},undefined,{asset:a.id});
    if(game.scenarioId==='SEN-H01'&&side==='blue'&&!game.metrics.handover&&game.metrics.case_records===3&&atGoal(setup,a,'Review'))add({type:'handover',asset:a.id},`${a.id}: hand over preserved evidence at Review`,{asset:a.id});
    if(side==='red'){
      for(const target of [...game.assets.filter(b=>canDelay(game,b)&&separation(setup,a.tileId,b.tileId)<=setup.movement+setup.interceptRange).map(b=>b.id),...(eligibleTarget(game,'handover')&&goalDistance(setup,a.tileId,'Review')<=setup.interceptRange?['handover']:[])])for(const effort of [1,2])if(game.pressure>=effort)add({type:'challenge',asset:a.id,target,effort},`${a.id}: intercept ${target} within ${setup.interceptRange} hex · ${effort} CP`,{asset:a.id});
    } else if(a.kind==='rescue') {
      for(const target of game.assets.filter(b=>b.id!==a.id&&canDelay(game,b)&&separation(setup,a.tileId,b.tileId)<=setup.interceptRange))for(const effort of [1,2])if(!(game.scenarioId==='HOR-H01'&&game.round<3&&effort===2))add({type:'assure',asset:a.id,target:target.id,effort},`${a.id}: escort ${target.id} from adjacent hex · ${effort} CP`,{asset:a.id});
    }
  }
  // Preserve the scenario's information and agreement rules; spatial missions are handled above.
  for(const c of sector.legalCandidates(game,side))if(['verify','share','propose','accept','statement','welfare','hold'].includes(c.order.type))add(c.order,c.label,'asset'in c.order&&c.order.asset?{asset:c.order.asset}:{});
  return orders;
}
export function validateOrders(game: Game, side: Side, value: unknown): asserts value is Order[] {
  if(!Array.isArray(value)||value.length>3||value.some(o=>!o||typeof o!=='object'||Array.isArray(o)))throw new Error('Provide up to three structured orders.');
  const error=batchError(value);if(error)throw new Error(error);
  const legal=new Set(legalCandidates(game,side).map(c=>c.id));for(const o of value)if(!legal.has(orderKey(o)))throw new Error('Order is unavailable from this ship’s current hex and round.');
  const destinations=value.filter(o=>o.type==='move').map(o=>o.target);if(new Set(destinations).size!==destinations.length)throw new Error('Two ships cannot reserve the same destination.');
}
export function resolveRound(before: Game, orders: Record<Side,Order[]>): Game {
  for(const side of sides)validateOrders(before,side,orders[side]);
  const game=structuredClone(before),setup=game.geography!,priority:Side[]=game.round%2?['blue','red']:['red','blue'];
  const pendingMoves=priority.flatMap(side=>orders[side].filter((o):o is Extract<Order,{type:'move'}>=>o.type==='move').map(order=>({side,order,path:geographicRoutes(before,before.assets.find(a=>a.id===order.asset)!).get(order.target)!.path,index:0,stopped:false})));
  const challenge=orders.red.find((o):o is Extract<Order,{type:'challenge'|'assure'}>=>o.type==='challenge');
  const challenged=challenge&&game.assets.find(a=>a.id===challenge.target),patrol=challenge&&before.assets.find(a=>a.id===challenge.asset)!;
  const escort=challenge&&orders.blue.find(o=>o.type==='assure'&&o.target===challenge.target);
  const blocked=new Set<string>();let interceptUsed=false;
  if(challenge)game.pressure-=challenge.effort;
  const trigger=(target:string,tile:string,order:Order)=>{
    if(!challenge||interceptUsed||challenge.target!==target||!range(before,patrol!,tile))return false;
    const assurance=escort&&'effort'in escort?escort.effort:0;
    if(challenge.effort<=assurance)return false;
    interceptUsed=true;
    const subjects=target==='handover'?['handover']:(order.type==='transfer'||order.type==='deliver')?[order.target]:challenged!.kind==='merchant'?[challenged!.id]:[...before.assets.find(a=>a.id===target)!.cargo];
    for(const id of subjects)game.delays[id]=(game.delays[id]??0)+1;
    blocked.add(target);event(game,'interception',`${patrol!.id} intercepted ${target} beside hex ${tileLabel(setup.mapId,tile)}. ${subjects.join(', ')} spent one of two allowed delays.`, 'red',challenge);
    return true;
  };
  // Handle missions against start-round positions, before the simultaneous movement ticks.
  for(const side of priority)for(const order of orders[side]){
    if(['move','challenge','assure'].includes(order.type))continue;
    const a='asset'in order&&order.asset?game.assets.find(a=>a.id===order.asset)!:undefined;
    if(a&&['deliver','transfer','handover'].includes(order.type)&&trigger(order.type==='handover'?'handover':order.type==='transfer'?order.from:a.id,a.tileId!,order))continue;
    switch(order.type){
      case'deliver':case'rescue':{
        const item=game.items.find(i=>i.id===order.target)!;if(item.completed!==null){event(game,'rescue',`${item.id} was already recovered this round; ${a!.id} spent its action without duplicate credit.`,side,order);continue;}
        item.completed=game.round;if(order.type==='deliver'){a!.cargo=a!.cargo.filter(id=>id!==item.id);item.location='Outpost';}else{a!.cargo.push(item.id);item.location=a!.id;}break;
      }
      case'transfer':{const donor=game.assets.find(a=>a.id===order.from)!,item=game.items.find(i=>i.id===order.target)!;donor.cargo=donor.cargo.filter(id=>id!==item.id);a!.cargo.push(item.id);item.location=a!.id;break;}
      case'verify':{const report=game.reports[side].find(r=>r.id===order.target)!;report.verified=game.round;event(game,'verify',`${report.id}: ${report.truth}`,side,order,side);continue;}
      case'share':{const report=before.reports[side].find(r=>r.id===order.target)!;game.reports[opposite(side)].push({...structuredClone(report),shared:true,received:game.round});event(game,'share',`${side} shared ${report.id}: ${report.truth}`,side,order);break;}
      case'welfare':if(game.scenarioId==='HOR-H01'&&game.lastWelfareRound!==game.round){game.metrics.welfare_checks=Math.min(2,game.metrics.welfare_checks+1);game.lastWelfareRound=game.round;}if(game.scenarioId==='HOR-F01'&&game.round<=4)game.metrics.welfare_complete=1;break;
      case'handover':game.metrics.handover=1;break;
      case'statement':game.metrics.statement_filed=1;break;
      case'propose':game.proposals.push({id:order.target,side,round:game.round,accepted:false});break;
      case'accept':{
        if(order.target==='release_after_record'&&before.metrics.case_records!==3){event(game,'agreement','Conditional release requires the completed record from a prior round.',side,order);continue;}
        if(game.scenarioId==='SEN-F01'&&game.metrics.coordination){event(game,'agreement','The first accepted coordination agreement is binding.',side,order);continue;}
        game.proposals.find(p=>p.id===order.target&&p.side!==side&&p.round<game.round)!.accepted=true;
        if(game.scenarioId==='SEN-H01')game.metrics.released=1;
        if(game.scenarioId==='SEN-F01')game.metrics.coordination=order.target==='blue_lead'?1:order.target==='red_lead'?2:3;
        if(game.scenarioId==='BAB-H01')game.metrics.standdown=1;break;
      }
      case'hold':break;
    }
    event(game,order.type,describeOrder(order),side,order);
  }
  for(let tick=1;tick<=Math.max(setup.movement,setup.patrolMovement);tick++){
    const occupied=new Set(game.assets.filter(a=>a.tileId).map(a=>a.tileId!)),reserved=new Set<string>();
    for(const move of pendingMoves){
      if(move.stopped||move.index===move.path.length-1)continue;
      const a=game.assets.find(a=>a.id===move.order.asset)!,next=move.path[move.index+1];
      if(move.side==='blue'&&challenge?.target===a.id&&(trigger(a.id,a.tileId!,move.order)||trigger(a.id,next,move.order))){move.stopped=true;continue;}
      if(occupied.has(next)||reserved.has(next)){move.stopped=true;event(game,'traffic',`${a.id} stopped at hex ${tileLabel(setup.mapId,a.tileId!)}: another ship has the next hex at movement tick ${tick}.`,move.side,move.order);continue;}
      reserved.add(next);a.tileId=next;move.index++;a.movement=Math.max(0,(a.movement??setup.movement)-1);
    }
  }
  syncLocations(game);
  for(const move of pendingMoves){const a=game.assets.find(a=>a.id===move.order.asset)!;event(game,'move',`${a.id}: ${move.index} water hexes to ${tileLabel(setup.mapId,a.tileId!)}${move.stopped?' (route interrupted)':''}.`,move.side,move.order);
    if(a.kind==='merchant'&&atGoal(setup,a,exitGoal(game.scenarioId))){a.tileId=null;a.sector='Exited';a.ready=false;event(game,'exit',`${a.id} completed its passage through the exit area.`,move.side,move.order);if(game.scenarioId==='HOR-H01')game.metrics.on_time=Number(game.round<=4);}
  }
  if(challenge&&!interceptUsed)event(game,'interception',`${patrol!.id}'s interception of ${challenge.target} spent ${challenge.effort} pressure; ${escort?'escort assurance protected the passage or ':'the target '}did not enter an effective interception.`, 'red',challenge);
  for(const o of orders.blue.filter(o=>o.type==='assure'))event(game,'escort',describeOrder(o),'blue',o);
  if(game.scenarioId==='HOR-H01'){
    game.custodyStreak=pendingMoves.some(m=>m.order.asset==='T1')&&blocked.has('T1')?before.custodyStreak+1:0;
    if(game.custodyStreak>=2){game.metrics.detained=1;const a=game.assets.find(a=>a.id==='T1')!;a.sector='Holding custody';a.ready=false;event(game,'custody','Two consecutive intercepted movement attempts: T1 enters the authored custody state.');}
  }
  game.finished=game.round===scenario(game.scenarioId).rounds;sector.refreshMetrics(game);
  event(game,'resolution',`Round ${game.round}: Blue spent ${orders.blue.reduce((n,o)=>n+orderCost(o),0)} CP; Red spent ${orders.red.reduce((n,o)=>n+orderCost(o),0)} CP. Pressure remaining ${game.pressure}.`);
  return game;
}
export function observe(game: Game, side: Side): Observation {
  const base=sector.observe(game,side),s=scenario(game.scenarioId);
  return {...base,scenario:structuredClone(s),geography:structuredClone(game.geography),edges:[],candidates:legalCandidates(game,side),guidance:[
    'Ships occupy the original map’s water hexes. Choose a ship, preview a route and add it to the sealed plan. Each ship acts once; movement uses up to four adjacent hexes.',
    'Land, mixed coast, reef and lagoon are excluded by the existing vessel policy. These movement points are game quantities, not vessel speeds or elapsed minutes.',
    'One ship per hex. Competing moves stop before occupied hexes; ties favor Blue on odd rounds and Red on even rounds.',
    'Red commits a named patrol to intercept one target. It can delay the target only when that target’s route or handling location comes within one water hex of the patrol’s starting position. The patrol cannot move and intercept together.',
    'A ready Blue response launch beside a target may spend its own action to escort it. Equal assurance defeats interception. Rescue and medical cargo remain protected.',
    ...(game.scenarioId.startsWith('SPR')?['Deliver each manifest from the marked Sierra Madre transfer area in a later action. This offshore transfer is an authored abstraction; it does not invent a passage across the reef.']:specification(game.scenarioId).guidance.filter(s=>!s.includes('→')&&!s.includes('Only ')&&!s.includes('Move to'))),
    ...(game.variant?['Short window: supply transports first become available in round 3.']:[]),
  ]};
}
export function planningWorld(observation: Observation): Game {
  const world=sector.planningWorld(observation);world.schema=ENGINE_VERSION;world.geography=structuredClone(observation.geography);return world;
}
export function terminalLedger(game:Game,refereeModified=false){return {...sector.terminalLedger(game,refereeModified),provenance:`${ENGINE_VERSION}; ${game.geography!.version}; ${game.variant??'baseline'}`};}
export function result(game:Game,refereeModified=false){return scoreLedger(library,terminalLedger(game,refereeModified));}
