import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {WorldStore} from '../lib/world-store.mjs';
import {extractPDF,pdfDiagnostics} from '../lib/pdf-extract.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const bytes=b=>(async function*(){yield Buffer.from(b);})();
test('PDF recovery without Poppler, legacy files and immutable history',async t=>{
 const temp=await mkdtemp(path.join(tmpdir(),'ax-pdf-recovery-'));const saved=process.env.AX_PDFTOTEXT_PATH;
 process.env.AX_PDFTOTEXT_PATH=path.join(temp,'not-installed-pdftotext.exe');
 try{
  const pdf=path.join(temp,'korean.pdf'),scan=path.join(temp,'scan.pdf'),encrypted=path.join(temp,'encrypted.pdf');
  execFileSync('python3',['-c',`from reportlab.pdfgen.canvas import Canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.lib.pdfencrypt import StandardEncryption
import sys
pdfmetrics.registerFont(UnicodeCIDFont('HYSMyeongJo-Medium'))
c=Canvas(sys.argv[1]);c.setFont('HYSMyeongJo-Medium',14);c.drawString(30,750,'AHMN 기억의 법칙과 안연사의 이야기');c.showPage();c.drawString(30,750,'Second page preserved.');c.save()
c=Canvas(sys.argv[2]);c.rect(10,10,100,100,fill=1);c.save()
c=Canvas(sys.argv[3],encrypt=StandardEncryption('secret'));c.drawString(30,750,'Encrypted world');c.save()`,pdf,scan,encrypted]);
  const store=new WorldStore(path.join(temp,'saved'));await store.init();let doc,legacy;
  await t.test('Missing Poppler is diagnosed separately; bundled engine works on Korean multipage PDF',async()=>{
   const d=await pdfDiagnostics();assert(d.bundled.available);assert.equal(d.poppler.available,false);assert.equal(d.poppler.code,'ENOENT');
   const result=await extractPDF(pdf);assert.equal(result.extraction.method,'pdfjs');assert.equal(result.extraction.pages,2);assert.match(result.text,/기억의 법칙과 안연사의 이야기/);assert.match(result.text,/Second page/);
  });
  await t.test('New PDF upload preserves original bytes and bundled extracted text separately',async()=>{
   const raw=await readFile(pdf);doc=await store.upload('ahmn',{filename:'세계관.pdf',category:'development',isTest:true},bytes(raw));
   assert.equal(doc.extraction.method,'pdfjs');assert.equal(doc.extraction.status,'ready');assert.deepEqual((await store.content('ahmn',doc.id,'original')).body,raw);
   assert.match((await store.content('ahmn',doc.id)).body.toString(),/AHMN/);
  });
  await t.test('Old failed upload recovers without reupload; all three legacy files remain byte-identical',async()=>{
   legacy=await store.upload('anyeonsa',{filename:'기존세계관.pdf',category:'original',isTest:true},bytes(await readFile(pdf)));
   const folder=store.dir('anyeonsa',legacy.id),m=JSON.parse(await readFile(path.join(folder,'metadata.json')));
   m.extraction={status:'failed',method:'pdftotext-raw',message:'legacy generic error'};m.textSha256=hash(Buffer.from(''));m.textBytes=0;
   await writeFile(path.join(folder,'metadata.json'),JSON.stringify(m));await writeFile(path.join(folder,'text.txt'),'');
   const old=await Promise.all(['original.pdf','text.txt','metadata.json'].map(f=>readFile(path.join(folder,f))));
   const recovered=await store.reextract('anyeonsa',legacy.id);assert.equal(recovered.extraction.status,'ready');assert.equal(recovered.extractionRevision,1);
   assert.match((await store.content('anyeonsa',legacy.id)).body.toString(),/안연사/);
   for(const [i,f] of ['original.pdf','text.txt','metadata.json'].entries())assert.deepEqual(await readFile(path.join(folder,f)),old[i]);
  });
  await t.test('Repeated and concurrent re-extraction appends history; restarted store reads recovered text',async()=>{
   await Promise.all([store.reextract('anyeonsa',legacy.id),store.reextract('anyeonsa',legacy.id)]);
   assert.equal((await store.extractionHistory('anyeonsa',legacy.id)).length,3);
   const reopened=new WorldStore(store.root);await reopened.init();assert.match((await reopened.content('anyeonsa',legacy.id)).body.toString(),/기억의 법칙/);
  });
  await t.test('Approved Original freezes recovered text and rejects re-extraction',async()=>{
   const current=await store.describe('anyeonsa',legacy.id);await assert.rejects(store.approve('anyeonsa',legacy.id,{confirmed:true,sha256:current.sha256,textSha256:'stale',expectedRevision:0}),e=>e.code==='TEXT_VERSION_CHANGED');await store.approve('anyeonsa',legacy.id,{confirmed:true,sha256:current.sha256,textSha256:current.textSha256,expectedRevision:0});
   await assert.rejects(store.reextract('anyeonsa',legacy.id),e=>e.code==='APPROVED_IMMUTABLE');assert.equal((await store.approvals('anyeonsa')).length,1);
  });
  await t.test('Scan/no-text and password cases show distinct reasons without losing PDF',async()=>{
   const a=await extractPDF(scan),b=await extractPDF(encrypted);assert.equal(a.extraction.status,'needs_ocr');assert.equal(b.extraction.status,'failed');assert.equal(b.extraction.attempts[0].code,'PasswordException');
   const bad=await store.upload('ahmn',{filename:'scan.pdf',category:'development'},bytes(await readFile(scan)));await store.reextract('ahmn',bad.id);assert.equal((await store.extractionHistory('ahmn',bad.id)).length,1);assert.deepEqual((await store.content('ahmn',bad.id,'original')).body,await readFile(scan));
  });
  await t.test('Failed attempt preserves previously successful legacy text instead of replacing it with empty text',async()=>{
   const d=await store.upload('ahmn',{filename:'password.pdf',category:'development'},bytes(await readFile(encrypted)));const folder=store.dir('ahmn',d.id);
   const m=JSON.parse(await readFile(path.join(folder,'metadata.json'))),text='Previously reviewed text';m.extraction={status:'ready',method:'legacy-reviewed'};m.textBytes=Buffer.byteLength(text);m.textSha256=hash(Buffer.from(text));
   await writeFile(path.join(folder,'metadata.json'),JSON.stringify(m));await writeFile(path.join(folder,'text.txt'),text);
   const result=await store.reextract('ahmn',d.id);assert.equal(result.extraction.status,'ready');assert.equal(result.lastExtractionAttempt.extraction.status,'failed');assert.equal((await store.content('ahmn',d.id)).body.toString(),text);
  });
  await t.test('Tampered source and non-PDF retries are rejected',async()=>{
   const md=await store.upload('ahmn',{filename:'test.md',category:'development'},bytes('text'));await assert.rejects(store.reextract('ahmn',md.id),e=>e.code==='PDF_ONLY');
   await writeFile(path.join(store.dir('ahmn',doc.id),'original.pdf'),'tampered');await assert.rejects(store.reextract('ahmn',doc.id),e=>e.code==='CONTENT_CHANGED');
  });
 }finally{if(saved===undefined)delete process.env.AX_PDFTOTEXT_PATH;else process.env.AX_PDFTOTEXT_PATH=saved;await rm(temp,{recursive:true,force:true});}
});
