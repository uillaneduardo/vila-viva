/** Declarative economy: inputs, outputs, workstation, and work units per batch. */
export interface Recipe {
 id:string;label:string;workstationId:string;inputs:Readonly<Record<string,number>>;
 outputs:Readonly<Record<string,number>>;workUnits:number;domain:"smelting"|"crafting";
}
export const RECIPES:Readonly<Record<string,Readonly<Recipe>>>=Object.freeze({
 smelt_iron:{id:"smelt_iron",label:"Fundir ferro",workstationId:"building.workshop",
  inputs:{iron_ore:3,wood:1},outputs:{iron_ingot:2},workUnits:4,domain:"smelting"},
 smelt_copper:{id:"smelt_copper",label:"Fundir cobre",workstationId:"building.workshop",
  inputs:{copper_ore:3,wood:1},outputs:{copper_ingot:2},workUnits:4,domain:"smelting"},
 craft_axe:{id:"craft_axe",label:"Fabricar machado",workstationId:"building.workshop",
  inputs:{iron_ingot:2,wood:2},outputs:{axe:1},workUnits:5,domain:"crafting"},
 craft_pickaxe:{id:"craft_pickaxe",label:"Fabricar picareta",workstationId:"building.workshop",
  inputs:{iron_ingot:2,wood:2},outputs:{pickaxe:1},workUnits:5,domain:"crafting"},
 craft_hammer:{id:"craft_hammer",label:"Fabricar martelo",workstationId:"building.workshop",
  inputs:{iron_ingot:1,copper_ingot:1,wood:2},outputs:{hammer:1},workUnits:5,domain:"crafting"}
});
export const recipeById=(id:string)=>RECIPES[id];
