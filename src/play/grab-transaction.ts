import type { GeographicRules, Action, Preview } from '../scenario/rules.ts';
import type { ScenarioState } from '../../server/scenario-session.ts';
export type GrabAction=Extract<Action,{type:'deploy'|'move'|'unload'}>;
/** A held piece is a local draft. Only take() may hand one validated action to the server. */
export class GrabTransaction {
  private held:{mapId:string;revision:number;action:GrabAction}|null=null;
  get active(){return !!this.held;}
  begin(state:ScenarioState,action:GrabAction){if(this.held)return false;this.held={mapId:state.exercise.manifest.mapId,revision:state.revision,action:structuredClone(action)};return true;}
  preview(rules:GeographicRules,state:ScenarioState,tileId:string|null):Preview {
    const held=this.held;
    if(!held)return{allowed:false,reason:'Pick up a miniature first.',cost:0,path:[]};
    if(held.mapId!==state.exercise.manifest.mapId||held.revision!==state.revision)return{allowed:false,reason:'The exercise changed. Pick up the piece again.',cost:0,path:[]};
    if(!tileId)return{allowed:false,reason:'Lower the miniature over a map hex.',cost:0,path:[]};
    return rules.evaluate(state.exercise,{...held.action,tileId});
  }
  take(rules:GeographicRules,state:ScenarioState,tileId:string|null):{action:GrabAction|null;preview:Preview} {
    const preview=this.preview(rules,state,tileId),held=this.held;this.held=null;
    return{action:preview.allowed&&held&&tileId?{...held.action,tileId}:null,preview};
  }
  cancel(){this.held=null;}
}
