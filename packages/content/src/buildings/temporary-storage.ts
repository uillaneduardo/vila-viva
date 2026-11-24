import type {BuildingBlueprint} from "./community-house.ts";
import {ITEMS} from "../items.ts";
/** Instant ground designation; normal construction commands cannot place it. */
export const TEMPORARY_STORAGE:Readonly<BuildingBlueprint>=Object.freeze({
 id:"building.temporary_storage",version:1,label:"Depósito temporário",displayName:{"pt-BR":"Depósito temporário"},footprint:{width:1,height:1},movementSpeed:1,
 stages:[{id:"designation",label:"Demarcação",displayName:{"pt-BR":"Demarcação"},materials:{wood:1},workUnits:1}],
 effects:[{capability:"storage.capacity",value:12,unit:"items"}],storage:{capacity:12,accepted:Object.keys(ITEMS)}
});
