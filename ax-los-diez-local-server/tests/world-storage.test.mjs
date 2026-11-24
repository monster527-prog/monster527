import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,readdir,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('..',import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
test('WORLD LAB filesystem persistence, original protection and extraction',async t=>{
 const temp=await mkdtemp(path.join(os.tmpdir(),'ax-world-test-')),data=path.join(temp,'data');
 const finder=net.createServer();finder.listen(0,'127.0.0.1');await once(finder,'listening');const port=finder.address().port;await new Promise(r=>finder.close(r));
 const base=`http://127.0.0.1:${port}`;let child,token;const messages=[];
 async function start(){
  child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),AX_WORLD_DATA_DIR:data},stdio:['ignore','pipe','pipe']});
  child.stderr.on('data',b=>messages.push(b.toString()));
  for(let i=0;i<120;i++){
   if(child.exitCode!==null)throw new Error('server exited: '+messages.join(''));
   try{const r=await fetch(base+'/api/status');if(r.ok){token=(await r.json()).csrfToken;return;}}catch{}
   await delay(50);
  }throw new Error('server did not start');
 }
 async function stop(){if(child&&child.exitCode===null){child.kill('SIGTERM');await once(child,'exit');}}
 async function list(world='ahmn'){return await(await fetch(`${base}/api/worlds/${world}/documents`)).json();}
 async function upload(name,body,category='development',world='ahmn',extra={}){
  return fetch(`${base}/api/worlds/${world}/documents?`+new URLSearchParams({filename:name,category,isTest:'true',...extra}),{method:'POST',headers:{'X-AX-CSRF':token,'Content-Type':'application/octet-stream'},body});
 }
 async function approve(doc,expectedRevision,extra={}){
  return fetch(`${base}/api/worlds/ahmn/documents/${doc.id}/approve`,{method:'POST',headers:{'X-AX-CSRF':token,'Content-Type':'application/json'},body:JSON.stringify({confirmed:true,sha256:doc.sha256,expectedRevision,...extra})});
 }
 const md='# TEST ONLY\n\n한글 세계관 저장 확인. <script>window.BAD=true</script>\n';let development,original1,original2;
 try{
  await start();
  await t.test('Five fixed worlds and four document categories',async()=>{const status=await(await fetch(base+'/api/status')).json();assert.deepEqual(status.worlds.map(w=>w.name),['AHMN','중간계','안연사','언네임드1','언네임드2']);assert.deepEqual(status.categories,['original','development','progress','proposals']);assert.equal((await list()).documents.length,0);});
  await t.test('Reject unsupported files, traversal, invalid categories, empty uploads and untrusted writes',async()=>{
   assert.equal((await upload('x.exe','x')).status,415);assert.equal((await upload('../x.md','x')).status,400);assert.equal((await upload('x.md','x','invalid')).status,400);assert.equal((await upload('x.md','','progress')).status,400);assert.equal((await upload('x.md','x','progress','no-such-world')).status,404);
   assert.equal((await fetch(base+'/api/worlds/ahmn/documents?filename=x.md&category=progress',{method:'POST',body:'x'})).status,403);
   assert.equal((await fetch(base+'/api/worlds/ahmn/documents?filename=x.md&category=progress',{method:'POST',headers:{'X-AX-CSRF':token,Origin:'https://another.example'},body:'x'})).status,403);assert.equal((await list()).documents.length,0);
  });
  await t.test('MD originals, exact extracted Unicode text and SHA-256 are preserved',async()=>{
   const response=await upload('테스트.md',md);assert.equal(response.status,201);development=(await response.json()).document;assert.equal(development.isTest,true);assert.equal(development.sha256,sha(Buffer.from(md)));
   const source=Buffer.from(await(await fetch(`${base}/api/worlds/ahmn/documents/${development.id}/original`)).arrayBuffer());assert.equal(source.toString(),md);
   const content=await(await fetch(`${base}/api/worlds/ahmn/documents/${development.id}/text`)).json();assert.equal(content.text,md);
  });
  await t.test('TXT encodings, separate worlds and the Progress/Proposals categories',async()=>{
   const utf16=Buffer.concat([Buffer.from([255,254]),Buffer.from('UTF16 한글 진행기록','utf16le')]);let response=await upload('진행.txt',utf16,'progress','middle-earth');assert.equal(response.status,201);const d=(await response.json()).document;
   assert.equal((await(await fetch(`${base}/api/worlds/middle-earth/documents/${d.id}/text`)).json()).text,'UTF16 한글 진행기록');assert.equal((await list('ahmn')).documents.length,1);assert.equal((await upload('제안.md','새로운 제안','proposals','anyeonsa')).status,201);
  });
  await t.test('Text PDF extraction and image-only / broken PDF status preserve the uploaded source',async()=>{
   const pdf=path.join(temp,'text.pdf'),image=path.join(temp,'image.pdf');
   execFileSync('python3',['-c',"from reportlab.pdfgen.canvas import Canvas\nimport sys\nc=Canvas(sys.argv[1]);c.drawString(30,750,'WORLD LAB PDF extraction test');c.save()\nc=Canvas(sys.argv[2]);c.rect(10,10,100,100,fill=1);c.save()",pdf,image]);
   const response=await upload('원본.pdf',await readFile(pdf));assert.equal(response.status,201);const d=(await response.json()).document;assert.equal(d.extraction.status,'ready');assert.match((await(await fetch(`${base}/api/worlds/ahmn/documents/${d.id}/text`)).json()).text,/WORLD LAB PDF extraction test/);
   const scan=(await(await upload('scan.pdf',await readFile(image),'original')).json()).document;assert.equal(scan.extraction.status,'needs_ocr');assert.equal((await approve(scan,0)).status,409);assert.equal((await fetch(`${base}/api/worlds/ahmn/documents/${scan.id}/original`)).status,200);
   const broken=(await(await upload('broken.pdf','%PDF-1.7 broken')).json()).document;assert.equal(broken.extraction.status,'failed');assert.equal((await fetch(`${base}/api/worlds/ahmn/documents/${broken.id}/original`)).status,200);assert.equal((await upload('fake.pdf','not a PDF')).status,422);
  });
  await t.test('Original stays pending until explicit file-bound approval',async()=>{
   original1=(await(await upload('정본.md','# 정본 후보 1','original')).json()).document;assert.equal(original1.status,'pending_approval');assert.equal((await list()).originalRevision,0);
   assert.equal((await approve(original1,0,{confirmed:false})).status,400);assert.equal((await approve(original1,0,{sha256:'wrong'})).status,400);assert.equal((await approve(development,0)).status,400);
   const response=await approve(original1,0);assert.equal(response.status,200);const d=(await response.json()).document;assert.equal(d.locked,true);assert.equal(d.approval.revision,1);assert.equal((await approve(original1,1)).status,409);
  });
  await t.test('Original cannot be overwritten or deleted, including direct API attempts',async()=>{
   for(const method of ['PUT','PATCH','DELETE']){const response=await fetch(`${base}/api/worlds/ahmn/documents/${original1.id}`,{method,headers:{'X-AX-CSRF':token},body:method==='DELETE'?undefined:'changed'});assert.equal(response.status,405);}
   assert.equal((await(await fetch(`${base}/api/worlds/ahmn/documents/${original1.id}/text`)).json()).text,'# 정본 후보 1');
  });
  await t.test('New Original versions append; stale and concurrent approvals are rejected',async()=>{
   original2=(await(await upload('정본.md','# 정본 후보 2','original')).json()).document;assert.notEqual(original2.id,original1.id);assert.equal((await approve(original2,0)).status,409);assert.equal((await approve(original2,1)).status,200);
   const a=(await(await upload('정본3.md','후보3','original')).json()).document,b=(await(await upload('정본4.md','후보4','original')).json()).document;
   const responses=await Promise.all([approve(a,2),approve(b,2)]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);assert.equal((await list()).originalRevision,3);
   assert.equal((await(await fetch(`${base}/api/worlds/ahmn/documents/${original1.id}/text`)).json()).text,'# 정본 후보 1');
  });
  await t.test('Backup includes originals, extracted text, metadata and approval history with verified hashes',async()=>{
   const response=await fetch(base+'/api/backup');assert.equal(response.status,200);const zip=path.join(temp,'backup.zip');await writeFile(zip,Buffer.from(await response.arrayBuffer()));
   execFileSync('python3',['-c',"import sys,zipfile,json,hashlib\nwith zipfile.ZipFile(sys.argv[1]) as z:\n m=json.loads(z.read('BACKUP-MANIFEST.json'))\n assert len(m['files'])>10\n assert any('/approvals/' in f['path'] for f in m['files'])\n for f in m['files']: assert hashlib.sha256(z.read('world-lab/'+f['path'])).hexdigest()==f['sha256']",zip]);
  });
  await t.test('New server process reads the same files, versions and exact text after restart',async()=>{
   const before=await list();await stop();await start();const after=await list();assert.deepEqual(after,before);assert.equal((await(await fetch(`${base}/api/worlds/ahmn/documents/${development.id}/text`)).json()).text,md);assert.equal(after.originalRevision,3);
  });
  await t.test('Raw storage and source code are not public static files',async()=>{
   for(const route of ['/../data/world-lab/worlds/ahmn/documents','/lib/world-store.mjs','/scripts/backup-world-lab.py','/package.json'])assert.equal((await fetch(base+route)).status,404);
   const folders=await readdir(path.join(data,'worlds','ahmn','documents'));assert(!folders.some(f=>f.startsWith('.staging-')));
  });
 }finally{await stop();await rm(temp,{recursive:true,force:true});}
});
