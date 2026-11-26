import test from "node:test";
import assert from "node:assert/strict";
import {createBrowserRuntime} from "../apps/browser-runtime/src/runtime.ts";
import {makePrototype} from "../apps/server/src/index.mts";
test("browser runtime uses real engine, same seed, clock and independent worlds",()=>{const a=createBrowserRuntime(),b=createBrowserRuntime();assert.deepEqual(a.view().world,b.view().world);const initialTick=a.view().world.tick;a.request("/api/clock",{role:"admin",speed:4});for(let i=0;i<12;i++)a.pulse();assert.equal(a.view().world.tick,initialTick+12);assert.equal(b.view().world.tick,initialTick);const saved=a.request("/api/world/export");a.request("/api/world/import",{role:"admin",snapshot:saved});assert.equal(a.view().clock.speed,0);assert.deepEqual(a.view().world,saved.world);assert.ok(a.request("/api/catalog").traits);const npc=a.view().world.entities.find(e=>e.kind==="character");assert.ok(a.request("/api/inspect?entityId="+npc.id).attributes);});
test("browser route serves God Mode without replacing existing server mode",async()=>{const {server}=makePrototype();await new Promise(r=>server.listen(0,"127.0.0.1",r));try{const base="http://127.0.0.1:"+server.address().port;for(const route of ["/browser","/browser/","/admin"]){const r=await fetch(base+route);assert.equal(r.status,200);assert.match(await r.text(),/data-role="admin"/);}}finally{await new Promise(r=>server.close(r));}});

test("browser world generation shares variable abundance and deterministic seed",()=>{
 const a=createBrowserRuntime(),b=createBrowserRuntime();
 const generate=(runtime:ReturnType<typeof createBrowserRuntime>,seed:string)=>{
  runtime.request("/api/world/new",{role:"admin",seed,width:32,height:24});
  const world=runtime.view().world;
  return world.entities.filter(e=>e.kind==="resource").map(e=>({type:e.resourceType,quantity:e.quantity,position:e.position}));
 };
 const first=generate(a,"resource-seed-a");
 assert.deepEqual(first,generate(b,"resource-seed-a"));
 for(const type of ["wood","stone","iron_ore","copper_ore","food"])assert.ok(first.some(e=>e.type===type&&e.quantity>0));
 const signatures=new Set([first,...["b","c","d"].map(s=>generate(a,"resource-seed-"+s))]
  .map(s=>JSON.stringify(s.map(e=>[e.type,e.quantity]))));
 assert.ok(signatures.size>1);
});
