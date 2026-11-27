import {PLANNED_BUILDING_ALIASES} from './planned-building-visuals.js';
import {resolveBuildingVisual} from './building-visuals.js';
import {getWorldVisualPack} from './visual-packs.js';
import {fitSpriteFrame,frameForState} from './sprite-layout.js';
import {resolveCharacterState,resolveCharacterRole,resolveFacing} from './character-visual-state.js';
/** World sprite registry. Render-only; no gameplay authority or inventory mutation. */
export const SPRITES=Object.freeze({
 'character.human':{id:'entities/human',states:['idle','moving','working','resting']},
 'resource.wood':{id:'resources/tree',states:['available','exhausted']},
 'resource.food':{id:'vegetation/apple_tree',states:['leafless','foliage','fruit_sparse','fruit_ripe']},
 'resource.iron_ore':{id:'resources/iron_ore',states:['available','exhausted']},
 'resource.copper_ore':{id:'resources/copper_ore',states:['available','exhausted']},
 'resource.stone':{id:'resources/stone',states:['available','exhausted']},
 'building.community_house':{id:'buildings/community_house',states:['site','foundation','structure','roof','completed']},
 'building.depot':{id:'buildings/depot',states:['site','foundation','structure','completed']}
});

/** Atlas source is local, transparent, and deliberately independent of UI icons. */
export const WORLD_ATLASES=getWorldVisualPack();

/** Map authoritative entity state to an appearance without changing the entity. */
export function resolveWorldSprite(entity,context){
 if(entity?.kind==='character'){
 const segment=entity.movementSegment,dx=segment?segment.to.x-segment.from.x:0,dy=segment?segment.to.y-segment.from.y:0;
 const direction=context?.direction??resolveFacing(dx,dy);
 return {id:'entities/human',state:resolveCharacterState(entity,context),direction,role:resolveCharacterRole(entity),scale:1.45};
 }
 if(entity?.kind==='construction')return resolveBuildingVisual(entity);
 if(entity?.kind!=='resource')return null;
 if(entity.sourceId==='carrot'||entity.sourceId==='potato'||entity.sourceId==='medicinal_herb')
  return {id:'vegetation/'+entity.sourceId,state:entity.life?.stage??'seedling',scale:.82};
 if(entity.resourceType==='food'){
  // Species-specific projection; old generic food sources retain a compatible fallback.
  if(entity.sourceId&&entity.sourceId!=='apple_tree')return null;
  const stage=entity.life?.stage;
  const fraction=entity.maximum>0?entity.quantity/entity.maximum:0;
  const state=stage==='dead'||entity.visualState==='leafless'?'leafless':
   entity.quantity<=0?'foliage':fraction<=.4?'fruit_sparse':'fruit_ripe';
  const scale=stage==='seedling'?.52:stage==='young'?.9:stage==='old'?1.45:1.55;
  return {id:'vegetation/apple_tree',state,scale};
 }
 const visual=SPRITES['resource.'+entity.resourceType];
 return visual?{id:visual.id,state:entity.quantity===0?'exhausted':'available',scale:.79}:null;
}

export class SpriteLibrary {
 constructor({pack=getWorldVisualPack()}={}){this.images=new Map();this.atlases=new Map();this.pack=pack;}
 setPack(pack){this.pack=pack;this.atlases.clear();this.preload();}
 register(id,image){this.images.set(id,image);}
 preload(){
  if(typeof Image==='undefined')return;
  for(const [id,definition] of Object.entries(this.pack))if(!definition.planned)this.loadAtlas(id,definition);
 }
 loadAtlas(id,definition){
   if(typeof Image==='undefined'||this.atlases.has(id))return;
   const image=new Image();
   this.atlases.set(id,{image,definition,ready:false});
   image.onload=()=>{const entry=this.atlases.get(id);if(entry?.image===image)entry.ready=image.naturalWidth===definition.frameWidth*definition.frameCount&&image.naturalHeight===definition.frameHeight;};
   image.onerror=()=>{const entry=this.atlases.get(id);if(entry?.image===image)entry.ready=false;};
   image.src=definition.src;
 }
 draw(ctx,id,x,y,size,state='idle',{height=size,level=1,direction,now=0,animate=false}={}){
  const legacyStates={site:'stage:0',foundation:'stage:1',structure:'stage:2',roof:'stage:3'};
  const key=legacyStates[state]??state;
  const directional=direction&&id+'/'+direction;
  const assetId=directional&&Object.hasOwn(this.pack,directional)?directional:Object.hasOwn(this.pack,id)?id:PLANNED_BUILDING_ALIASES[id]??id;
  for(const candidate of [assetId,assetId+'@'+level])if(Object.hasOwn(this.pack,candidate))this.loadAtlas(candidate,this.pack[candidate]);
  const variant=this.atlases.get(assetId+'@'+level);
  const atlas=variant?.ready&&(variant.definition.states.includes(key)||variant.definition.states.includes(state))?variant:this.atlases.get(assetId);
  if(atlas?.ready){
   const d=atlas.definition;
   const frame=frameForState(d,d.states.includes(key)?key:state,now,animate);
   if(frame===-1)return false;
   // Raster completed buildings are contained; footprint diagrams remain full-area.
   const fit=d.fit==='contain'&&(state==='completed'||!assetId.startsWith('buildings/'))?'contain':'stretch';
   const bounds=fitSpriteFrame(d,x,y,size,height,fit);
   ctx.save();ctx.imageSmoothingEnabled=false;
   ctx.drawImage(atlas.image,frame*d.frameWidth,0,d.frameWidth,d.frameHeight,bounds.x,bounds.y,bounds.width,bounds.height);
   ctx.restore();return true;
  }
  const sprite=this.images.get(id+':'+state)||this.images.get(id);
  if(!sprite||!sprite.complete||!sprite.naturalWidth)return false;
  const bounds=fitSpriteFrame({frameWidth:sprite.naturalWidth,frameHeight:sprite.naturalHeight||sprite.naturalWidth,pivotX:sprite.naturalWidth/2,pivotY:(sprite.naturalHeight||sprite.naturalWidth)/2},x,y,size,height);
  ctx.drawImage(sprite,bounds.x,bounds.y,bounds.width,bounds.height);return true;
 }
}
