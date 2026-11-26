import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {workProfile,workRows,WORK_DOMAINS} from "../packages/ui/src/work-profile.js";
import {TRAITS,affinityFor} from "../packages/content/src/characters.ts";
test("work profile uses real trait factors, not assigned jobs",()=>{
 const npc={id:"a",kind:"character",name:"Ayla",health:100,traits:["farmer","patient"]};
 const p=workProfile(npc,{traits:TRAITS});
 assert.equal(p.preference,"Agricultura");
 for(const a of p.affinities)assert.equal(a.factor,affinityFor(npc,a.id));
 assert.equal(p.affinities.length,WORK_DOMAINS.length);
 assert.equal(workProfile(npc,null).best,null);
 assert.equal(workProfile({...npc,traits:[]},{traits:TRAITS}).preference,"Sem preferência dominante");
 assert.equal(workRows({entities:[npc,{...npc,id:"dead",health:0},{...npc,id:"player",ownerId:"p"}]},{traits:TRAITS}).length,1);
});
test("community tabs admin only and inspector work/history/inventory present",async()=>{
 const admin=await readFile(new URL("../apps/admin-web/index.html",import.meta.url),"utf8");
 const player=await readFile(new URL("../apps/player-web/index.html",import.meta.url),"utf8");
 const inspector=await readFile(new URL("../packages/ui/src/inspector.js",import.meta.url),"utf8");
 assert.match(admin,/id="communityTabs"/);assert.doesNotMatch(player,/communityTabs/);
 for(const id of ["work","history","box"])assert.ok(inspector.includes("active==='"+id+"'"));
});
