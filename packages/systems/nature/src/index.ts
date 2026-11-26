import {soilAt} from "../../../content/src/soil.js";
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
  const rate=soilAt(world,entity.position.x,entity.position.y).rate;
  const previousAge=life.ageTicks;
  // Fertility accelerates maturation, not senescence. Integer carry preserves fractional ticks.
  if(previousAge<def.stages.mature){
   const growth=(life.growthRemainder??0)+rate;
   life.ageTicks=Math.min(def.stages.mature,previousAge+Math.floor(growth/100));
   const remainder=life.ageTicks>=def.stages.mature?0:growth%100;
   if(remainder)life.growthRemainder=remainder;else delete life.growthRemainder;
  }else life.ageTicks++;
  life.stage=stageForAge(def,life.ageTicks);
  life.health=healthForAge(def,life.ageTicks);
  if(life.stage==="dead"){
   life.productionProgress=0;delete life.productionRemainder;entity.quantity=0;
   // Annual crops wither and leave the cultivated cell free for reseeding.
   if(def.growthMode==="single_harvest")expired.push(entity.id);
   continue;
  }
  if(life.stage!=="mature"&&life.stage!=="old")continue;
  if(def.growthMode==="single_harvest"){
   // One finite harvest; not a regenerating source.
   if(previousAge<def.stages.mature&&life.ageTicks>=def.stages.mature)entity.quantity=def.production.capacity;
   continue;
  }
  const production=(life.productionRemainder??0)+rate;
  life.productionProgress+=Math.floor(production/100);
  if(production%100)life.productionRemainder=production%100;else delete life.productionRemainder;
  if(life.productionProgress>=def.production.intervalTicks) {
   life.productionProgress-=def.production.intervalTicks;
   const yieldCount=life.stage==="old"?Math.max(1,Math.floor(def.production.amount/2)):def.production.amount;
   entity.quantity=Math.min(entity.maximum,entity.quantity+yieldCount);
  }
 }
 if(expired.length)world.entities=world.entities.filter(e=>!expired.includes(e.id));
}
