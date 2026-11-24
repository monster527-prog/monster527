const {chromium}=await import(process.env.AX_PLAYWRIGHT_MODULE||'playwright');
import {WorldStore} from '../lib/world-store.mjs';
import {mkdtemp,readFile,writeFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import net from 'node:net';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url)),temp=await mkdtemp(path.join(tmpdir(),'ax-pdf-ui-'));
const data=path.join(temp,'saved'),pdf=path.join(temp,'world.pdf');let child,browser;
try{
 execFileSync('python3',['-c',"from reportlab.pdfgen.canvas import Canvas\nfrom reportlab.pdfbase import pdfmetrics\nfrom reportlab.pdfbase.cidfonts import UnicodeCIDFont\nimport sys\npdfmetrics.registerFont(UnicodeCIDFont('HYSMyeongJo-Medium'))\nc=Canvas(sys.argv[1]);c.setFont('HYSMyeongJo-Medium',14);c.drawString(30,750,'AHMN 기억과 안연사의 세계관');c.save()",pdf]);
 const store=new WorldStore(data);await store.init();const raw=await readFile(pdf);
 const d=await store.upload('ahmn',{filename:'TEST_ONLY_legacy.pdf',category:'development',isTest:true},(async function*(){yield raw;})());
 const folder=store.dir('ahmn',d.id),m=JSON.parse(await readFile(path.join(folder,'metadata.json')));
 m.extraction={status:'failed',method:'pdftotext-raw',message:'원본은 보존했지만 본문을 추출하지 못했습니다.'};m.textSha256=createHash('sha256').update('').digest('hex');m.textBytes=0;
 await writeFile(path.join(folder,'text.txt'),'');await writeFile(path.join(folder,'metadata.json'),JSON.stringify(m));
 const finder=net.createServer();finder.listen(0,'127.0.0.1');await once(finder,'listening');const port=finder.address().port;await new Promise(r=>finder.close(r));
 child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),AX_WORLD_DATA_DIR:data,AX_PDFTOTEXT_PATH:path.join(temp,'missing.exe')},stdio:'ignore'});
 const base=`http://127.0.0.1:${port}`;let token;
 for(let i=0;i<100;i++){try{token=(await(await fetch(base+'/api/status')).json()).csrfToken;break;}catch{await new Promise(r=>setTimeout(r,100));}}
 assert(token);assert.equal((await fetch(`${base}/api/worlds/ahmn/documents/${d.id}/reextract`,{method:'POST'})).status,403);
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'networkidle'});await page.locator('#navigation [data-nav="worlds"]').click();await page.locator('.storage-ready').waitFor();await page.locator('[data-world-tab="development"]').click();
 await page.locator('[data-pdf-diagnostics]').click();await page.waitForFunction(()=>document.querySelector('dialog')?.textContent.includes('ENOENT'));assert.match(await page.locator('dialog').textContent(),/사용 가능/);await page.locator('#dialog-close').click();
 await page.locator('[data-reextract-document]').click();await page.locator('#reextract-start').click();await page.locator('dialog').waitFor({state:'hidden'});await page.waitForFunction(()=>document.querySelector('.document-text')?.textContent.includes('기억과 안연사의 세계관'));
 assert.equal((await store.extractionHistory('ahmn',d.id)).length,1);assert.deepEqual(await readFile(path.join(folder,'original.pdf')),raw);assert.equal(await readFile(path.join(folder,'text.txt'),'utf8'),'');
 await page.reload({waitUntil:'networkidle'});await page.locator('.storage-ready').waitFor();await page.locator('[data-world-tab="development"]').click();await page.waitForFunction(()=>document.querySelector('.document-text')?.textContent.includes('기억과 안연사의 세계관'));
 await page.locator('[data-extraction-history]').click();await page.waitForFunction(()=>document.querySelector('dialog')?.open&&document.querySelector('dialog')?.textContent.includes('ready'));assert.match(await page.locator('dialog').textContent(),/ready/);await page.locator('#dialog-close').click();
 await page.locator('[data-upload-document]').first().click();await page.locator('#world-file').setInputFiles(pdf);await page.locator('#world-test-document').check();await page.locator('#world-upload-submit').click();await page.locator('dialog').waitFor({state:'hidden'});await page.waitForFunction(()=>document.querySelector('.document-text')?.textContent.includes('기억と')||document.querySelector('.document-text')?.textContent.includes('기억과 안연사'));
 for(const width of [1440,820,390]){await page.setViewportSize({width,height:1100});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 await page.setViewportSize({width:1440,height:1100});await mkdir(path.join(root,'verification'),{recursive:true});await page.screenshot({path:path.join(root,'verification/pdf-recovery-ui.png'),fullPage:true});assert.deepEqual(errors,[]);
 await writeFile(path.join(root,'verification/pdf-ui.json'),JSON.stringify({testedAt:new Date().toISOString(),platform:'Linux / Chromium / Node 24',popplerMissing:true,diagnostics:true,legacyReextract:true,originalBytesUnchanged:true,legacyTextUnchanged:true,koreanBodyRendered:true,refreshPersistence:true,newUpload:true,history:true,viewportWidths:[1440,820,390],jsErrors:errors,userWindowsVerified:false},null,2));
 console.log('PASS browser: Poppler missing diagnostic, legacy retry, Korean body, refresh, history, new upload, original preservation, responsive layouts');
}finally{if(browser)await browser.close();if(child){child.kill();await once(child,'exit');}await rm(temp,{recursive:true,force:true});}
