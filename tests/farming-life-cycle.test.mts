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
const pick=(w,person,itemId)=>{const item=w.entities.find(e=>e.kind==="item"&&e.itemId===itemId);assert.ok(item);assert.equal(player(w,"pick-"+itemId+"-"+w.tick,"item.pickup",item.id).ok,true);};
const zone=(w,id,sourceId,position={x:2,y:2},width=2,height=2)=>
 god(w,id,"farming.zone.create",{position,parameters:{sourceId,width,height}});

test("catalog defines perennial, food and medicinal crops",()=>{
 assert.deepEqual(Object.keys(NATURAL_SOURCES),["apple_tree","carrot","potato","medicinal_herb"]);
 assert.equal(naturalSource("apple_tree").growthMode,"perennial");
 for(const id of ["carrot","potato"]){
  assert.equal(naturalSource(id).growthMode,"single_harvest");
  assert.equal(naturalSource(id).seedsPerHarvest,2);
  assert.equal(naturalSource(id).blocksMovement,false);
  assert.ok(FOOD_ITEMS[naturalSource(id).productId].satiety>0);
 }
});
test("medicinal herb uses the physical planting, harvest and storage cycle without being food",()=>{
 const w=createWorld("herbs",12,12),n=owned(w);
 assert.ok(zone(w,"herbs","medicinal_herb").ok);
 const field=w.entities.find(e=>e.kind==="planting_zone");
 n.inventory={medicinal_herb_seed:1};n.satiety=10;
 assert.ok(player(w,"sow-herb","farming.plant",field.id,{position:{x:2,y:2}}).ok);
 assert.equal(n.inventory.medicinal_herb_seed,0);
 const plant=w.entities.find(e=>e.id==="plant-sow-herb");
 assert.equal(plant.resourceType,"medicinal_herb");assert.ok(canEnter(w,plant.position));
 for(let i=0;i<45;i++)advanceTick(w);
 assert.equal(plant.quantity,3);
 assert.ok(player(w,"herb-harvest-1","resource.harvest",plant.id).ok);
 if(plant.quantity>0)assert.ok(player(w,"herb-harvest-2","resource.harvest",plant.id).ok);
 assert.equal(availablePlots(w,field).length,4);
 pick(w,n,"medicinal_herb");pick(w,n,"medicinal_herb_seed");
 assert.equal(n.inventory.medicinal_herb,3);
 assert.ok(n.inventory.medicinal_herb_seed>=1);
 assert.equal(FOOD_ITEMS.medicinal_herb,undefined);
 assert.equal(player(w,"not-food","npc.eat",n.id,{parameters:{itemId:"medicinal_herb"}}).ok,false);
 assert.ok(god(w,"depot","construction.place",{position:{x:0,y:0},parameters:{blueprintId:"building.depot",mode:"completed"}}).ok);
 const depot=w.entities.find(e=>e.id==="construction-depot");
 assert.ok(player(w,"store-herb","storage.deposit",depot.id,{parameters:{materialId:"medicinal_herb",quantity:3}}).ok);
 assert.equal(depot.stock.medicinal_herb,3);
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
 while(w.entities.some(e=>e.id===crop.id))assert.equal(player(w,"harvest-"+w.tick,"resource.harvest",crop.id).ok,true);
 pick(w,person,"carrot");pick(w,person,"carrot_seed");
 assert.equal(person.inventory.carrot,3);
 assert.ok(person.inventory.carrot_seed>=1);
 const seeds=person.inventory.carrot_seed;
 assert.equal(w.entities.find(e=>e.id===crop.id),undefined);
 assert.equal(availablePlots(w,field).length,4);
 person.satiety=45;
 assert.equal(player(w,"eat","npc.eat",person.id,{parameters:{itemId:"carrot"}}).ok,true);
 assert.equal(person.inventory.carrot,2);
 assert.equal(person.satiety,73);
 assert.equal(player(w,"sow-again","farming.plant",field.id,{position:{x:2,y:2}}).ok,true);
 assert.equal(person.inventory.carrot_seed,seeds-1);
});
test("potato crop has finite yield, produces viable seed and disappears when it withers",()=>{
 const w=createWorld("potato",12,12);const person=owned(w);
 zone(w,"zone","potato");person.inventory={potato_seed:2};
 const field=w.entities.find(e=>e.kind==="planting_zone");
 assert.equal(player(w,"first","farming.plant",field.id,{position:{x:2,y:2}}).ok,true);
 assert.equal(player(w,"move","movement.move",person.id,{position:{x:3,y:1}}).ok,true);
 assert.equal(player(w,"second","farming.plant",field.id,{position:{x:3,y:2}}).ok,true);
 assert.equal(player(w,"return","movement.move",person.id,{position:{x:2,y:1}}).ok,true);
 for(let i=0;i<80;i++)advanceTick(w);
 const ripe=w.entities.find(e=>e.id==="plant-first");
 assert.equal(ripe.quantity,4);
 assert.equal(player(w,"harvest","resource.harvest",ripe.id).ok,true);
 while(w.entities.some(e=>e.id===ripe.id))assert.equal(player(w,"harvest-"+w.tick,"resource.harvest",ripe.id).ok,true);
 pick(w,person,"potato");pick(w,person,"potato_seed");
 assert.equal(person.inventory.potato,4);
 assert.ok(person.inventory.potato_seed>=1);
 for(let i=80;i<330;i++)advanceTick(w);
 assert.ok(w.entities.some(e=>e.id==="plant-second"),"crop remains harvestable beyond its previous expiry");
 for(let i=330;i<naturalSource("potato").stages.dead+3;i++)advanceTick(w);
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
 pick(w,person,"apple");pick(w,person,"apple_seed");
 assert.ok(person.inventory.apple>=1&&person.inventory.apple<=3);
 const seeds=person.inventory.apple_seed;assert.ok(seeds>=1&&seeds<=2);
 const field=w.entities.find(e=>e.kind==="planting_zone");
 assert.equal(player(w,"plant","farming.plant",field.id,{position:{x:2,y:2}}).ok,true);
 assert.equal(person.inventory.apple_seed,seeds-1);
 const tree=w.entities.find(e=>e.id==="plant-plant");
 assert.equal(tree.life.stage,"seedling");
 assert.equal(canEnter(w,tree.position),true);
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
 assert.ok(npc.ai.history.length>0);
 assert.ok((npc.inventory.carrot_seed??0)<=7);
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
