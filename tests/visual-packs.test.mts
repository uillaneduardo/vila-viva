import test from 'node:test';
import assert from 'node:assert/strict';
import {getWorldVisualPack} from '../packages/renderer/src/visual-packs.js';
import {resolveCharacterState} from '../packages/renderer/src/character-visual-state.js';
import {SpriteLibrary,resolveWorldSprite} from '../packages/renderer/src/sprites.js';
test('approved visual states use only known activities and confirmed movement',()=>{
 const npc={kind:'character',health:100,ai:{activity:'Construindo'}};
 assert.equal(resolveCharacterState(npc),'working');
 assert.equal(resolveCharacterState(npc,{movingVisually:true}),'moving');
 assert.equal(resolveCharacterState({...npc,health:0},{movingVisually:true}),'dead');
 assert.equal(resolveCharacterState({...npc,ai:{activity:'Dormindo'}}),'resting');
 assert.equal(resolveCharacterState({...npc,ai:{activity:'Bloqueado',route:[{}]}}),'idle');
 assert.equal(resolveCharacterState({...npc,ai:{activity:'future unknown'}}),'idle');
 assert.equal(resolveWorldSprite(npc).id,'entities/human');
});
test('packs can be exchanged without changing semantic IDs; old pack has fallback',()=>{
 const simple=getWorldVisualPack(),classic=getWorldVisualPack('classic');
 assert.equal(getWorldVisualPack('unknown'),simple);
 assert.equal(simple['vegetation/apple_tree'],classic['vegetation/apple_tree']);
 assert.deepEqual(simple['entities/human'].states,['idle','moving','working','resting']);
 const lib=new SpriteLibrary({pack:simple});lib.setPack(classic);
 assert.equal(lib.pack,classic);assert.equal(lib.draw({},'entities/human',0,0,20),false);
});
