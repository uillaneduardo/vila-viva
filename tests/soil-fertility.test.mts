import test from "node:test";
import assert from "node:assert/strict";
import {createWorld,applyCommand} from "../packages/engine/src/engine.ts";
import {bootstrapSeededWorld} from "../packages/content/src/world-seeds.ts";
import {soilAt,SOIL_TYPES} from "../packages/content/src/soil.js";
import {makeNaturalSource,advanceNaturalSources} from "../packages/systems/nature/src/index.ts";
import {validateWorld} from "../packages/protocol/src/world-snapshot.ts";
import {TerrainCache} from "../packages/renderer/src/terrain-cache.js";
const world=(seed:string)=>({...createWorld("soil-test",32,24),seed,soilVersion:1 as const});
const rates=(w:ReturnType<typeof world>)=>Array.from({length:w.width*w.height},(_,i)=>soilAt(w,i%w.width,Math.floor(i/w.width)).rate);
test("soil is deterministic, varied, bounded, and neutral for legacy saves",()=>{
 const a=world("soil-a"),b=world("soil-b");assert.deepEqual(rates(a),rates(world("soil-a")));assert.notDeepEqual(rates(a),rates(b));
 assert.ok(new Set(rates(a)).size>=3);
 assert.ok(rates(a).every(x=>SOIL_TYPES.some(s=>s.rate===x)));
 assert.equal(soilAt(createWorld("legacy"),4,4).rate,100);
 validateWorld(a);
 assert.throws(()=>validateWorld({...a,soilVersion:99}),/INVALID_WORLD/);
});
test("maturation and fruit replenishment follow soil rates without changing yield",()=>{
 const w=world("soil-a");
 const byRate=new Map<number,{x:number;y:number}>();
 for(let y=0;y<w.height;y++)for(let x=0;x<w.width;x++)byRate.set(soilAt(w,x,y).rate,{x,y});
 const sorted=[...byRate.keys()].sort((a,b)=>a-b),slow=sorted[0],fast=sorted.at(-1)!;
 assert.ok(slow<fast);
 for(const rate of [slow,fast]){
  const local=world("soil-a"),crop=makeNaturalSource("crop",byRate.get(rate)!,"carrot");
  local.entities.push(crop);const ticks=Math.ceil(5500/rate);
  for(let i=0;i<ticks-1;i++)advanceNaturalSources(local);
  assert.equal(crop.quantity,0);advanceNaturalSources(local);
  assert.equal(crop.quantity,3);assert.equal(crop.life!.ageTicks,55);
  validateWorld(local);
  const tree=makeNaturalSource("tree",byRate.get(rate)!,"apple_tree",120,0);
  local.entities=[tree];const interval=Math.ceil(4000/rate);
  for(let i=0;i<interval-1;i++)advanceNaturalSources(local);
  assert.equal(tree.quantity,0);advanceNaturalSources(local);assert.equal(tree.quantity,3);
 }
});
test("bootstrap sets soil version without affecting saved legacy worlds",()=>{
 const w=createWorld("seed-test",24,16);
 bootstrapSeededWorld(w,"terrain-seed",c=>applyCommand(w,{...c,worldId:w.id,actorRole:"admin"}));
 assert.equal(w.soilVersion,1);validateWorld(w);
 assert.equal(createWorld("old").soilVersion,undefined);
});
test("terrain cache distinguishes seed and fertility overlay",()=>{
 const cache=new TerrainCache({createCanvas:(width,height)=>({width,height,getContext:()=>({fillRect(){}})})});
 const a=world("a"),b=world("b");
 const initial=cache.get(0,0,32,24,32,true,a,false);
 assert.equal(cache.get(0,0,32,24,32,true,a,false),initial);
 assert.notEqual(cache.get(0,0,32,24,32,true,b,false),initial);
 assert.notEqual(cache.get(0,0,32,24,32,true,a,true),initial);
});
