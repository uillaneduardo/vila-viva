import {naturalSource,stageForAge,healthForAge} from "../../../content/src/natural-sources.ts";
import type {World,Resource,NaturalLife} from "../../../domain/src/contracts.ts";

/** Initializes only sources with a registered living-species definition. */
export function makeNaturalSource(id:string,position:Resource["position"],sourceId:string,ageTicks=0,quantity=0):Resource {
 const def=naturalSource(sourceId);
 if(!def)throw new Error("Unknown natural source: "+sourceId);
 const stage=stageForAge(def,ageTicks);
 const life:NaturalLife={ageTicks,stage,health:healthForAge(def,ageTicks),productionProgress:0};
 const productive=stage==="mature"||stage==="old";
 return {kind:"resource",id,position:{...position},sourceId,productId:def.productId,resourceType:def.resourceType,
  quantity:productive?Math.min(def.production.capacity,quantity):0,maximum:def.production.capacity,life};
}
/** Runs from the world's logical tick, not request polling or paint frames. */
export function advanceNaturalSources(world:World):void {
 const expired:string[]=[];
 for(const entity of world.entities) {
  if(entity.kind!=="resource"||!entity.sourceId||!entity.life)continue;
  const def=naturalSource(entity.sourceId);
  if(!def)continue;
  const life=entity.life;
  life.ageTicks++;
  life.stage=stageForAge(def,life.ageTicks);
  life.health=healthForAge(def,life.ageTicks);
  if(life.stage==="dead"){
   life.productionProgress=0;entity.quantity=0;
   // Annual crops wither and leave the cultivated cell free for reseeding.
   if(def.growthMode==="single_harvest")expired.push(entity.id);
   continue;
  }
  if(life.stage!=="mature"&&life.stage!=="old")continue;
  if(def.growthMode==="single_harvest"){
   // One finite harvest; not a regenerating source.
   if(life.ageTicks===def.stages.mature)entity.quantity=def.production.capacity;
   continue;
  }
  life.productionProgress++;
  if(life.productionProgress>=def.production.intervalTicks) {
   life.productionProgress=0;
   const yieldCount=life.stage==="old"?Math.max(1,Math.floor(def.production.amount/2)):def.production.amount;
   entity.quantity=Math.min(entity.maximum,entity.quantity+yieldCount);
  }
 }
 if(expired.length)world.entities=world.entities.filter(e=>!expired.includes(e.id));
}
