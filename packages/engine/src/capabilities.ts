import type {World, Role, Entity, ActionId, Position, FailureCode} from "../../domain/src/contracts.ts";
import {inBounds} from "../../domain/src/contracts.ts";

export interface ActionAvailability {id: ActionId; label: string; enabled: boolean; reason?: FailureCode; targetId?: string}
export function availableActions(world: World, role: Role, actorId: string|undefined, target: Entity|undefined, position?: Position): ActionAvailability[] {
 if(role==="admin") {
  const valid=position ? inBounds(world,position):false;
  return [
   {id:"npc.spawn",label:"Criar NPC",enabled:valid,...(!valid?{reason:"OUT_OF_BOUNDS" as const}:{})},
   {id:"resource.spawn",label:"Criar fonte",enabled:valid,...(!valid?{reason:"OUT_OF_BOUNDS" as const}:{})},
   ...(target?[{id:"entity.inspect" as const,label:"Inspecionar entidade",enabled:true,targetId:target.id}]:[])
  ];
 }
 if(role==="player"){
  const player=world.entities.find(e=>e.kind==="character" && e.ownerId===actorId);
  const at=position&&player?.kind==="character"? Math.abs(player.position.x-position.x)+Math.abs(player.position.y-position.y):Infinity;
  const valid=!!position&&inBounds(world,position)&&at===1&&(player?.kind==="character"&&player.energy>0);
  return [
   {id:"movement.move",label:"Mover um tile",enabled:!!valid,...(!valid?{reason:"BLOCKED" as const}:{})},
   ...(target?[{id:"entity.inspect" as const,label:"Inspecionar entidade",enabled:true,targetId:target.id}]:[])
  ];
 }
 return target?[{id:"entity.inspect",label:"Inspecionar entidade",enabled:true,targetId:target.id}]:[];
}
