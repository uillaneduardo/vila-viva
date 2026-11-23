import type {LocalizedText} from "../../../domain/src/localization.ts";
/**
 * First completed MVP building. Data only: no reproduction, relationship or
 * gestation side effects may be executed by a building definition.
 * Balancing values below are DRAFT defaults and are versioned separately.
 */
export interface BuildingStage {
 id:string; label:string; displayName:LocalizedText; materials:Readonly<Record<string,number>>; workUnits:number;
}
export interface BuildingBlueprint {
 id:string; version:number; label:string; displayName:LocalizedText; stages:readonly BuildingStage[];
 effects:readonly {capability:string;value:number;unit:string}[];
}
export const COMMUNITY_HOUSE:Readonly<BuildingBlueprint>=Object.freeze({
 id:"building.community_house",version:1,label:"Casa Comunitária",displayName:{"pt-BR":"Casa Comunitária"},
 stages:[
  {id:"foundation",label:"Fundação",displayName:{"pt-BR":"Fundação"},materials:{stone:12,wood:4},workUnits:30},
  {id:"structure",label:"Estrutura",displayName:{"pt-BR":"Estrutura"},materials:{wood:24,stone:6},workUnits:45},
  {id:"roof",label:"Telhado",displayName:{"pt-BR":"Telhado"},materials:{wood:16},workUnits:30},
  {id:"finishing",label:"Acabamento",displayName:{"pt-BR":"Acabamento"},materials:{wood:8,stone:2},workUnits:20}
 ],
 effects:[
  {capability:"housing.adult_capacity",value:6,unit:"slots"},
  {capability:"housing.dependent_capacity",value:2,unit:"slots"},
  {capability:"housing.comfort",value:10,unit:"points"},
  {capability:"social.meeting_capacity",value:4,unit:"slots"}
 ]
});
