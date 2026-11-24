/** Catalog-driven deterministic character creation. Generated values are replayable per world/command. */
import type {Character} from "../../../domain/src/contracts.ts";
import type {AttributeId} from "../../../domain/src/effects.ts";
export const GIVEN_NAMES=Object.freeze([
 "Ayla","Lia","Nina","Cecília","Clara","Iara","Jade","Elisa","Maya","Bia",
 "Caio","Davi","Theo","Noah","Levi","Bento","Ravi","Ícaro","Gael","Otávio",
 "Luna","Lara","Mila","Luiza","Eva","Helena","Nara","Ciro","Ian","Raul"
]);
export const FAMILY_NAMES=Object.freeze(["Silva","Oliveira","Costa","Almeida","Lima",
 "Santos","Rocha","Ferreira","Moura","Ribeiro","Nascimento","Barros","Pereira","Nunes"]);
export const TRAITS:Readonly<Record<string,Readonly<{label:string;description:string;attributes:Partial<Record<AttributeId,number>>}>>>=Object.freeze({
 resilient:{label:"Resiliente",description:"Maior resistência física",attributes:{endurance:3}},
 nimble:{label:"Ágil",description:"Movimentos mais rápidos",attributes:{agility:3}},
 strong:{label:"Forte",description:"Maior força de carga",attributes:{strength:3}},
 sociable:{label:"Sociável",description:"Busca interações sociais",attributes:{sociability:3}},
 introverted:{label:"Reservado",description:"Menor disposição social",attributes:{sociability:-2}},
 fragile:{label:"Frágil",description:"Resistência reduzida",attributes:{endurance:-2}},
 clumsy:{label:"Desajeitado",description:"Agilidade reduzida",attributes:{agility:-2}},
 patient:{label:"Paciente",description:"Resistência a tarefas repetitivas",attributes:{endurance:2,sociability:1}}
});
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
