/** Versioned, transport-independent records. Persistent adapters live outside engine and domain. */
import type {World,Command,Result} from "./contracts.ts";
export const WORLD_FORMAT_VERSION=1;
export interface AcceptedAction {
 tick:number; commandId:string; action:Command["action"]; actorRole:Command["actorRole"];
 actorId?:string; targetId?:string; position?:Command["position"];
 parameters?:Record<string,unknown>; events:Extract<Result,{ok:true}>["events"];
}
export type ActivityObserver=(action:AcceptedAction)=>void;
export interface ActivityTick {
 formatVersion:1; timelineId:string; sequence:number; tick:number;
 recordedAt:string; actions:AcceptedAction[];
}
export interface WorldSnapshot {
 formatVersion:1; savedAt:string; timelineId:string; lastSequence:number;
 world:World; clock:{speed:0|1|2|4}; seed?:string;
}
