import type {BuildingBlueprint} from "./community-house.ts";
/** The first functional warehouse; capacity is physical, and inventory starts empty. */
export const DEPOT:Readonly<BuildingBlueprint>=Object.freeze({
 id:"building.depot",version:1,label:"Depósito",displayName:{"pt-BR":"Depósito"},footprint:{width:2,height:2},
 stages:[
  {id:"foundation",label:"Fundação",displayName:{"pt-BR":"Fundação"},materials:{stone:6,wood:4},workUnits:20},
  {id:"structure",label:"Estrutura",displayName:{"pt-BR":"Estrutura"},materials:{wood:12,stone:4},workUnits:28},
  {id:"roof",label:"Cobertura",displayName:{"pt-BR":"Cobertura"},materials:{wood:8},workUnits:20}
 ],
 effects:[{capability:"storage.capacity",value:120,unit:"items"}],
 storage:{capacity:120,accepted:["wood","stone","apple","carrot","potato","apple_seed","carrot_seed","potato_seed"]}
});
