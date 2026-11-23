import {DefinitionRegistry} from "../../domain/src/registry.ts";
export function createBaseRegistry():DefinitionRegistry {
 const catalog=new DefinitionRegistry();
 for(const definition of [
  {id:"character.human",displayName:{"pt-BR":"Personagem humano"},kind:"character",components:["identity","position","ownership","health","energy","needs","inventory","movement","renderable"],description:"Pessoa física, jogador ou NPC"},
  {id:"resource.wood",displayName:{"pt-BR":"Fonte de madeira"},kind:"resource",components:["position","resourceSource","regeneration","renderable"],description:"Fonte regenerável de madeira"},
  {id:"resource.food",displayName:{"pt-BR":"Fonte de alimento"},kind:"resource",components:["position","resourceSource","regeneration","renderable"],description:"Fonte regenerável de alimentos"},
  {id:"resource.stone",displayName:{"pt-BR":"Fonte de pedra"},kind:"resource",components:["position","resourceSource","regeneration","renderable"],description:"Fonte regenerável de pedra"},
  {id:"storage.depot",displayName:{"pt-BR":"Depósito"},kind:"storage",components:["position","storage","inventory","renderable"],description:"Depósito com capacidade e regras de entrega"},
  {id:"construction.site",displayName:{"pt-BR":"Canteiro de obras"},kind:"construction",components:["position","construction","inventory","renderable"],description:"Canteiro por etapas"},
  {id:"item.stack",displayName:{"pt-BR":"Pilha de itens"},kind:"item",components:["position","inventory","renderable"],description:"Pilha de itens físicos no mundo"}
 ] as const)catalog.registerEntity(definition);
 for(const action of [
  {id:"entity.inspect",displayName:{"pt-BR":"Inspecionar"},roles:["player","npc","admin"],targets:["character","resource","item","storage","construction","terrain"],requires:[],readonly:true,description:"Inspeção autorizada sem alterar o mundo"},
  {id:"movement.move",displayName:{"pt-BR":"Mover"},roles:["player","npc"],targets:["position"],requires:["position","movement","energy"],readonly:false,description:"Mover ator físico"},
  {id:"npc.spawn",displayName:{"pt-BR":"Adicionar NPC"},roles:["admin"],targets:["position"],requires:[],readonly:false,description:"Criar personagem usando definição registrada"},
  {id:"resource.spawn",displayName:{"pt-BR":"Adicionar fonte"},roles:["admin"],targets:["position"],requires:[],readonly:false,description:"Criar fonte usando definição registrada"}
 ] as const)catalog.registerAction(action);
 return catalog;
}
export const baseRegistry=createBaseRegistry();
export const RESOURCE_PRESETS=Object.freeze({
 wood:{definitionId:"resource.wood",label:"Madeira",resourceType:"wood"},
 food:{definitionId:"resource.food",label:"Alimento",resourceType:"food"},
 stone:{definitionId:"resource.stone",label:"Pedra",resourceType:"stone"}
});
export function resourcePreset(type:string):typeof RESOURCE_PRESETS[keyof typeof RESOURCE_PRESETS]|undefined {
 return Object.values(RESOURCE_PRESETS).find(p=>p.resourceType===type);
}
