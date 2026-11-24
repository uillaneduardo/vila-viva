import {BUILDING_VISUALS} from './building-visuals.js';
/** Pack definitions are data, independent of simulation and drawing. */
const atlas=(src,states,pivotY=88)=>Object.freeze({src,frameWidth:96,frameHeight:96,frameCount:states.length,pivotX:48,pivotY,states:Object.freeze(states)});
export const CLASSIC_ATLASES=Object.freeze({
 'vegetation/apple_tree':atlas('/assets/world/vegetation/apple_tree_atlas_96.png',['leafless','foliage','fruit_sparse','fruit_ripe'])
});
export const WORLD_VISUAL_PACKS=Object.freeze({
 classic:CLASSIC_ATLASES,
 simple:Object.freeze({...CLASSIC_ATLASES,...BUILDING_VISUALS,'entities/human':atlas('/assets/world/entities/human_simple.svg',['idle','moving','working','resting'],66)})
});
export const DEFAULT_WORLD_PACK='simple';
export function getWorldVisualPack(id=DEFAULT_WORLD_PACK){return WORLD_VISUAL_PACKS[id]??WORLD_VISUAL_PACKS[DEFAULT_WORLD_PACK];}
