/** Catalog-driven deterministic character creation. Generated values are replayable per world/command. */
import {isItem} from "./items.ts";
import type {Character} from "../../../domain/src/contracts.ts";
import type {AttributeId} from "../../../domain/src/effects.ts";
export const GIVEN_NAMES=Object.freeze([
 "Ayla","Lia","Nina","Cecília","Clara","Iara","Jade","Elisa","Maya","Bia",
 "Caio","Davi","Theo","Noah","Levi","Bento","Ravi","Ícaro","Gael","Otávio",
 "Luna","Lara","Mila","Luiza","Eva","Helena","Nara","Ciro","Ian","Raul"
]);
export const FAMILY_NAMES=Object.freeze(["Silva","Oliveira","Costa","Almeida","Lima",
 "Santos","Rocha","Ferreira","Moura","Ribeiro","Nascimento","Barros","Pereira","Nunes"]);
export type WorkDomain="farming"|"woodcutting"|"mining"|"building"|"crafting"|"hauling";
export interface TraitDefinition {
 label:string;description:string;attributes:Partial<Record<AttributeId,number>>;
 affinities?:Partial<Record<WorkDomain,number>>;
 healing?:number;risk?:number;
 startingItems?:readonly {itemId:string;chance:number;min:number;max:number}[];
}
/** Work affinity changes *preferences*, not permissions or a supply of resources. */
export const TRAITS:Readonly<Record<string,Readonly<TraitDefinition>>>=Object.freeze({
 resilient:{label:"Resiliente",description:"Resiste melhor aos ferimentos",attributes:{endurance:3},healing:1.2,risk:.85,startingItems:[{"itemId":"carrot","chance":0.4,"min":1,"max":2}]},
 nimble:{label:"Ágil",description:"Move-se rapidamente",attributes:{agility:3},affinities:{hauling:1.18}},
 strong:{label:"Forte",description:"Boa aptidão física",attributes:{strength:3},affinities:{building:1.1,woodcutting:1.1}},
 sociable:{label:"Sociável",description:"Gosta de atividades em grupo",attributes:{sociability:3},affinities:{building:1.05}},
 introverted:{label:"Reservado",description:"Prefere trabalhos individuais",attributes:{sociability:-2},affinities:{crafting:1.08}},
 fragile:{label:"Frágil",description:"Sofre mais lesões e recupera-se lentamente",attributes:{endurance:-2},healing:.7,risk:1.3},
 clumsy:{label:"Desajeitado",description:"Dificuldade em tarefas manuais",attributes:{agility:-2},affinities:{crafting:.8}},
 patient:{label:"Paciente",description:"Gosta de trabalho prolongado",attributes:{endurance:2,sociability:1},affinities:{farming:1.08,crafting:1.08}},
 farmer:{label:"Agricultor",description:"Maior afinidade pelo plantio e colheita",attributes:{endurance:2,agility:1},affinities:{farming:1.8},startingItems:[{"itemId":"apple_seed","chance":0.6,"min":1,"max":4},{"itemId":"carrot_seed","chance":0.75,"min":2,"max":6},{"itemId":"potato_seed","chance":0.6,"min":1,"max":4}]},
 lumberjack:{label:"Lenhador",description:"Prefere extrair madeira",attributes:{strength:3},affinities:{woodcutting:1.8},startingItems:[{"itemId":"axe","chance":0.45,"min":1,"max":1},{"itemId":"wood","chance":0.65,"min":2,"max":5}]},
 miner:{label:"Minerador",description:"Prefere pedras e minérios",attributes:{strength:2,endurance:1},affinities:{mining:1.8},startingItems:[{"itemId":"pickaxe","chance":0.45,"min":1,"max":1},{"itemId":"stone","chance":0.65,"min":2,"max":4}]},
 builder:{label:"Construtor",description:"Prefere construir edifícios",attributes:{strength:2,endurance:2},affinities:{building:1.8},startingItems:[{"itemId":"hammer","chance":0.45,"min":1,"max":1},{"itemId":"wood","chance":0.5,"min":2,"max":4},{"itemId":"stone","chance":0.5,"min":1,"max":3}]},
 artisan:{label:"Artesão",description:"Prefere fabricar ferramentas",attributes:{agility:2,endurance:1},affinities:{crafting:1.8},startingItems:[{"itemId":"iron_ingot","chance":0.5,"min":1,"max":2},{"itemId":"copper_ingot","chance":0.5,"min":1,"max":2}]},
 healthy:{label:"Saudável",description:"Maior recuperação e resistência a lesões",attributes:{endurance:2},healing:1.4,risk:.85,startingItems:[{"itemId":"apple","chance":0.6,"min":1,"max":3}]},
 fast_healer:{label:"Cicatrização rápida",description:"Recupera saúde mais depressa",attributes:{endurance:1},healing:1.7},
 slow_healer:{label:"Recuperação lenta",description:"Ferimentos demoram a sarar",attributes:{},healing:.5},
 sickly:{label:"Constituição delicada",description:"Maior vulnerabilidade e recuperação pior",attributes:{endurance:-3},healing:.6,risk:1.35}
});
export function affinityFor(npc:Pick<Character,"traits">,domain:WorkDomain):number {
 return (npc.traits??[]).reduce((score,id)=>score*(TRAITS[id]?.affinities?.[domain]??1),1);
}
export function healingFactor(npc:Pick<Character,"traits">):number{
 return (npc.traits??[]).reduce((rate,id)=>rate*(TRAITS[id]?.healing??1),1);
}
export function injuryFactor(npc:Pick<Character,"traits">):number{
 return (npc.traits??[]).reduce((rate,id)=>rate*(TRAITS[id]?.risk??1),1);
}
function hashSeed(value:string):number {
 let state=2166136261;
 for(let i=0;i<value.length;i++){state^=value.charCodeAt(i);state=Math.imul(state,16777619);}
 return state>>>0;
}
function randomGenerator(seed:string):()=>number {
 let state=hashSeed(seed)||1;
 return ()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};
}
export function generateCharacterProfile(worldId:string,commandId:string,tick:number):{
 name:string; traits:string[]; attributes:NonNullable<Character["attributes"]>
} {
 const random=randomGenerator(worldId+"|"+commandId+"|"+tick);
 const name=GIVEN_NAMES[Math.floor(random()*GIVEN_NAMES.length)]+" "+
  FAMILY_NAMES[Math.floor(random()*FAMILY_NAMES.length)];
 const attributes:NonNullable<Character["attributes"]>={};
 for(const attribute of ["strength","endurance","agility","sociability"] as const)
  attributes[attribute]=6+Math.floor(random()*10);
 const traitIds=Object.keys(TRAITS);
 const first=traitIds.splice(Math.floor(random()*traitIds.length),1)[0];
 const second=traitIds.splice(Math.floor(random()*traitIds.length),1)[0];
 for(const trait of [first,second])for(const [attribute,change] of Object.entries(TRAITS[trait].attributes))
  attributes[attribute as AttributeId]=Math.max(4,Math.min(20,(attributes[attribute as AttributeId]??10)+change));
 return {name,traits:[first,second],attributes};
}

/** Spawn-only gifts; preserve free capacity for survival and normal work. */
export function generateStartingInventory(worldId:string,commandId:string,tick:number,traits:readonly string[],capacity:number):Record<string,number>{
 const random=randomGenerator(worldId+"|"+commandId+"|"+tick+"|starting-items");
 const inventory:Record<string,number>={};
 let remaining=Math.max(0,Math.floor(capacity)-6);
 for(const trait of [...new Set(traits)])for(const entry of TRAITS[trait]?.startingItems??[]){
  if(!isItem(entry.itemId)||random()>=entry.chance)continue;
  const amount=Math.min(remaining,entry.min+Math.floor(random()*(entry.max-entry.min+1)));
  if(amount>0){inventory[entry.itemId]=(inventory[entry.itemId]??0)+amount;remaining-=amount;}
 }
 return inventory;
}
