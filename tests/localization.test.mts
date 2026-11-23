import assert from "node:assert/strict";
import test from "node:test";
import {baseRegistry} from "../packages/content/src/catalog.ts";
import {EFFECTS} from "../packages/content/src/effects/catalog.ts";
import {COMMUNITY_HOUSE} from "../packages/content/src/buildings/community-house.ts";
import {displayText,validateLocalizedText} from "../packages/domain/src/localization.ts";
import {DefinitionRegistry} from "../packages/domain/src/registry.ts";
import {makePrototype} from "../apps/server/src/index.mts";

test("entities, actions, effects and construction content have pt-BR display names",()=>{
 for(const def of baseRegistry.entities.values())assert.ok(displayText(def.displayName).trim());
 for(const def of baseRegistry.actions.values())assert.ok(displayText(def.displayName).trim());
 for(const effect of Object.values(EFFECTS))assert.ok(displayText(effect.displayName).trim());
 assert.equal(displayText(COMMUNITY_HOUSE.displayName),"Casa Comunitária");
 for(const stage of COMMUNITY_HOUSE.stages)assert.ok(displayText(stage.displayName).trim());
 assert.equal(displayText(baseRegistry.entity("resource.wood").displayName),"Fonte de madeira");
 assert.equal(displayText(baseRegistry.action("movement.move").displayName),"Mover");
});
test("locale fallback is deterministic and missing pt-BR is rejected",()=>{
 assert.equal(displayText({"pt-BR":"Madeira"},"en-US"),"Madeira");
 assert.throws(()=>validateLocalizedText({} as any));
 const registry=new DefinitionRegistry();
 assert.throws(()=>registry.registerEntity({id:"bad",kind:"item",components:[],displayName:{} as any,description:"bad"}));
});
test("local UI catalog returns localized texts, not domain IDs as visible names",async()=>{
 const {server}=makePrototype();
 await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",()=>resolve()));
 const addr=server.address();if(!addr||typeof addr==="string")throw Error("server not listening");
 try{
  const response=await fetch("http://127.0.0.1:"+addr.port+"/api/catalog");
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.locale,"pt-BR");
  assert.equal(data.resources.wood,"Fonte de madeira");
  assert.equal(data.effects.gestation,"Gestação");
  assert.equal(data.buildings["building.community_house"],"Casa Comunitária");
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
