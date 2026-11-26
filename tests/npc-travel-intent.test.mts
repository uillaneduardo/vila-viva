import test from "node:test";
import assert from "node:assert/strict";
import {travelActivity,advanceNpcDecisions} from "../packages/systems/ai/src/index.ts";
import {createWorld,applyCommand} from "../packages/engine/src/engine.ts";
import type {Character} from "../packages/domain/src/contracts.ts";
test("travel describes intent rather than completed work",()=>{
 assert.equal(travelActivity("resource.gather","Buscando recursos","iron"),"Indo minerar ferro");
 assert.equal(travelActivity("resource.gather","Coletando material","wood"),"Indo coletar madeira");
 assert.equal(travelActivity("storage.deposit","Armazenando recursos"),"Carregando para o depósito");
 assert.equal(travelActivity("storage.deposit","Entregando à oficina"),"Carregando para a oficina");
 assert.equal(travelActivity("mine.extract","Operando mina"),"Indo minerar");
 assert.equal(travelActivity("farming.plant","Plantando"),"Indo plantar");
 assert.equal(travelActivity("storage.withdraw","Buscando alimento"),"Buscando alimento");
});
test("NPC moving to a planting plot exposes the intended activity",()=>{
 const w=createWorld("travel-intent",12,12);
 assert.ok(applyCommand(w,{worldId:w.id,commandId:"npc",actorRole:"admin",action:"npc.spawn",position:{x:1,y:1}}).ok);
 assert.ok(applyCommand(w,{worldId:w.id,commandId:"zone",actorRole:"admin",action:"farming.zone.create",position:{x:8,y:8},parameters:{sourceId:"carrot",width:2,height:2}}).ok);
 const npc=w.entities.find(e=>e.kind==="character") as Character;
 npc.inventory={carrot_seed:2};npc.energy=100;npc.satiety=100;w.tick=3;
 advanceNpcDecisions(w,c=>applyCommand(w,c,{internal:true}));
 assert.equal(npc.ai?.activity,"Indo plantar");
 assert.ok(npc.ai?.targetId);
 assert.equal(npc.inventory.carrot_seed,2);
});
