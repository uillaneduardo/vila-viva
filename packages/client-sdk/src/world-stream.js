import {applyDelta,STREAM_VERSION} from '../../protocol/src/world-stream.js';
export function connectWorld({onState,onStatus,onMetrics}){
 let socket,timer,heartbeat,closed=false,attempt=0,state=null,revision=-1,epoch=-1,updates=0,bytes=0,rtt=null;
 let live=false;
 const connect=()=>{
  if(closed)return;
  onStatus('connecting');const scheme=location.protocol==='https:'?'wss:':'ws:';
  const ws=new WebSocket(scheme+'//'+location.host+'/api/world/stream');socket=ws;
  ws.onopen=()=>{attempt=0;ws.send(JSON.stringify({type:'ping',sent:performance.now()}));};
  ws.onmessage=event=>{
   if(socket!==ws)return;
   bytes+=new TextEncoder().encode(event.data).length;
   try{
    const m=JSON.parse(event.data);
    if(m.type==='pong'){rtt=Math.max(0,performance.now()-m.sent);return;}
    if(m.v!==STREAM_VERSION)throw Error('VERSION');
    const reset=m.type==='snapshot';
    if(!reset&&(m.type!=='delta'||!state||m.base!==revision||m.epoch!==epoch)){ws.send(JSON.stringify({type:'resync'}));return;}
    const next=reset?m.data:applyDelta(state,m.data);
    if(!next?.world||!Array.isArray(next.world.entities))throw Error('STATE');
    state=next;revision=m.revision;epoch=m.epoch;updates++;live=true;
    onStatus('live');onState(state,{reset});
   }catch{ws.close();}
  };
  ws.onerror=()=>ws.close();
  ws.onclose=()=>{if(socket!==ws||closed)return;live=false;onStatus('fallback');timer=setTimeout(connect,Math.min(10000,500*2**Math.min(attempt++,5)));};
 };
 heartbeat=setInterval(()=>{
  onMetrics({updates,bytes,rtt});updates=0;bytes=0;
  if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'ping',sent:performance.now()}));
 },1000);
 connect();
 return {get live(){return live;},close(){closed=true;live=false;clearTimeout(timer);clearInterval(heartbeat);socket?.close();}};
}
