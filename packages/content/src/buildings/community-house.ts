import type {LocalizedText} from "../../../domain/src/localization.ts";
/**
 * First completed MVP building. Data only: no reproduction, relationship or
 * gestation side effects may be executed by a building definition.
 * Balancing values below are DRAFT defaults and are versioned separately.
 */
export interface BuildingStage {
 id:string; label:string; displayName:LocalizedText; materials:Readonly<Record<string,number>>; workUnits:number;
}
export interface BuildingUpgrade {level:number;stage:BuildingStage;capacities:Readonly<Record<string,number>>}
export interface BuildingBlueprint {
 upgrades?:readonly BuildingUpgrade[];
 id:string; version:number; label:string; displayName:LocalizedText; footprint:Readonly<{width:number;height:number}>; stages:readonly BuildingStage[];
 effects:readonly {capability:string;value:number;unit:string}[];
 movementSpeed?:number;
 storage?:Readonly<{capacity:number;accepted:readonly string[]}>;
 housing?:Readonly<{adultBeds:number;restGain:number;dependentBeds?:number;permanent?:boolean}>;
 cemetery?:Readonly<{capacity:number}>;
 mining?:Readonly<{workers:number}>;
 production?:Readonly<{recipes:readonly string[]}>;
}
export const COMMUNITY_HOUSE:Readonly<BuildingBlueprint>=Object.freeze({
 id:"building.community_house",version:1,label:"Casa Comunitária",displayName:{"pt-BR":"Casa Comunitária"},footprint:{width:2,height:2},
 stages:[
  {id:"foundation",label:"Fundação",displayName:{"pt-BR":"Fundação"},materials:{stone:12,wood:4},workUnits:30},
  {id:"structure",label:"Estrutura",displayName:{"pt-BR":"Estrutura"},materials:{wood:24,stone:6},workUnits:45},
  {id:"roof",label:"Telhado",displayName:{"pt-BR":"Telhado"},materials:{wood:16},workUnits:30},
  {id:"finishing",label:"Acabamento",displayName:{"pt-BR":"Acabamento"},materials:{wood:8,stone:2},workUnits:20}
 ],
 upgrades:[
  {level:2,stage:{id:"upgrade-2",label:"Ampliação interna",displayName:{"pt-BR":"Ampliação interna"},materials:{wood:30,stone:18},workUnits:45},capacities:{"housing.adult_capacity":9}},
  {level:3,stage:{id:"upgrade-3",label:"Alojamento ampliado",displayName:{"pt-BR":"Alojamento ampliado"},materials:{wood:45,stone:30},workUnits:70},capacities:{"housing.adult_capacity":12}}
 ],
 movementSpeed:.5,
 housing:{adultBeds:6,restGain:14},
 effects:[
  {capability:"housing.adult_capacity",value:6,unit:"slots"},
  {capability:"housing.dependent_capacity",value:2,unit:"slots"},
  {capability:"housing.comfort",value:10,unit:"points"},
  {capability:"social.meeting_capacity",value:4,unit:"slots"}
 ]
});
