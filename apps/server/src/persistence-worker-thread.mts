import {parentPort,workerData} from 'node:worker_threads';
import {FileWorldStore} from './world-store.mts';
if(!parentPort)throw Error('WORKER_REQUIRED');
const port=parentPort;
const store=new FileWorldStore(workerData.root);
store.loadActive();
port.postMessage({type:'ready'});
port.on('message',message=>{
 try{
  const snapshot=message.type==='switch'?store.switchWorld(message.world,message.seed):store.commit(message.world,message.seed,message.actions);
  port.postMessage({type:'ack',id:message.id,snapshot});
 }catch(error){
  port.postMessage({type:'failed',id:message.id,error:error instanceof Error?error.message:String(error)});
  port.close();
 }
});
