import type {EffectDefinition} from "../../../domain/src/effects.ts";
export const EFFECTS:Readonly<Record<string,Readonly<EffectDefinition>>>=Object.freeze({
 sad:{
  id:"sad",displayName:{"pt-BR":"Triste"},tags:["emotion","negative"],lifetime:{kind:"timed",durationTicks:12},
  stacking:"refresh",modifiers:[{attribute:"moodMax",operation:"add",value:-20}]
 },
 happy:{
  id:"happy",displayName:{"pt-BR":"Feliz"},tags:["emotion","positive"],lifetime:{kind:"timed",durationTicks:10},
  stacking:"refresh",modifiers:[{attribute:"mood",operation:"add",value:15}]
 },
 well_sheltered:{
  id:"well_sheltered",displayName:{"pt-BR":"Bem-abrigado"},tags:["housing","positive"],lifetime:{kind:"conditional"},
  stacking:"unique",modifiers:[{attribute:"mood",operation:"add",value:10}]
 },
 gestation:{
  id:"gestation",displayName:{"pt-BR":"Gestação"},tags:["pregnancy","lifecycle"],lifetime:{kind:"timed",durationTicks:40},
  stacking:"unique",
  modifiers:[{attribute:"movementSpeed",operation:"multiply",value:.85},{attribute:"workRate",operation:"multiply",value:.8},{attribute:"carryCapacity",operation:"multiply",value:.75}],
  onExpire:{eventType:"reproduction.birth_due"}
 },
 postpartum_recovery:{
  id:"postpartum_recovery",displayName:{"pt-BR":"Resguardo"},tags:["lifecycle","recovery"],lifetime:{kind:"timed",durationTicks:12},
  stacking:"unique",modifiers:[{attribute:"movementSpeed",operation:"multiply",value:.9},{attribute:"workRate",operation:"multiply",value:.7},{attribute:"carryCapacity",operation:"multiply",value:.5}]
 },
 injured:{
  id:"injured",displayName:{"pt-BR":"Ferido"},tags:["health","negative"],lifetime:{kind:"timed",durationTicks:30},
  stacking:"refresh",modifiers:[{attribute:"movementSpeed",operation:"multiply",value:.65},{attribute:"workRate",operation:"multiply",value:.7}]
 },
 hungry:{
  id:"hungry",displayName:{"pt-BR":"Com fome"},tags:["needs","negative"],lifetime:{kind:"conditional"},
  stacking:"unique",modifiers:[{attribute:"workRate",operation:"multiply",value:.8},{attribute:"movementSpeed",operation:"multiply",value:.9}]
 },
 starving:{
  id:"starving",displayName:{"pt-BR":"Faminto"},tags:["needs","negative"],lifetime:{kind:"conditional"},
  stacking:"unique",modifiers:[{attribute:"workRate",operation:"multiply",value:.5},{attribute:"movementSpeed",operation:"multiply",value:.7}]
 },
 well_fed:{
  id:"well_fed",displayName:{"pt-BR":"Bem alimentado"},tags:["needs","positive"],lifetime:{kind:"conditional"},
  stacking:"unique",modifiers:[{attribute:"workRate",operation:"multiply",value:1.1},{attribute:"mood",operation:"add",value:5}]
 }
});
