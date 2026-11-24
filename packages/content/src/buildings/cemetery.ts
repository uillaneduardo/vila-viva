import type {BuildingBlueprint} from "./community-house.ts";
/** Simple demarcated burial ground, sharing construction contracts with other buildings. */
export const CEMETERY:Readonly<BuildingBlueprint>=Object.freeze({
 id:"building.cemetery",version:1,label:"Cemitério",displayName:{"pt-BR":"Cemitério"},
 footprint:{width:3,height:3},
 movementSpeed:1,
 stages:[{id:"marking",label:"Demarcação",displayName:{"pt-BR":"Demarcação"},
  materials:{stone:3},workUnits:6}],
 upgrades:[
  {level:2,stage:{id:"upgrade-2",label:"Reorganização",displayName:{"pt-BR":"Reorganização"},materials:{stone:12},workUnits:24},capacities:{"cemetery.grave_capacity":24}},
  {level:3,stage:{id:"upgrade-3",label:"Memorial ampliado",displayName:{"pt-BR":"Memorial ampliado"},materials:{stone:24,wood:8},workUnits:40},capacities:{"cemetery.grave_capacity":48}}
 ],
 effects:[{capability:"cemetery.grave_capacity",value:12,unit:"vagas"}],
 cemetery:{capacity:12}
});
