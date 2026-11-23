import {actionsFor} from "../../../../../../packages/protocol/src/actions.js";
import {escapeHTML} from "../../shared/escape-html.js";
function card(title,description,meta,action=""){return `<article class="generic-card" ${action}><h3>${escapeHTML(title)}</h3><p>${escapeHTML(description)}</p><small>${escapeHTML(meta)}</small></article>`;}
export function renderPage(view,state,worlds){let html="";
if(view==="worlds")html=worlds.map(w=>card(w.name,"Dia "+w.day+" · Ano "+w.year+" · Seed "+w.seed,w.id===state.world.id?"Mundo selecionado":"Abrir mundo",`data-world="${w.id}" tabindex="0" role="button"`)).join("");
else if(view==="population")html=state.npc.map(n=>card(n.name,n.task+" · Saúde "+n.health+"%","Inspecionar NPC",`data-select="${n.id}" tabindex="0" role="button"`)).join("");
else if(view==="resources")html=state.resource.map(n=>card(n.name,"Posição "+n.x+", "+n.y,n.qty+" unidades",`data-select="${n.id}" tabindex="0" role="button"`)).join("");
else if(view==="events")html=state.events.map(n=>card(n.title,n.description,n.time)).join("");
else if(view==="actions")html=actionsFor("admin").map(a=>card(a.label,"Comando: "+a.id,a.status==="demo"?"Prévia disponível":"Planejado")).join("");
else if(view==="rules")html=["Velocidade do tempo","Regeneração de recursos","Necessidades e sobrevivência","Construções e população"].map(n=>card(n,"Configuração prevista para a integração com o motor.","Somente visualização nesta etapa")).join("");
else html=["População","Saúde média","Coleta por dia","Construções concluídas"].map((n,i)=>card(n,["Habitantes no mundo","Média de saúde dos NPCs","Produção ilustrativa","Estruturas finalizadas"][i],[state.npc.length+" habitantes",Math.round(state.npc.reduce((a,x)=>a+x.health,0)/state.npc.length)+"%","48 unidades","1 estrutura"][i])).join("");
return '<div class="generic-grid">'+html+"</div>";}
