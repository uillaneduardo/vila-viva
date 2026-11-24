import {parentPort,workerData} from 'node:worker_threads';
import {FileWorldStore} from './world-store.mts';
if(!parentPort)throw Error('WORKER_REQUIRED');
const port=parentPort;
const store=new FileWorldStore(workerData.root);
const restored=store.loadActive();
port.postMessage({type:'ready',restored});
port.on('message',message=>{
 try{
  let result;
  switch(message.type){
   case 'switch':result=store.switchWorld(message.world,message.seed);break;
   case 'commit':result=store.commit(message.world,message.seed,message.actions);break;
   case 'saveNamed':result=store.saveNamed(message.name,message.world,message.seed);break;
   case 'loadNamed':result=store.loadNamed(message.name);break;
   case 'listSaves':result=store.listSaves();break;
   case 'getLog':result=store.getLog(message.timelineId);break;
   case 'recentLog':result=store.recentLog(message.limit);break;
   case 'listLogs':result=store.listLogs();break;
   case 'snapshot':result=store.snapshot(message.world,message.seed);break;
   default:throw Error('INVALID_OPERATION');
  }
  port.postMessage({type:'ack',id:message.id,result});
 }catch(error){
  const detail=error instanceof Error?error.message:String(error);
  // Read errors do not corrupt checkpoint state. Failed writes require recovery.
  const fatal=['commit','switch','saveNamed'].includes(message.type);
  port.postMessage({type:'failed',id:message.id,error:detail,fatal});
  if(fatal)port.close();
 }
});
