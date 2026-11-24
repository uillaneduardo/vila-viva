import {COMMUNITY_HOUSE} from "./community-house.ts";
import type {BuildingBlueprint} from "./community-house.ts";
import {validateBuildingBlueprint} from "../building-validation.ts";

/** Adding a building requires a blueprint; mechanics remain generic. */
export const BUILDING_BLUEPRINTS:Readonly<Record<string,Readonly<BuildingBlueprint>>>=Object.freeze({
 [COMMUNITY_HOUSE.id]:COMMUNITY_HOUSE
});
for(const blueprint of Object.values(BUILDING_BLUEPRINTS))validateBuildingBlueprint(blueprint);
export function buildingBlueprint(id:string):Readonly<BuildingBlueprint>|undefined {
 return Object.hasOwn(BUILDING_BLUEPRINTS,id)?BUILDING_BLUEPRINTS[id]:undefined;
}
