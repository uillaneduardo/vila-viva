import type {BuildingBlueprint} from "./community-house.ts";
/** Simple demarcated burial ground, sharing construction contracts with other buildings. */
export const CEMETERY:Readonly<BuildingBlueprint>=Object.freeze({
 id:"building.cemetery",version:1,label:"Cemitério",displayName:{"pt-BR":"Cemitério"},
 footprint:{width:3,height:3},
 movementSpeed:1,
 stages:[{id:"marking",label:"Demarcação",displayName:{"pt-BR":"Demarcação"},
  materials:{stone:3},workUnits:6}],
 effects:[{capability:"cemetery.grave_capacity",value:12,unit:"vagas"}],
 cemetery:{capacity:12}
});
