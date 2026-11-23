import test from 'node:test';
import assert from 'node:assert/strict';
import {views} from '../src/features/navigation/views.js';
import {renderPage} from '../src/features/navigation/pages.js';
import {renderInspector} from '../src/features/inspector/render.js';
import {renderActivityMarkup} from '../src/features/activity/render.js';
import {worlds,createDemoState} from '../src/mock.js';
test('telas administrativas registradas',()=>{for(const id of ['world','worlds','population','resources','events','rules','metrics'])assert.ok(views[id]);});
test('listas renderizam dados do mundo demonstrativo',()=>{
 const state=createDemoState();
 assert.match(renderPage('population',state,worlds),/Ayla/);
 assert.match(renderPage('worlds',state,worlds),/Assentamento Inicial/);
 assert.match(renderPage('resources',state,worlds),/Floresta/);
});
test('inspetor representa entidades e estado vazio',()=>{
 const s=createDemoState();assert.match(renderInspector(null),/Nenhum item selecionado/);
 assert.match(renderInspector(s.npc[0]),/Saúde/);
 assert.match(renderInspector(s.resource[0]),/Quantidade/);
 assert.match(renderInspector(s.building[0]),/Progresso/);
});
test('conteúdo dinâmico é escapado',()=>{
 const s=createDemoState();s.npc[0].name='<img src=x onerror=alert(1)>';
 const html=renderPage('population',s,worlds);
 assert.doesNotMatch(html,/<img/);
 assert.match(html,/&lt;img/);
 assert.match(renderActivityMarkup([{icon:'x',title:'<script>',description:'test',time:'now'}]),/&lt;script&gt;/);
});
