import {COMMUNITY_HOUSE} from "./community-house.ts";
import {TEMPORARY_STORAGE} from "./temporary-storage.ts";
import {DEPOT} from "./depot.ts";
import {CEMETERY} from "./cemetery.ts";
import {FAMILY_HOUSE,CAFETERIA,MINE} from "./community-expansion.ts";
import {WORKSHOP} from "./workshop.ts";
import type {BuildingBlueprint} from "./community-house.ts";
import {validateBuildingBlueprint} from "../building-validation.ts";

/** Adding a building requires a blueprint; mechanics remain generic. */
export const BUILDING_BLUEPRINTS:Readonly<Record<string,Readonly<BuildingBlueprint>>>=Object.freeze({
 [COMMUNITY_HOUSE.id]:COMMUNITY_HOUSE,
 [DEPOT.id]:DEPOT,[TEMPORARY_STORAGE.id]:TEMPORARY_STORAGE,
 [CEMETERY.id]:CEMETERY,
 [WORKSHOP.id]:WORKSHOP,[FAMILY_HOUSE.id]:FAMILY_HOUSE,[CAFETERIA.id]:CAFETERIA,[MINE.id]:MINE
});
for(const blueprint of Object.values(BUILDING_BLUEPRINTS))validateBuildingBlueprint(blueprint);
export function buildingBlueprint(id:string):Readonly<BuildingBlueprint>|undefined {
 return Object.hasOwn(BUILDING_BLUEPRINTS,id)?BUILDING_BLUEPRINTS[id]:undefined;
}
