import test from "node:test";
import assert from "node:assert/strict";
import {createWorld,applyCommand,advanceTick} from "../packages/engine/src/engine.ts";
import {ITEMS,ITEM_CATEGORIES} from "../packages/content/src/items.ts";
import {RECIPES} from "../packages/content/src/recipes.ts";
import {TRAITS,affinityFor,healingFactor} from "../packages/content/src/characters.ts";
import {productionNeeds} from "../packages/systems/leadership/src/production.ts";
import {productionDefinition,canWorkProduction,activeOrder} from "../packages/systems/production/src/index.ts";
import {storedTotal} from "../packages/systems/construction/src/index.ts";
import {injuryProbability} from "../packages/systems/risk/src/index.ts";
import {makePrototype} from "../apps/server/src/index.mts";
const god=(w,id,action,extra={})=>applyCommand(w,{worldId:w.id,commandId:id,
 actorRole:"admin",action,...extra});
const worker=(w,id,position={x:4,y:4})=>{
 assert.equal(god(w,id,"npc.spawn",{position,parameters:{name:id}}).ok,true);
 return w.entities.find(e=>e.id==="npc-"+id);
};
const cmd=(w,actor,id,action,targetId,parameters,position)=>applyCommand(w,{
 worldId:w.id,commandId:id,actorRole:"npc",actorId:actor.id,
 action,targetId,parameters,position
});
test("unified catalog includes raw materials, seeds, foods, ingots and physical equipment",()=>{
 assert.equal(ITEMS.iron_ore.category,"raw");
 assert.equal(ITEMS.copper_ore.category,"raw");
 assert.equal(ITEMS.apple_seed.category,"seed");
 assert.equal(ITEMS.iron_ingot.category,"processed");
 assert.equal(ITEMS.axe.category,"equipment");
 assert.ok(ITEM_CATEGORIES.seed);
 for(const recipe of Object.values(RECIPES)){
  assert.equal(recipe.workstationId,"building.workshop");
  for(const item of [...Object.keys(recipe.inputs),...Object.keys(recipe.outputs)])
   assert.ok(ITEMS[item]);
 }
});
test("workshop order consumes physical ingredients only after full work, and produces one tool",()=>{
 const w=createWorld("craft",16,14);
 const npc=worker(w,"maker",{x:4,y:4});
 assert.equal(god(w,"shop","construction.place",{position:{x:5,y:4},
  parameters:{blueprintId:"building.workshop",mode:"completed"}}).ok,true);
 const shop=w.entities.find(e=>e.id==="construction-shop");
 assert.ok(productionDefinition(shop));
 assert.equal(productionDefinition(shop).recipes.length,5);
 assert.equal(god(w,"order","production.order",{targetId:shop.id,
  parameters:{recipeId:"smelt_iron",quantity:1}}).ok,true);
 assert.equal(canWorkProduction(shop),false);
 assert.equal(cmd(w,npc,"empty","production.work",shop.id).error,"NOT_READY");
 for(const [item,quantity] of Object.entries(RECIPES.smelt_iron.inputs))
  assert.equal(god(w,"s-"+item,"storage.admin_supply",{
   targetId:shop.id,parameters:{materialId:item,quantity}}).ok,true);
 assert.equal(canWorkProduction(shop),true);
 for(let i=1;i<=RECIPES.smelt_iron.workUnits;i++){
  assert.equal(cmd(w,npc,"iron-work-"+i,"production.work",shop.id).ok,true);
  if(i<RECIPES.smelt_iron.workUnits){
   assert.equal(shop.stock.iron_ingot??0,0);
   assert.equal(shop.stock.iron_ore,3);
  }
 }
 assert.equal(shop.stock.iron_ingot,2);
 assert.equal(shop.stock.iron_ore,0);
 assert.equal(shop.stock.wood,0);
 assert.equal(activeOrder(shop),undefined);
 assert.equal(god(w,"axe-order","production.order",{targetId:shop.id,
  parameters:{recipeId:"craft_axe",quantity:1}}).ok,true);
 assert.equal(god(w,"wood2","storage.admin_supply",{targetId:shop.id,
  parameters:{materialId:"wood",quantity:2}}).ok,true);
 for(let i=1;i<=5;i++)
  assert.equal(cmd(w,npc,"axe-work-"+i,"production.work",shop.id).ok,true);
 assert.equal(shop.stock.iron_ingot,0);
 assert.equal(shop.stock.wood,0);
 assert.equal(shop.stock.axe,1);
 assert.equal(cmd(w,npc,"take","storage.withdraw",shop.id,{materialId:"axe",quantity:1}).ok,true);
 assert.equal(npc.inventory.axe,1);
 const before=injuryProbability(npc,"resource.gather:wood",w.tick);
 assert.equal(cmd(w,npc,"equip","npc.equip",npc.id,{tool:"axe"}).ok,true);
 assert.equal(npc.equipment.tool,"axe");
 assert.equal(npc.inventory.axe,0);
 assert.ok(injuryProbability(npc,"resource.gather:wood",w.tick)<before);
 assert.equal(cmd(w,npc,"double","npc.equip",npc.id,{tool:"axe"}).error,"NOT_READY");
});
test("copper ore, ingots, hammer and pickaxe use the same production contracts",()=>{
 const w=createWorld("shop",14,14);
 const npc=worker(w,"p",{x:3,y:5});
 god(w,"shop","construction.place",{position:{x:4,y:5},
  parameters:{blueprintId:"building.workshop",mode:"completed"}});
 const shop=w.entities.find(e=>e.id==="construction-shop");
 const batch=(recipeId,token)=>{
  const recipe=RECIPES[recipeId];
  assert.equal(god(w,token,"production.order",{targetId:shop.id,
   parameters:{recipeId,quantity:1}}).ok,true);
  for(const [item,quantity] of Object.entries(recipe.inputs)){
   const short=Math.max(0,quantity-(shop.stock[item]??0));
   if(short)assert.equal(god(w,token+"-"+item,"storage.admin_supply",{
    targetId:shop.id,parameters:{materialId:item,quantity:short}}).ok,true);
  }
  for(let i=1;i<=recipe.workUnits;i++)
   assert.equal(cmd(w,npc,token+"-work-"+i,"production.work",shop.id).ok,true);
  for(const [item,quantity] of Object.entries(recipe.outputs))assert.ok(shop.stock[item]>=quantity);
 };
 batch("smelt_iron","iron");
 batch("smelt_copper","copper");
 batch("craft_hammer","hammer");
 batch("smelt_iron","iron-again");
 batch("craft_pickaxe","pickaxe");
 assert.equal(shop.stock.hammer,1);
 assert.equal(shop.stock.pickaxe,1);
 assert.equal(shop.stock.copper_ingot,1);
 assert.equal(storedTotal(shop),
  Object.values(shop.stock).reduce((sum,n)=>sum+n,0));
});
test("resource gathering supports ore sources without arbitrary resource creation",()=>{
 const w=createWorld("mining",14,14);
 const npc=worker(w,"mine",{x:3,y:4});
 assert.equal(god(w,"iron","resource.spawn",{position:{x:4,y:4},
  parameters:{resourceType:"iron_ore",quantity:6}}).ok,true);
 assert.equal(god(w,"copper","resource.spawn",{position:{x:3,y:5},
  parameters:{resourceType:"copper_ore",quantity:6}}).ok,true);
 npc.inventory={};
 assert.equal(cmd(w,npc,"take-iron","resource.gather","resource-iron").ok,true);
 assert.equal(cmd(w,npc,"take-copper","resource.gather","resource-copper").ok,true);
 for(const metal of ["iron","copper"]){
  const itemId=metal+"_ore";
  const pile=w.entities.find(e=>e.kind==="item"&&e.itemId===itemId);
  assert.ok(pile);
  const amount=pile.quantity;
  assert.ok(amount>=1&&amount<=3);
  assert.equal(npc.inventory[itemId]??0,0);
  assert.equal(w.entities.find(e=>e.id==="resource-"+metal).quantity+amount,6);
  assert.equal(cmd(w,npc,"pickup-"+metal,"item.pickup",pile.id).ok,true);
  assert.equal(npc.inventory[itemId],amount);
  assert.ok(!w.entities.some(e=>e.id===pile.id));
 }
});
test("health traits change recovery and injury probability without healing through starvation",()=>{
 const w=createWorld("health",14,14);
 const make=(id,trait,x)=>{
  assert.equal(god(w,id,"npc.spawn",{position:{x,y:2},
   parameters:{name:id,ownerId:id}}).ok,true);
  const npc=w.entities.find(e=>e.id==="npc-"+id);
  npc.traits=[trait];npc.health=50;npc.satiety=100;
  return npc;
 };
 const normal=make("normal","patient",1);
 const fast=make("fast","fast_healer",3);
 const slow=make("slow","slow_healer",5);
 const sick=make("sick","sickly",7);
 assert.ok(healingFactor(fast)>healingFactor(normal));
 assert.ok(healingFactor(slow)<healingFactor(normal));
 assert.ok(injuryProbability(sick,"resource.gather:stone",w.tick)>
  injuryProbability(normal,"resource.gather:stone",w.tick));
 for(let i=0;i<6;i++)advanceTick(w);
 assert.ok(fast.health>normal.health);
 assert.ok(normal.health>slow.health);
 const starving=make("starve","fast_healer",9);
 starving.satiety=0;
 for(let i=0;i<6;i++)advanceTick(w);
 assert.ok(starving.health<=50);
});
test("occupational traits influence task preference without granting inventory or bypassing survival",()=>{
 const farmer={traits:["farmer"]},builder={traits:["builder"]},miner={traits:["miner"]};
 assert.ok(affinityFor(farmer,"farming")>affinityFor(farmer,"building"));
 assert.ok(affinityFor(builder,"building")>affinityFor(builder,"farming"));
 assert.ok(affinityFor(miner,"mining")>affinityFor(miner,"woodcutting"));
 assert.equal(affinityFor({traits:[]},"farming"),1);
 assert.ok(Object.values(TRAITS).some(t=>t.healing!==undefined&&t.healing<1));
 assert.ok(Object.values(TRAITS).some(t=>t.healing!==undefined&&t.healing>1));
});
test("autonomous NPC collects food and seeds and physically delivers both to a depot",()=>{
 const w=createWorld("storage",16,12);
 const person=worker(w,"picker",{x:2,y:5});
 god(w,"apple","resource.spawn",{position:{x:4,y:5},parameters:{
  resourceType:"food",sourceId:"apple_tree",ageTicks:130,quantity:12
 }});
 god(w,"depot","construction.place",{position:{x:8,y:5},parameters:{
  blueprintId:"building.depot",mode:"completed"
 }});
 const warehouse=w.entities.find(e=>e.id==="construction-depot");
 for(let i=0;i<155;i++)advanceTick(w);
 assert.ok((warehouse.stock.apple??0)>0,"food was transported into depot");
 assert.ok((warehouse.stock.apple_seed??0)>0,"seeds were transported into depot");
 assert.ok(person.ai.history.length>0);
 assert.equal(storedTotal(warehouse),Object.values(warehouse.stock).reduce((n,q)=>n+q,0));
});
test("active workshop queue is completed by autonomous NPC and leader can order smelting",()=>{
 const w=createWorld("automation",18,16);
 const npc=worker(w,"artisan",{x:4,y:4});
 npc.traits=["artisan"];
 god(w,"shop","construction.place",{position:{x:5,y:4},
  parameters:{blueprintId:"building.workshop",mode:"completed"}});
 const shop=w.entities.find(e=>e.id==="construction-shop");
 god(w,"iron","storage.admin_supply",{targetId:shop.id,parameters:{materialId:"iron_ore",quantity:3}});
 god(w,"wood","storage.admin_supply",{targetId:shop.id,parameters:{materialId:"wood",quantity:1}});
 god(w,"order","production.order",{targetId:shop.id,parameters:{recipeId:"smelt_iron",quantity:1}});
 for(let i=0;i<24;i++)advanceTick(w);
 assert.equal(shop.stock.iron_ingot,2);
 assert.equal(shop.stock.iron_ore,0);
 const other=createWorld("plan",22,18);
 god(other,"shop","construction.place",{position:{x:8,y:4},
  parameters:{blueprintId:"building.workshop",mode:"completed"}});
 god(other,"leader","npc.spawn",{position:{x:5,y:5},parameters:{communityRole:"leader"}});
 god(other,"ore","resource.spawn",{position:{x:3,y:8},
  parameters:{resourceType:"iron_ore",quantity:40}});
 for(let i=0;i<12;i++)advanceTick(other);
 const workshop=other.entities.find(e=>e.id==="construction-shop");
 assert.equal(workshop.productionOrders?.[0]?.recipeId,"smelt_iron");
 const leader=other.entities.find(e=>e.id==="npc-leader");
 assert.equal(leader.leadership.lastRecipeId,"smelt_iron");
 assert.ok(productionNeeds(other).some(x=>x.item==="axe"));
});
test("autonomous NPC converts nearby raw iron and wood into ingots for a queued recipe",()=>{
 const w=createWorld("auto-ore",17,14);
 const npc=worker(w,"worker",{x:7,y:4});npc.traits=["artisan"];
 god(w,"shop","construction.place",{position:{x:8,y:4},parameters:{
  blueprintId:"building.workshop",mode:"completed"
 }});
 god(w,"ore","resource.spawn",{position:{x:4,y:4},parameters:{
  resourceType:"iron_ore",quantity:30
 }});
 god(w,"tree","resource.spawn",{position:{x:4,y:7},parameters:{
  resourceType:"wood",quantity:30
 }});
 const shop=w.entities.find(e=>e.id==="construction-shop");
 assert.equal(god(w,"batch","production.order",{targetId:shop.id,
  parameters:{recipeId:"smelt_iron",quantity:1}}).ok,true);
 for(let i=0;i<160;i++)advanceTick(w);
 assert.equal(shop.stock.iron_ingot,2,"ingots require physical mining, delivery and crafting work");
 assert.equal(shop.stock.iron_ore,0);
 assert.ok(w.entities.find(e=>e.id==="resource-ore").quantity<30);
 assert.equal(activeOrder(shop),undefined);
});
test("API lists all storage categories, workshop queue, tool needs, traits and ores",async()=>{
 const {server}=makePrototype();
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+server.address().port;
 const post=(path,payload)=>fetch(base+path,{method:"POST",headers:{"content-type":"application/json"},
  body:JSON.stringify(payload)});
 try{
  const catalog=await (await fetch(base+"/api/catalog")).json();
  assert.equal(catalog.items.apple_seed.category,"seed");
  assert.equal(catalog.items.iron_ingot.category,"processed");
  assert.equal(catalog.buildingBlueprints["building.workshop"].production.recipes.length,5);
  assert.equal(catalog.traits.farmer.affinities.farming,1.8);
  const brush=await (await post("/api/brush",{role:"admin",commands:[
   {commandId:"api-depot",action:"construction.place",position:{x:17,y:2},
    parameters:{blueprintId:"building.depot",mode:"completed"}},
   {commandId:"api-shop",action:"construction.place",position:{x:17,y:7},
    parameters:{blueprintId:"building.workshop",mode:"completed"}}
  ]})).json();
  assert.deepEqual(brush.results.map(r=>r.ok),[true,true]);
  const depot=await (await fetch(base+"/api/inspect?entityId=construction-api-depot")).json();
  assert.ok(depot.construction.storage.accepted.includes("copper_ore"));
  assert.ok(depot.construction.storage.accepted.includes("potato_seed"));
  const shop=await (await fetch(base+"/api/inspect?entityId=construction-api-shop")).json();
  assert.equal(shop.construction.production.orders.length,0);
  const order=await (await post("/api/commands",{role:"admin",commandId:"api-order",
   action:"production.order",targetId:"construction-api-shop",parameters:{recipeId:"smelt_iron",quantity:1}})).json();
  assert.equal(order.result.ok,true);
  const economy=await (await fetch(base+"/api/economy")).json();
  assert.equal(economy.workshops[0].order.recipeId,"smelt_iron");
  assert.ok(economy.productionNeeds.some(x=>x.item==="hammer"));
  assert.ok(economy.depots.some(x=>x.id==="construction-api-depot"));
  assert.equal(economy.workshops[0].missing.iron_ore,3);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
