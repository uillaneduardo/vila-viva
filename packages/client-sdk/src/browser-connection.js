/** Local transport uses the same client request/stream contract without HTTP or WebSocket. */
export function createBrowserConnection(){
 const worker=new Worker('/apps/browser-runtime/worker.js',{type:'module'});let seq=0,live=false,callbacks=null,updates=0,closed=false;const pending=new Map();
 worker.onmessage=e=>{const m=e.data;if(m.type==='state'){live=true;updates++;callbacks?.onStatus('live');callbacks?.onState(m.data,m.meta);}else if(m.type==='response'){const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(m.error)):p.resolve(m.data);}else if(m.type==='fault'){callbacks?.onStatus('fallback');}};
 const fail=()=>{live=false;callbacks?.onStatus('fallback');for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('LOCAL_WORKER_FAILED'));}pending.clear();};
 worker.onerror=fail;
 function request(path,options){if(closed)return Promise.reject(Error('LOCAL_WORKER_CLOSED'));return new Promise((resolve,reject)=>{const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(Error('LOCAL_WORKER_TIMEOUT'));},10000);pending.set(id,{resolve,reject,timer});try{worker.postMessage({type:'request',id,path,input:options?.body?JSON.parse(options.body):{}});}catch(e){clearTimeout(timer);pending.delete(id);reject(e);}});}
 function connect(c){callbacks=c;c.onStatus('connecting');worker.postMessage({type:'start'});const metrics=setInterval(()=>{c.onMetrics({updates,bytes:0,rtt:null});updates=0;},1000);return {get live(){return live;},close(){closed=true;clearInterval(metrics);worker.terminate();fail();}};}
 return {request,connect};
}
