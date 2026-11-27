import {PLANNED_BUILDING_VISUALS} from './planned-building-visuals.js';
import {BUILDING_VISUALS} from './building-visuals.js';
/** Pack definitions are data, independent of simulation and drawing. */
const atlas=(src,states,pivotY=88)=>Object.freeze({src,frameWidth:96,frameHeight:96,frameCount:states.length,pivotX:48,pivotY,states:Object.freeze(states)});
export const CLASSIC_ATLASES=Object.freeze({
 'vegetation/apple_tree':atlas('/assets/world/vegetation/apple_tree_atlas_96.png',['leafless','foliage','fruit_sparse','fruit_ripe'])
});
const SIMPLE_ATLASES=Object.freeze({...CLASSIC_ATLASES,...PLANNED_BUILDING_VISUALS,...BUILDING_VISUALS,'entities/human':atlas('/assets/world/entities/human_simple.svg',['idle','moving','working','resting'],66)});
const rusticBuilding=id=>Object.freeze({...BUILDING_VISUALS['buildings/'+id],src:'/assets/world/rustic/'+id+'.svg',fit:'contain'});
const rusticAtlas=(name,states,pivot=88)=>Object.freeze({...atlas('/assets/world/rustic/'+name+'.svg',states,pivot),fit:'contain'});
const directional=(dir)=>Object.freeze({...rusticAtlas('human_'+dir,['idle','moving','working','resting','walk:1','walk:2','walk:3','work:1'],66),
 animations:Object.freeze({moving:Object.freeze({frames:Object.freeze(['moving','walk:1','walk:2','walk:3']),frameMs:125}),working:Object.freeze({frames:Object.freeze(['working','work:1']),frameMs:300})})});
const roles=['leader','farm','builder','miner','woodcutter','cook','carrier','artisan','healer'];
const rusticLevels=Object.fromEntries(['community_house','family_house','depot','workshop','cafeteria','mine'].flatMap(id=>[2,3].map(level=>['buildings/'+id+'@'+level,Object.freeze({...BUILDING_VISUALS['buildings/'+id],src:'/assets/world/rustic/'+id+'_level'+level+'.svg',fit:'contain'})])));
export const RUSTIC_ATLASES=Object.freeze({...SIMPLE_ATLASES,...rusticLevels,
 'vegetation/apple_tree':rusticAtlas('apple_tree',CLASSIC_ATLASES['vegetation/apple_tree'].states),
 ...Object.fromEntries(['carrot','potato','medicinal_herb'].map(id=>['vegetation/'+id,rusticAtlas(id,['seedling','young','mature','old','dead'],80)])),
 ...Object.fromEntries([['tree','tree'],['stone','stone'],['iron_ore','iron'],['copper_ore','copper']].map(([id,name])=>['resources/'+id,rusticAtlas(name,['available','exhausted'],82)])),
 ...Object.fromEntries(['north','south','east','west'].map(dir=>['entities/human/'+dir,directional(dir)])),
 ...Object.fromEntries(roles.map(role=>['accessories/'+role,rusticAtlas('role_'+role,['idle'],48)])),
 'entities/human':Object.freeze({...SIMPLE_ATLASES['entities/human'],src:'/assets/world/rustic/human.svg'}),
 ...Object.fromEntries(['community_house','family_house','depot','workshop','cafeteria','temporary_storage','mine','cemetery'].map(id=>['buildings/'+id,rusticBuilding(id)]))
});
export const WORLD_VISUAL_PACKS=Object.freeze({
 classic:CLASSIC_ATLASES,
 simple:SIMPLE_ATLASES,
 rustic:RUSTIC_ATLASES
});
export const DEFAULT_WORLD_PACK='simple';
export function getWorldVisualPack(id=DEFAULT_WORLD_PACK){return WORLD_VISUAL_PACKS[id]??WORLD_VISUAL_PACKS[DEFAULT_WORLD_PACK];}
