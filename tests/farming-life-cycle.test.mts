import assert from "node:assert/strict";
import test from "node:test";
import {createWorld,applyCommand,advanceTick} from "../packages/engine/src/engine.ts";
import {naturalSource,NATURAL_SOURCES} from "../packages/content/src/natural-sources.ts";
import {FOOD_ITEMS} from "../packages/content/src/foods.ts";
import {canEnter} from "../packages/systems/collision/src/index.ts";
import {availablePlots,countZoneCrops} from "../packages/systems/farming/src/index.ts";
import {makePrototype} from "../apps/server/src/index.mts";
const god=(w,id,action,extra={})=>applyCommand(w,{
 worldId:w.id,commandId:id,actorRole:"admin",action,...extra
});
const owned=(w,position={x:2,y:1})=>{
 assert.equal(god(w,"owner","npc.spawn",{position,parameters:{name:"Tester",ownerId:"local"}}).ok,true);
 return w.entities.find(e=>e.id==="npc-owner");
};
const player=(w,id,action,targetId,extra={})=>applyCommand(w,{
 worldId:w.id,commandId:id,actorRole:"player",actorId:"local",action,targetId,...extra
});
const zone=(w,id,sourceId,position={x:2,y:2},width=2,height=2)=>
 god(w,id,"farming.zone.create",{position,parameters:{sourceId,width,height}});

