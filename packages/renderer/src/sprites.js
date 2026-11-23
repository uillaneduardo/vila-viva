/** Renderer-only sprite registry. Gameplay never imports atlas paths.
 * Missing images deliberately fall back to semantic geometric shapes.
 */
export const SPRITES=Object.freeze({
 'character.human':{id:'entities/human',states:['idle','moving','working','resting']},
 'resource.wood':{id:'resources/tree',states:['available','exhausted']},
 'resource.food':{id:'resources/food',states:['available','exhausted']},
 'resource.stone':{id:'resources/stone',states:['available','exhausted']}
});
export class SpriteLibrary {
 constructor(){this.images=new Map();}
 register(id,image){this.images.set(id,image);}
 draw(ctx,id,x,y,size,state='idle'){
  const sprite=this.images.get(id+':'+state)||this.images.get(id);
  if(!sprite||!sprite.complete||!sprite.naturalWidth)return false;
  ctx.drawImage(sprite,x-size/2,y-size/2,size,size);
  return true;
 }
}
