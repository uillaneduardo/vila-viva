import {createBrowserRuntime} from "./runtime.ts";
const runtime=createBrowserRuntime({publish:(data,meta)=>postMessage({type:"state",data,meta})});
self.onmessage=e=>{const m=e.data;if(m.type==="start"){runtime.notify(true);return;}if(m.type!=="request")return;try{const data=runtime.request(m.path,m.input);postMessage({type:"response",id:m.id,data});}catch(error){postMessage({type:"response",id:m.id,error:String(error instanceof Error?error.message:error)});}};
setInterval(()=>{try{runtime.pulse();}catch(error){runtime.request("/api/clock",{role:"admin",speed:0});postMessage({type:"fault",error:String(error)});}},62.5);
