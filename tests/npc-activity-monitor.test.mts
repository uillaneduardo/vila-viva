import assert from "node:assert/strict";
import test from "node:test";
import {readFile} from "node:fs/promises";
import {npcActivityRows,createNpcActivityMonitor} from "../packages/ui/src/npc-activity-monitor.js";
import {createWorld,applyCommand,advanceTick} from "../packages/engine/src/engine.ts";

const inhabitant=(id,name,activity,history=[],extra={})=>({
 id,kind:"character",name,position:{x:1,y:1},health:100,energy:90,
 ai:{activity,reason:"Decisão de exemplo",lastDecisionTick:25,
  route:[],history},...extra
});
const record=(tick,activity,reason)=>({tick,activity,reason});
test("activity projection only includes autonomous inhabitants; last task, leader and death display",()=>{
 const world={entities:[
  inhabitant("npc-3","Zeca","Construindo",[record(2,"Coletando","Madeira")]),
  inhabitant("player","Meu personagem",null,[],{ownerId:"local-player"}),
  inhabitant("npc-1","Ayla","Colhendo",[record(1,"Plantando","Zona com vaga")],{communityRole:"leader"}),
  inhabitant("npc-2","Bento",null,[record(10,"Aguardando","Sem trabalho")],{health:0})
 ]};
 const before=JSON.stringify(world);
 const rows=npcActivityRows(world);
 assert.deepEqual(rows.map(r=>r.name),["Ayla","Bento","Zeca"]);
 assert.equal(rows[0].leader,true);
 assert.equal(rows[0].activity,"Colhendo");
 assert.equal(rows[1].dead,true);
 assert.equal(rows[1].activity,"Falecido");
 assert.equal(rows[2].lastTick,25);
 assert.equal(rows[0].history[0].reason,"Zona com vaga");
 assert.equal(JSON.stringify(world),before,"presentation never mutates simulation state");
 assert.deepEqual(npcActivityRows({entities:[]}),[]);
});
test("history projection uses newest first, limited to the 8 real decisions kept by the motor",()=>{
 const history=Array.from({length:13},(_,i)=>record(i,"Atividade "+i,"Razão "+i));
 const rows=npcActivityRows({entities:[inhabitant("worker","Worker",null,history)]});
 assert.deepEqual(rows[0].history.map(item=>item.tick),[12,11,10,9,8,7,6,5]);
 assert.equal(rows[0].history[0].reason,"Razão 12");
 assert.equal(rows[0].activity,"Atividade 12");
});
class MockElement {
 constructor(tag){this.tag=tag;this.children=[];this.parent=null;this.dataset={};
  this.attributes={};this.listeners={};this.scrollTop=0;this._text="";
  this.classes=new Set();this.classList={toggle:(c,on)=>{
   if(on??!this.classes.has(c))this.classes.add(c);else this.classes.delete(c);
  }};this.className="";this.open=false;}
 set textContent(v){this._text=String(v);this.replaceChildren();}
 get textContent(){return this._text;}
 setAttribute(k,v){this.attributes[k]=String(v);}
 addEventListener(k,listener){this.listeners[k]=listener;}
 append(...nodes){for(const node of nodes){if(node.parent)node.remove();node.parent=this;this.children.push(node);}}
 replaceChildren(...nodes){for(const n of this.children)n.parent=null;this.children=[];this.append(...nodes);}
 insertBefore(node,before){
  if(node.parent)node.remove();
  const index=before?this.children.indexOf(before):-1;
  node.parent=this;this.children.splice(index<0?this.children.length:index,0,node);
 }
 remove(){if(!this.parent)return;this.parent.children.splice(this.parent.children.indexOf(this),1);this.parent=null;}
 querySelector(selector){
  if(selector==="[data-empty-npcs]")return this.children.find(x=>x.dataset.emptyNpcs)||null;
  return this.ids?.[selector]??null;
 }
}
test("live sidebar expands inline and retains both scrollbars and DOM nodes on each world refresh",()=>{
 const original=globalThis.document;globalThis.document={createElement:tag=>new MockElement(tag)};
 try{
  const root=new MockElement("section"),list=new MockElement("div"),
   count=new MockElement("small"),toggle=new MockElement("button");
  root.ids={"#npcActivityList":list,"#npcActivityCount":count,"#npcActivityToggle":toggle};
  const monitor=createNpcActivityMonitor(root);
  const data={timelineId:"timeline-a",world:{entities:[
   inhabitant("npc-a","Ayla","Plantando",[record(1,"Plantando","Primeira ação")]),
   inhabitant("npc-b","Caio","Buscando recursos",[])
  ]}};
  monitor.update(data);
  assert.equal(list.children.length,2);
  assert.equal(count.textContent,"2 habitantes");
  const expanded=list.children[0];expanded.open=true;list.scrollTop=18;
  const history=expanded.children[1];history.scrollTop=28;
  data.world.entities[0].ai.history.push(record(3,"Regando","Segunda decisão"));
  data.world.entities[0].ai.activity="Regando";
  monitor.update(data);
  assert.equal(list.children[0],expanded,"the expanded entry is not recreated");
  assert.equal(expanded.open,true);
  assert.equal(history.scrollTop,28);
  assert.equal(list.scrollTop,18);
  assert.equal(expanded.children[0].children[1].children[1].textContent,"Regando · t25");
  assert.equal(history.children.length,2,"expanded history shows latest decisions");
  toggle.listeners.click();
  assert.equal(toggle.attributes["aria-expanded"],"false");
  assert.ok(root.classes.has("npc-monitor-collapsed"));
  toggle.listeners.click();
  assert.equal(toggle.attributes["aria-expanded"],"true");
  monitor.update({...data,timelineId:"timeline-b"});
  assert.notEqual(list.children[0],expanded,"a new timeline resets stale accordion state");
  monitor.update({timelineId:"timeline-b",world:{entities:[]}});
  assert.equal(list.children.length,1);
  assert.equal(list.children[0].dataset.emptyNpcs,"true");
  monitor.update(data);
  assert.equal(list.children.length,2,"empty placeholder disappears when inhabitants return");
 }finally{globalThis.document=original;}
});
test("activity sidebar is admin-only; responsive layout keeps native scrolling and isolated module",async()=>{
 const admin=await readFile(new URL("../apps/admin-web/index.html",import.meta.url),"utf8");
 const player=await readFile(new URL("../apps/player-web/index.html",import.meta.url),"utf8");
 const app=await readFile(new URL("../apps/shared-ui/app.js",import.meta.url),"utf8");
 const style=await readFile(new URL("../apps/shared-ui/style.css",import.meta.url),"utf8");
 for(const id of ["npcActivityMonitor","npcActivityList","npcActivityCount","npcActivityToggle"])
  assert.match(admin,new RegExp('id="'+id+'"'));
 assert.doesNotMatch(player,/npcActivityMonitor/);
 assert.match(app,/role==='admin'\?createNpcActivityMonitor/);
 assert.match(app,/npcActivityMonitor\?\.update\(data\)/);
 assert.match(style,/\.npc-monitor-history\{max-height:155px;overflow-y:auto/);
 assert.match(style,/\.npc-monitor-list\{min-height:0;overflow-y:auto/);
 assert.match(style,/@media\(max-width:740px\)/);
});
test("AI history available to the monitor is populated by real engine decisions",()=>{
 const world=createWorld("monitor",14,12);
 const created=applyCommand(world,{commandId:"monitor-worker",worldId:world.id,
  actorRole:"admin",action:"npc.spawn",position:{x:2,y:3},parameters:{name:"Ayla"}});
 assert.equal(created.ok,true);
 for(let i=0;i<9;i++)advanceTick(world);
 const rows=npcActivityRows(world);
 assert.equal(rows.length,1);
 assert.ok(rows[0].history.length>0);
 assert.equal(rows[0].history.at(0).tick,9);
 assert.equal(rows[0].activity,"Aguardando");
});
