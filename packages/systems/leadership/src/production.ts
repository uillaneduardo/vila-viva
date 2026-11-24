/** Physical supply chain planning. Orders do not manufacture items or grant inventory. */
import type {World,Character,Construction} from "../../../domain/src/contracts.ts";
import {RECIPES} from "../../../content/src/recipes.ts";
import {productionDefinition,activeOrder} from "../../production/src/index.ts";
import {affinityFor} from "../../../content/src/characters.ts";
import {isMineral} from "../../../content/src/extraction.ts";
import {ITEMS} from "../../../content/src/items.ts";
export type ProductionIntent={recipeId:string;reason:string;missing:Record<string,number>};
const available=(world:World,item:string):number=>world.entities.reduce((sum,e)=>{
 if(e.kind==="construction"&&e.status==="completed")return sum+(e.stock?.[item]??0);
 if(e.kind==="item"&&e.itemId===item)return sum+e.quantity;
 if(e.kind==="character"&&e.health>0)return sum+(e.inventory?.[item]??0)+
  (e.equipment?.tool===item?1:0);
 return sum;
},0);
const sourceAvailable=(world:World,id:string):boolean=>world.entities.some(e=>(e.kind==="resource"&&e.resourceType===id&&e.quantity>0)||(e.kind==="construction"&&e.status==="completed"&&(e.mineRemaining?.[id]??0)>0));
export function productionNeeds(world:World):Array<{item:string;desired:number;available:number;missing:number}>{
 const workers=world.entities.filter((e):e is Character=>e.kind==="character"&&e.health>0&&!e.ownerId);
 const npcCount=workers.length;
 const baseline=Math.max(1,Math.min(3,Math.ceil(npcCount/4)));
 const miners=workers.filter(n=>{const target=world.entities.find(e=>e.id===n.ai?.targetId);return n.equipment?.tool==="pickaxe"||affinityFor(n,"mining")>=1.25||((target?.kind==="resource"&&isMineral(target.resourceType))||(target?.kind==="construction"&&target.blueprintId==="building.mine"))&&/Extraindo|Operando mina|Coletando/i.test(n.ai?.activity??"");}).length;
 return ["pickaxe","axe","hammer"].map(item=>{
  const desired=item==="pickaxe"?Math.max(baseline,miners):baseline;
  const current=available(world,item);
  const queued=world.entities.filter((e):e is Construction=>e.kind==="construction")
   .reduce((sum,e)=>sum+(e.productionOrders??[]).reduce((n,o)=>{
    const recipe=RECIPES[o.recipeId];
    return n+(recipe?.outputs[item]??0)*o.quantity;
   },0),0);
  return {item,desired,available:current+queued,missing:Math.max(0,desired-current-queued)};
 });
}
export function planProduction(world:World):ProductionIntent|null{
 const workshops=world.entities.filter((e):e is Construction=>e.kind==="construction"&&e.blueprintId==="building.workshop"&&!!productionDefinition(e));
 if(!workshops.length||workshops.every(e=>!!activeOrder(e)))return null;
 const needed=productionNeeds(world).find(n=>n.missing>0);
 if(!needed)return null;
 const targetRecipe=RECIPES["craft_"+needed.item];
 for(const [ingredient,quantity] of Object.entries(targetRecipe.inputs)){
  if(!ingredient.endsWith("_ingot")||available(world,ingredient)>=quantity)continue;
  const ore=ingredient.replace("_ingot","_ore");
  const recipeId=ingredient==="iron_ingot"?"smelt_iron":"smelt_copper";
  const total=available(world,ore);
  if(total>=RECIPES[recipeId].inputs[ore]||sourceAvailable(world,ore))
   return {recipeId,reason:"Faltam "+quantity+" "+ITEMS[ingredient].label+
    " para "+ITEMS[needed.item].label+"; fundir minério disponível",
    missing:{[ingredient]:Math.max(0,quantity-available(world,ingredient))}};
  return null;
 }
 return {recipeId:targetRecipe.id,reason:"Déficit de "+needed.missing+" "+ITEMS[needed.item].label+" (meta "+needed.desired+"); precisamos de "+ITEMS[needed.item].label+
  " para distribuir ferramentas físicas aos habitantes",
  missing:{[needed.item]:needed.missing}};
}
