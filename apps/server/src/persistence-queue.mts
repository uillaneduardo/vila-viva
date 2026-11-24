/** Experimental standalone queue. No server wiring or durability-policy change. */
export class PersistenceQueue<T>{
 private items:{revision:number,bytes:number,value:T,resolve:()=>void,reject:(e:Error)=>void}[]=[];
 private bytes=0;
 private lastAccepted=0;
 private lastDurable=0;
 private running=false;
 private failure:Error|null=null;
 private sealed=false;
 private idleWaiters:(()=>void)[]=[];
 private writer:(value:T,revision:number)=>Promise<void>;
 private maxItems:number;
 private maxBytes:number;
 constructor(writer:(value:T,revision:number)=>Promise<void>,limits:{maxItems:number,maxBytes:number}){
  if(!Number.isSafeInteger(limits.maxItems)||limits.maxItems<1||!Number.isSafeInteger(limits.maxBytes)||limits.maxBytes<1)throw Error('INVALID_QUEUE_LIMITS');
  this.writer=writer;this.maxItems=limits.maxItems;this.maxBytes=limits.maxBytes;
 }
 status(){return {pending:this.items.length,bytes:this.bytes,acceptedRevision:this.lastAccepted,durableRevision:this.lastDurable,failed:!!this.failure,sealed:this.sealed};}
 /** Caller transfers ownership of an immutable payload; bytes must include its conservative serialized cost. */
 enqueue(revision:number,value:T,bytes:number):Promise<void>{
  if(this.failure)throw this.failure;
  if(this.sealed)throw Error('QUEUE_SEALED');
  if(!Number.isSafeInteger(revision)||revision!==this.lastAccepted+1)throw Error('INVALID_REVISION');
  if(!Number.isSafeInteger(bytes)||bytes<1)throw Error('INVALID_SIZE');
  if(this.items.length>=this.maxItems||bytes>this.maxBytes-this.bytes)throw Error('PERSISTENCE_BACKPRESSURE');
  const ack=new Promise<void>((resolve,reject)=>{this.items.push({revision,bytes,value,resolve,reject});});
  this.bytes+=bytes;this.lastAccepted=revision;
  if(!this.running){this.running=true;queueMicrotask(()=>{void this.pump();});}
  return ack;
 }
 private async pump(){
  try{
   while(this.items.length){
    const item=this.items[0];
    await this.writer(item.value,item.revision);
    this.lastDurable=item.revision;this.items.shift();this.bytes-=item.bytes;item.resolve();
   }
  }catch(e){
   this.failure=e instanceof Error?e:Error(String(e));
   for(const item of this.items)item.reject(this.failure);
   this.items=[];this.bytes=0;
  }finally{
   this.running=false;
   for(const wake of this.idleWaiters.splice(0))wake();
  }
 }
 /** Barrier: seal admission before awaiting outstanding commits. A new timeline requires a new queue. */
 async close(){
  this.sealed=true;
  if(this.running)await new Promise<void>(resolve=>this.idleWaiters.push(resolve));
  if(this.failure)throw this.failure;
 }
}
