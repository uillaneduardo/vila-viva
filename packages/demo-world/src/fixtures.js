// UI-only fixtures. No authoritative simulation state or backend operations.
export const worlds=[
 {id:"initial",name:"Assentamento Inicial",day:24,year:1,seed:4521},
 {id:"survival",name:"Vale da Escassez",day:12,year:1,seed:1936},
 {id:"growth",name:"Experimento de Crescimento",day:43,year:2,seed:7612}
];
export const names=["Ayla","Breno","Cora","Davi","Elisa","Félix","Gabi","Hugo","Íris","João","Lia","Noah"];
export function createDemoState(world=worlds[0]){
 const npc=names.map((name,i)=>({id:"npc-"+i,type:"npc",name,x:10+(i*17)%43,y:10+(i*11)%31,health:70+(i*11)%30,energy:40+(i*13)%60,hunger:22+(i*17)%65,task:["Coletando","Transportando","Descansando","Explorando","Construindo"][i%5],dx:0,dy:0}));
 const resource=[{x:13,y:12,name:"Floresta",qty:82},{x:35,y:7,name:"Pomar",qty:65},{x:53,y:18,name:"Pedreira",qty:110},{x:9,y:33,name:"Bosque",qty:57},{x:28,y:38,name:"Mina",qty:90},{x:46,y:34,name:"Campo",qty:72},{x:38,y:26,name:"Lago",qty:95},{x:58,y:38,name:"Madeira",qty:36}].map((r,i)=>({...r,id:"res-"+i,type:"resource"}));
 const building=[{id:"build-1",type:"building",name:"Depósito central",x:31,y:21,progress:100},{id:"build-2",type:"building",name:"Casa comunitária",x:38,y:18,progress:75},{id:"build-3",type:"building",name:"Canteiro",x:24,y:25,progress:38}];
 return {world,npc,resource,building,day:world.day,paused:false,speed:1,tool:"inspect",selected:null,events:[{icon:"♙",title:"NPC iniciou uma tarefa",description:"Ayla está coletando recursos no bosque.",time:"Agora"},{icon:"▤",title:"Construção em andamento",description:"Casa comunitária atingiu 75% de progresso.",time:"Há 2 min"},{icon:"♧",title:"Recursos regenerados",description:"A floresta recuperou 12 unidades de madeira.",time:"Há 5 min"}]};
}
