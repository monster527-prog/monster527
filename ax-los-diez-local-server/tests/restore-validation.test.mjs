import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {zipSync,unzipSync,strToU8} from '../vendor/fflate/esm/index.mjs';
import {WorldStore} from '../lib/world-store.mjs';
import {backupWorldLab} from '../lib/backup.mjs';
import {restoreWorldLab} from '../lib/restore.mjs';
const bytes=b=>(async function*(){yield Buffer.from(b);})();
test('Restore rejects path traversal and checksum damage without modifying the destination',async()=>{
 const temp=await mkdtemp(path.join(tmpdir(),'ax-safe-restore-'));
 try{
  const source=new WorldStore(path.join(temp,'source')),target=new WorldStore(path.join(temp,'target'));await source.init();await target.init();
  const doc=await source.upload('ahmn',{filename:'TEST_ONLY.md',category:'development'},bytes('immutable source'));
  const original=await source.upload('ahmn',{filename:'Original.md',category:'original'},bytes('approved immutable source'));await source.approve('ahmn',original.id,{confirmed:true,sha256:original.sha256,expectedRevision:0});
  const zip=path.join(temp,'backup.zip');await backupWorldLab(source.root,zip);const archive=await readFile(zip);
  const files=unzipSync(archive),key=Object.keys(files).find(k=>k.endsWith('original.md'));files[key]=strToU8('tampered body');
  await assert.rejects(restoreWorldLab(target,bytes(zipSync(files))),e=>e.code==='RESTORE_INVALID');assert.equal((await target.list('ahmn')).documents.length,0);
  const attack=zipSync({'BACKUP-MANIFEST.json':strToU8(JSON.stringify({schema:1,files:[{path:'../../escape.md',bytes:4,sha256:'0'.repeat(64)}]})),'world-lab/../../escape.md':strToU8('evil')});
  await assert.rejects(restoreWorldLab(target,bytes(attack)),e=>e.code==='RESTORE_INVALID');await assert.rejects(stat(path.join(temp,'escape.md')));
  const good=new WorldStore(path.join(temp,'valid-target'));await good.init();const restored=await restoreWorldLab(good,bytes(archive));assert.equal(restored.documents,2);assert.equal((await good.list('ahmn')).originalRevision,1);assert.equal((await stat(path.join(good.dir('ahmn',original.id),'original.md'))).mode&0o222,0);
  assert(!(await readdir(temp)).some(n=>n.startsWith('.restoring-')));assert.equal((await source.content('ahmn',doc.id,'original')).body.toString(),'immutable source');
 }finally{await rm(temp,{recursive:true,force:true});}
});
