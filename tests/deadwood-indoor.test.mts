import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,applyCommand,advanceTick} from '../packages/engine/src/engine.ts';
import {canPlaceEntity} from '../packages/systems/collision/src/index.ts';
import {availableActions} from '../packages/engine/src/capabilities.ts';
const god=(w,id,action,extra)=>applyCommand(w,{worldId:w.id,commandId:id,actorRole:'admin',action,...extra});
test('dead tree can be cut from same cell even with full cargo; wood and space preserved',()=>{
 const w=createWorld('deadwood');
 god(w,'tree','resource.spawn',{position:{x:3,y:3},parameters:{resourceType:'food',sourceId:'apple_tree',ageTicks:3000,quantity:0}});
 god(w,'npc','npc.spawn',{position:{x:3,y:2},parameters:{name:'NPC'}});
 const npc=w.entities.find(e=>e.kind==='character');npc.inventory={stone:12};npc.position={x:3,y:3};
 assert.equal(availableActions(w,'npc',npc.id,w.entities.find(e=>e.id==='resource-tree')).find(a=>a.id==='nature.cut')?.enabled,true);
 for(let i=0;i<3;i++)advanceTick(w);
 assert.equal(w.entities.some(e=>e.id==='resource-tree'),false);
 assert.ok(w.entities.some(e=>e.kind==='item'&&e.itemId==='wood'&&e.quantity>=3&&e.quantity<=5));
 npc.position={x:3,y:2};assert.equal(canPlaceEntity(w,{x:3,y:3}),true);
});
test('sleep enters reserved house logically and waking/destruction clears occupancy',()=>{
 const w=createWorld('sleep');
 god(w,'home','construction.place',{position:{x:6,y:4},parameters:{blueprintId:'building.community_house',mode:'completed'}});
 god(w,'npc','npc.spawn',{position:{x:5,y:4},parameters:{name:'NPC'}});
 const npc=w.entities.find(e=>e.kind==='character');npc.energy=10;
 for(let i=0;i<3;i++)advanceTick(w);
 assert.equal(npc.sleepingInId,'construction-home');assert.equal(npc.ai.activity,'Dormindo');
 npc.energy=100;for(let i=0;i<3;i++)advanceTick(w);assert.equal(npc.sleepingInId,undefined);
 npc.energy=10; npc.position={x:5,y:4};for(let i=0;i<3;i++)advanceTick(w);
 assert.equal(npc.sleepingInId,'construction-home');
 god(w,'destroy','construction.destroy',{targetId:'construction-home'});assert.equal(npc.sleepingInId,undefined);
});

import {canEnter} from '../packages/systems/collision/src/index.ts';
import {reserveBed,enterHouse,exitHouse} from '../packages/systems/housing/src/index.ts';
test('indoor sleeper does not block passage and chooses a free exit',()=>{
 const w=createWorld('exit');
 god(w,'home','construction.place',{position:{x:6,y:4},parameters:{blueprintId:'building.community_house',mode:'completed'}});
 god(w,'npc','npc.spawn',{position:{x:5,y:4},parameters:{name:'NPC'}});
 const npc=w.entities.find(e=>e.kind==='character'),home=w.entities.find(e=>e.kind==='construction');
 assert.equal(reserveBed(w,npc,home),true);assert.equal(enterHouse(w,npc,home),true);
 assert.equal(canEnter(w,{x:5,y:4}),true);
 god(w,'other','npc.spawn',{position:{x:4,y:4},parameters:{name:'Other'}});
 const other=w.entities.find(e=>e.id==='npc-other');other.position={x:5,y:4};
 assert.equal(exitHouse(w,npc),true);assert.notDeepEqual(npc.position,other.position);assert.equal(npc.sleepingInId,undefined);
});
