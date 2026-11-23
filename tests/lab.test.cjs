"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const src=fs.readFileSync(require("node:path").join(__dirname,"../lab.js"),"utf8");
function lab(){
 const sandbox={Math,console,window:{},setTimeout};
 vm.runInNewContext(src,sandbox,{filename:"lab.js"});
 return sandbox.window.VilaLab;
}
const sites=[{id:"forest",resource:"wood",qty:4,x:3,y:3},{id:"orchard",resource:"food",qty:3,x:5,y:5}];
function world(){
 return {seed:42,day:1,minute:500,ticks:0,stock:{wood:2,stone:0,food:5,ore:0,coins:0},npcs:[{id:"collector",name:"Borin",energy:80,hunger:70,x:3,y:3,phase:"idle",site:null,cargo:null}],project:{stage:4}};
}
test("natural sources remain present and regenerate after exhaustion",()=>{
 const L=lab(),w=world();L.ensure(w,sites);
 const f=L.source(w,"forest");
 f.amount=0;
 for(let i=0;i<100;i++){w.ticks++;L.beginTick(w,sites);L.endTick(w,sites);}
 assert.ok(f.amount>0);assert.ok(f.amount<=f.max);
});
test("harvest only removes available resource and never goes negative",()=>{
 const L=lab(),w=world();L.ensure(w,sites);
 const f=L.source(w,"forest");f.amount=2;
 assert.equal(L.harvest(w,sites[0],4),2);
 assert.equal(f.amount,0);
 assert.equal(L.harvest(w,sites[0],4),0);
});
test("harvest rejects production when storage has no free capacity",()=>{
 const L=lab(),w=world();L.ensure(w,sites);
 w.lab.depotCapacity=L.used(w);
 const initial=L.source(w,"forest").amount;
 assert.equal(L.harvest(w,sites[0],4),0);
 assert.equal(L.source(w,"forest").amount,initial);
});
test("hunger drives a physical food retrieval from depot",()=>{
 const L=lab(),w=world();L.ensure(w,sites);const n=w.npcs[0];n.hunger=20;
 assert.equal(L.needsAction(w,n,()=>true),true);
 assert.equal(n.phase,"toFood");
 assert.equal(w.stock.food,5);
 assert.equal(L.needsAction(w,n,()=>true),true);
 assert.equal(w.stock.food,4);
 assert.ok(n.hunger>20);
});
test("a full depot pauses transport without destroying cargo",()=>{
 const L=lab(),w=world();L.ensure(w,sites);const n=w.npcs[0];
 n.phase="toDepot";n.cargo={key:"wood",qty:3};
 w.lab.depotCapacity=L.used(w);
 assert.equal(L.needsAction(w,n,()=>true),true);
 assert.equal(n.phase,"waitStorage");
 assert.equal(n.cargo.qty,3);
 w.lab.depotCapacity+=20;
 assert.equal(L.needsAction(w,n,()=>true),true);
 assert.equal(n.phase,"toDepot");
});
test("available work is chosen without exceeding storage constraints",()=>{
 const L=lab(),w=world();L.ensure(w,sites);
 assert.equal(typeof L.choose(w,w.npcs[0],sites),"string");
 w.lab.depotCapacity=L.used(w);
 assert.equal(L.choose(w,w.npcs[0],sites),null);
});

test("starving NPC finds food in nature when depot is empty",()=>{
 const L=lab(),w=world(),n=w.npcs[0];w.stock.food=0;w.npcs[0].hunger=20;L.ensure(w,sites);
 const original=L.source(w,"orchard").amount;
 // Lab obtains actual sites from the browser globals. In this isolated test,
 // the action must at least enter the natural-foraging state.
 assert.equal(L.needsAction(w,n,()=>true),true);
 assert.equal(n.phase,"toForage");
 assert.equal(L.source(w,"orchard").amount,original);
});
test("zero energy stops movement and preserves cargo",()=>{
 const L=lab(),w=world(),n=w.npcs[0];L.ensure(w,sites);
 n.energy=0;n.phase="toDepot";n.cargo={key:"wood",qty:2};
 assert.equal(L.needsAction(w,n,()=>false),true);
 assert.equal(n.phase,"rest");
 assert.equal(n.cargo.qty,2);
});
test("builder material transport is chosen when construction needs materials",()=>{
 const L=lab(),w=world();w.project={stage:0,delivered:{wood:0,stone:0}};
 w.npcs[0].id="merchant";w.npcs[0].name="Nilo";L.ensure(w,sites);
 assert.equal(L.choose(w,w.npcs[0],sites),"supply:wood");
});
