/** Pure production rules. A valid order consumes inputs only when its work completes. */
import type {Construction,Inventory} from "../../../domain/src/contracts.ts";
import {buildingBlueprint} from "../../../content/src/buildings/registry.ts";
import {RECIPES,recipeById} from "../../../content/src/recipes.ts";
import {storageDefinition,storedTotal} from "../../construction/src/index.ts";
export const productionDefinition=(workshop:Construction)=>{
 const blueprint=buildingBlueprint(workshop.blueprintId);
 return workshop.status==="completed"&&workshop.availability==="available"&&
  blueprint?.version===workshop.blueprintVersion?blueprint.production:undefined;
};
export const activeOrder=(workshop:Construction)=>workshop.productionOrders?.[0];
export const queuedQuantity=(workshop:Construction,recipeId:string)=>
 (workshop.productionOrders??[]).reduce((sum,order)=>sum+(order.recipeId===recipeId?order.quantity:0),0);
export const stockMissing=(workshop:Construction,recipeId:string):Inventory=>{
 const recipe=recipeById(recipeId),stock=workshop.stock??{};
 return recipe?Object.fromEntries(Object.entries(recipe.inputs).map(([id,n])=>
  [id,Math.max(0,n-(stock[id]??0))])):{};
};
export function orderProduction(workshop:Construction,recipeId:string,quantity:number):boolean {
 const def=productionDefinition(workshop),recipe=recipeById(recipeId);
 if(!def||!recipe||!def.recipes.includes(recipeId)||
  !Number.isSafeInteger(quantity)||quantity<1||quantity>6||
  (workshop.productionOrders?.length??0)>=8)return false;
 workshop.productionOrders??=[];
 const existing=workshop.productionOrders.find(o=>o.recipeId===recipeId);
 if(existing){if(existing.quantity+quantity>6)return false;existing.quantity+=quantity;}
 else workshop.productionOrders.push({recipeId,quantity,workDone:0});
 return true;
}
export function canWorkProduction(workshop:Construction):boolean {
 const order=activeOrder(workshop),recipe=order?recipeById(order.recipeId):undefined;
 if(!recipe||!productionDefinition(workshop)||!storageDefinition(workshop))return false;
 if(Object.values(stockMissing(workshop,recipe.id)).some(n=>n>0))return false;
 const output=Object.values(recipe.outputs).reduce((n,q)=>n+q,0);
 const input=Object.values(recipe.inputs).reduce((n,q)=>n+q,0);
 return storedTotal(workshop)-input+output<=storageDefinition(workshop)!.capacity;
}
export function applyProductionWork(workshop:Construction,units=1):{completed:boolean;recipeId:string}|null {
 if(!canWorkProduction(workshop)||!Number.isSafeInteger(units)||units!==1)return null;
 const order=activeOrder(workshop)!;
 const recipe=RECIPES[order.recipeId];
 order.workDone++;
 if(order.workDone<recipe.workUnits)return {completed:false,recipeId:recipe.id};
 // Zero-sum material conversion: no output without consuming all declared inputs.
 for(const [id,quantity] of Object.entries(recipe.inputs))
  workshop.stock![id]-=quantity;
 for(const [id,quantity] of Object.entries(recipe.outputs))
  workshop.stock![id]=(workshop.stock![id]??0)+quantity;
 order.quantity--;order.workDone=0;
 if(order.quantity===0)workshop.productionOrders!.shift();
 return {completed:true,recipeId:recipe.id};
}
