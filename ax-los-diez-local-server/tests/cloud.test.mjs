import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,readFile,writeFile,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {AccessGate} from '../lib/access-gate.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)),password='TEST_ONLY_owner_password_2026',origin='https://ax.example.test';
test('Remote mode fails closed and session cookies cannot be guessed or reused after logout',()=>{
 assert.throws(()=>new AccessGate({AX_REMOTE:'1'}));assert.throws(()=>new AccessGate({AX_REMOTE:'1',AX_ACCESS_PASSWORD:password,AX_PUBLIC_ORIGIN:'http://ax.example.test'}));
 const gate=new AccessGate({AX_REMOTE:'1',AX_ACCESS_PASSWORD:password,AX_PUBLIC_ORIGIN:origin});
 const result=gate.login(password,'owner');assert.equal(result.status,200);assert.match(result.cookie,/HttpOnly/);assert.match(result.cookie,/Secure/);assert.match(result.cookie,/SameSite=Lax/);
 const req={headers:{cookie:result.cookie.split(';')[0]}};assert(gate.authenticated(req));gate.logout(req);assert(!gate.authenticated(req));
 for(let i=0;i<8;i++)assert.equal(gate.login('wrong','attacker').status,401);assert.equal(gate.login('wrong','attacker').status,429);
});
test('Hosted HTTPS proxy contract, private data, per-agent settings, Node backup and empty-only restore',async t=>{
 const temp=await mkdtemp(path.join(tmpdir(),'ax-cloud-test-'));let child,port,cookie='',csrf='';const logs=[];
 async function start(data){
  const s=net.createServer();s.listen(0,'127.0.0.1');await once(s,'listening');port=s.address().port;await new Promise(r=>s.close(r));
  child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,OPENAI_API_KEY:'',XAI_API_KEY:'',AX_REMOTE:'1',AX_ACCESS_PASSWORD:password,AX_PUBLIC_ORIGIN:origin,PORT:String(port),AX_WORLD_DATA_DIR:path.join(temp,data),AX_PRIVATE_SETTINGS_DIR:path.join(temp,'private')},stdio:['ignore','ignore','pipe']});child.stderr.on('data',b=>logs.push(String(b)));
  for(let i=0;i<100;i++){try{const r=await request('/healthz');if(r.status===200)return;}catch{}await new Promise(r=>setTimeout(r,50));}throw new Error('Server failed: '+logs.join(''));
 }
 const request=(url,options={})=>new Promise((resolve,reject)=>{
  const body=options.body===undefined?null:Buffer.isBuffer(options.body)?options.body:Buffer.from(typeof options.body==='string'?options.body:JSON.stringify(options.body));
  const headers={Host:'ax.example.test','X-Forwarded-Proto':'https',...(cookie?{Cookie:cookie}:{}),...(options.method==='POST'?{Origin:origin,'X-AX-CSRF':csrf,'Content-Type':'application/json'}:{}),...options.headers};if(body)headers['Content-Length']=body.length;
  const r=http.request({hostname:'127.0.0.1',port,path:url,method:options.method||'GET',headers},res=>{const chunks=[];res.on('data',b=>chunks.push(b));res.on('end',()=>{const raw=Buffer.concat(chunks);let json;try{json=JSON.parse(raw);}catch{}resolve({status:res.statusCode,headers:res.headers,raw,json});});});r.once('error',reject);r.end(body);
 });
 async function login(){const r=await request('/api/access/login',{method:'POST',body:{password}});assert.equal(r.status,200);cookie=r.headers['set-cookie'][0].split(';')[0];csrf=(await request('/api/status')).json.csrfToken;}
 try{
  await start('data1');let archive,doc;
  await t.test('Anonymous visitors get login and cannot read model settings, documents, chats or backups',async()=>{
   assert.equal((await request('/')).status,302);for(const p of ['/api/status','/api/chat/status','/api/worlds/ahmn/documents','/api/backup'])assert.equal((await request(p)).status,401);
   assert.equal((await request('/api/status',{headers:{Host:'evil.example'}})).status,403);assert.equal((await request('/api/status',{headers:{'X-Forwarded-Proto':'http'}})).status,308);
   assert.equal((await request('/api/access/login',{method:'POST',headers:{Origin:'https://evil.example'},body:{password}})).status,403);
   assert.equal((await request('/api/access/login',{method:'POST',body:{password:'wrong'}})).status,401);
  });
  await t.test('Owner login, CSRF, per-agent config and upload preserve private originals',async()=>{
   await login();assert.equal((await request('/')).status,200);assert((await request('/api/status')).json.localOnly===false);
   assert.equal((await request('/api/chat/settings',{method:'POST',headers:{'X-AX-CSRF':''},body:{}})).status,403);
   assert.equal((await request('/api/chat/settings',{method:'POST',body:{agentId:'marcelo',provider:'openai',model:'gpt-4.1-mini',apiKey:'TEST_ONLY_NOT_A_REAL_API_KEY',persistKey:true}})).status,200);
   assert.equal((await request('/api/chat/settings',{method:'POST',body:{agentId:'paul',provider:'xai',model:'grok-4'}})).status,200);
   assert.equal((await request('/api/chat/status?agent=marcelo')).json.provider,'openai');assert.equal((await request('/api/chat/status?agent=paul')).json.provider,'xai');
   const r=await request('/api/worlds/ahmn/documents?filename=TEST_ONLY.md&category=development&isTest=true',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:Buffer.from('# TEST ONLY 한글 원본 보존')});assert.equal(r.status,201);doc=r.json.document;
   const backup=await request('/api/backup');assert.equal(backup.status,200);archive=backup.raw;const zip=path.join(temp,'backup.zip');await writeFile(zip,archive);
   execFileSync('python3',['-c',"import zipfile,sys\nz=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None\nassert all(b'TEST_ONLY_NOT_A_REAL_API_KEY' not in z.read(n) for n in z.namelist())\nassert all('private-settings' not in n for n in z.namelist())",zip]);
  });
  await t.test('Restart keeps files/config and invalidates old login sessions; backup restores exact data in an empty instance',async()=>{
   child.kill();await once(child,'exit');await start('data2');assert.equal((await request('/api/status')).status,401);cookie='';csrf='';await login();
   assert((await request('/api/chat/status?agent=marcelo')).json.configured);assert.equal((await request('/api/chat/status?agent=paul')).json.configured,false);
   const imported=await request('/api/import-backup',{method:'POST',headers:{'X-AX-CONFIRM-RESTORE':'yes','Content-Type':'application/zip'},body:archive});assert.equal(imported.status,200,JSON.stringify(imported.json));assert.equal(imported.json.documents,1);
   const original=await request('/api/worlds/ahmn/documents/'+doc.id+'/original');assert.equal(original.raw.toString(),'# TEST ONLY 한글 원본 보존');
   const repeat=await request('/api/import-backup',{method:'POST',headers:{'X-AX-CONFIRM-RESTORE':'yes'},body:archive});assert.equal(repeat.status,409);assert.equal((await request('/api/worlds/ahmn/documents')).json.documents.length,1);
  });
  await t.test('Logout revokes access to saved sources and backup',async()=>{
   assert.equal((await request('/api/access/logout',{method:'POST'})).status,200);assert.equal((await request('/api/status')).status,401);assert.equal((await request('/api/backup')).status,401);
  });
 }finally{if(child&&child.exitCode===null){child.kill();await once(child,'exit');}await rm(temp,{recursive:true,force:true});}
});
