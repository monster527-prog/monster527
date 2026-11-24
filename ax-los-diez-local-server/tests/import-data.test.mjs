import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,cp,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {spawn} from 'node:child_process';
import {WorldStore} from '../lib/world-store.mjs';
async function run(script,input){return await new Promise((resolve,reject)=>{const p=spawn(process.execPath,[script],{stdio:['pipe','pipe','pipe']});let output='';p.stdout.on('data',b=>output+=b);p.stderr.on('data',b=>output+=b);p.once('error',reject);p.once('exit',code=>resolve({code,output}));p.stdin.end(input+'\n');});}
test('Import copies Korean/space path, preserves source and refuses overwrite',async()=>{
 const temp=await mkdtemp(path.join(tmpdir(),'ax-import-'));
 try{
  const old=path.join(temp,'이전 폴더','saved-world-lab'),app=path.join(temp,'새 폴더');await mkdir(path.join(app,'scripts'),{recursive:true});
  await cp(new URL('../scripts/import-old-data.mjs',import.meta.url),path.join(app,'scripts/import-old-data.mjs'));
  const store=new WorldStore(old);await store.init();const d=await store.upload('ahmn',{filename:'기존자료.md',category:'development'},(async function*(){yield Buffer.from('기존 문서 보존');})());
  const first=await run(path.join(app,'scripts/import-old-data.mjs'),'"'+old+'"');assert.equal(first.code,0,first.output);
  const fresh=new WorldStore(path.join(app,'saved-world-lab'));assert.equal((await fresh.content('ahmn',d.id)).body.toString(),'기존 문서 보존');assert.equal((await store.content('ahmn',d.id)).body.toString(),'기존 문서 보존');
  const second=await run(path.join(app,'scripts/import-old-data.mjs'),old);assert.equal(second.code,1);assert.match(second.output,/이미 있습니다/);assert.equal((await fresh.content('ahmn',d.id)).body.toString(),'기존 문서 보존');
 }finally{await rm(temp,{recursive:true,force:true});}
});
