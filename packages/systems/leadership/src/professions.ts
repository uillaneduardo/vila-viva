import type {Character,ProfessionId,World} from "../../../domain/src/contracts.ts";
import {PROFESSIONS} from "../../../content/src/professions.ts";
import {affinityFor} from "../../../content/src/characters.ts";
/** Assign unassigned citizens during the leader planning cycle. Never reassign due to a task. */
export function assignProfessions(world:World,leader:Character):void{
 if(leader.communityRole!=="leader"||leader.health<=0||leader.ownerId)return;
 const citizens=world.entities.filter((e):e is Character=>e.kind==="character"&&e.health>0&&!e.ownerId&&e.communityRole!=="leader");
 const counts=new Map<ProfessionId,number>();
 for(const npc of citizens)if(npc.profession)counts.set(npc.profession,(counts.get(npc.profession)??0)+1);
 const buildings=world.entities.filter(e=>e.kind==="construction"&&e.status==="completed");
 const candidates:ProfessionId[]=["farmer","collector","builder","hauler","lumberjack","miner"];
 if(buildings.some(e=>e.blueprintId==="building.workshop"))candidates.push("artisan");
 if(buildings.some(e=>e.blueprintId==="building.cafeteria"))candidates.push("cook");
 if(buildings.some(e=>e.blueprintId==="building.cemetery"))candidates.push("gravedigger");
 const demand=(id:ProfessionId)=>id==="farmer"||id==="collector"?1.15:id==="builder"&&world.entities.some(e=>e.kind==="construction"&&e.status==="site")?1.3:1;
 for(const npc of citizens.filter(n=>!n.profession).sort((a,b)=>a.id.localeCompare(b.id))){
  const ranked=candidates.map((id,index)=>({id,index,score:affinityFor(npc,PROFESSIONS[id].domain)*demand(id)/(1+(counts.get(id)??0))})).sort((a,b)=>b.score-a.score||a.index-b.index);
  npc.profession=ranked[0].id;npc.professionAssignedBy=leader.id;npc.professionAssignedTick=world.tick;
  counts.set(npc.profession,(counts.get(npc.profession)??0)+1);
 }
}
