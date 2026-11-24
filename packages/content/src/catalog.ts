import {DefinitionRegistry} from "../../domain/src/registry.ts";
export function createBaseRegistry():DefinitionRegistry {
 const catalog=new DefinitionRegistry();
 for(const definition of [
  {id:"character.human",displayName:{"pt-BR":"Personagem humano"},kind:"character",components:["identity","position","ownership","health","energy","needs","inventory","movement","renderable"],description:"Pessoa física, jogador ou NPC"},
  {id:"resource.wood",displayName:{"pt-BR":"Fonte de madeira"},kind:"resource",components:["position","resourceSource","regeneration","renderable"],description:"Fonte regenerável de madeira"},
  {id:"resource.food",displayName:{"pt-BR":"Cultivo alimentar"},kind:"resource",components:["position","resourceSource","regeneration","lifecycle","production","collision","renderable"],description:"Fontes alimentares definidas por espécie: perenes ou de colheita única"},
  {id:"resource.stone",displayName:{"pt-BR":"Fonte de pedra"},kind:"resource",components:["position","resourceSource","regeneration","renderable"],description:"Fonte regenerável de pedra"},
  {id:"resource.ore",displayName:{"pt-BR":"Jazida mineral"},kind:"resource",components:["position","resourceSource","regeneration","renderable"],description:"Jazida de ferro ou cobre"},
  {id:"obstacle.scenery",displayName:{"pt-BR":"Obstáculo de cenário"},kind:"obstacle",components:["position","collision","renderable"],description:"Elemento sólido e não coletável do cenário"},
  {id:"storage.depot",displayName:{"pt-BR":"Depósito"},kind:"storage",components:["position","storage","inventory","renderable"],description:"Depósito com capacidade e regras de entrega"},
  {id:"construction.site",displayName:{"pt-BR":"Canteiro de obras"},kind:"construction",components:["position","construction","inventory","renderable"],description:"Canteiro por etapas"},
  {id:"item.stack",displayName:{"pt-BR":"Pilha de itens"},kind:"item",components:["position","inventory","renderable"],description:"Pilha de itens físicos no mundo"},
  {id:"planting.zone",displayName:{"pt-BR":"Zona de cultivo"},kind:"terrain",components:["position","renderable"],description:"Área de plantio sem colisão que recebe mudas mediante sementes reais"}
 ] as const)catalog.registerEntity(definition);
 for(const action of [
  {id:"mine.extract",displayName:{"pt-BR":"Operar mina"},roles:["npc","player"],targets:["construction"],requires:["position","energy"],readonly:false,description:"Extrair minério finito com trabalhador presente"},
  {id:"item.drop",displayName:{"pt-BR":"Deixar item no chão"},roles:["npc","player"],targets:["character"],requires:["position","inventory"],readonly:false,description:"Transferir item físico do inventário para o chão"},
  {id:"item.pickup",displayName:{"pt-BR":"Recolher item"},roles:["npc","player"],targets:["item"],requires:["position","inventory"],readonly:false,description:"Recolher pilha física no chão"},
  {id:"entity.inspect",displayName:{"pt-BR":"Inspecionar"},roles:["player","npc","admin"],targets:["character","resource","item","storage","construction","terrain"],requires:[],readonly:true,description:"Inspeção autorizada sem alterar o mundo"},
  {id:"movement.move",displayName:{"pt-BR":"Mover"},roles:["player","npc"],targets:["position"],requires:["position","movement","energy"],readonly:false,description:"Mover ator físico"},
  {id:"npc.spawn",displayName:{"pt-BR":"Adicionar NPC"},roles:["admin"],targets:["position"],requires:[],readonly:false,description:"Criar personagem usando definição registrada"},
  {id:"resource.spawn",displayName:{"pt-BR":"Adicionar fonte"},roles:["admin"],targets:["position"],requires:[],readonly:false,description:"Criar fonte usando definição registrada"},
  {id:"obstacle.spawn",displayName:{"pt-BR":"Adicionar cenário"},roles:["admin"],targets:["position"],requires:[],readonly:false,description:"Posicionar elemento sólido não coletável"},
  {id:"resource.harvest",displayName:{"pt-BR":"Colher frutos"},roles:["player","npc"],targets:["resource"],requires:["position","energy","inventory","resourceSource"],readonly:false,description:"Gerar frutos e sementes físicos no chão"},
  {id:"resource.gather",displayName:{"pt-BR":"Extrair recursos"},roles:["player","npc"],targets:["resource"],requires:["position","energy","inventory","resourceSource"],readonly:false,description:"Extrair recursos e gerar pilhas físicas no chão"},
  {id:"construction.place",displayName:{"pt-BR":"Criar canteiro"},roles:["admin"],targets:["position"],requires:[],readonly:false,description:"Reservar terreno livre para um projeto registrado"},
  {id:"construction.propose",displayName:{"pt-BR":"Planejar construção"},roles:["npc"],targets:["position"],requires:["position","construction"],readonly:false,description:"Um líder decide um projeto e terreno, criando somente um canteiro sem recursos ou trabalho fictícios"},
  {id:"production.order",displayName:{"pt-BR":"Planejar fabricação"},roles:["npc","admin"],targets:["construction"],requires:["production"],readonly:false,description:"Adicionar ordem de receita à fila da oficina"},
  {id:"production.work",displayName:{"pt-BR":"Fabricar lote"},roles:["npc","player"],targets:["construction"],requires:["production","energy"],readonly:false,description:"Trabalhar em ordem com ingredientes reais"},
  {id:"npc.equip",displayName:{"pt-BR":"Equipar item físico"},roles:["npc","player"],targets:["character"],requires:["inventory"],readonly:false,description:"Transferir ferramenta do inventário para slot de equipamento"},
  {id:"construction.deliver",displayName:{"pt-BR":"Entregar materiais"},roles:["npc","player"],targets:["construction"],requires:["position","energy","inventory","construction"],readonly:false,description:"Mover recursos do inventário do ator para o canteiro"},
  {id:"construction.work",displayName:{"pt-BR":"Trabalhar no canteiro"},roles:["npc","player"],targets:["construction"],requires:["position","energy","construction"],readonly:false,description:"Realizar trabalho com materiais da etapa entregues"},
  {id:"construction.admin_supply",displayName:{"pt-BR":"Injetar materiais para teste"},roles:["admin"],targets:["construction"],requires:["construction"],readonly:false,description:"Comando explícito de homologação, sem simular transporte"},
  {id:"construction.admin_work",displayName:{"pt-BR":"Aplicar trabalho para teste"},roles:["admin"],targets:["construction"],requires:["construction"],readonly:false,description:"Comando explícito de homologação sem trabalhador"},
  {id:"storage.deposit",displayName:{"pt-BR":"Guardar recursos"},roles:["player","npc"],targets:["construction"],requires:["inventory","storage","position"],readonly:false,description:"Depositar itens fisicamente carregados em depósito concluído"},
  {id:"storage.withdraw",displayName:{"pt-BR":"Retirar recursos"},roles:["player","npc"],targets:["construction"],requires:["inventory","storage","position"],readonly:false,description:"Retirar itens do depósito para transporte físico"},
  {id:"storage.admin_supply",displayName:{"pt-BR":"Adicionar estoque de teste"},roles:["admin"],targets:["construction"],requires:["storage"],readonly:false,description:"Injeção explícita de estoque para homologação"},
  {id:"construction.remove",displayName:{"pt-BR":"Remover construção"},roles:["admin"],targets:["construction"],requires:[],readonly:false,description:"Remover elemento e seu conteúdo do mundo, sem reembolso"},
  {id:"construction.destroy",displayName:{"pt-BR":"Destruir construção"},roles:["admin"],targets:["construction"],requires:[],readonly:false,description:"Desabilitar prédio e deixar ruína sólida no mapa"},
  {id:"npc.admin_equip",displayName:{"pt-BR":"Equipar ferramenta de teste"},roles:["admin"],targets:["character"],requires:[],readonly:false,description:"Definir ferramenta de NPC para homologação de riscos"},
  {id:"npc.eat",displayName:{"pt-BR":"Alimentar-se"},roles:["player","npc"],targets:["character"],requires:["inventory"],readonly:false,description:"Consumir alimento com regras nutricionais do catálogo"},
  {id:"farming.zone.create",displayName:{"pt-BR":"Demarcar cultivo"},roles:["admin","npc"],targets:["position"],requires:[],readonly:false,description:"Marcar área atravessável para plantio de espécie registrada"},
  {id:"farming.zone.remove",displayName:{"pt-BR":"Remover zona de cultivo"},roles:["admin"],targets:["planting_zone"],requires:[],readonly:false,description:"Remover zona sem destruir plantas já cultivadas"},
  {id:"farming.plant",displayName:{"pt-BR":"Plantar semente"},roles:["npc","player"],targets:["planting_zone"],requires:["position","inventory","energy"],readonly:false,description:"Converter uma semente física em muda na célula livre da zona"},
  {id:"nature.cut",displayName:{"pt-BR":"Cortar árvore envelhecida"},roles:["npc","player"],targets:["resource"],requires:["position","energy","inventory"],readonly:false,description:"Converter macieira velha ou seca em madeira carregada"},
  {id:"burial.pickup",displayName:{"pt-BR":"Recolher falecido"},roles:["npc","player"],targets:["character"],requires:["position","energy"],readonly:false,description:"Recolher corpo sem colisão para sepultamento"},
  {id:"burial.inter",displayName:{"pt-BR":"Sepultar no cemitério"},roles:["npc","player"],targets:["construction"],requires:["position","energy"],readonly:false,description:"Registrar nome do falecido no cemitério e remover corpo do mundo"},
  {id:"burial.drop",displayName:{"pt-BR":"Deixar o corpo no chão"},roles:["npc","player"],targets:["character"],requires:["position"],readonly:false,description:"Recuperar corpo visível se não houver cemitério disponível"}
 ] as const)catalog.registerAction(action);
 return catalog;
}
export const baseRegistry=createBaseRegistry();
export const RESOURCE_PRESETS=Object.freeze({
 wood:{definitionId:"resource.wood",label:"Madeira",resourceType:"wood"},
 food:{definitionId:"resource.food",label:"Alimento",resourceType:"food"},
 stone:{definitionId:"resource.stone",label:"Pedra",resourceType:"stone"},
 iron_ore:{definitionId:"resource.ore",label:"Minério de ferro",resourceType:"iron_ore"},
 copper_ore:{definitionId:"resource.ore",label:"Minério de cobre",resourceType:"copper_ore"}
});
export function resourcePreset(type:string):typeof RESOURCE_PRESETS[keyof typeof RESOURCE_PRESETS]|undefined {
 return Object.values(RESOURCE_PRESETS).find(p=>p.resourceType===type);
}
