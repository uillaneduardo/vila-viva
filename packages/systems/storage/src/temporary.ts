import type {World,Position,Entity,Construction} from "../../../domain/src/contracts.ts";
import {canPlaceEntity,occupiesCell} from "../../collision/src/index.ts";
import {TEMPORARY_STORAGE} from "../../../content/src/buildings/temporary-storage.ts";
export {TEMPORARY_STORAGE};
export const isTemporaryStorage=(e:Entity):e is Construction=>e.kind==="construction"&&e.blueprintId===TEMPORARY_STORAGE.id&&e.status==="completed";
export const canCreateTemporaryStorage=(world:World,position:Position)=>canPlaceEntity(world,position)&&!world.entities.some(e=>e.kind==="planting_zone"&&occupiesCell(e,position));
