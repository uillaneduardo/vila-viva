import test from "node:test";
import assert from "node:assert/strict";
import {createWorld,applyCommand} from "../packages/engine/src/engine.ts";
import {advanceNpcDecisions} from "../packages/systems/ai/src/index.ts";
import {validateWorld} from "../packages/protocol/src/world-snapshot.ts";
import type {Character} from "../packages/domain/src/contracts.ts";
function fixture(){
 const w=createWorld("commitment",12,12);
 assert.ok(applyCommand(w,{worldId:w.id,commandId:"npc",actorRole:"admin",action:"npc.spawn",position:{x:1,y:1}}).ok);
 assert.ok(applyCommand(w,{worldId:w.id,commandId:"zone",actorRole:"admin",action:"farming.zone.create",position:{x:8,y:8},parameters:{sourceId:"carrot",width:2,height:2}}).ok);
 const npc=w.entities.find(e=>e.kind==="character") as Character;
 npc.inventory={carrot_seed:2};npc.energy=100;npc.satiety=100;
 w.tick=3;
 return {w,npc};
}
test("planting intent is persisted and cancelled for survival",()=>{
 const {w,npc}=fixture();
 advanceNpcDecisions(w,c=>applyCommand(w,c,{internal:true}));
 assert.ok(npc.ai?.plantingCommitment);
 const copy=JSON.parse(JSON.stringify(w));validateWorld(copy);
 const actor=copy.entities.find(e=>e.kind==="character") as Character;
 const original=actor.ai!.plantingCommitment!;
 copy.tick=6;
 advanceNpcDecisions(copy,c=>applyCommand(copy,c,{internal:true}));
 assert.deepEqual(actor.ai?.plantingCommitment?.position,original.position);
 actor.satiety=5;actor.inventory!.apple=1;copy.tick=9;
 advanceNpcDecisions(copy,c=>applyCommand(copy,c,{internal:true}));
 assert.equal(actor.ai?.plantingCommitment,undefined);
 assert.ok(actor.satiety>5);
});
test("invalid commitment is rejected by snapshot validation",()=>{
 const {w,npc}=fixture();
 advanceNpcDecisions(w,c=>applyCommand(w,c,{internal:true}));
 assert.ok(npc.ai?.plantingCommitment);
 npc.ai!.plantingCommitment!.position.x=99;
 assert.throws(()=>validateWorld(w),/INVALID_WORLD/);
});
