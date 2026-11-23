/** Solid scenery isn't a resource, never contains harvestable materials or inventory. */
export const SCENERY_PRESETS=Object.freeze({
 boulder:Object.freeze({id:"boulder",label:"Pedra decorativa",blocksMovement:true,harvestable:false}),
 wall:Object.freeze({id:"wall",label:"Muro",blocksMovement:true,harvestable:false}),
 statue:Object.freeze({id:"statue",label:"Estátua",blocksMovement:true,harvestable:false})
});
export type SceneryId = keyof typeof SCENERY_PRESETS;
export function sceneryPreset(id:string) {
 return Object.hasOwn(SCENERY_PRESETS,id)?SCENERY_PRESETS[id as SceneryId]:undefined;
}
