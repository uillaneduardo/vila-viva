import type {Character,Profession,World} from "../../../domain/src/contracts.ts";
import {PROFESSIONS} from "../../../content/src/professions.ts";
import {affinityFor} from "../../../content/src/characters.ts";
export function assignProfessions(world:World,leader:Character):void {
 if(leader.communityRole!=="leader"||leader.health<=0||leader.ownerId)return;
 const citizens=world.entities.filter((e):e is Character=>e.kind==="character"&&!e.ownerId&&e.health>0&&e.communityRole!=="leader").sort((a,b)=>a.id.localeCompare(b.id));
 const counts=new Map<Profession,number>();
 for(const citizen of citizens)if(citizen.profession)counts.set(citizen.profession,(counts.get(citizen.profession)??0)+1);
 const candidates:Profession[]=["farm","collector","builder","woodcutter","miner","carrier","artisan"];
 if(world.entities.some(e=>e.kind==="construction"&&e.blueprintId==="building.cafeteria"&&e.status==="completed"))candidates.push("cook");
 if(world.entities.some(e=>e.kind==="construction"&&e.blueprintId==="building.cemetery"&&e.status==="completed"))candidates.push("gravedigger");
 for(const citizen of citizens){
  if(citizen.profession)continue;
  const options=candidates.map((p,index)=>({p,index,score:affinityFor(citizen,PROFESSIONS[p].domain!)/(1+(counts.get(p)??0))})).sort((a,b)=>b.score-a.score||a.index-b.index);
  citizen.profession=options[0].p;citizen.professionAssignedBy=leader.id;citizen.professionAssignedTick=world.tick;
  counts.set(citizen.profession,(counts.get(citizen.profession)??0)+1);
 }
}
