export const ACTIONS=Object.freeze([
["world.inspect","Inspecionar","both","demo"],["world.observe","Observar mundo","both","demo"],
["world.move","Mover personagem","player","planned"],["resource.collect","Coletar recursos","player","planned"],
["inventory.transfer","Transportar e entregar","player","planned"],["needs.eat","Comer","player","planned"],["needs.rest","Descansar","player","planned"],["building.work","Trabalhar em obra","player","planned"],["entity.interact","Interagir/socializar","player","planned"],
["world.create","Criar mundo","admin","demo"],["world.pause","Pausar/retomar","admin","demo"],["world.speed","Alterar velocidade","admin","demo"],["npc.spawn","Adicionar NPC","admin","demo"],["resource.spawn","Adicionar fonte","admin","demo"],["event.trigger","Disparar evento","admin","demo"],["building.spawn","Criar construção","admin","planned"],["entity.edit","Editar atributos","admin","planned"],["world.rules","Editar regras","admin","planned"],["world.metrics","Ver estatísticas","admin","demo"],["world.clone","Duplicar mundo","admin","planned"],["world.history","Auditar comandos","admin","planned"]
].map(([id,label,role,status])=>Object.freeze({id,label,role,status})));
export const actionsFor=role=>{if(!["player","admin"].includes(role))throw Error("invalid role");return ACTIONS.filter(a=>a.role===role||a.role==="both")};
export const canUse=(role,id)=>actionsFor(role).some(a=>a.id===id);
