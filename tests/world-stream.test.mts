import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {once} from 'node:events';
import {makePrototype} from '../apps/server/src/index.mts';
import {delta,applyDelta} from '../packages/protocol/src/world-stream.js';
test('projection delta preserves order, updates and removes',()=>{
 const a={world:{entities:[{id:'a',x:1},{id:'b'}]}},b={world:{entities:[{id:'c'},{id:'a',x:2}]}};
 assert.deepEqual(applyDelta(a,delta(a,b)),b);
});
test('two spectators receive the same authoritative clock and reconnect snapshot',async()=>{
 const {server}=makePrototype();server.listen(0,'127.0.0.1');await once(server,'listening');
 const addr=server.address();if(!addr||typeof addr==='string')throw Error('address');
 const origin='http://127.0.0.1:'+addr.port;
 const sockets:WebSocket[]=[];
 const client=()=>{const ws=new WebSocket(origin.replace('http','ws')+'/api/world/stream',{origin});sockets.push(ws);
  let state:any;const waiters:Array<(s:any)=>void>=[];
  ws.on('message',raw=>{const m=JSON.parse(raw.toString());if(m.type==='snapshot')state=m.data;else if(m.type==='delta'&&state)state=applyDelta(state,m.data);else return;for(const cb of waiters.splice(0))cb(state);});
  return {ws,next:()=>new Promise<any>(resolve=>waiters.push(resolve))};};
 try{
  const a=client(),b=client();const [first,second]=await Promise.all([a.next(),b.next()]);assert.deepEqual(first,second);
  const pa=a.next(),pb=b.next();await fetch(origin+'/api/clock',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({role:'admin',speed:1})});
  const [x,y]=await Promise.all([pa,pb]);assert.equal(x.clock.speed,1);assert.deepEqual(x,y);
  const c=client();assert.equal((await c.next()).clock.speed,1);
 }finally{for(const ws of sockets)ws.terminate();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
