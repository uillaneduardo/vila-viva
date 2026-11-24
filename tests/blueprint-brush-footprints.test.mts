import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {BUILDING_BLUEPRINTS} from "../packages/content/src/buildings/registry.ts";
import {createWorld,applyCommand} from "../packages/engine/src/engine.ts";
test("UI footprint contract derives from blueprint instead of fixed construction sizes",async()=>{
 const hud=await readFile(new URL("../packages/ui/src/hud.js",import.meta.url),"utf8");
 const app=await readFile(new URL("../apps/shared-ui/app.js",import.meta.url),"utf8");
 const scene=await readFile(new URL("../packages/renderer/src/scene.js",import.meta.url),"utf8");
 assert.match(hud,/blueprints\[selected\]\?\.footprint/);
 assert.match(app,/catalog\?\.buildingBlueprints\?\.\[preset\]\?\.footprint/);
 assert.match(scene,/this\.brush\.footprint\?\.width/);
 assert.match(scene,/this\.brush\.footprint\?\.height/);
 assert.deepEqual(BUILDING_BLUEPRINTS["building.depot"].footprint,{width:2,height:2});
 assert.deepEqual(BUILDING_BLUEPRINTS["building.workshop"].footprint,{width:3,height:2});
 assert.deepEqual(BUILDING_BLUEPRINTS["building.cemetery"].footprint,{width:3,height:3});
 const w=createWorld("place",12,12);
 assert.equal(applyCommand(w,{worldId:w.id,commandId:"workshop",actorRole:"admin",
  action:"construction.place",position:{x:9,y:9},parameters:{
   blueprintId:"building.workshop",mode:"site"
  }}).ok,true);
 assert.equal(applyCommand(w,{worldId:w.id,commandId:"cemetery",actorRole:"admin",
  action:"construction.place",position:{x:10,y:10},parameters:{
   blueprintId:"building.cemetery",mode:"site"
  }}).error,"OUT_OF_BOUNDS");
});
