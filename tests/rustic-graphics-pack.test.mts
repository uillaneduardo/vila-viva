import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {getWorldVisualPack,DEFAULT_WORLD_PACK} from '../packages/renderer/src/visual-packs.js';
import {UiAssetRegistry} from '../packages/ui/assets/registry.js';
import {registerRusticUi} from '../packages/ui/assets/rustic-pack.js';
test('rustic preserves world atlas contract and default',async()=>{
 assert.equal(DEFAULT_WORLD_PACK,'simple');
 const simple=getWorldVisualPack('simple'),rustic=getWorldVisualPack('rustic');
 assert.equal(getWorldVisualPack('invalid'),simple);
 for(const [id,def] of Object.entries(simple)){
  const next=rustic[id];assert.deepEqual(next.states,def.states);assert.equal(next.pivotX,def.pivotX);assert.equal(next.pivotY,def.pivotY);
  if(next.src!==def.src){const svg=await readFile(new URL('../public'+next.src,import.meta.url),'utf8');assert.match(svg,new RegExp('width="'+next.frameWidth*next.frameCount+'"'));assert.match(svg,/height="96"/);assert.match(svg,/data:image\/png;base64,/);}
 }
 assert.notEqual(rustic['buildings/depot'].src,simple['buildings/depot'].src);
});
test('rustic UI registration is scoped and assets exist',async()=>{
 const reg=new UiAssetRegistry();registerRusticUi(reg);
 assert.equal(reg.resolve('resource.wood').sprite,null);
 reg.setTheme('rustic-dark');
 for(const id of ['resource.wood','resource.food','resource.stone','action.add-npc','action.build','choice.building.depot','choice.building.workshop']){
  const src=reg.resolve(id).sprite;assert.ok(src);assert.match(await readFile(new URL('../public'+src,import.meta.url),'utf8'),/data:image\/png;base64,/);
 }
 assert.equal(reg.resolve('control.pause').sprite,null);
});