test("catalog defines only one perennial tree and two finite vegetable species",()=>{
 assert.deepEqual(Object.keys(NATURAL_SOURCES),["apple_tree","carrot","potato"]);
 assert.equal(naturalSource("apple_tree").growthMode,"perennial");
 for(const id of ["carrot","potato"]){
  assert.equal(naturalSource(id).growthMode,"single_harvest");
  assert.equal(naturalSource(id).seedsPerHarvest,2);
  assert.equal(naturalSource(id).blocksMovement,false);
  assert.ok(FOOD_ITEMS[naturalSource(id).productId].satiety>0);
 }
});
test("planting zones reserve land without blocking movement, but cannot overlap foundations",()=>{
 const w=createWorld("land",12,12);
 assert.equal(zone(w,"carrots","carrot",{x:4,y:4},3,3).ok,true);
 const farm=w.entities.find(e=>e.kind==="planting_zone");
 assert.equal(canEnter(w,{x:4,y:4}),true);
 assert.equal(countZoneCrops(w,farm).capacity,9);
 assert.equal(availablePlots(w,farm).length,9);
 assert.equal(zone(w,"overlap","potato",{x:6,y:6},2,2).error,"BLOCKED");
 assert.equal(zone(w,"tooBig","carrot",{x:11,y:11},2,2).error,"OUT_OF_BOUNDS");
 assert.equal(zone(w,"unknown","fake",{x:1,y:1}).error,"INVALID_PAYLOAD");
 assert.equal(zone(w,"invalid","potato",{x:1,y:1},20,20).error,"INVALID_PAYLOAD");
 assert.equal(god(w,"wall","obstacle.spawn",{
  position:{x:5,y:4},parameters:{obstacleType:"wall"}}).ok,true);
 assert.equal(availablePlots(w,farm).length,8);
 assert.equal(god(w,"remove","farming.zone.remove",{targetId:farm.id}).ok,true);
 assert.equal(w.entities.some(e=>e.kind==="planting_zone"),false);
 assert.equal(canEnter(w,{x:4,y:4}),true);
});
test("one carried seed creates one crop; planting validates actor, adjacency and occupancy",()=>{
 const w=createWorld("f",12,12);
 const person=owned(w,{x:2,y:1});
 assert.equal(zone(w,"field","carrot",{x:2,y:2}).ok,true);
 const farm=w.entities.find(e=>e.kind==="planting_zone");
 assert.equal(player(w,"missing","farming.plant",farm.id,{position:{x:2,y:2}}).error,"EXHAUSTED");
 person.inventory={carrot_seed:1};
 assert.equal(player(w,"far","farming.plant",farm.id,{position:{x:3,y:3}}).error,"BLOCKED");
 assert.equal(player(w,"plant","farming.plant",farm.id,{position:{x:2,y:2}}).ok,true);
 const plant=w.entities.find(e=>e.id==="plant-plant");
 assert.equal(plant.sourceId,"carrot");
 assert.equal(plant.plantedInZoneId,farm.id);
 assert.equal(person.inventory.carrot_seed,0);
 assert.equal(plant.life.stage,"seedling");
 assert.equal(canEnter(w,{x:2,y:2}),true);
 assert.equal(player(w,"duplicate","farming.plant",farm.id,{position:{x:2,y:2}}).error,"BLOCKED");
 assert.equal(countZoneCrops(w,farm).planted,1);
});
test("carrot matures once, yields food and 2 seeds, then frees plot without magically regrowing",()=>{
 const w=createWorld("carrot",12,12);
 const person=owned(w);
 zone(w,"field","carrot");
 person.inventory={carrot_seed:1};
 const field=w.entities.find(e=>e.kind==="planting_zone");
 assert.equal(player(w,"sow","farming.plant",field.id,{position:{x:2,y:2}}).ok,true);
 const crop=w.entities.find(e=>e.id==="plant-sow");
 for(let i=0;i<55;i++)advanceTick(w);
 assert.equal(crop.life.stage,"mature");
 assert.equal(crop.quantity,3);
 for(let i=0;i<35;i++)advanceTick(w);
 assert.equal(crop.quantity,3); // finite, not renewable
 assert.equal(player(w,"harvest","resource.harvest",crop.id).ok,true);
 assert.equal(person.inventory.carrot,3);
 assert.equal(person.inventory.carrot_seed,2);
 assert.equal(w.entities.find(e=>e.id===crop.id),undefined);
 assert.equal(availablePlots(w,field).length,4);
 person.satiety=45;
 assert.equal(player(w,"eat","npc.eat",person.id,{parameters:{itemId:"carrot"}}).ok,true);
 assert.equal(person.inventory.carrot,2);
 assert.equal(person.satiety,73);
 assert.equal(player(w,"sow-again","farming.plant",field.id,{position:{x:2,y:2}}).ok,true);
 assert.equal(person.inventory.carrot_seed,1);
});
test("potato crop has finite yield, produces viable seed and disappears when it withers",()=>{
 const w=createWorld("potato",12,12);const person=owned(w);
 zone(w,"zone","potato");person.inventory={potato_seed:2};
 const field=w.entities.find(e=>e.kind==="planting_zone");
 player(w,"first","farming.plant",field.id,{position:{x:2,y:2}});
 player(w,"second","farming.plant",field.id,{position:{x:3,y:2}});
 for(let i=0;i<80;i++)advanceTick(w);
 const ripe=w.entities.find(e=>e.id==="plant-first");
 assert.equal(ripe.quantity,4);
 assert.equal(player(w,"harvest","resource.harvest",ripe.id).ok,true);
 assert.equal(person.inventory.potato,4);
 assert.equal(person.inventory.potato_seed,2);
 for(let i=80;i<333;i++)advanceTick(w);
 assert.equal(w.entities.some(e=>e.id==="plant-second"),false);
 assert.equal(countZoneCrops(w,field).planted,0);
});
test("apple harvesting returns seeds and a replanted tree keeps the perennial life-cycle",()=>{
 const w=createWorld("orchard",12,12);
 const person=owned(w);
 zone(w,"field","apple_tree");
 god(w,"mother","resource.spawn",{position:{x:3,y:1},parameters:{
  resourceType:"food",sourceId:"apple_tree",ageTicks:120,quantity:12
 }});
 assert.equal(player(w,"apple-harvest","resource.harvest","resource-mother").ok,true);
 assert.equal(person.inventory.apple,3);
 assert.equal(person.inventory.apple_seed,1);
 const field=w.entities.find(e=>e.kind==="planting_zone");
 assert.equal(player(w,"plant","farming.plant",field.id,{position:{x:2,y:2}}).ok,true);
 assert.equal(person.inventory.apple_seed,0);
 const tree=w.entities.find(e=>e.id==="plant-plant");
 assert.equal(tree.life.stage,"seedling");
 assert.equal(canEnter(w,tree.position),false);
 for(let i=0;i<160;i++)advanceTick(w);
 assert.equal(tree.life.stage,"mature");
 assert.equal(tree.quantity,3);
});
test("NPC obtains real seeds from the depot and plants carrots without teleportation",()=>{
 const w=createWorld("auto",15,12);
 god(w,"depot","construction.place",{position:{x:5,y:2},parameters:{
  blueprintId:"building.depot",mode:"completed"
 }});
 god(w,"seed","storage.admin_supply",{targetId:"construction-depot",parameters:{
  materialId:"carrot_seed",quantity:7
 }});
 zone(w,"field","carrot",{x:8,y:3},2,2);
 god(w,"worker","npc.spawn",{position:{x:4,y:3},parameters:{name:"Agricultor"}});
 const zoneEntity=w.entities.find(e=>e.id==="zone-field");
 const warehouse=w.entities.find(e=>e.id==="construction-depot");
 const npc=w.entities.find(e=>e.id==="npc-worker");
 const start=w.tick;
 for(let i=0;i<95;i++)advanceTick(w);
 assert.ok(countZoneCrops(w,zoneEntity).planted>0,"worker planted from physical seed inventory");
 assert.ok((warehouse.stock.carrot_seed??0)<7);
 assert.equal(w.tick,start+95,"AI internal actions never advance world tick");
 assert.ok(npc.ai.history.some(x=>x.activity==="Plantando"||x.activity==="Buscando sementes"));
});
test("God Mode API exposes species, fields, food and seed warehouse stock",async()=>{
 const {server}=makePrototype();await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+server.address().port;
 const post=(path,data)=>fetch(base+path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});
 try{
  const catalog=await (await fetch(base+"/api/catalog")).json();
  assert.equal(catalog.naturalSources.carrot.seedItem,"carrot_seed");
  assert.equal(catalog.naturalSources.potato.growthMode,"single_harvest");
  assert.equal(catalog.foods.potato.satiety,42);
  const placed=await (await post("/api/brush",{role:"admin",commands:[{
   commandId:"zone-api",action:"farming.zone.create",position:{x:15,y:4},
   parameters:{sourceId:"potato",width:3,height:3}
  }]})).json();
  assert.equal(placed.results[0].ok,true);
  const inspect=await (await fetch(base+"/api/inspect?entityId=zone-zone-api")).json();
  assert.equal(inspect.farming.capacity,9);
  assert.equal(inspect.farming.planted,0);
  const result=await (await post("/api/commands",{
   commandId:"remove-zone",role:"admin",action:"farming.zone.remove",targetId:"zone-zone-api"
  })).json();
  assert.equal(result.result.ok,true);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
