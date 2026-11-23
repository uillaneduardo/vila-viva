import type {World,Role,Entity,ActionId,Position,FailureCode,Character} from "../../domain/src/contracts.ts";
import {inBounds} from "../../domain/src/contracts.ts";
import {canEnter,orthogonallyAdjacent} from "../../systems/collision/src/index.ts";
import {naturalSource} from "../../content/src/natural-sources.ts";

export interface ActionAvailability {id:ActionId;label:string;enabled:boolean;reason?:FailureCode;targetId?:string}
const carryLoad=(actor:Character)=>Object.values(actor.inventory??{}).reduce((a,b)=>a+(b>0?b:0),0);
export function availableActions(world:World,role:Role,actorId:string|undefined,target:Entity|undefined,position?:Position):ActionAvailability[] {
 if(role==="admin"){
  const valid=!!position&&canEnter(world,position);
  return [
   {id:"npc.spawn",label:"Criar NPC",enabled:valid,...(!valid?{reason:"BLOCKED" as const}:{})},
   {id:"resource.spawn",label:"Criar fonte",enabled:valid,...(!valid?{reason:"BLOCKED" as const}:{})},
   {id:"obstacle.spawn",label:"Posicionar obstáculo",enabled:valid,...(!valid?{reason:"BLOCKED" as const}:{})},
   ...(target?[{id:"entity.inspect" as const,label:"Inspecionar entidade",enabled:true,targetId:target.id}]:[])
  ];
 }
 const actor=world.entities.find((e):e is Character=>e.kind==="character" &&
  (role==="npc"?e.id===actorId:e.ownerId===actorId));
 if(!actor)return target?[{id:"entity.inspect",label:"Inspecionar entidade",enabled:true,targetId:target.id}]:[];
 const adjacent=!!target&&orthogonallyAdjacent(actor.position,target.position);
 const free=carryLoad(actor)<12;
 const alive=actor.health>0&&actor.energy>0;
 const source=target?.kind==="resource"&&target.sourceId?naturalSource(target.sourceId):undefined;
 const canHarvest=!!source&&adjacent&&alive&&free&&target?.kind==="resource"&&target.quantity>0&&target.life?.stage!=="dead";
 const harvestReason:FailureCode= !adjacent||!alive?"BLOCKED":!free?"INVENTORY_FULL":"EXHAUSTED";
 const actions:ActionAvailability[]=[];
 if(role==="player") {
  const valid=!!position&&inBounds(world,position)&&orthogonallyAdjacent(actor.position,position)&&alive&&canEnter(world,position,actor.id);
  actions.push({id:"movement.move",label:"Mover um tile",enabled:valid,...(!valid?{reason:"BLOCKED" as const}:{})});
 }
 if(source&&target)actions.push({id:"resource.harvest",label:"Colher frutos",enabled:canHarvest,targetId:target.id,...(!canHarvest?{reason:harvestReason}:{})});
 if(target)actions.push({id:"entity.inspect",label:"Inspecionar entidade",enabled:true,targetId:target.id});
 return actions;
}
