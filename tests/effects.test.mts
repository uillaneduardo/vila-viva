import assert from "node:assert/strict";
import test from "node:test";
import {applyEffect,expireEffects,removeEffect} from "../packages/systems/effects/src/manager.ts";
import {resolveAttributes} from "../packages/systems/effects/src/resolver.ts";
import {createWorld,applyCommand} from "../packages/engine/src/engine.ts";

test("sadness reduces mood ceiling and indirectly affects productivity/social willingness",()=>{
 const npc={attributes:{mood:90},effects:[] as any[]};
 const before=resolveAttributes(npc,0);
 applyEffect(npc,"sad","event-1",0,"sad-1");
 const after=resolveAttributes(npc,1);
 assert.equal(after.values.moodMax,80);
 assert.equal(after.values.mood,80);
 assert.ok(after.values.workRate<before.values.workRate);
 assert.ok(after.values.socialWillingness<before.values.socialWillingness);
 assert.equal(after.breakdown.moodMax.sources[0],"sad:event-1");
});

test("housing conditional effect adds comfort but does not expire without owner removing it",()=>{
 const npc={effects:[] as any[]};
 applyEffect(npc,"well_sheltered","house-1",3,"housing-1");
 assert.equal(resolveAttributes(npc,5).values.mood,85);
 assert.deepEqual(expireEffects(npc,"npc",500),[]);
 assert.equal(removeEffect(npc,"housing-1"),true);
 assert.equal(resolveAttributes(npc,500).values.mood,75);
});

test("pregnancy ends with one event intent and postpartum is a distinct effect",()=>{
 const npc={effects:[] as any[]};
 applyEffect(npc,"gestation","reproduction-1",10,"g-1");
 assert.ok(resolveAttributes(npc,20).values.carryCapacity<20);
 assert.deepEqual(expireEffects(npc,"person-1",49),[]);
 assert.equal(expireEffects(npc,"person-1",50)[0].type,"reproduction.birth_due");
 assert.deepEqual(expireEffects(npc,"person-1",51),[]);
 applyEffect(npc,"postpartum_recovery","birth-1",50,"post-1");
 assert.equal(resolveAttributes(npc,51).values.carryCapacity,10);
 expireEffects(npc,"person-1",62);
 assert.equal(resolveAttributes(npc,62).values.carryCapacity,20);
});

test("refresh and unique stacking are deterministic",()=>{
 const npc={effects:[] as any[]};
 applyEffect(npc,"gestation","a",0,"unique-1");
 applyEffect(npc,"gestation","b",2,"unique-2");
 assert.equal(npc.effects.length,1);
 applyEffect(npc,"sad","x",0,"sad-1");
 applyEffect(npc,"sad","x",5,"sad-2");
 assert.equal(npc.effects.length,2);
 assert.equal(npc.effects[1].expiresAtTick,17);
});

test("engine expires effect at logical tick only, and inspection does not progress time",()=>{
 const world=createWorld("w");
 applyCommand(world,{commandId:"a",worldId:"w",actorRole:"admin",action:"npc.spawn",position:{x:2,y:2},parameters:{name:"Ayla"}});
 const character=world.entities[0];assert.equal(character.kind,"character");
 if(character.kind!=="character")throw Error("invalid");
 applyEffect(character,"sad","test",world.tick,"sad-1");
 const tick=world.tick;
 applyCommand(world,{commandId:"read",worldId:"w",actorRole:"player",action:"entity.inspect",targetId:character.id});
 assert.equal(world.tick,tick);
 assert.equal(character.effects?.length,1);
});
