import type {Character,Profession,World} from "../../../domain/src/contracts.ts";
import {affinityFor,type WorkDomain} from "../../../content/src/characters.ts";
const domains:readonly [Profession,WorkDomain][]=[["farm","farming"],["builder","building"],["woodcutter","woodcutting"],["miner","mining"],["carrier","hauling"],["artisan","crafting"]];
/** Assign only unassigned living citizens. Survival and task selection remain independent. */
export function assignProfessions(world:World,leader:Character):void {
 if(leader.communityRole!=="leader"||leader.health<=0||leader.ownerId)return;
 const citizens=world.entities.filter((e):e is Character=>e.kind==="character"&&!e.ownerId&&e.health>0&&e.communityRole!=="leader").sort((a,b)=>a.id.localeCompare(b.id));
 const counts=new Map<Profession,number>();
 for(const citizen of citizens)if(citizen.profession)counts.set(citizen.profession,(counts.get(citizen.profession)??0)+1);
 for(const citizen of citizens){
  if(citizen.profession)continue;
  const options:[Profession,number][]=domains.map(([p,d])=>[p,affinityFor(citizen,d)/(1+(counts.get(p)??0))]);
  if(world.entities.some(e=>e.kind==="construction"&&e.blueprintId==="building.cafeteria"&&e.status==="completed"))options.push(["cook",1/(1+(counts.get("cook")??0))]);
  options.sort((a,b)=>b[1]-a[1]);
  citizen.profession=options[0][0];
  counts.set(citizen.profession,(counts.get(citizen.profession)??0)+1);
 }
}
