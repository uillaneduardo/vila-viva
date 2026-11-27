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
  if(next.src!==def.src){const svg=await readFile(new URL('../public'+next.src,import.meta.url),'utf8');assert.match(svg,new RegExp('width="'+next.frameWidth*next.frameCount+'"'));assert.match(svg,/height="96"/);if(id!=='buildings/cemetery')assert.match(svg,/data:image\/png;base64,/);}
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
 assert.ok(reg.resolve('control.pause').sprite);
});

test('expanded rustic atlases preserve dimensions and cover directions, crops, ore and levels',async()=>{
 const rustic=getWorldVisualPack('rustic'),simple=getWorldVisualPack('simple');
 for(const [id,def] of Object.entries(rustic)){
  if(!def.src.includes('/rustic/'))continue;
  const svg=await readFile(new URL('../public'+def.src,import.meta.url),'utf8');
  assert.match(svg,new RegExp('width="'+def.frameWidth*def.frameCount+'"'));
  assert.match(svg,/height="96"/);
  assert.equal(def.states.length,def.frameCount);
 }
 for(const id of ['community_house','family_house','depot','workshop','cafeteria','mine'])for(const level of [2,3])assert.ok(rustic['buildings/'+id+'@'+level]);
 for(const dir of ['north','south','east','west'])assert.ok(rustic['entities/human/'+dir]);
 for(const id of ['carrot','potato','medicinal_herb'])assert.equal(rustic['vegetation/'+id].states.length,5);
 for(const id of ['iron_ore','copper_ore'])assert.ok(rustic['resources/'+id]);
 assert.equal(simple['entities/human/north'],undefined);
});
