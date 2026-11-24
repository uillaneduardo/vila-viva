import assert from 'node:assert/strict';
import test from 'node:test';
import {createWorld,applyCommand,advanceTick} from '../packages/engine/src/engine.ts';
import {COMMUNITY_HOUSE} from '../packages/content/src/buildings/community-house.ts';
import {buildingBlueprint} from '../packages/content/src/buildings/registry.ts';
import {buildingCapabilities} from '../packages/systems/construction/src/index.ts';
import {canEnter} from '../packages/systems/collision/src/index.ts';
import {resolveWorldSprite} from '../packages/renderer/src/sprites.js';
import {makePrototype} from '../apps/server/src/index.mts';
import {readFile} from 'node:fs/promises';
const issue=(w,id,action,extra={})=>applyCommand(w,{worldId:w.id,commandId:id,action,actorRole:'admin',...extra});
const place=(w,id='house',position={x:3,y:3})=>
 issue(w,id,'construction.place',{position,parameters:{blueprintId:COMMUNITY_HOUSE.id}});
test('community house uses one registered blueprint and a solid 2x2 footprint',()=>{
 const w=createWorld('world',12,12);
 assert.equal(buildingBlueprint('building.community_house'),COMMUNITY_HOUSE);
 assert.equal(buildingBlueprint('building.unknown'),undefined);
 assert.equal(place(w).ok,true);
 const site=w.entities.find(e=>e.kind==='construction');
 assert.equal(site.status,'site');assert.equal(site.stageIndex,0);
 assert.deepEqual(site.delivered,{});
 assert.deepEqual(buildingCapabilities(site),{});
 assert.equal(resolveWorldSprite(site).state,'site');
 for(const [x,y] of [[3,3],[3,4],[4,3],[4,4]])assert.equal(canEnter(w,{x,y}),false);
 assert.equal(issue(w,'overlap','obstacle.spawn',{position:{x:4,y:4},parameters:{obstacleType:'wall'}}).error,'BLOCKED');
 assert.equal(place(w,'another',{x:4,y:4}).error,'BLOCKED');
 assert.equal(place(w,'outside',{x:11,y:11}).error,'OUT_OF_BOUNDS');
 assert.equal(issue(w,'invalid','construction.place',{position:{x:7,y:7},parameters:{blueprintId:'building.fake'}}).error,'INVALID_PAYLOAD');
 assert.equal(issue(w,'npc','npc.spawn',{position:{x:4,y:4},parameters:{name:'Teste'}}).error,'BLOCKED');
 assert.equal(w.entities.length,1);
});
test('manual God Mode construction follows all four stages and unlocks capacities only once',()=>{
 const w=createWorld('w');
 place(w);
 const site=w.entities[0];
 const expectedVisuals=['site','foundation','structure','roof'];
 for(let i=0;i<COMMUNITY_HOUSE.stages.length;i++){
  const stage=COMMUNITY_HOUSE.stages[i];
  assert.equal(site.stageIndex,i);
  assert.equal(resolveWorldSprite(site).state,expectedVisuals[i]);
  assert.equal(issue(w,'premature'+i,'construction.admin_work',{targetId:site.id,parameters:{workUnits:1}}).error,'NOT_READY');
  for(const [materialId,quantity] of Object.entries(stage.materials)){
   const before=JSON.stringify(site.delivered);
   assert.equal(issue(w,'bad'+i+materialId,'construction.admin_supply',{targetId:site.id,parameters:{materialId,quantity:quantity+1}}).error,'INVALID_PAYLOAD');
   assert.equal(JSON.stringify(site.delivered),before);
   assert.equal(issue(w,'supply'+i+materialId,'construction.admin_supply',{targetId:site.id,parameters:{materialId,quantity}}).ok,true);
  }
  assert.deepEqual(buildingCapabilities(site),{});
  const partial=issue(w,'partial'+i,'construction.admin_work',{targetId:site.id,parameters:{workUnits:stage.workUnits-1}});
  assert.equal(partial.ok,true);assert.equal(site.workDone,stage.workUnits-1);
  const final=issue(w,'finish'+i,'construction.admin_work',{targetId:site.id,parameters:{workUnits:1}});
  assert.equal(final.ok,true);
  assert.ok(final.events.some(e=>e.type==='construction.stage_completed'));
  if(i===COMMUNITY_HOUSE.stages.length-1)assert.equal(final.events.filter(e=>e.type==='building.completed').length,1);
  else assert.equal(final.events.some(e=>e.type==='building.completed'),false);
  assert.deepEqual(site.delivered,{});assert.equal(site.workDone,0);
 }
 assert.equal(site.status,'completed');
 assert.equal(resolveWorldSprite(site).state,'completed');
 assert.equal(site.stageIndex,4);
 assert.deepEqual(buildingCapabilities(site),{
  'housing.adult_capacity':6,'housing.dependent_capacity':2,
  'housing.comfort':10,'social.meeting_capacity':4
 });
 assert.equal(issue(w,'post','construction.admin_work',{targetId:site.id,parameters:{workUnits:1}}).error,'ALREADY_COMPLETED');
 assert.equal(w.entities.length,1);
 assert.equal(w.appliedCommands.filter(x=>x==='finish3').length,1);
 site.availability='unavailable';
 assert.deepEqual(buildingCapabilities(site),{});
});
test('physical delivery comes only from adjacent actor inventory and consumes energy',()=>{
 const w=createWorld('w',10,10);
 place(w,'site',{x:2,y:2});
 issue(w,'npc','npc.spawn',{position:{x:1,y:2},parameters:{name:'Construtora'}});
 const site=w.entities.find(e=>e.kind==='construction');
 const worker=w.entities.find(e=>e.kind==='character');
 worker.inventory={wood:4,stone:12};
 const deliver=(id,materialId,quantity)=>applyCommand(w,{worldId:w.id,commandId:id,actorRole:'npc',actorId:worker.id,
  action:'construction.deliver',targetId:site.id,parameters:{materialId,quantity}});
 assert.equal(deliver('wood','wood',4).ok,true);
 assert.equal(worker.inventory.wood,0);assert.equal(site.delivered.wood,4);
 assert.equal(deliver('double','wood',1).error,'INVALID_PAYLOAD');
 assert.equal(deliver('stone','stone',12).ok,true);
 assert.equal(worker.inventory.stone,0);assert.equal(site.delivered.stone,12);
 const worked=applyCommand(w,{worldId:w.id,commandId:'work',actorRole:'npc',actorId:worker.id,
  action:'construction.work',targetId:site.id});
 assert.equal(worked.ok,true);assert.equal(site.workDone,1);
 assert.equal(worker.energy,97); // 2 deliveries + 1 work
 const another=issue(w,'rock','resource.spawn',{position:{x:5,y:5},parameters:{resourceType:'stone',quantity:50}});
 assert.equal(another.ok,true);
 assert.equal(site.delivered.stone,12); // resource not magically transferred from source
});
test('nonadjacent characters cannot contribute, simulated time cannot build for free',()=>{
 const w=createWorld('w');
 place(w,'site',{x:3,y:3});issue(w,'npc','npc.spawn',{position:{x:9,y:9},parameters:{name:'Longe'}});
 const site=w.entities.find(e=>e.kind==='construction'),worker=w.entities.find(e=>e.kind==='character');
 worker.inventory={wood:10};
 const deliver=applyCommand(w,{worldId:w.id,commandId:'delivery',actorRole:'npc',actorId:worker.id,
  action:'construction.deliver',targetId:site.id,parameters:{materialId:'wood',quantity:4}});
 assert.equal(deliver.error,'BLOCKED');
 const stage=site.stageIndex,quantity=Object.keys(site.delivered).length;
 for(let i=0;i<500;i++)advanceTick(w);
 assert.equal(site.stageIndex,stage);assert.equal(Object.keys(site.delivered).length,quantity);
 assert.equal(site.workDone,0);assert.equal(Object.keys(buildingCapabilities(site)).length,0);
});
test('server exposes blueprint, site inspection and explicit God Mode actions',async()=>{
 const {server}=makePrototype();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const post=(path,body)=>fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 try{
  const catalogue=await (await fetch(base+'/api/catalog')).json();
  assert.equal(catalogue.buildingBlueprints['building.community_house'].footprint.width,2);
  const placed=await (await post('/api/brush',{role:'admin',commands:[
   {commandId:'site-browser',action:'construction.place',position:{x:10,y:2},parameters:{blueprintId:'building.community_house'}}
  ]})).json();
  assert.equal(placed.results[0].ok,true);
  const siteId='construction-site-browser';
  const info=await (await fetch(base+'/api/inspect?entityId='+siteId)).json();
  assert.equal(info.construction.stage,'foundation');
  assert.equal(info.construction.remaining.stone,12);
  assert.deepEqual(info.construction.capabilities,{});
  const result=await (await post('/api/commands',{commandId:'addsitewood',role:'admin',action:'construction.admin_supply',
   targetId:siteId,parameters:{materialId:'wood',quantity:4}})).json();
  assert.equal(result.result.ok,true);
  const world=await (await fetch(base+'/api/world')).json();
  assert.equal(world.world.entities.find(e=>e.id===siteId).delivered.wood,4);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
test('browser integration exposes construction actions and five visual phases',async()=>{
 const ui=await readFile(new URL('../apps/shared-ui/app.js',import.meta.url),'utf8');
 const hud=await readFile(new URL('../packages/ui/src/hud.js',import.meta.url),'utf8');
 const inspector=await readFile(new URL('../packages/ui/src/inspector.js',import.meta.url),'utf8');
 assert.match(ui,/construction\.place/);assert.match(ui,/construction\.admin_supply/);
 assert.doesNotMatch(hud,/\['house','events','stats'\]\.includes/);
 assert.match(inspector,/construction\.admin_work/);
});
