import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {BUILDING_BLUEPRINTS} from '../packages/content/src/buildings/registry.ts';
import {BUILDING_VISUALS,resolveBuildingVisual} from '../packages/renderer/src/building-visuals.js';
import {SpriteLibrary} from '../packages/renderer/src/sprites.js';
import {getWorldVisualPack} from '../packages/renderer/src/visual-packs.js';
test('current building blueprints have all stages and terminal sprites',async()=>{
 for(const b of Object.values(BUILDING_BLUEPRINTS)){
  const id=resolveBuildingVisual({blueprintId:b.id,status:'completed'}).id;
  const d=BUILDING_VISUALS[id];assert.ok(d,b.id);
  for(let i=0;i<b.stages.length;i++)assert.ok(d.states.includes('stage:'+i));
  assert.ok(d.states.includes('completed'));assert.ok(d.states.includes('destroyed'));
  const svg=await readFile(new URL('../public'+d.src,import.meta.url),'utf8');
  assert.ok(svg.includes('width="'+(d.frameWidth*d.frameCount)+'" height="'+d.frameHeight+'"'));
 }
});
test('future blueprint remains renderable by fallback and level does not alter ID',()=>{
 const v=resolveBuildingVisual({blueprintId:'building.future',status:'site',stageIndex:2,level:3});
 assert.deepEqual(v,{id:'buildings/future',state:'stage:2',scale:1,level:3});
 assert.equal(new SpriteLibrary().draw({},v.id,0,0,40,v.state,{height:20,level:v.level}),false);
});
test('atlas scales to rectangular footprint and uses base on missing level',()=>{
 const lib=new SpriteLibrary({pack:getWorldVisualPack()});
 const d=BUILDING_VISUALS['buildings/workshop'];lib.atlases.set('buildings/workshop',{ready:true,definition:d,image:{}});
 let args;const ctx={save(){},restore(){},drawImage(...a){args=a;}};
 assert.equal(lib.draw(ctx,'buildings/workshop',100,100,90,'completed',{height:60,level:2}),true);
 assert.deepEqual(args.slice(-4),[55,70,90,60]);
});
