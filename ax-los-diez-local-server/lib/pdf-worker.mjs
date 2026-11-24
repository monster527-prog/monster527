import {parentPort,workerData} from 'node:worker_threads';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import DOMMatrix from '../vendor/dommatrix/dist/dommatrix.mjs';
globalThis.DOMMatrix=DOMMatrix;
let task;
try {
 const {getDocument}=await import('../vendor/pdfjs/legacy/build/pdf.mjs');
 const base=new URL('../vendor/pdfjs/',import.meta.url);
 task=getDocument({data:new Uint8Array(await readFile(workerData.file)),
  cMapUrl:fileURLToPath(new URL('cmaps/',base)),cMapPacked:true,
  standardFontDataUrl:fileURLToPath(new URL('standard_fonts/',base)),
  wasmUrl:fileURLToPath(new URL('wasm/',base)),
  useSystemFonts:false,disableFontFace:true,isEvalSupported:false,
  useWasm:false,verbosity:0});
 const pdf=await task.promise;
 if(pdf.numPages>5000)throw Object.assign(new Error('page limit'),{code:'PAGE_LIMIT'});
 const pages=[];let bytes=0,emptyPages=0;
 for(let n=1;n<=pdf.numPages;n++){
  const page=await pdf.getPage(n),content=await page.getTextContent();
  let text='';for(const item of content.items)if(typeof item.str==='string')text+=item.str+(item.hasEOL?'\n':' ');
  text=text.trim();if(!text)emptyPages++;
  const section=`[PDF page ${n}]\n${text}`;bytes+=Buffer.byteLength(section);
  if(bytes>24*1024*1024)throw Object.assign(new Error('text limit'),{code:'TEXT_LIMIT'});
  pages.push(section);page.cleanup();
 }
 parentPort.postMessage({ok:true,text:emptyPages===pdf.numPages?'':pages.join('\n\n'),pages:pdf.numPages,emptyPages,version:'6.5.438'});
}catch(e){parentPort.postMessage({ok:false,code:typeof e.code==='string'?e.code:e.name||'PDF_ERROR'});}
finally{if(task)await task.destroy().catch(()=>{});}
