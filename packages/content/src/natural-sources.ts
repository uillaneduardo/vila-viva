/** Data-only definitions: one perennial tree and two finite-season vegetable crops. */
import type {NaturalStage} from "../../domain/src/contracts.ts";
export type GrowthMode="perennial"|"single_harvest";
export interface NaturalSourceDefinition {
 id:string;label:string;resourceType:"food";productId:string;
 seedItem:string;seedsPerHarvest:number;drop:Readonly<{min:number;max:number;seedMin:number;seedMax:number}>;growthMode:GrowthMode;
 stages:Readonly<{young:number;mature:number;old:number;dead:number}>;
 production:Readonly<{capacity:number;intervalTicks:number;amount:number;harvestBatch:number}>;
 blocksMovement:boolean;
}
export const NATURAL_SOURCES:Readonly<Record<string,NaturalSourceDefinition>>=Object.freeze({
 apple_tree:Object.freeze({
  id:"apple_tree",label:"Macieira",resourceType:"food",productId:"apple",
  seedItem:"apple_seed",seedsPerHarvest:1,drop:Object.freeze({min:1,max:3,seedMin:1,seedMax:2}),growthMode:"perennial",
  stages:Object.freeze({young:40,mature:120,old:1800,dead:3000}),
  production:Object.freeze({capacity:30,intervalTicks:40,amount:3,harvestBatch:3}),
  blocksMovement:true
 }),
 carrot:Object.freeze({
  id:"carrot",label:"Cenoura",resourceType:"food",productId:"carrot",
  seedItem:"carrot_seed",seedsPerHarvest:2,drop:Object.freeze({min:2,max:3,seedMin:1,seedMax:3}),growthMode:"single_harvest",
  stages:Object.freeze({young:15,mature:55,old:480,dead:720}),
  production:Object.freeze({capacity:3,intervalTicks:0,amount:3,harvestBatch:3}),
  blocksMovement:false
 }),
 potato:Object.freeze({
  id:"potato",label:"Batata",resourceType:"food",productId:"potato",
  seedItem:"potato_seed",seedsPerHarvest:2,drop:Object.freeze({min:2,max:4,seedMin:1,seedMax:3}),growthMode:"single_harvest",
  stages:Object.freeze({young:22,mature:80,old:600,dead:960}),
  production:Object.freeze({capacity:4,intervalTicks:0,amount:4,harvestBatch:4}),
  blocksMovement:false
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
