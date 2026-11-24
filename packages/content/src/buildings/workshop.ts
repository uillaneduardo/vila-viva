import type {BuildingBlueprint} from "./community-house.ts";
/** Workstation with physical input/output inventory. No material appears before crafting completes. */
export const WORKSHOP:Readonly<BuildingBlueprint>=Object.freeze({
 id:"building.workshop",version:1,label:"Oficina",displayName:{"pt-BR":"Oficina de fabricação"},footprint:{width:3,height:2},
 movementSpeed:0.6,
 stages:[
  {id:"foundation",label:"Fundação",displayName:{"pt-BR":"Fundação"},materials:{stone:8,wood:5},workUnits:18},
  {id:"workbench",label:"Bancada",displayName:{"pt-BR":"Bancada e forja"},materials:{wood:10,stone:6},workUnits:24}
 ],
 effects:[{capability:"production.workstation",value:1,unit:"workshop"}],
 storage:{capacity:120,accepted:[
  "wood","stone","iron_ore","copper_ore","iron_ingot","copper_ingot","axe","pickaxe","hammer"
 ]},
 production:{recipes:["smelt_iron","smelt_copper","craft_axe","craft_pickaxe","craft_hammer"]}
});
