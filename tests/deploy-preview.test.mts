import assert from 'node:assert/strict';
import test from 'node:test';
import {makePrototype} from '../apps/server/src/index.mts';
test('health, version and preview route expose a valid homologation contract', async()=>{
 const {server}=makePrototype();
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 try {
  const health=await fetch(base+'/healthz');
  assert.equal(health.status,200);
  assert.equal((await health.json()).status,'ok');
  const version=await fetch(base+'/version.txt');
  assert.equal(version.status,200);
  assert.match(await version.text(),/development|^[a-f0-9]{40}/);
  const preview=await fetch(base+'/apps/player-web/assets-preview.html');
  assert.equal(preview.status,200);
  assert.match(await preview.text(),/Oturo/);
 } finally {await new Promise(resolve=>server.close(resolve));}
});
