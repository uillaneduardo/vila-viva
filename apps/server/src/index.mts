import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {resolve,extname,sep} from "node:path";
import {fileURLToPath} from "node:url";
import {createWorld,applyCommand} from "../../../packages/engine/src/engine.ts";
import {availableActions} from "../../../packages/engine/src/capabilities.ts";
import type {Command,World,Role,Entity,Position} from "../../../packages/domain/src/contracts.ts";

// EXPERIMENTAL LOCAL DEVELOPMENT SERVER: no authentication or persistence.
// Never bind publicly until identity/RBAC, rate limiting and audit are implemented.
const root=resolve(fileURLToPath(new URL("../../../",import.meta.url)));
const host="127.0.0.1";
const port=Number(process.env.PORT||8086);
export function makePrototype(){
 const world=createWorld("first-world",24,16);
 const init=(action:Command["action"],commandId:string,position:Position,parameters:Record<string,unknown>)=>
  applyCommand(world,{worldId:world.id,actorRole:"admin",commandId,action,position,parameters});
 init("npc.spawn","player-init",{x:4,y:5},{name:"Meu personagem",ownerId:"local-player"});
 init("npc.spawn","npc-init",{x:13,y:9},{name:"Ayla"});
 init("resource.spawn","wood-init",{x:7,y:8},{resourceType:"madeira",quantity:30});
 const playerId="npc-player-init";
 const json=(res:import("node:http").ServerResponse,status:number,data:unknown)=>{
  res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"});
  res.end(JSON.stringify(data));
 };
 const server=createServer(async(req,res)=>{
  try{
   const url=new URL(req.url||"/","http://localhost");
   if(url.pathname==="/api/world"&&req.method==="GET")return json(res,200,{world,playerId,mode:"local-prototype",persistent:false});
   if(url.pathname==="/api/actions"&&req.method==="GET"){
    const role:Role=url.searchParams.get("role")==="admin"?"admin":"player";
    const id=url.searchParams.get("targetId");
    const target=world.entities.find(e=>e.id===id);
    const x=Number(url.searchParams.get("x")),y=Number(url.searchParams.get("y"));
    const point=url.searchParams.has("x")&&url.searchParams.has("y")?{x,y}:undefined;
    return json(res,200,{actions:availableActions(world,role,role==="player"?"local-player":undefined,target,point)});
   }
   if(url.pathname==="/api/commands"&&req.method==="POST"){
    // These URLs are deliberately loopback-only. Role is NOT verified.
    // Caller-controlled role is forbidden in production. Keep this server local.
    let raw="";for await (const part of req){raw+=part.toString();if(raw.length>8192)return json(res,413,{error:"BODY_TOO_LARGE"});}
    let input:any;try{input=JSON.parse(raw);}catch{return json(res,400,{error:"INVALID_JSON"});}
    if(!input||typeof input!=="object"||typeof input.commandId!=="string"||!/^[-\w]{1,80}$/.test(input.commandId))return json(res,400,{error:"INVALID_PAYLOAD"});
    const role:Role=input.role==="admin"?"admin":"player";
    const command:Command={worldId:world.id,commandId:input.commandId,actorRole:role,actorId:role==="player"?"local-player":undefined,action:input.action,targetId:role==="player"?playerId:input.targetId,position:input.position,parameters:input.parameters};
    const result=applyCommand(world,command);
    return json(res,result.ok?200:422,{result,world});
   }
   if(req.method!=="GET"&&req.method!=="HEAD")return json(res,405,{error:"METHOD_NOT_ALLOWED"});
   const path=url.pathname==="/"?"/apps/player-web/index.html":url.pathname==="/admin"?"/apps/admin-web/index.html":url.pathname;
   const filename=resolve(root,"."+path);
   if(filename!==root&&!filename.startsWith(root+sep))return json(res,403,{error:"FORBIDDEN"});
   const mime:{[key:string]:string}={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8"};
   if(!Object.hasOwn(mime,extname(filename)))return json(res,404,{error:"NOT_FOUND"});
   const bytes=await readFile(filename);
   res.writeHead(200,{"content-type":mime[extname(filename)],"cache-control":"no-store","x-content-type-options":"nosniff"});
   res.end(req.method==="HEAD"?undefined:bytes);
  }catch(e){if((e as NodeJS.ErrnoException).code==="ENOENT")return json(res,404,{error:"NOT_FOUND"});json(res,500,{error:"INTERNAL_ERROR"});}
 });
 return {server,world};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const {server}=makePrototype();
 server.listen(port,host,()=>console.log("Local prototype: http://"+host+":"+port+" (admin: /admin)"));
}
