import {DefinitionRegistry} from "../../domain/src/registry.ts";
export function createBaseRegistry():DefinitionRegistry {
 const catalog=new DefinitionRegistry();
 for(const definition of [
  {id:"character.human",displayName:{"pt-BR":"Personagem humano"},kind:"character",components:["identity","position","ownership","health","energy","needs","inventory","movement","renderable"],description:"Pessoa física, jogador ou NPC"},
  {id:"resource.wood",displayName:{"pt-BR":"Fonte de madeira"},kind:"resource",components:["position","resourceSource","regeneration","renderable"],description:"Fonte regenerável de madeira"},
  {id:"resource.food",displayName:{"pt-BR":"Macieira"},kind:"resource",components:["position","resourceSource","regeneration","lifecycle","production","collision","renderable"],description:"Macieira renovável com vida, frutos coletáveis e colisão"},
  {id:"resource.stone",displayName:{"pt-BR":"Fonte de pedra"},kind:"resource",components:["position","resourceSource","regeneration","renderable"],description:"Fonte regenerável de pedra"},
  {id:"obstacle.scenery",displayName:{"pt-BR":"Obstáculo de cenário"},kind:"obstacle",components:["position","collision","renderable"],description:"Elemento sólido e não coletável do cenário"},
  {id:"storage.depot",displayName:{"pt-BR":"Depósito"},kind:"storage",components:["position","storage","inventory","renderable"],description:"Depósito com capacidade e regras de entrega"},
  {id:"construction.site",displayName:{"pt-BR":"Canteiro de obras"},kind:"construction",components:["position","construction","inventory","renderable"],description:"Canteiro por etapas"},
  {id:"item.stack",displayName:{"pt-BR":"Pilha de itens"},kind:"item",components:["position","inventory","renderable"],description:"Pilha de itens físicos no mundo"}
 ] as const)catalog.registerEntity(definition);
 for(const action of [
  {id:"entity.inspect",displayName:{"pt-BR":"Inspecionar"},roles:["player","npc","admin"],targets:["character","resource","item","storage","construction","terrain"],requires:[],readonly:true,description:"Inspeção autorizada sem alterar o mundo"},
  {id:"movement.move",displayName:{"pt-BR":"Mover"},roles:["player","npc"],targets:["position"],requires:["position","movement","energy"],readonly:false,description:"Mover ator físico"},
  {id:"npc.spawn",displayName:{"pt-BR":"Adicionar NPC"},roles:["admin"],targets:["position"],requires:[],readonly:false,description:"Criar personagem usando definição registrada"},
  {id:"resource.spawn",displayName:{"pt-BR":"Adicionar fonte"},roles:["admin"],targets:["position"],requires:[],readonly:false,description:"Criar fonte usando definição registrada"},
  {id:"obstacle.spawn",displayName:{"pt-BR":"Adicionar cenário"},roles:["admin"],targets:["position"],requires:[],readonly:false,description:"Posicionar elemento sólido não coletável"},
  {id:"resource.harvest",displayName:{"pt-BR":"Colher frutos"},roles:["player","npc"],targets:["resource"],requires:["position","energy","inventory","resourceSource"],readonly:false,description:"Transferir frutos de fonte adjacente ao inventário físico do ator"},
  {id:"resource.gather",displayName:{"pt-BR":"Extrair recursos"},roles:["player","npc"],targets:["resource"],requires:["position","energy","inventory","resourceSource"],readonly:false,description:"Coleta física de madeira ou pedra no inventário do personagem"},
  {id:"construction.place",displayName:{"pt-BR":"Criar canteiro"},roles:["admin"],targets:["position"],requires:[],readonly:false,description:"Reservar terreno livre para um projeto registrado"},
  {id:"construction.deliver",displayName:{"pt-BR":"Entregar materiais"},roles:["npc","player"],targets:["construction"],requires:["position","energy","inventory","construction"],readonly:false,description:"Mover recursos do inventário do ator para o canteiro"},
  {id:"construction.work",displayName:{"pt-BR":"Trabalhar no canteiro"},roles:["npc","player"],targets:["construction"],requires:["position","energy","construction"],readonly:false,description:"Realizar trabalho com materiais da etapa entregues"},
  {id:"construction.admin_supply",displayName:{"pt-BR":"Injetar materiais para teste"},roles:["admin"],targets:["construction"],requires:["construction"],readonly:false,description:"Comando explícito de homologação, sem simular transporte"},
  {id:"construction.admin_work",displayName:{"pt-BR":"Aplicar trabalho para teste"},roles:["admin"],targets:["construction"],requires:["construction"],readonly:false,description:"Comando explícito de homologação sem trabalhador"},
  {id:"storage.deposit",displayName:{"pt-BR":"Guardar recursos"},roles:["player","npc"],targets:["construction"],requires:["inventory","storage","position"],readonly:false,description:"Depositar itens fisicamente carregados em depósito concluído"},
  {id:"storage.withdraw",displayName:{"pt-BR":"Retirar recursos"},roles:["player","npc"],targets:["construction"],requires:["inventory","storage","position"],readonly:false,description:"Retirar itens do depósito para transporte físico"},
  {id:"storage.admin_supply",displayName:{"pt-BR":"Adicionar estoque de teste"},roles:["admin"],targets:["construction"],requires:["storage"],readonly:false,description:"Injeção explícita de estoque para homologação"}
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
