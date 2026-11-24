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
export const WORLD_ATLASES=Object.freeze({
 'vegetation/apple_tree':Object.freeze({
  src:'/assets/world/vegetation/apple_tree_atlas_96.png',
  frameWidth:96,frameHeight:96,frameCount:4,
  pivotX:48,pivotY:88, // aligned to the entity's world footprint
  states:Object.freeze(['leafless','foliage','fruit_sparse','fruit_ripe'])
 })
});

/** Map authoritative entity state to an appearance without changing the entity. */
export function resolveWorldSprite(entity){
 if(entity?.kind==='character')return entity.health<=0?
  {id:'entities/human',state:'dead',scale:.79}:{id:'entities/human',state:'idle',scale:.79};
 if(entity?.kind==='construction'){
  const states=entity.blueprintId==='building.depot'?
   ['site','foundation','structure']:['site','foundation','structure','roof'];
  const state=entity.status==='destroyed'?'destroyed':
   entity.status==='completed'?'completed':states[Math.min(states.length-1,entity.stageIndex)];
  const spriteId=entity.blueprintId==='building.depot'?'buildings/depot':
   entity.blueprintId==='building.community_house'?'buildings/community_house':null;
  return spriteId?{id:spriteId,state,scale:1}:null;
 }
 if(entity?.kind!=='resource')return null;
 if(entity.sourceId==='carrot'||entity.sourceId==='potato')
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
 constructor(){this.images=new Map();this.atlases=new Map();}
 register(id,image){this.images.set(id,image);}
 preload(){
  if(typeof Image==='undefined')return;
  for(const [id,definition] of Object.entries(WORLD_ATLASES)){
   const image=new Image();
   this.atlases.set(id,{image,definition,ready:false});
   image.onload=()=>{const entry=this.atlases.get(id);if(entry)entry.ready=image.naturalWidth===definition.frameWidth*definition.frameCount&&image.naturalHeight===definition.frameHeight;};
   image.onerror=()=>{const entry=this.atlases.get(id);if(entry)entry.ready=false;};
   image.src=definition.src;
  }
 }
 draw(ctx,id,x,y,size,state='idle'){
  const atlas=this.atlases.get(id);
  if(atlas?.ready){
   const frame=atlas.definition.states.indexOf(state);
   if(frame===-1)return false;
   const d=atlas.definition;
   ctx.save();ctx.imageSmoothingEnabled=false;
   ctx.drawImage(atlas.image,frame*d.frameWidth,0,d.frameWidth,d.frameHeight,
    x-size*d.pivotX/d.frameWidth,y-size*d.pivotY/d.frameHeight,size,size);
   ctx.restore();return true;
  }
  const sprite=this.images.get(id+':'+state)||this.images.get(id);
  if(!sprite||!sprite.complete||!sprite.naturalWidth)return false;
  ctx.drawImage(sprite,x-size/2,y-size/2,size,size);return true;
 }
}
