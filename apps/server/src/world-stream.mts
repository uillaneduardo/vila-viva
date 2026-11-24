import {RevisionBuffer} from './revision-buffer.mts';
import {WebSocketServer,WebSocket} from 'ws';
import {delta,STREAM_VERSION} from '../../../packages/protocol/src/world-stream.js';
import type {Server} from 'node:http';
// Read-only adapter; same projection as HTTP. Existing prototype has no RBAC.
export function attachWorldStream(server:Server,project:()=>any,generation:()=>number){
 const wss=new WebSocketServer({noServer:true,maxPayload:1024,perMessageDeflate:false});
 const maxBuffer=2*1024*1024,maxClients=32;
 let revision=0,previous:any=null,signature='',epoch=-1,sampleTime=0;
 const buffer=new RevisionBuffer(64,2*1024*1024);
 const send=(socket:WebSocket,message:string)=>{
  if(socket.readyState!==WebSocket.OPEN)return;
  if(Buffer.byteLength(message)>maxBuffer||socket.bufferedAmount+Buffer.byteLength(message)>maxBuffer){socket.terminate();return;}
  socket.send(message);
 };
 const snapshot=()=>JSON.stringify({v:STREAM_VERSION,type:'snapshot',revision,epoch,sampleTime,data:previous});
 function publish(){
  if(!wss.clients.size)return;
  const next=project(),serialized=JSON.stringify(next),nextEpoch=generation();
  if(serialized===signature&&epoch===nextEpoch)return;
  const stable=JSON.parse(serialized),reset=!previous||epoch!==nextEpoch;
  const base=revision;revision++;epoch=nextEpoch;sampleTime=performance.now();
  const message=reset?null:JSON.stringify({v:STREAM_VERSION,type:'delta',base,revision,epoch,sampleTime,data:delta(previous,stable)});
  previous=stable;signature=serialized;
  const payload=message??snapshot();
  if(reset)buffer.clear();buffer.push(revision,payload);
  for(const socket of wss.clients)send(socket,payload);
 }
 server.on('upgrade',(req,socket,head)=>{
  let allowed=false;
  try{
   const origin=new URL(req.headers.origin??'');
   allowed=req.url==='/api/world/stream'&&['http:','https:'].includes(origin.protocol)&&origin.host===req.headers.host;
  }catch{}
  if(!allowed||wss.clients.size>=maxClients){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
 });
 const alive=new WeakSet<WebSocket>();
 wss.on('connection',socket=>{
  socket.on('error',()=>socket.terminate());
  alive.add(socket);socket.on('pong',()=>alive.add(socket));
  publish();send(socket,snapshot());
  socket.on('message',raw=>{
   try{const m=JSON.parse(raw.toString());
    if(m.type==='ping'&&Number.isFinite(m.sent))send(socket,JSON.stringify({type:'pong',sent:m.sent}));
    else if(m.type==='resync')send(socket,snapshot());
    else socket.close(1008,'read only');
   }catch{socket.close(1008,'invalid message');}
  });
 });
 // No internal polling: the authoritative producer explicitly publishes committed revisions.
 const heartbeat=setInterval(()=>{for(const s of wss.clients){if(!alive.has(s)){s.terminate();continue;}alive.delete(s);s.ping();}},15000);heartbeat.unref();
 // HTTP close waits for upgraded connections only on some runtimes; explicitly dispose on close.
 server.on('close',()=>{clearInterval(heartbeat);for(const s of wss.clients)s.terminate();wss.close();});
 return {publish,buffer,wss};
}
