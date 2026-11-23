import assert from "node:assert/strict";
import test from "node:test";
import {makePrototype} from "../apps/server/src/index.mts";

test("same authoritative world visible via two UI contexts; commands change real state",async()=>{
 const {server}=makePrototype();
 await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",()=>resolve()));
 const address=server.address();if(!address||typeof address==="string")throw Error("server not listening");
 const base="http://127.0.0.1:"+address.port;
 try{
  const first=await (await fetch(base+"/api/world")).json();
  assert.equal(first.world.entities.length,3);
  assert.equal(first.world.entities.filter((e:any)=>e.kind==="resource").length,1);
  const actions=await (await fetch(base+"/api/actions?role=player&x=5&y=5")).json();
  assert.ok(actions.actions.some((x:any)=>x.id==="movement.move"&&x.enabled));
  const command={commandId:"test-move",role:"player",action:"movement.move",position:{x:5,y:5}};
  const response=await (await fetch(base+"/api/commands",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(command)})).json();
  assert.equal(response.result.ok,true);
  const after=await (await fetch(base+"/api/world")).json();
  assert.equal(after.world.entities.find((e:any)=>e.id===first.playerId).position.x,5);
  const forbidden=await (await fetch(base+"/api/commands",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...command,commandId:"not-admin",action:"resource.spawn",parameters:{resourceType:"stone",quantity:4}})})).json();
  assert.equal(forbidden.result.error,"UNAUTHORIZED");
  const duplicate=await (await fetch(base+"/api/commands",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(command)})).json();
  assert.equal(duplicate.result.error,"DUPLICATE_COMMAND");
  const admin=await (await fetch(base+"/api/commands",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({commandId:"add-source",role:"admin",action:"resource.spawn",position:{x:8,y:7},parameters:{resourceType:"food",quantity:20}})})).json();
  assert.equal(admin.result.ok,true);
  const final=await (await fetch(base+"/api/world")).json();
  assert.equal(final.world.entities.length,4);
  const playerPage=await (await fetch(base+"/")).text();const adminPage=await (await fetch(base+"/admin")).text();
  assert.match(playerPage,/JOGADOR/);assert.match(adminPage,/ADMINISTRADOR/);
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
