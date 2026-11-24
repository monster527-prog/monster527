const {chromium}=await import(process.env.AX_PLAYWRIGHT_MODULE||'playwright');
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import net from 'node:net';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {WorldStore} from '../lib/world-store.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)),temp=await mkdtemp(path.join(tmpdir(),'ax-chat-ui-'));let child,browser;
try{
 const store=new WorldStore(path.join(temp,'data'));await store.init();const raw=Buffer.from('TEST ONLY: 기억은 양도할 수 없다.');
 const doc=await store.upload('ahmn',{filename:'TEST_ONLY.md',category:'development',isTest:true},(async function*(){yield raw;})());
 const listener=net.createServer();listener.listen(0,'127.0.0.1');await once(listener,'listening');const port=listener.address().port;await new Promise(r=>listener.close(r));
 const log=path.join(temp,'calls.jsonl'),base=`http://127.0.0.1:${port}`;
 child=spawn(process.execPath,['--import',process.env.AX_CHAT_TEST_PRELOAD||fileURLToPath(new URL('./fixtures/chat-provider.mjs',import.meta.url)),'server.mjs'],{cwd:root,env:{...process.env,OPENAI_API_KEY:'',XAI_API_KEY:'',PORT:String(port),AX_WORLD_DATA_DIR:store.root,AX_PRIVATE_SETTINGS_DIR:path.join(temp,'private'),AX_TEST_CALL_LOG:log},stdio:'ignore'});
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/status')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'networkidle'});await page.locator('#navigation [data-nav="chat"]').click();await page.waitForFunction(()=>document.querySelector('.chat-notice')?.textContent.includes('API Key가 없습니다'));
 assert(await page.locator('#chat-send').isDisabled());assert.equal(await page.locator('.chat-agent:not(:disabled)').count(),2);assert.equal(await page.locator('.chat-agent:disabled').count(),10);
 await page.locator('[data-chat-settings]').click();await page.locator('#chat-api-key').fill('browser-test-only-not-a-real-key');await page.locator('#chat-settings-save').click();await page.locator('dialog').waitFor({state:'hidden'});
 await page.locator('#chat-message').fill('원래 규칙을 지키며 한 가지 소주제를 제안해줘.');await page.locator('#chat-consent').check();await page.locator('#chat-send').click();await page.waitForFunction(()=>document.querySelector('.chat-answer pre')?.textContent.includes('TEST DOUBLE'));
 assert.equal(await page.evaluate(()=>!!window.bad),false);assert.match(await page.locator('.chat-response-meta').textContent(),/TEST-DOUBLE-NOT-A-LIVE-MODEL/);
 await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelector('.chat-answer pre')?.textContent.includes('TEST DOUBLE'));
 await page.locator('[data-chat-review]').click();await page.waitForFunction(()=>document.querySelector('.chat-toolbar strong')?.textContent.includes('Paul Rudolph'));
 await page.locator('#chat-consent').check();await page.locator('#chat-send').click();await page.waitForFunction(()=>document.querySelector('.chat-answer pre')?.textContent.includes('Paul 독립 평가'));
 const calls=(await readFile(log,'utf8')).trim().split('\n').map(JSON.parse);assert.equal(calls.length,2);assert(calls[1].input.at(-1).content.includes('Marcelo의 소주제'));assert(calls[1].instructions.includes('독립 평가자'));
 await page.locator('[data-chat-save]').click();await page.waitForFunction(()=>document.querySelector('[data-chat-save]')?.textContent.includes('보관됨'));await page.locator('[data-chat-open-proposal]').click();await page.locator('[data-proposal-decision="approved"]').waitFor();
 await page.locator('[data-proposal-decision="approved"]').click();await page.locator('#proposal-confirm').check();await page.locator('#proposal-note').fill('TEST ONLY — 사용자 판단 UI 시험');await page.locator('#proposal-decision-save').click();await page.locator('dialog').waitFor({state:'hidden'});await page.waitForFunction(()=>document.querySelector('.proposal-review-actions')?.textContent.includes('제안 승인'));
 assert.equal((await store.list('ahmn')).originalRevision,0);assert.deepEqual((await store.content('ahmn',doc.id,'original')).body,raw);
 await page.locator('#navigation [data-nav="chat"]').click();await page.locator('[data-chat-agent="marcelo"]').click();
 await page.locator('#chat-world').selectOption('anyeonsa');await page.waitForFunction(()=>document.querySelector('.chat-empty'));assert.equal(await page.locator('.chat-turn').count(),0);
 await page.locator('#chat-world').selectOption('ahmn');await page.waitForFunction(()=>document.querySelector('.chat-turn'));
 await mkdir(path.join(root,'verification'),{recursive:true});await page.screenshot({path:path.join(root,'verification/agent-chat-desktop.png'),fullPage:true});
 for(const width of [820,390]){await page.setViewportSize({width,height:1100});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow '+width);if(width===820)await page.screenshot({path:path.join(root,'verification/agent-chat-ipad.png'),fullPage:true});}
 assert.deepEqual(errors,[]);assert(!JSON.stringify(await page.evaluate(()=>({...localStorage}))).includes('browser-test-only'));
 assert(!(await readFile(path.join(temp,'private','ai.json'),'utf8')).includes('browser-test-only'));
 const stat=await(await fetch(base+'/api/status')).json();assert.equal((await fetch(base+'/api/chat/settings',{method:'POST',body:'{}'})).status,403);
 assert.equal((await fetch(base+'/private-settings/ai.json')).status,404);assert.equal((await fetch(base+'/api/chat/ahmn/marcelo',{method:'POST',headers:{'X-AX-CSRF':stat.csrfToken,'Content-Type':'application/json'},body:JSON.stringify({})})).status,400);
 child.kill();await once(child,'exit');
 child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,OPENAI_API_KEY:'',XAI_API_KEY:'',PORT:String(port),AX_WORLD_DATA_DIR:store.root,AX_PRIVATE_SETTINGS_DIR:path.join(temp,'private')},stdio:'ignore'});
 let restarted;
 for(let i=0;i<100;i++){try{restarted=await(await fetch(base+'/api/chat/status')).json();break;}catch{}await new Promise(r=>setTimeout(r,100));}
 assert.equal(restarted.configured,false);await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelector('.chat-answer pre')?.textContent.includes('TEST DOUBLE'));assert(await page.locator('#chat-send').isDisabled());
 const auth=await(await fetch(base+'/api/status')).json();assert.equal((await fetch(base+'/api/chat/settings',{method:'POST',headers:{'X-AX-CSRF':auth.csrfToken,Origin:'http://evil.example','Content-Type':'application/json'},body:'{}'})).status,403);
 await writeFile(path.join(root,'verification/chat-ui.json'),JSON.stringify({testedAt:new Date().toISOString(),mode:'TEST DOUBLES ONLY — NOT LIVE INFERENCE',simulatedModelCalls:calls.length,realModelCalls:0,missingAuthBlocked:true,worldAgentIsolation:true,marceloToPaulExplicitTransfer:true,proposalApprovalOriginalUnchanged:true,persistedAfterRefresh:true,persistedAfterServerRestart:true,sessionKeyAbsentAfterRestart:true,credentialsNotInBrowserStorage:true,viewportWidths:[1440,820,390],javascriptErrors:errors,userWindowsVerified:false},null,2));
 console.log('PASS chat UI using TEST DOUBLE ONLY: credential gate, 2 selected agents, model metadata, refresh, independent Paul transfer, Proposals approval, source immutability, responsive layouts; ZERO live inference calls');
}finally{if(browser)await browser.close();if(child){child.kill();await once(child,'exit');}await rm(temp,{recursive:true,force:true});}
