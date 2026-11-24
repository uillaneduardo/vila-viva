import {makePrototype} from '../apps/server/src/index.mts';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {once} from 'node:events';
import {WebSocket} from 'ws';
import {hostname,platform,arch,cpus} from 'node:os';

const duration=Number(process.env.OTURO_BENCH_MS??10000);
const counts=(process.env.OTURO_BENCH_NPCS??'6,50,100,250').split(',').map(Number);
const speeds=(process.env.OTURO_BENCH_SPEEDS??'1,2,4').split(',').map(Number);
const observers=(process.env.OTURO_BENCH_OBSERVERS??'1,2').split(',').map(Number);
if(!Number.isFinite(duration)||duration<1000||duration>120000||counts.some(n=>!Number.isInteger(n)||n<1||n>250)||speeds.some(n=>![1,2,4].includes(n))||observers.some(n=>![1,2].includes(n)))throw Error('invalid benchmark settings');
function percentile(values:number[],p:number){const a=[...values].sort((a,b)=>a-b);return a.length?a[Math.ceil(a.length*p)-1]:null;}
async function run(asyncPersistence:boolean,npcs:number,speed:number,clients:number){
 const dir=mkdtempSync(join(tmpdir(),'oturo-baseline-'));
 const app=makePrototype({dataDir:dir,asyncPersistence});
 const sockets:WebSocket[]=[];
 try{
  app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  const address=app.server.address();if(!address||typeof address==='string')throw Error('address');
  const host='127.0.0.1:'+address.port;
  const post=async(path:string,data:object)=>{
   const res=await fetch('http://'+host+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({role:'admin',...data})});
   if(!res.ok)throw Error(path+': '+res.status+' '+await res.text());return res.json();
  };
  await post('/api/world/new',{width:64,height:48});
  const commands=Array.from({length:npcs-1},(_,i)=>({commandId:'bench-npc-'+i,action:'npc.spawn',position:{x:i%60+1,y:Math.floor(i/60)+1},parameters:{name:'Bench '+i}}));
  for(let i=0;i<commands.length;i+=50){const result=await post('/api/brush',{commands:commands.slice(i,i+50)});if(result.results.some((r:any)=>!r.ok))throw Error('spawn rejected');}
  const actual=app.world.entities.filter(e=>e.kind==='character').length;if(actual!==npcs)throw Error('unexpected population '+actual);
  const samples=Array.from({length:clients},()=>({bytes:0,count:0,last:0,gaps:[] as number[]}));
  let measuring=false;
  for(let i=0;i<clients;i++){
   const ws=new WebSocket('ws://'+host+'/api/world/stream',{origin:'http://'+host});sockets.push(ws);
   ws.on('message',raw=>{if(!measuring)return;const s=samples[i],now=performance.now();s.bytes+=Buffer.byteLength(raw.toString());s.count++;if(s.last)s.gaps.push(now-s.last);s.last=now;});
   await once(ws,'open');
  }
  const startTick=app.world.tick, cpu=process.cpuUsage(),start=performance.now();
  measuring=true;app.clock.speed=speed as 1|2|4;
  await delay(duration);app.clock.speed=0;measuring=false;
  const elapsed=performance.now()-start,endTick=app.world.tick;
  const usage=process.cpuUsage(cpu);
  await app.shutdown();
  return {mode:asyncPersistence?'worker':'sync',npcs,speed,clients,elapsedMs:elapsed,ticks:endTick-startTick,tps:(endTick-startTick)*1000/elapsed,metrics:app.timings.summary(),cpuMainProcessMicros:usage,rssBytes:process.memoryUsage().rss,observers:samples.map(s=>({messages:s.count,bytes:s.bytes,gapP50:percentile(s.gaps,.5),gapP95:percentile(s.gaps,.95),gapP99:percentile(s.gaps,.99)}))};
 }finally{app.clock.speed=0;for(const ws of sockets)ws.terminate();if(app.server.listening)await new Promise<void>(resolve=>app.server.close(()=>resolve()));await app.shutdown();rmSync(dir,{recursive:true,force:true});}
}
console.log(JSON.stringify({type:'environment',host:hostname(),platform:platform(),arch:arch(),cpu:cpus()[0]?.model,node:process.version,duration,scope:'loopback websocket; sparse synthetic world; no browser'}));
for(const n of counts)for(const speed of speeds)for(const clients of observers)for(const mode of [false,true])console.log(JSON.stringify(await run(mode,n,speed,clients)));
