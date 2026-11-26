import assert from "node:assert/strict";
import test from "node:test";
import {createWorld,applyCommand} from "../packages/engine/src/engine.ts";
import {starterCommands,bootstrapSeededWorld} from "../packages/content/src/world-seeds.ts";

const build=(seed:string,width=24,height=16)=>{
 const world=createWorld("seed-test",width,height);
 bootstrapSeededWorld(world,seed,command=>applyCommand(world,{
  worldId:world.id,commandId:command.commandId,actorRole:"admin",
  action:command.action,position:command.position,parameters:command.parameters
 }));
 return world;
};

test("same seed and dimensions deterministically reproduce the initial world",()=>{
 for(const dimensions of [[24,16],[32,24],[64,48]]){
  const [width,height]=dimensions;
  assert.deepEqual(build("oturo-world-1024",width,height),build("oturo-world-1024",width,height));
 }
});

test("different seeds generate meaningfully different initial placements",()=>{
 const samples=["oturo-1","oturo-2","oturo-3","oturo-4","oturo-5"]
  .map(seed=>starterCommands(seed,createWorld("seed-test",32,24))
   .map(command=>[command.commandId,command.position.x,command.position.y]));
 assert.equal(new Set(samples.map(s=>JSON.stringify(s))).size,samples.length);
});

test("procedural spawn is valid with no overlapping entities and a clear farming footprint",()=>{
 for(const seed of ["0","1","2","village","oturo-long-seed-2026"]){
  for(const [width,height] of [[24,16],[32,24],[64,48]]){
   const world=build(seed,width,height);
   const unique=new Set<string>();
   for(const entity of world.entities){
    assert.ok(entity.position.x>=0&&entity.position.x<width);
    assert.ok(entity.position.y>=0&&entity.position.y<height);
    if(entity.kind==="planting_zone")continue;
    const key=entity.position.x+","+entity.position.y;
    assert.ok(!unique.has(key),"overlapping entities: "+key);
    unique.add(key);
   }
   const zones=world.entities.filter(e=>e.kind==="planting_zone");
   assert.equal(zones.length,1);
   const zone=zones[0];
   for(let y=zone.position.y;y<zone.position.y+3;y++)
    for(let x=zone.position.x;x<zone.position.x+3;x++)
     assert.ok(!unique.has(x+","+y),"occupied farm tile");
   assert.equal(world.entities.filter(e=>e.kind==="character").length,4);
   assert.equal(world.entities.filter(e=>e.kind==="character"&&e.communityRole==="leader").length,1);
  }
 }
});

test("invalid seeds and undersized maps fail before creating commands",()=>{
 assert.throws(()=>starterCommands(" ",createWorld("x",24,16)),/INVALID_SEED/);
 assert.throws(()=>starterCommands("x".repeat(81),createWorld("x",24,16)),/INVALID_SEED/);
 assert.throws(()=>starterCommands("valid",createWorld("x",23,16)),/WORLD_TOO_SMALL_FOR_SEED/);
});

test("seeded abundance varies independently and every basic resource starts positive",()=>{
 const types=["wood","stone","iron_ore","copper_ore","food"];
 const counts=new Map(types.map(type=>[type,new Set<number>()]));
 const amounts=new Map(types.map(type=>[type,new Set<number>()]));
 for(let i=0;i<48;i++){
  const world=build("abundance-"+i);
  for(const type of types){
   const resources=world.entities.filter(e=>e.kind==="resource"&&e.resourceType===type);
   assert.ok(resources.length>=1,type+" missing in "+i);
   const maxCount=type==="wood"?5:type==="stone"?4:type==="food"?7:3;
   assert.ok(resources.length<=maxCount);
   counts.get(type)!.add(resources.length);
   for(const entity of resources){
    assert.equal(entity.kind,"resource");
    const [min,max]=type==="food"?[8,30]:type==="wood"||type==="stone"?[80,240]:[60,220];
    assert.ok(entity.quantity>=min&&entity.quantity<=max);
    amounts.get(type)!.add(entity.quantity);
   }
  }
 }
 for(const type of types){
  assert.ok(counts.get(type)!.size>1,type+" fixed source count");
  assert.ok(amounts.get(type)!.size>1,type+" fixed quantity");
 }
});
test("all supported dimensions preserve minimum resources, nearby essentials and bounded density",()=>{
 for(const [width,height] of [[24,16],[32,24],[48,32],[64,48]]){
  for(const seed of ["scarcity","abundance","nearby","oturo-2026"]){
   const commands=starterCommands(seed,createWorld("seed-test",width,height));
   const sources=commands.filter(c=>c.action==="resource.spawn");
   const bonus=Math.min(3,Math.floor(Math.log2(width*height/(24*16))));
   assert.ok(sources.length>=5&&sources.length<=22+5*bonus);
   for(const type of ["wood","stone","iron_ore","copper_ore","food"])
    assert.ok(sources.some(c=>c.parameters.resourceType===type));
   const leader=commands.find(c=>c.commandId==="seed-leader")!;
   for(const type of ["wood","stone","food"])
    assert.ok(sources.some(c=>c.parameters.resourceType===type&&
     Math.abs(c.position.x-leader.position.x)+Math.abs(c.position.y-leader.position.y)<=11));
   const world=build(seed,width,height);
   assert.equal(world.entities.filter(e=>e.kind==="resource").length,sources.length);
  }
 }
});
