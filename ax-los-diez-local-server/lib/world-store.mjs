import {extractPDF} from './pdf-extract.mjs';
import {mkdir,readFile,readdir,rename,rm,chmod,open,stat} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
export const WORLD_SPACES=[{id:'ahmn',name:'AHMN'},{id:'middle-earth',name:'중간계'},{id:'anyeonsa',name:'안연사'},{id:'unnamed-1',name:'언네임드1'},{id:'unnamed-2',name:'언네임드2'}];
export const CATEGORIES=['original','development','progress','proposals'];
export const MAX_UPLOAD_BYTES=64*1024*1024;
const MAX_TEXT_BYTES=24*1024*1024;
const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
const digest=b=>createHash('sha256').update(b).digest('hex');
export class StoreError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code;}}
async function write(file,data){const h=await open(file,'wx',0o600);try{await h.writeFile(data);await h.sync();}finally{await h.close();}}
function decode(bytes){
 let encoding=bytes[0]===255&&bytes[1]===254?'utf-16le':bytes[0]===254&&bytes[1]===255?'utf-16be':'utf-8',text;
 try{text=new TextDecoder(encoding,{fatal:true}).decode(bytes);}catch{try{encoding='euc-kr';text=new TextDecoder(encoding,{fatal:true}).decode(bytes);}catch{throw new StoreError(422,'ENCODING','텍스트를 읽지 못했습니다. UTF-8로 저장한 파일을 올려 주세요.');}}
 if(text.includes('\0'))throw new StoreError(422,'BINARY_TEXT','텍스트에 바이너리 데이터가 들어 있습니다.');
 return {text,encoding};
}
export class WorldStore{
 constructor(root){this.root=path.resolve(root);this.locks=new Map();}
 world(id){if(!WORLD_SPACES.some(w=>w.id===id))throw new StoreError(404,'WORLD_NOT_FOUND','세계관을 찾을 수 없습니다.');return path.join(this.root,'worlds',id);}
 dir(world,id){if(!uuid.test(id))throw new StoreError(404,'DOCUMENT_NOT_FOUND','문서를 찾을 수 없습니다.');return path.join(this.world(world),'documents',id);}
 async init(){for(const w of WORLD_SPACES)for(const f of ['documents','approvals'])await mkdir(path.join(this.world(w.id),f),{recursive:true});}
 async approvals(world){
  const folder=path.join(this.world(world),'approvals');
  const files=(await readdir(folder)).filter(f=>/^[a-f0-9-]+\.json$/.test(f));
  const records=await Promise.all(files.map(async f=>JSON.parse(await readFile(path.join(folder,f),'utf8'))));
  records.sort((a,b)=>a.revision-b.revision);
  for(let i=0;i<records.length;i++)if(records[i].revision!==i+1||records[i].previousApprovalId!==(records[i-1]?.id||null))throw new StoreError(500,'APPROVAL_HISTORY','승인 이력에 문제가 있어 저장을 중단했습니다.');
  return records;
 }
 async metadata(world,id){
  try{const m=JSON.parse(await readFile(path.join(this.dir(world,id),'metadata.json'),'utf8'));if(m.id!==id||m.worldId!==world||!CATEGORIES.includes(m.category)||!['.pdf','.txt','.md'].includes(m.extension))throw new Error('metadata');return m;}
  catch(e){if(e instanceof StoreError)throw e;if(e.code==='ENOENT')throw new StoreError(404,'DOCUMENT_NOT_FOUND','문서를 찾을 수 없습니다.');throw new StoreError(500,'METADATA_INTEGRITY','문서 정보가 손상되어 읽기를 중단했습니다.');}
 }
 async describe(world,id,history){const m=await this.effectiveMetadata(world,id);history||=await this.approvals(world);const approval=history.find(a=>a.documentId===id);return {...m,status:approval?'approved':m.category==='original'?'pending_approval':'registered',locked:!!approval,approval:approval||null};}
 async list(world){
  const dir=path.join(this.world(world),'documents'),history=await this.approvals(world),entries=await readdir(dir,{withFileTypes:true});
  const documents=await Promise.all(entries.filter(e=>e.isDirectory()&&uuid.test(e.name)).map(e=>this.describe(world,e.name,history)));
  documents.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));return {worldId:world,documents,originalRevision:history.length,currentOriginalId:history.at(-1)?.documentId||null};
 }
 async upload(world,{filename,title,category,isTest},request){
  const w=this.world(world);
  if(!CATEGORIES.includes(category))throw new StoreError(400,'CATEGORY','문서 분류를 선택해 주세요.');
  if(!filename||/[\\/\x00-\x1f]/.test(filename)||Buffer.byteLength(filename)>240)throw new StoreError(400,'FILENAME','올바른 파일명을 사용해 주세요.');
  const extension=path.extname(filename).toLowerCase();
  if(!['.pdf','.txt','.md'].includes(extension))throw new StoreError(415,'FILE_TYPE','PDF, TXT, MD만 등록할 수 있습니다.');
  if(title&&title.length>200)throw new StoreError(400,'TITLE','제목은 200자 이내로 입력해 주세요.');
  const id=randomUUID(),stage=path.join(w,'documents','.staging-'+id),target=path.join(w,'documents',id);await mkdir(stage);
  try{
   const original=path.join(stage,'original'+extension),textPath=path.join(stage,'text.txt'),h=await open(original,'wx',0o600),hash=createHash('sha256');let bytes=0;
   try{for await(const chunk of request){bytes+=chunk.length;if(bytes>MAX_UPLOAD_BYTES)throw new StoreError(413,'TOO_LARGE','파일 하나당 최대 64MiB까지 등록할 수 있습니다.');hash.update(chunk);await h.writeFile(chunk);}await h.sync();}finally{await h.close();}
   if(!bytes)throw new StoreError(400,'EMPTY_FILE','빈 파일은 등록할 수 없습니다.');
   let text='',encoding='utf-8',extraction={status:'ready',method:'text-decoder',message:null};
   if(extension==='.pdf'){
    const handle=await open(original,'r'),header=Buffer.alloc(8);try{await handle.read(header,0,8,0);}finally{await handle.close();}
    if(!header.toString('ascii').startsWith('%PDF-'))throw new StoreError(422,'INVALID_PDF','PDF 형식이 올바르지 않습니다.');
    ({text,extraction}=await extractPDF(original));
   }else{if(bytes>MAX_TEXT_BYTES)throw new StoreError(413,'TEXT_TOO_LARGE','텍스트 문서는 최대 24MiB까지 등록할 수 있습니다.');({text,encoding}=decode(await readFile(original)));if(!text.trim())extraction={...extraction,status:'empty_text',message:'본문이 비어 있습니다.'};}
   await write(textPath,text);
   const metadata={schema:1,id,worldId:world,category,title:title?.trim()||path.basename(filename,extension),filename,extension,bytes,sha256:hash.digest('hex'),textSha256:digest(Buffer.from(text)),textBytes:Buffer.byteLength(text),encoding,extraction,isTest:!!isTest,createdAt:new Date().toISOString()};
   await write(path.join(stage,'metadata.json'),JSON.stringify(metadata,null,2)+'\n');await rename(stage,target);return await this.describe(world,id);
  }catch(e){await rm(stage,{recursive:true,force:true});throw e;}
 }
 async extractionHistory(world,id){
  const m=await this.metadata(world,id),folder=path.join(this.dir(world,id),'extractions');
  let entries;try{entries=await readdir(folder,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return [];throw e;}
  const records=await Promise.all(entries.filter(e=>e.isDirectory()&&uuid.test(e.name)).map(async e=>{
   const r=JSON.parse(await readFile(path.join(folder,e.name,'extraction.json'),'utf8'));
   if(r.id!==e.name||r.originalSha256!==m.sha256)throw new StoreError(409,'EXTRACTION_INTEGRITY','추출 이력 무결성을 확인할 수 없습니다.');return r;
  }));return records.sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
 }
 async effectiveMetadata(world,id){
  const m=await this.metadata(world,id),history=await this.extractionHistory(world,id);
  const ready=history.filter(r=>r.extraction.status==='ready');
  const current=ready.at(-1)||(m.extraction.status==='ready'?null:history.at(-1));
  return {...m,...(current?{extraction:current.extraction,textSha256:current.textSha256,textBytes:current.textBytes,activeExtractionId:current.id}:{}),extractionRevision:history.length,lastExtractionAttempt:history.at(-1)||null};
 }
 async reextract(world,id){
  this.world(world);const previous=this.locks.get(world)||Promise.resolve();
  const result=previous.catch(()=>{}).then(async()=>{
   const m=await this.metadata(world,id);
   if(m.extension!=='.pdf')throw new StoreError(400,'PDF_ONLY','PDF 문서만 다시 추출할 수 있습니다.');
   if((await this.approvals(world)).some(a=>a.documentId===id))throw new StoreError(409,'APPROVED_IMMUTABLE','승인된 Original의 본문은 고정됩니다. 새 후보를 등록해 주세요.');
   await this.content(world,id,'original');
   const result=await extractPDF(path.join(this.dir(world,id),'original.pdf'));
   const revisionId=randomUUID(),folder=path.join(this.dir(world,id),'extractions');await mkdir(folder,{recursive:true});
   const stage=path.join(folder,'.staging-'+revisionId),target=path.join(folder,revisionId);await mkdir(stage);
   try{
    const record={schema:1,id:revisionId,originalSha256:m.sha256,createdAt:new Date().toISOString(),textSha256:digest(Buffer.from(result.text)),textBytes:Buffer.byteLength(result.text),extraction:result.extraction};
    await write(path.join(stage,'text.txt'),result.text);await write(path.join(stage,'extraction.json'),JSON.stringify(record,null,2)+'\n');await rename(stage,target);
   }catch(e){await rm(stage,{recursive:true,force:true});throw e;}
   // Existing original.pdf, text.txt and metadata.json are never overwritten.
   return await this.describe(world,id);
  });this.locks.set(world,result.then(()=>{},()=>{}));return result;
 }
 async content(world,id,kind='text'){
  const m=await this.effectiveMetadata(world,id),file=path.join(this.dir(world,id),kind==='original'?'original'+m.extension:m.activeExtractionId?'extractions/'+m.activeExtractionId+'/text.txt':'text.txt'),body=await readFile(file),expected=kind==='original'?m.sha256:m.textSha256;
  if(digest(body)!==expected)throw new StoreError(409,'CONTENT_CHANGED','파일 무결성이 달라져 읽기와 승인을 중단했습니다.');return {metadata:m,body};
 }
 async approve(world,id,input){
  this.world(world);const previous=this.locks.get(world)||Promise.resolve();
  const result=previous.catch(()=>{}).then(async()=>{
   const m=await this.effectiveMetadata(world,id);
   if(m.category!=='original')throw new StoreError(400,'NOT_ORIGINAL','Original 후보만 승인할 수 있습니다.');
   if(input.confirmed!==true||input.sha256!==m.sha256)throw new StoreError(400,'EXPLICIT_APPROVAL','선택한 파일에 대한 명시적인 사용자 확인이 필요합니다.');
   if(m.activeExtractionId&&input.textSha256!==m.textSha256)throw new StoreError(409,'TEXT_VERSION_CHANGED','추출 본문이 바뀌었습니다. 새로고침 후 본문을 다시 확인해 주세요.');
   if(m.extraction.status!=='ready')throw new StoreError(409,'TEXT_REVIEW_REQUIRED','추출된 본문을 확인할 수 있어야 Original로 승인할 수 있습니다.');
   const history=await this.approvals(world);
   if(history.some(a=>a.documentId===id))throw new StoreError(409,'ALREADY_APPROVED','이미 승인된 문서입니다.');
   if(input.expectedRevision!==history.length)throw new StoreError(409,'REVISION_CHANGED','원본 버전이 바뀌었습니다. 목록을 다시 확인해 주세요.');
   await this.content(world,id,'original');await this.content(world,id,'text');
   const approval={schema:1,id:randomUUID(),documentId:id,sha256:m.sha256,textSha256:m.textSha256,revision:history.length+1,previousApprovalId:history.at(-1)?.id||null,confirmedBy:'user',approvedAt:new Date().toISOString()};
   for(const file of ['original'+m.extension,'text.txt','metadata.json'])await chmod(path.join(this.dir(world,id),file),0o444);
   if(m.activeExtractionId)for(const file of ['text.txt','extraction.json'])await chmod(path.join(this.dir(world,id),'extractions',m.activeExtractionId,file),0o444);
   const final=path.join(this.world(world),'approvals',approval.id+'.json'),temporary=final+'.tmp';await write(temporary,JSON.stringify(approval,null,2)+'\n');await rename(temporary,final);await chmod(final,0o444);
   return await this.describe(world,id);
  });this.locks.set(world,result.then(()=>{},()=>{}));return result;
 }
}
