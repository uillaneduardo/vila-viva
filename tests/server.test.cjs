"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {spawn}=require("node:child_process"),{once}=require("node:events");
const DIR=fs.mkdtempSync(path.join(os.tmpdir(),"vila-world-")),PORT=19873;
let child;
function start(){child=spawn(process.execPath,[path.join(__dirname,"../server/index.cjs")],{env:{...process.env,PORT:String(PORT),DATA_DIR:DIR},stdio:["ignore","pipe","pipe"]});child.stderr.on("data",b=>process.stderr.write(b));}
async function call(route,method="GET",body){const r=await fetch("http://127.0.0.1:"+PORT+route,{method,headers:{"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined});const j=await r.json();if(!r.ok)throw Error(r.status+": "+JSON.stringify(j));return j}
async function ready(){for(let i=0;i<100;i++){try{await call("/healthz");return}catch{}await new Promise(r=>setTimeout(r,80))}throw Error("Server not ready")}
async function stop(){if(child&&child.exitCode===null){child.kill("SIGTERM");await once(child,"exit")}}
test("authoritative persistent simulations",async()=>{
 try{
  start();await ready();
  const first=(await call("/api/simulations")).worlds[0];assert.ok(first.id);
  const b=(await call("/api/simulations","POST",{name:"Estudo B"})).world;
  assert.notEqual(first.id,b.id);
  await call("/api/simulations/"+b.id+"/commands","POST",{type:"speed",value:20});
  const before=(await call("/api/simulations/"+b.id)).world.ticks;
  await new Promise(r=>setTimeout(r,550));
  const after=(await call("/api/simulations/"+b.id)).world.ticks;
  assert.ok(after>before,"world must tick without any browser");
  await call("/api/simulations/"+first.id+"/commands","POST",{type:"pause",value:true});
  const frozen=(await call("/api/simulations/"+first.id)).world.ticks;
  await new Promise(r=>setTimeout(r,240));
  assert.equal((await call("/api/simulations/"+first.id)).world.ticks,frozen);
  await call("/api/simulations/"+b.id+"/commands","POST",{type:"source",preset:"forest",x:2,y:2});
  const placed=(await call("/api/simulations/"+b.id)).world;
  assert.equal(placed.extraSites.length,1);assert.ok(placed.lab.resources[placed.extraSites[0].id]);
  await stop();start();await ready();
  const recovered=(await call("/api/simulations/"+b.id)).world;
  assert.equal(recovered.extraSites.length,1);assert.ok(recovered.ticks>=after);
  assert.equal((await call("/api/simulations/"+first.id)).world.run.paused,true);
 }finally{await stop();fs.rmSync(DIR,{recursive:true,force:true})}
});
