import {resolveBuildingVisual} from './building-visuals.js';
import {getWorldVisualPack} from './visual-packs.js';
import {resolveCharacterState} from './character-visual-state.js';
/** World sprite registry. Render-only; no gameplay authority or inventory mutation. */
export const SPRITES=Object.freeze({
 'character.human':{id:'entities/human',states:['idle','moving','working','resting']},
 'resource.wood':{id:'resources/tree',states:['available','exhausted']},
 'resource.food':{id:'vegetation/apple_tree',states:['leafless','foliage','fruit_sparse','fruit_ripe']},
 'resource.stone':{id:'resources/stone',states:['available','exhausted']},
 'building.community_house':{id:'buildings/community_house',states:['site','foundation','structure','roof','completed']},
 'building.depot':{id:'buildings/depot',states:['site','foundation','structure','completed']}
});

/** Atlas source is local, transparent, and deliberately independent of UI icons. */
export const WORLD_ATLASES=getWorldVisualPack();

/** Map authoritative entity state to an appearance without changing the entity. */
export function resolveWorldSprite(entity,context){
 if(entity?.kind==='character')return {id:'entities/human',state:resolveCharacterState(entity,context),scale:1.45};
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
  for(const [id,definition] of Object.entries(this.pack)){
   const image=new Image();
   this.atlases.set(id,{image,definition,ready:false});
   image.onload=()=>{const entry=this.atlases.get(id);if(entry?.image===image)entry.ready=image.naturalWidth===definition.frameWidth*definition.frameCount&&image.naturalHeight===definition.frameHeight;};
   image.onerror=()=>{const entry=this.atlases.get(id);if(entry?.image===image)entry.ready=false;};
   image.src=definition.src;
  }
 }
 draw(ctx,id,x,y,size,state='idle',{height=size,level=1}={}){
  const variant=this.atlases.get(id+'@'+level);
  const atlas=variant?.ready&&variant.definition.states.includes(state)?variant:this.atlases.get(id);
  if(atlas?.ready){
   const frame=atlas.definition.states.indexOf(state);
   if(frame===-1)return false;
   const d=atlas.definition;
   ctx.save();ctx.imageSmoothingEnabled=false;
   ctx.drawImage(atlas.image,frame*d.frameWidth,0,d.frameWidth,d.frameHeight,
    x-size*d.pivotX/d.frameWidth,y-height*d.pivotY/d.frameHeight,size,height);
   ctx.restore();return true;
  }
  const sprite=this.images.get(id+':'+state)||this.images.get(id);
  if(!sprite||!sprite.complete||!sprite.naturalWidth)return false;
  ctx.drawImage(sprite,x-size/2,y-height/2,size,height);return true;
 }
}
