import type {BuildingBlueprint} from "./community-house.ts";
/** The first functional warehouse; capacity is physical, and inventory starts empty. */
export const DEPOT:Readonly<BuildingBlueprint>=Object.freeze({
 id:"building.depot",version:1,label:"Depósito",displayName:{"pt-BR":"Depósito"},footprint:{width:2,height:2},
 movementSpeed:0.75,
 stages:[
  {id:"foundation",label:"Fundação",displayName:{"pt-BR":"Fundação"},materials:{stone:6,wood:4},workUnits:20},
  {id:"structure",label:"Estrutura",displayName:{"pt-BR":"Estrutura"},materials:{wood:12,stone:4},workUnits:28},
  {id:"roof",label:"Cobertura",displayName:{"pt-BR":"Cobertura"},materials:{wood:8},workUnits:20}
 ],
 upgrades:[
  {level:2,stage:{id:"upgrade-2",label:"Ampliação",displayName:{"pt-BR":"Ampliação"},materials:{wood:30,stone:20},workUnits:40},capacities:{"storage.capacity":300}},
  {level:3,stage:{id:"upgrade-3",label:"Reforço",displayName:{"pt-BR":"Reforço"},materials:{wood:50,stone:35},workUnits:70},capacities:{"storage.capacity":600}}
 ],
 effects:[{capability:"storage.capacity",value:120,unit:"items"}],
 storage:{capacity:120,accepted:["medicinal_herb","medicinal_herb_seed","wood","stone","meal","apple","carrot","potato","apple_seed","carrot_seed","potato_seed","iron_ore","copper_ore","iron_ingot","copper_ingot","axe","pickaxe","hammer"]}
});
