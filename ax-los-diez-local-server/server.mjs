import http from 'node:http';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {WorldStore,StoreError,WORLD_SPACES,CATEGORIES,MAX_UPLOAD_BYTES} from './lib/world-store.mjs';
const root=path.dirname(fileURLToPath(import.meta.url)),port=Number(process.env.PORT||3000);
const dataRoot=path.resolve(process.env.AX_WORLD_DATA_DIR||path.join(root,'saved-world-lab'));
const store=new WorldStore(dataRoot);await store.init();
const token=randomBytes(32).toString('hex'),exec=promisify(execFile);
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
function authorize(req){
 const supplied=req.headers['x-ax-csrf'];if(typeof supplied!=='string'||Buffer.byteLength(supplied)!==Buffer.byteLength(token)||!timingSafeEqual(Buffer.from(supplied),Buffer.from(token)))throw new StoreError(403,'WRITE_TOKEN','저장 연결을 새로 확인해 주세요. 페이지를 새로고침한 후 다시 시도하세요.');
 if(req.headers.origin){let host;try{host=new URL(req.headers.origin).host;}catch{throw new StoreError(403,'ORIGIN','허용되지 않은 요청입니다.');}if(![req.headers.host,req.headers['x-forwarded-host']].includes(host))throw new StoreError(403,'ORIGIN','다른 사이트의 저장 요청을 허용하지 않습니다.');}
}
async function readJSON(req){let text='';for await(const c of req){text+=c;if(text.length>8192)throw new StoreError(413,'JSON_SIZE','요청이 너무 큽니다.');}try{return JSON.parse(text);}catch{throw new StoreError(400,'JSON','올바른 승인 요청이 아닙니다.');}}
const publicFiles=new Set(['index.html','app.js','world-lab.js','reference-books.js','style.css','AX-LOS-DIEZ-DEMO.html','AX-LOS-DIEZ-LAB-v2.html','AX-LOS-DIEZ-LAB-v3.html','AX-LOS-DIEZ-바로열기.zip']);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2','.zip':'application/zip'};
http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost'),name=decodeURIComponent(url.pathname);
  if(name.startsWith('/api/')){
   if(req.method==='POST')authorize(req);
   if(name==='/api/status'&&req.method==='GET')return json(res,200,{mode:'persistent-filesystem',ready:true,csrfToken:token,worlds:WORLD_SPACES,categories:CATEGORIES,maxUploadBytes:MAX_UPLOAD_BYTES});
   if(name==='/api/backup'&&req.method==='GET'){
    const temp=await mkdtemp(path.join(os.tmpdir(),'ax-world-backup-'));
    try{const zip=path.join(temp,'world-lab.zip');await exec('python3',[path.join(root,'scripts','backup-world-lab.py'),'--data-dir',dataRoot,'--output',zip],{timeout:60000});const body=await readFile(zip);res.writeHead(200,{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="AX-WORLD-LAB-backup.zip"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body);}finally{await rm(temp,{recursive:true,force:true});}return;
   }
   const list=name.match(/^\/api\/worlds\/([^/]+)\/documents$/);
   if(list&&req.method==='GET')return json(res,200,await store.list(list[1]));
   if(list&&req.method==='POST'){
    if(Number(req.headers['content-length'])>MAX_UPLOAD_BYTES)throw new StoreError(413,'TOO_LARGE','파일 하나당 최대 64MiB까지 등록할 수 있습니다.');
    const doc=await store.upload(list[1],{filename:url.searchParams.get('filename'),title:url.searchParams.get('title'),category:url.searchParams.get('category'),isTest:url.searchParams.get('isTest')==='true'},req);return json(res,201,{document:doc});
   }
   const item=name.match(/^\/api\/worlds\/([^/]+)\/documents\/([^/]+)\/(text|original|approve)$/);
   if(item&&item[3]==='approve'&&req.method==='POST')return json(res,200,{document:await store.approve(item[1],item[2],await readJSON(req))});
   if(item&&['text','original'].includes(item[3])&&req.method==='GET'){
    const data=await store.content(item[1],item[2],item[3]);if(item[3]==='text')return json(res,200,{text:data.body.toString('utf8'),extraction:data.metadata.extraction});
    res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(data.metadata.filename),'Content-Length':data.body.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data.body);return;
   }
   if(['PUT','PATCH','DELETE'].includes(req.method)||list||item)throw new StoreError(405,'IMMUTABLE','문서는 덮어쓰거나 삭제할 수 없습니다. 새 문서를 등록해 주세요.');
   throw new StoreError(404,'API_NOT_FOUND','요청한 기능을 찾을 수 없습니다.');
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  const relative=name==='/'?'index.html':name.slice(1);
  if(!(publicFiles.has(relative)||/^assets\/(?:fonts\/)?[a-zA-Z0-9_.-]+$/.test(relative))){res.writeHead(404);res.end('Not found');return;}
  const target=path.resolve(root,relative);if(!target.startsWith(root+path.sep)||!types[path.extname(target)]){res.writeHead(404);res.end('Not found');return;}
  const body=await readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:body);
 }catch(e){if(res.headersSent){res.end();return;}if(e instanceof StoreError)return json(res,e.status,{error:e.code,message:e.message});if(e.code==='ENOENT')return json(res,404,{error:'NOT_FOUND',message:'파일을 찾을 수 없습니다.'});console.error('AX request failed:',e.code||e.name);json(res,500,{error:'STORAGE_ERROR',message:'저장소 처리 중 오류가 발생했습니다. 기존 파일은 변경하지 않았습니다.'});}
}).listen(port,'127.0.0.1',()=>console.log(`AX dashboard with persistent WORLD LAB listening on port ${port}`));
