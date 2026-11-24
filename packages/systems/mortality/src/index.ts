/** Death, body transport, cemetery recording, and local morale aura. World-tick authoritative. */
import type {World,Character,Construction} from "../../../domain/src/contracts.ts";
import {buildingBlueprint} from "../../../content/src/buildings/registry.ts";
import {applyEffect,removeEffect} from "../../effects/src/manager.ts";
import {releaseBed} from "../../housing/src/index.ts";
export const CORPSE_EXPOSURE_RADIUS=4;
export const CORPSE_EFFECT_ID="corpse_exposure";
export const isCorpse=(e:unknown):e is Character=>
 !!e&&typeof e==="object"&&(e as Character).kind==="character"&&(e as Character).health<=0;
export const isVisibleCorpse=(e:unknown):e is Character=>isCorpse(e)&&!(e as Character).bodyCarriedBy;
export function cemeteryCapacity(building:Construction):number {
 if(building.status!=="completed"||building.availability!=="available")return 0;
 const blueprint=buildingBlueprint(building.blueprintId);
 return blueprint?.version===building.blueprintVersion?blueprint.cemetery?.capacity??0:0;
}
export const availableGraves=(building:Construction)=>
 Math.max(0,cemeteryCapacity(building)-(building.burials?.length??0));
export const carriedCorpse=(world:World,npcId:string):Character|undefined=>
 world.entities.find(e=>isCorpse(e)&&e.bodyCarriedBy===npcId) as Character|undefined;
export const visibleCorpses=(world:World):Character[]=>
 world.entities.filter(isVisibleCorpse);
export function registerBurial(world:World,corpse:Character,building:Construction):boolean {
 if(!isCorpse(corpse)||!corpse.bodyCarriedBy||availableGraves(building)<1)return false;
 if(building.burials?.some(record=>record.npcId===corpse.id))return false;
 building.burials??=[];
 building.burials.push({npcId:corpse.id,name:corpse.name,
  deathTick:corpse.deathTick??world.tick,burialTick:world.tick,cause:corpse.causeOfDeath??"Desconhecida"});
 world.entities=world.entities.filter(e=>e.id!==corpse.id);
 return true;
}
export function advanceMortality(world:World):void {
 // Mark each death once; retain original character ID and name while corpse is visible.
 for(const character of world.entities){
  if(character.kind!=="character"||character.health>0||character.deathTick!==undefined)continue;
  character.deathTick=world.tick;
  character.causeOfDeath??=(character.satiety??100)===0?"Inanição":"Ferimentos ou saúde esgotada";
  releaseBed(world,character);
 }
 const corpses=visibleCorpses(world);
 for(const character of world.entities){
  if(character.kind!=="character")continue;
  const effectId="mortality:near_corpse:"+character.id;
  const nearby=character.health>0&&corpses.some(corpse=>corpse.id!==character.id&&
   Math.abs(corpse.position.x-character.position.x)+Math.abs(corpse.position.y-character.position.y)<=CORPSE_EXPOSURE_RADIUS);
  if(nearby){
   if(!character.effects?.some(e=>e.instanceId===effectId))
    applyEffect(character,CORPSE_EFFECT_ID,"mortality:visible_corpse",world.tick,effectId);
  }else removeEffect(character,effectId);
 }
}
