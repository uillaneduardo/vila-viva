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
