import {Worker} from 'node:worker_threads';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {access,readFile,mkdtemp,rm,stat} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const exec=promisify(execFile),limit=24*1024*1024;
const command=()=>process.env.AX_PDFTOTEXT_PATH?.replace(/^"|"$/g,'')||'pdftotext';
const messages={ENOENT:'Poppler의 pdftotext 실행 파일을 찾지 못했습니다.',EACCES:'pdftotext 실행 권한이 없습니다.',PasswordException:'암호화된 PDF입니다. 암호가 해제된 사본이 필요합니다.',InvalidPDFException:'PDF 구조가 손상되었거나 올바른 PDF가 아닙니다.',TIMEOUT:'PDF 추출 제한 시간(90초)을 초과했습니다.',TEXT_LIMIT:'추출 텍스트가 24MiB 한도를 초과했습니다.',PAGE_LIMIT:'PDF 페이지 수가 5,000쪽 한도를 초과했습니다.',WORKER_MEMORY:'PDF 처리 메모리 한도를 초과했습니다.'};
function internal(file){return new Promise(resolve=>{
 let done=false;
 const worker=new Worker(new URL('./pdf-worker.mjs',import.meta.url),{workerData:{file},execArgv:[],resourceLimits:{maxOldGenerationSizeMb:384}});
 const finish=result=>{if(done)return;done=true;clearTimeout(timer);worker.terminate();resolve(result);};
 const timer=setTimeout(()=>finish({ok:false,code:'TIMEOUT'}),90000);
 worker.once('message',finish);worker.once('error',e=>finish({ok:false,code:e.code==='ERR_WORKER_OUT_OF_MEMORY'?'WORKER_MEMORY':e.code||'ENGINE_ERROR'}));
 worker.once('exit',()=>finish({ok:false,code:'ENGINE_EXIT'}));
});}
export async function pdfDiagnostics(){
 let bundled=false;try{await access(new URL('../vendor/pdfjs/legacy/build/pdf.mjs',import.meta.url));await access(new URL('../vendor/pdfjs/legacy/build/pdf.worker.mjs',import.meta.url));bundled=true;}catch{}
 let poppler;
 try{
  const v=await exec(command(),['-v'],{timeout:5000,maxBuffer:65536});let resolved=command();
  if(!path.isAbsolute(resolved))try{resolved=(await exec(process.platform==='win32'?'where.exe':'which',[resolved],{timeout:5000})).stdout.trim().split(/\r?\n/)[0];}catch{}
  poppler={available:true,command:resolved,version:(v.stderr||v.stdout).split(/\r?\n/)[0]};
 }catch(e){poppler={available:false,command:command(),code:e.code||'COMMAND_FAILED',message:messages[e.code]||'pdftotext 버전을 확인하지 못했습니다.'};}
 return {node:process.versions.node,platform:process.platform,bundled:{available:bundled,engine:'PDF.js',version:'6.5.438'},poppler,ocrAvailable:false};
}
export async function extractPDF(file){
 const attempts=[],result=await internal(file);
 if(result.ok){
  const extraction={status:result.text.trim()?'ready':'needs_ocr',method:'pdfjs',engineVersion:result.version,pages:result.pages,emptyPages:result.emptyPages,
   message:!result.text.trim()?'읽을 수 있는 텍스트가 없습니다. 스캔/윤곽선 PDF라면 OCR이 필요합니다.':result.emptyPages?`${result.pages}쪽 중 ${result.emptyPages}쪽에는 추출 가능한 텍스트가 없습니다. 스캔 페이지를 확인해 주세요.`:null};
  if(extraction.status==='ready')return {text:result.text,extraction};
  attempts.push({engine:'pdfjs',code:'NO_TEXT'});
 }else attempts.push({engine:'pdfjs',code:result.code,message:messages[result.code]||'내장 PDF 추출기가 본문을 읽지 못했습니다.'});
 // Poppler is optional. Never invoke a shell or send the PDF to an external service.
 const temp=await mkdtemp(path.join(os.tmpdir(),'ax-pdf-'));
 try{
  const target=path.join(temp,'text.txt');await exec(command(),['-enc','UTF-8','-raw',file,target],{timeout:60000,maxBuffer:1024*1024});
  if((await stat(target)).size>limit)throw Object.assign(new Error('limit'),{code:'TEXT_LIMIT'});
  const text=await readFile(target,'utf8');
  if(text.trim())return {text,extraction:{status:'ready',method:'pdftotext-raw',message:null,attempts}};
  attempts.push({engine:'poppler',code:'NO_TEXT'});
 }catch(e){attempts.push({engine:'poppler',code:e.code||'COMMAND_FAILED',message:messages[e.code]||'Poppler로 본문을 읽지 못했습니다.'});}
 finally{await rm(temp,{recursive:true,force:true});}
 const noText=result.ok;
 return {text:'',extraction:{status:noText?'needs_ocr':'failed',method:'pdfjs',message:noText?'추출 가능한 텍스트가 없습니다. 스캔/윤곽선 PDF는 OCR이 필요합니다.':messages[result.code]||'PDF를 읽지 못했습니다. PDF 진단에서 오류 코드를 확인해 주세요.',attempts}};
}
