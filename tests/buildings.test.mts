import assert from "node:assert/strict";
import test from "node:test";
import {COMMUNITY_HOUSE} from "../packages/content/src/buildings/community-house.ts";
import {validateBuildingBlueprint} from "../packages/content/src/building-validation.ts";
test("community house has four construction stages",()=>{
 assert.deepEqual(COMMUNITY_HOUSE.stages.map(s=>s.id),["foundation","structure","roof","finishing"]);
 assert.equal(COMMUNITY_HOUSE.effects.find(e=>e.capability==="housing.adult_capacity")?.value,6);
 assert.equal(COMMUNITY_HOUSE.effects.find(e=>e.capability==="housing.dependent_capacity")?.value,2);
 assert.doesNotThrow(()=>validateBuildingBlueprint(COMMUNITY_HOUSE));
});
test("building data does not own pregnancy logic",()=>{
 assert.ok(COMMUNITY_HOUSE.effects.every(e=>!e.capability.startsWith("reproduction.")&&!e.capability.startsWith("lifecycle.")));
});
test("invalid stage materials rejected",()=>{
 assert.throws(()=>validateBuildingBlueprint({...COMMUNITY_HOUSE,stages:[{id:"bad",label:"bad",materials:{wood:-1},workUnits:1,displayName:{"pt-BR":"Etapa inválida"}}]}));
});
