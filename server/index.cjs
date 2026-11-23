"use strict";
const http=require("node:http"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),crypto=require("node:crypto");
const ROOT=path.resolve(__dirname,".."),DIR=process.env.DATA_DIR||"/data",PORT=Number(process.env.PORT||3000),MAX_WORLDS=12;
fs.mkdirSync(DIR,{recursive:true});
const labSource=fs.readFileSync(path.join(ROOT,"lab.js"),"utf8");
const appSource=fs.readFileSync(path.join(ROOT,"app.js"),"utf8").replace(/\bsetup\(\);\s*$/,"");
const worlds=new Map();
function engine(data){
 const window={};const sandbox={window,console,Math,Date,JSON,setTimeout,clearTimeout,document:{getElementById:()=>({getContext:()=>({imageSmoothingEnabled:false})})},localStorage:{getItem:()=>null,setItem:()=>{}}};
 vm.createContext(sandbox);vm.runInContext(labSource,sandbox,{timeout:1000});vm.runInContext(appSource,sandbox,{timeout:1000});
 vm.runInContext("window.VilaSites=sites;window.VilaNames=R",sandbox);
 const api=vm.runInContext("({fresh,tick,event,sites,lab:window.VilaLab})",sandbox);
 const w=data||api.fresh("Novo Vale");
 w.extraSites??=[];w.run??={paused:false,speed:1};w.revision??=0;
 for(const s of w.extraSites)api.sites.push(s);
 api.lab.ensure(w,api.sites);
 return {api,w,carry:0,lastTick:Date.now(),dirty:true};
}
function file(id){return path.join(DIR,id+".json")}
function persist(e){const target=file(e.w.id),temp=target+"."+process.pid+".tmp";fs.writeFileSync(temp,JSON.stringify(e.w));fs.renameSync(temp,target);e.dirty=false}
for(const name of fs.readdirSync(DIR)){if(!/^[a-f0-9-]{36}\.json$/.test(name))continue;try{const data=JSON.parse(fs.readFileSync(path.join(DIR,name),"utf8"));worlds.set(data.id,engine(data))}catch(err){console.error("Unable to load world",name,err.message)}}
if(!worlds.size){const e=engine();e.w.id=crypto.randomUUID();e.w.name="Vale Verde";worlds.set(e.w.id,e);persist(e)}
function list(){return [...worlds.values()].map(({w})=>({id:w.id,name:w.name,day:w.day,minute:w.minute,revision:w.revision,paused:w.run.paused,speed:w.run.speed,population:w.npcs.length}));}
function bump(e){e.w.revision++;e.dirty=true;persist(e);}
function command(e,data){
 const {w,api}=e;switch(data.type){
 case "pause":w.run.paused=!!data.value;break;
 case "speed":if(![0,1,5,20,100].includes(Number(data.value)))throw Error("Velocidade inválida");w.run.speed=Number(data.value);w.run.paused=w.run.speed===0;break;
 case "event":if(!["random","harvest","drought","caravan","storm","beasts"].includes(data.value))throw Error("Evento inválido");api.event(w,data.value,true);break;
 case "scenario":{
  const v=data.value;
  if(v==="food")w.stock.food=0;
  else if(v==="forest")w.lab.resources.forest.amount=0;
  else if(v==="storage")w.lab.depotCapacity=api.lab.used(w);
  else if(v==="fatigue")w.npcs.forEach(n=>n.energy=2);
  else if(v==="normal"){w.lab.depotCapacity=Math.max(170,api.lab.used(w)+50);w.npcs.forEach(n=>{n.energy=Math.max(n.energy,70);n.hunger=Math.max(n.hunger,70)});w.stock.food+=20;}
  else throw Error("Cenário inválido");break;
 }
 case "source":{
  const presets={forest:["Floresta","wood",4,24,"🌲",72,.015,3],orchard:["Pomar","food",3,18,"🍎",42,.05,2],hunt:["Caça","food",4,32,"🐾",30,.025,2],farm:["Fazenda","food",5,22,"🌾",70,.065,3],quarry:["Pedreira","stone",4,26,"🪨",64,.012,3],mine:["Mina","ore",2,34,"⛏",50,.008,2]};
  const p=presets[data.preset],x=Number(data.x),y=Number(data.y);
  if(!p||!Number.isInteger(x)||!Number.isInteger(y)||x<1||x>28||y<1||y>15)throw Error("Fonte ou coordenadas inválidas");
  if(api.sites.some(s=>Math.hypot(s.x-x,s.y-y)<1.8)||Math.hypot(x-13,y-8)<2||Math.hypot(x-14,y-9)<2)throw Error("Local ocupado");
  if(w.extraSites.length>=35)throw Error("Limite de fontes atingido");
  const id=data.preset+"-"+crypto.randomUUID().slice(0,8),s={id,name:p[0],x,y,resource:p[1],qty:p[2],work:p[3],icon:p[4],cap:p[7]};
  w.extraSites.push(s);api.sites.push(s);w.lab.resources[id]={amount:p[5],max:p[5],regen:p[6]};break;
 }
 case "nextday":for(let i=0;i<1440;i++)api.tick(w);break;
 default:throw Error("Comando desconhecido");
 }
 bump(e);
}
setInterval(()=>{const now=Date.now();for(const e of worlds.values()){try{const ms=Math.min(500,Math.max(0,now-e.lastTick));e.lastTick=now;if(e.w.run.paused)continue;e.carry+=ms/1000*2*e.w.run.speed;let steps=Math.min(100,Math.floor(e.carry));e.carry-=steps;for(let i=0;i<steps;i++)e.api.tick(e.w);if(steps){e.w.revision++;e.dirty=true}}catch(err){console.error("World tick failed",e.w.id,err);e.w.run.paused=true;e.dirty=true}}},100).unref();
setInterval(()=>{for(const e of worlds.values())if(e.dirty)try{persist(e)}catch(err){console.error("Save failed",err)}},2000);
process.on("SIGTERM",()=>{for(const e of worlds.values())if(e.dirty)persist(e);process.exit(0)});
function respond(res,status,body){const data=JSON.stringify(body);res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Access-Control-Allow-Origin":"same-origin"});res.end(data)}
async function json(req){let s="";for await(const b of req){s+=b;if(s.length>200000)throw Error("Corpo muito grande")}return s?JSON.parse(s):{}}
http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,"http://localhost"),parts=url.pathname.split("/").filter(Boolean);
 if(url.pathname==="/healthz")return respond(res,200,{ok:true,worlds:worlds.size});
 if(parts[0]!=="api"||parts[1]!=="simulations")return respond(res,404,{error:"Not found"});
 if(parts.length===2&&req.method==="GET")return respond(res,200,{worlds:list()});
 if(parts.length===2&&req.method==="POST"){
  if(worlds.size>=MAX_WORLDS)return respond(res,409,{error:"Limite de mundos"});
  const data=await json(req),name=String(data.name||"Novo Mundo").trim().slice(0,40);
  if(!name)return respond(res,400,{error:"Nome obrigatório"});
  const e=engine();e.w.id=crypto.randomUUID();e.w.name=name;worlds.set(e.w.id,e);bump(e);return respond(res,201,{world:e.w});
 }
 const e=worlds.get(parts[2]);if(!e)return respond(res,404,{error:"Simulação não encontrada"});
 if(parts.length===3&&req.method==="GET")return respond(res,200,{world:e.w});
 if(parts.length===3&&req.method==="PATCH"){const data=await json(req);const name=String(data.name||"").trim().slice(0,40);if(!name)throw Error("Nome inválido");e.w.name=name;bump(e);return respond(res,200,{world:e.w})}
 if(parts.length===3&&req.method==="DELETE"){if(worlds.size===1)return respond(res,409,{error:"Mantenha ao menos uma simulação"});worlds.delete(e.w.id);fs.rmSync(file(e.w.id),{force:true});return respond(res,200,{ok:true})}
 if(parts[3]==="commands"&&req.method==="POST"){command(e,await json(req));return respond(res,200,{world:e.w})}
 return respond(res,404,{error:"Not found"});
 }catch(err){respond(res,400,{error:String(err.message||err)})}
}).listen(PORT,"0.0.0.0",()=>console.log("Vila Viva authoritative engine on",PORT));
