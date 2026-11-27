import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveFacing,resolveCharacterRole,resolveWorkAnimation} from '../packages/renderer/src/character-visual-state.js';
import {workPose} from '../packages/renderer/src/character-animation.js';
import {assignProfessions} from '../packages/systems/leadership/src/professions.ts';
import type {Character,World} from '../packages/domain/src/contracts.ts';
test('direction follows projected movement and preserves facing while stationary',()=>{
 assert.equal(resolveFacing(1,0),'east');assert.equal(resolveFacing(-1,0),'west');
 assert.equal(resolveFacing(0,1),'south');assert.equal(resolveFacing(0,-1),'north');
 assert.equal(resolveFacing(0,0,'west'),'west');
});
test('leader assigns stable occupations; work clips are independent',()=>{
 const citizen:Character={id:'a',kind:'character',name:'A',position:{x:0,y:0},health:100,energy:100,traits:['farmer']};
 const leader:Character={...citizen,id:'leader',communityRole:'leader'};
 const world:World={id:'w',tick:0,width:4,height:4,entities:[leader,citizen],appliedCommands:[]};
 assignProfessions(world,citizen);assert.equal(citizen.profession,undefined);
 assignProfessions(world,leader);assert.equal(citizen.profession,'farm');
 citizen.ai={activity:'Construindo',workAction:'construction.work',route:[],reason:'',lastDecisionTick:0,history:[]};
 assert.equal(resolveWorkAnimation(citizen),'hammer');assert.equal(resolveCharacterRole(citizen),'farm');
 citizen.ai.workAction='resource.gather';citizen.ai.workMaterial='wood';
 assert.equal(resolveWorkAnimation(citizen),'axe');assert.equal(resolveCharacterRole(citizen),'farm');
 assignProfessions(world,leader);assert.equal(citizen.profession,'farm');
 assert.notDeepEqual(workPose('axe',100),workPose('axe',200));
 assert.notDeepEqual(workPose('axe',100),workPose('hammer',100));
});
