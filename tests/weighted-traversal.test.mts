import test from "node:test";
import assert from "node:assert/strict";
import type {World,Entity} from "../packages/domain/src/contracts.ts";
import {createWorld,applyCommand} from "../packages/engine/src/engine.ts";
import {canEnter,canPlaceEntity,movementCost} from "../packages/systems/collision/src/index.ts";
import {routeToEntity,routeCost} from "../packages/systems/pathfinding/src/index.ts";
import {createCompletedBuilding} from "../packages/systems/construction/src/index.ts";
import {DEPOT} from "../packages/content/src/buildings/depot.ts";
import {COMMUNITY_HOUSE} from "../packages/content/src/buildings/community-house.ts";
import {WORKSHOP} from "../packages/content/src/buildings/workshop.ts";
const at=(x:number,y:number)=>({x,y});
test("completed structures allow movement but not placement; sites and ruins stay solid",()=>{
 const w=createWorld("test",12,10);
 for(const [i,blueprint,speed] of [[0,DEPOT,.75],[1,COMMUNITY_HOUSE,.5],[2,WORKSHOP,.6]] as const){
  const b=createCompletedBuilding("b"+i,at(i*4,2),blueprint,0);
  w.entities.push(b);
  assert.equal(movementCost(w,b.position),1/speed);
  assert.equal(canEnter(w,b.position),true);
  assert.equal(canPlaceEntity(w,b.position),false);
  b.status="destroyed";assert.equal(canEnter(w,b.position),false);
 }
});
test("A* takes the faster route around a slow footprint",()=>{
 const w=createWorld("test",12,7);
 const b=createCompletedBuilding("house",at(3,2),COMMUNITY_HOUSE,0);w.entities.push(b);
 const target:Entity={id:"target",kind:"obstacle",obstacleType:"wall",position:at(8,2),blocksMovement:true};
 w.entities.push(target);
 const route=routeToEntity(w,at(1,2),target)!;
 assert.ok(route);assert.ok(routeCost(w,route)<=8);
 assert.ok(route.every(p=>p.x!==3||p.y!==2));
});
test("apple tree and cultivation cost movement without permitting placement",()=>{
 const w=createWorld("test",10,10);
 w.entities.push({id:"apple",kind:"resource",resourceType:"food",sourceId:"apple_tree",quantity:3,maximum:30,position:at(2,2),life:{stage:"mature",ageTicks:120,health:100,productionProgress:0}});
 assert.equal(movementCost(w,at(2,2)),1/.6);
 assert.equal(canPlaceEntity(w,at(2,2)),false);
});
test("NPC movement enforces terrain traversal time on authoritative commands",()=>{
 const w=createWorld("test",10,10);
 const b=createCompletedBuilding("house",at(3,2),COMMUNITY_HOUSE,0);w.entities.push(b);
 const npc={id:"npc",kind:"character" as const,name:"NPC",position:at(2,2),health:100,energy:100};w.entities.push(npc);
 const move=(id:string,x:number)=>applyCommand(w,{commandId:id,worldId:w.id,actorRole:"npc",actorId:npc.id,targetId:npc.id,action:"movement.move",position:at(x,2)},{internal:true});
 assert.equal(move("m1",3).ok,true);w.tick=3;assert.equal(move("m2",4).ok,false);
 w.tick=6;assert.equal(move("m3",4).ok,true);
});
