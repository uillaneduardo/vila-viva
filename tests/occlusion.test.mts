import test from "node:test";
import assert from "node:assert/strict";
import {createOcclusionResolver} from "../packages/renderer/src/occlusion.js";
test("occlusion is a visual projection, independent of gameplay and sprite pack",()=>{
 const npc={kind:"character",health:100,position:{x:0,y:0}};
 const building={kind:"construction",status:"completed",position:{x:2,y:2},footprint:{width:2,height:2}};
 const resolve=createOcclusionResolver([npc],()=>({x:2.2,y:3}));
 assert.equal(resolve(building),.38);
 assert.equal(resolve({...building,status:"site"}),1);
 assert.equal(resolve({...building,position:{x:7,y:7}}),1);
 assert.equal(resolve({kind:"resource",sourceId:"apple_tree",position:{x:2,y:3}}),.38);
 assert.equal(resolve(npc),1);
 assert.equal(createOcclusionResolver([{...npc,health:0}])(building),1);
});
