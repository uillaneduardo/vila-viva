import assert from 'node:assert/strict';
import test from 'node:test';
import {makePrototype} from '../apps/server/src/index.mts';

test('public UI sprite paths remain under approved namespace; no arbitrary binary files',async()=>{
 const {server}=makePrototype();
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address=server.address(),base='http://127.0.0.1:'+address.port;
 try{
  const missing=await fetch(base+'/assets/ui/actions/not-yet-available.webp');
  assert.equal(missing.status,404);
  const invalid=await fetch(base+'/packages/renderer/src/scene.webp');
  assert.equal(invalid.status,404);
  const manifest=await fetch(base+'/packages/ui/assets/manifest.js');
  assert.equal(manifest.status,200);
  assert.match(await manifest.text(),/action\.add-npc/);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
