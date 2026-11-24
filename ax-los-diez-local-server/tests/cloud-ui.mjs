const {chromium}=await import(process.env.AX_PLAYWRIGHT_MODULE||'playwright');
import assert from 'node:assert/strict';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {WorldStore} from '../lib/world-store.mjs';
import {backupWorldLab} from '../lib/backup.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)),temp=await mkdtemp(path.join(tmpdir(),'ax-cloud-ui-'));let child,proxy,browser;
async function port(){const s=net.createServer();s.listen(0,'127.0.0.1');await once(s,'listening');const p=s.address().port;await new Promise(r=>s.close(r));return p;}
try{
 const cert=path.join(temp,'test-cert.pem'),key=path.join(temp,'test-key.pem');execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=localhost'],{stdio:'ignore'});
 const appPort=await port(),tlsPort=await port(),origin=`https://localhost:${tlsPort}`;
 proxy=https.createServer({key:await readFile(key),cert:await readFile(cert)},(req,res)=>{
  const r=http.request({hostname:'127.0.0.1',port:appPort,path:req.url,method:req.method,headers:{...req.headers,host:`localhost:${tlsPort}`,'x-forwarded-proto':'https'}},p=>{res.writeHead(p.statusCode,p.headers);p.pipe(res);});r.on('error',()=>{res.writeHead(502);res.end();});req.pipe(r);
 });proxy.listen(tlsPort,'127.0.0.1');await once(proxy,'listening');
 const log=path.join(temp,'calls.jsonl');
 child=spawn(process.execPath,['--import',fileURLToPath(new URL('./fixtures/chat-provider.mjs',import.meta.url)),'server.mjs'],{cwd:root,env:{...process.env,OPENAI_API_KEY:'',XAI_API_KEY:'',AX_OPEN_BROWSER:'0',AX_REMOTE:'1',AX_ACCESS_PASSWORD:'TEST_ONLY_cloud_owner_password',AX_PUBLIC_ORIGIN:origin,PORT:String(appPort),AX_WORLD_DATA_DIR:path.join(temp,'remote-data'),AX_PRIVATE_SETTINGS_DIR:path.join(temp,'private'),AX_TEST_CALL_LOG:log},stdio:'ignore'});
 for(let i=0;i<100;i++){try{if((await fetch(`http://127.0.0.1:${appPort}/healthz`)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 const source=new WorldStore(path.join(temp,'source'));await source.init();await source.upload('ahmn',{filename:'TEST_ONLY.md',category:'development',isTest:true},(async function*(){yield Buffer.from('TEST ONLY — 기억은 양도할 수 없다.');})());const zip=path.join(temp,'backup.zip');await backupWorldLab(source.root,zip);
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:820,height:1180},isMobile:true,hasTouch:true,ignoreHTTPSErrors:true});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/#chat',{waitUntil:'networkidle'});await page.locator('#password').waitFor();assert.equal(new URL(page.url()).pathname,'/login');await page.screenshot({path:path.join(root,'verification/cloud-login.png'),fullPage:true});
 await page.locator('#password').fill('TEST_ONLY_cloud_owner_password');await page.locator('#submit').click();await page.locator('#navigation [data-nav="worlds"]').waitFor();
 await page.locator('#navigation [data-nav="worlds"]').click();await page.locator('[data-import-backup]').waitFor();await page.locator('[data-import-backup]').click();await page.locator('#restore-file').setInputFiles(zip);await page.locator('#restore-confirm').check();await page.locator('#restore-submit').click();await page.locator('#restore-reload').waitFor();await page.locator('#restore-reload').click();await page.locator('[data-world-tab="development"]').click();await page.waitForFunction(()=>document.querySelector('.document-text')?.textContent.includes('기억은 양도'));
 await page.locator('#navigation [data-nav="chat"]').click();await page.waitForFunction(()=>document.querySelector('.chat-notice')?.textContent.includes('API Key가 없습니다'));
 await page.locator('[data-chat-settings]').click();await page.locator('#chat-api-key').fill('TEST_ONLY_NOT_A_REAL_KEY');await page.locator('#chat-persist-key').check();await page.locator('#chat-settings-save').click();await page.locator('dialog').waitFor({state:'hidden'});
 await page.locator('[data-chat-agent="paul"]').click();await page.waitForFunction(()=>document.querySelector('.chat-toolbar small')?.textContent.includes('요청 모델'));
 await page.locator('[data-chat-settings]').click();assert.match(await page.locator('#dialog-title').textContent(),/Paul/);await page.locator('#chat-model').fill('gpt-4.1');await page.locator('#chat-settings-save').click();await page.locator('dialog').waitFor({state:'hidden'});
 await page.locator('[data-chat-agent="marcelo"]').click();await page.waitForFunction(()=>document.querySelector('.chat-toolbar small')?.textContent.includes('gpt-4.1-mini'));
 await page.locator('#chat-message').fill('기존 규칙을 유지하며 소주제 하나를 제안해줘.');await page.locator('#chat-consent').check();await page.locator('#chat-send').click();await page.waitForFunction(()=>document.querySelector('.chat-answer pre')?.textContent.includes('TEST DOUBLE'));
 await page.locator('[data-chat-review]').click();await page.waitForFunction(()=>document.querySelector('.chat-toolbar small')?.textContent.includes('gpt-4.1'));await page.locator('#chat-consent').check();await page.locator('#chat-send').click();await page.waitForFunction(()=>document.querySelector('.chat-answer pre')?.textContent.includes('Paul 독립 평가'));
 const calls=(await readFile(log,'utf8')).trim().split('\n').map(JSON.parse);assert.equal(calls.length,2);assert.deepEqual(calls.map(c=>c.model),['gpt-4.1-mini','gpt-4.1']);assert.equal((await source.list('ahmn')).originalRevision,0);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(root,'verification/cloud-tablet-chat.png'),fullPage:true});
 await page.locator('#access-logout').click();await page.locator('#password').waitFor();assert.equal(new URL(page.url()).pathname,'/login');assert.deepEqual(errors,[]);
 await writeFile(path.join(root,'verification/cloud-browser.json'),JSON.stringify({testedAt:new Date().toISOString(),httpsReverseProxyTest:true,testCertificateOnly:true,tabletEmulation:true,actualSafariOrIPadVerified:false,loginLogout:true,emptyBackupImport:true,agentSpecificModels:true,realModelCalls:0,testDoubleCalls:2,actualRenderDeployment:false,publicURL:null,jsErrors:errors},null,2));console.log('PASS HTTPS browser: login, tablet upload/restore, per-agent models, explicit review, logout; TEST DOUBLE ONLY, no public deployment');
}finally{if(browser)await browser.close();if(child){child.kill();await once(child,'exit');}if(proxy)await new Promise(r=>proxy.close(r));await rm(temp,{recursive:true,force:true});}
