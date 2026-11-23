/** Content-only definition of a renewable living source. Future berry bushes add one entry, not a new engine. */
import type {NaturalStage} from "../../domain/src/contracts.ts";
export interface NaturalSourceDefinition {
 id:string;
 label:string;
 resourceType:string;
 productId:string;
 stages:Readonly<{young:number;mature:number;old:number;dead:number}>;
 production:Readonly<{capacity:number;intervalTicks:number;amount:number;harvestBatch:number}>;
 blocksMovement:boolean;
}
export const NATURAL_SOURCES:Readonly<Record<string,NaturalSourceDefinition>>=Object.freeze({
 "apple_tree":Object.freeze({
  id:"apple_tree",label:"Macieira",resourceType:"food",productId:"apple",
  stages:Object.freeze({young:40,mature:120,old:1800,dead:3000}),
  production:Object.freeze({capacity:30,intervalTicks:40,amount:3,harvestBatch:3}),
  blocksMovement:true
 })
});
export function naturalSource(id:string):NaturalSourceDefinition|undefined {
 return Object.hasOwn(NATURAL_SOURCES,id)?NATURAL_SOURCES[id]:undefined;
}
export function stageForAge(def:NaturalSourceDefinition,age:number):NaturalStage {
 if(age>=def.stages.dead)return "dead";
 if(age>=def.stages.old)return "old";
 if(age>=def.stages.mature)return "mature";
 if(age>=def.stages.young)return "young";
 return "seedling";
}
export function healthForAge(def:NaturalSourceDefinition,age:number):number {
 if(age>=def.stages.dead)return 0;
 if(age<=def.stages.old)return 100;
 return Math.max(1,Math.ceil(100*(def.stages.dead-age)/(def.stages.dead-def.stages.old)));
}
