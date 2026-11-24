/** Data-only menu options for the God Mode UI.
 * Values are existing engine/catalog identifiers, not a second gameplay registry.
 * All icon IDs are handled by the independent UI visual manifest.
 */
const FIXED=Object.freeze({
 npc:Object.freeze([
  {id:"settler",label:"Habitante",icon:"choice.npc.settler"},
  {id:"leader",label:"Líder",icon:"choice.npc.leader"}
 ]),
 stone:Object.freeze([
  {id:"stone",label:"Pedra",icon:"resource.stone"},
  {id:"iron_ore",label:"Ferro",description:"Minério de ferro",icon:"choice.ore.iron"},
  {id:"copper_ore",label:"Cobre",description:"Minério de cobre",icon:"choice.ore.copper"}
 ]),
 food:Object.freeze([
  {id:"apple_adult",label:"Adulta",description:"Macieira adulta",icon:"choice.tree.adult"},
  {id:"apple_seedling",label:"Muda",description:"Muda de macieira",icon:"choice.tree.seedling"}
 ]),
 scenery:Object.freeze([
  {id:"boulder",label:"Rocha",icon:"resource.stone"},
  {id:"wall",label:"Muro",icon:"choice.scenery.wall"},
  {id:"statue",label:"Estátua",icon:"choice.scenery.statue"}
 ])
});
const BUILD_ICONS=Object.freeze({
 "building.community_house":"action.build",
 "building.depot":"choice.building.depot",
 "building.cemetery":"choice.building.cemetery",
 "building.workshop":"choice.building.workshop"
});
const FARM_ICONS=Object.freeze({
 apple_tree:"choice.tree.seedling",carrot:"choice.farm.carrot",potato:"choice.farm.potato"
});
export const BUILD_MODES=Object.freeze([
 {id:"site",label:"Projeto",description:"Fase 1",icon:"choice.mode.project"},
 {id:"completed",label:"Concluída",description:"Pronta",icon:"choice.mode.complete"}
]);
/** Return available tiles in catalogue order; unknown definitions receive a stable generic icon. */
export function godMenuOptions(tool,{blueprints={},farmingSpecies={}}={}){
 if(tool==="house")
  return Object.entries(blueprints).map(([id,def])=>({
   id,label:def.label??def.displayName?.["pt-BR"]??id,icon:BUILD_ICONS[id]??"action.build",
   description:def.footprint?def.footprint.width+" × "+def.footprint.height:""
  }));
 if(tool==="farm")
  return Object.entries(farmingSpecies).map(([id,def])=>({
   id,label:def.label??id,icon:FARM_ICONS[id]??"action.add-farm",
   description:"Zona de cultivo"
  }));
 return FIXED[tool]??[];
}
export const HAS_GOD_SUBMENU=Object.freeze(["npc","stone","food","farm","scenery","house"]);
