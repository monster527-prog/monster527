import {createReadStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {backupWorldLab} from './lib/backup.mjs';
import {restoreWorldLab} from './lib/restore.mjs';
import {AccessGate} from './lib/access-gate.mjs';
import {openLocalBrowser} from './lib/open-browser.mjs';
import {AIClient} from './lib/ai-client.mjs';
import {ChatStore,CHAT_AGENTS} from './lib/chat-store.mjs';
import {pdfDiagnostics} from './lib/pdf-extract.mjs';
import http from 'node:http';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {WorldStore,StoreError,WORLD_SPACES,CATEGORIES,MAX_UPLOAD_BYTES} from './lib/world-store.mjs';
const root=path.dirname(fileURLToPath(import.meta.url)),port=Number(process.env.PORT||33000);
const dataRoot=path.resolve(process.env.AX_WORLD_DATA_DIR||path.join(root,'saved-world-lab'));
const store=new WorldStore(dataRoot);await store.init();
const privateRoot=path.resolve(process.env.AX_PRIVATE_SETTINGS_DIR||path.join(root,'private-settings'));
if(privateRoot===dataRoot||privateRoot.startsWith(dataRoot+path.sep))throw new Error('AI key storage must be outside world data and backup folders.');
const ai=new AIClient(privateRoot);await ai.init();
const chat=new ChatStore(store,ai);
const access=new AccessGate();
const token=randomBytes(32).toString('hex'),exec=promisify(execFile);
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
function authorize(req){
 if(access.enabled&&!access.checkOrigin(req))throw new StoreError(403,'ORIGIN','허용되지 않은 사이트의 저장 요청입니다.');
 const supplied=req.headers['x-ax-csrf'];if(typeof supplied!=='string'||Buffer.byteLength(supplied)!==Buffer.byteLength(token)||!timingSafeEqual(Buffer.from(supplied),Buffer.from(token)))throw new StoreError(403,'WRITE_TOKEN','저장 연결을 새로 확인해 주세요. 페이지를 새로고침한 후 다시 시도하세요.');
 if(req.headers.origin){let host;try{host=new URL(req.headers.origin).host;}catch{throw new StoreError(403,'ORIGIN','허용되지 않은 요청입니다.');}if(![req.headers.host,req.headers['x-forwarded-host']].includes(host))throw new StoreError(403,'ORIGIN','다른 사이트의 저장 요청을 허용하지 않습니다.');}
}
async function readJSON(req){let text='';for await(const c of req){text+=c;if(text.length>32768)throw new StoreError(413,'JSON_SIZE','요청이 너무 큽니다.');}try{return JSON.parse(text);}catch{throw new StoreError(400,'JSON','올바른 JSON 요청이 아닙니다.');}}
const publicFiles=new Set(['index.html','app.js','agent-chat.js','world-lab.js','reference-books.js','style.css','black-theme.css','AX-LOS-DIEZ-DEMO.html','AX-LOS-DIEZ-LAB-v2.html','AX-LOS-DIEZ-LAB-v3.html','AX-LOS-DIEZ-바로열기.zip']);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2','.zip':'application/zip'};
let activeWrites=0,maintenance=false;
const server=http.createServer(async(req,res)=>{
 let writing=false;
 try{
  const url=new URL(req.url,'http://localhost'),name=decodeURIComponent(url.pathname);
  if(name==='/healthz'&&req.method==='GET')return json(res,200,{ok:true,appVersion:'0.5.0'});
  if(!access.checkHost(req))throw new StoreError(403,'HOST_NOT_ALLOWED','설정된 접속 주소에서 열어 주세요.');
  if(access.enabled&&!access.encrypted(req)){res.writeHead(308,{Location:access.origin+url.pathname+url.search});res.end();return;}
  if(name==='/api/access/status'&&req.method==='GET')return json(res,200,{enabled:access.enabled,authenticated:access.authenticated(req),mode:access.enabled?'cloud':'local'});
  if(name==='/login'&&req.method==='GET'){
   if(!access.enabled||access.authenticated(req)){res.writeHead(302,{Location:'/'});res.end();return;}
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Frame-Options':'DENY','Content-Security-Policy':"frame-ancestors 'none'; base-uri 'none'; form-action 'self'"});res.end(access.loginHTML());return;
  }
  if(name==='/api/access/login'&&req.method==='POST'){
   if(!access.enabled||!access.checkOrigin(req))throw new StoreError(403,'ORIGIN','허용되지 않은 로그인 요청입니다.');
   const input=await readJSON(req),result=access.login(input.password,req.socket.remoteAddress);
   if(result.cookie)res.setHeader('Set-Cookie',result.cookie);return json(res,result.status,{ok:result.status===200,...(result.message?{message:result.message}:{})});
  }
  if(!access.authenticated(req)){
   if(name.startsWith('/api/'))throw new StoreError(401,'LOGIN_REQUIRED','로그인이 필요합니다.');
   res.writeHead(302,{Location:'/login','Cache-Control':'no-store'});res.end();return;
  }
  res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','same-origin');
  if(name==='/api/access/logout'&&req.method==='POST'){
   authorize(req);res.setHeader('Set-Cookie',access.logout(req));return json(res,200,{ok:true});
  }
  if(name.startsWith('/api/')){
   if(maintenance)throw new StoreError(503,'MAINTENANCE','자료를 백업·복원하고 있습니다. 완료 후 다시 시도하세요.');
   if(req.method==='POST'){authorize(req);activeWrites++;writing=true;}
   if(name==='/api/chat/status'&&req.method==='GET')return json(res,200,{...ai.status(url.searchParams.get('agent')||undefined),agents:CHAT_AGENTS});
   if(name==='/api/chat/settings'&&req.method==='POST')return json(res,200,await ai.configure(await readJSON(req)));
   if(name==='/api/chat/context'&&req.method==='GET')return json(res,200,await chat.context(url.searchParams.get('world')));
   const conversation=name.match(/^\/api\/chat\/([^/]+)\/([^/]+)$/);
   if(conversation&&req.method==='GET')return json(res,200,{turns:await chat.history(conversation[1],conversation[2])});
   if(conversation&&req.method==='POST')return json(res,200,{turn:await chat.send(conversation[1],conversation[2],await readJSON(req))});
   const saveChat=name.match(/^\/api\/chat\/([^/]+)\/([^/]+)\/([^/]+)\/proposal$/);
   if(saveChat&&req.method==='POST')return json(res,200,await chat.saveProposal(saveChat[1],saveChat[2],saveChat[3]));
   if(name==='/api/status'&&req.method==='GET')return json(res,200,{appVersion:'0.5.0',localOnly:!access.enabled,mode:'persistent-filesystem',ready:true,csrfToken:token,worlds:WORLD_SPACES,categories:CATEGORIES,maxUploadBytes:MAX_UPLOAD_BYTES});
   if(name==='/api/pdf-diagnostics'&&req.method==='GET')return json(res,200,await pdfDiagnostics());
   if(name==='/api/import-backup'&&req.method==='POST'){
    if(activeWrites!==1)throw new StoreError(409,'RESTORE_BUSY','다른 작업이 끝난 후 백업을 가져오세요.');
    if(req.headers['x-ax-confirm-restore']!=='yes')throw new StoreError(400,'RESTORE_CONFIRM','빈 저장소에 정본·대화 이력을 복원함을 확인해 주세요.');
    maintenance=true;try{return json(res,200,await restoreWorldLab(store,req));}finally{maintenance=false;}
   }
   if(name==='/api/backup'&&req.method==='GET'){
    if(activeWrites)throw new StoreError(409,'BACKUP_BUSY','문서·대화 저장이 끝난 후 백업하세요.');maintenance=true;
    let temp;
    try{temp=await mkdtemp(path.join(os.tmpdir(),'ax-world-backup-'));const zip=path.join(temp,'world-lab.zip');await backupWorldLab(dataRoot,zip);res.writeHead(200,{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="AX-WORLD-LAB-backup.zip"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});await pipeline(createReadStream(zip),res);}finally{maintenance=false;if(temp)await rm(temp,{recursive:true,force:true});}return;
   }
   const list=name.match(/^\/api\/worlds\/([^/]+)\/documents$/);
   if(list&&req.method==='GET')return json(res,200,await store.list(list[1]));
   if(list&&req.method==='POST'){
    if(Number(req.headers['content-length'])>MAX_UPLOAD_BYTES)throw new StoreError(413,'TOO_LARGE','파일 하나당 최대 64MiB까지 등록할 수 있습니다.');
    const doc=await store.upload(list[1],{filename:url.searchParams.get('filename'),title:url.searchParams.get('title'),category:url.searchParams.get('category'),isTest:url.searchParams.get('isTest')==='true'},req);return json(res,201,{document:doc});
   }
   const item=name.match(/^\/api\/worlds\/([^/]+)\/documents\/([^/]+)\/(text|original|approve|reextract|extractions|decision)$/);
   if(item&&item[3]==='decision'&&req.method==='POST')return json(res,200,{document:await store.decideProposal(item[1],item[2],await readJSON(req))});
   if(item&&item[3]==='reextract'&&req.method==='POST')return json(res,200,{document:await store.reextract(item[1],item[2])});
   if(item&&item[3]==='extractions'&&req.method==='GET')return json(res,200,{history:await store.extractionHistory(item[1],item[2])});
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
  const body=await readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)],'Cache-Control':access.enabled&&path.extname(target)==='.html'?'no-store':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:body);
 }catch(e){if(res.headersSent){res.end();return;}if(e instanceof StoreError)return json(res,e.status,{error:e.code,message:e.message});if(e.code==='ENOENT')return json(res,404,{error:'NOT_FOUND',message:'파일을 찾을 수 없습니다.'});console.error('AX request failed:',e.code||e.name);json(res,500,{error:'STORAGE_ERROR',message:'저장소 처리 중 오류가 발생했습니다. 화면을 새로고침하여 저장 상태를 확인해 주세요.'});}finally{if(writing)activeWrites--;}
});
server.on('error',error=>{
 console.error(error.code==='EADDRINUSE'?`포트 ${port}가 이미 사용 중입니다. 이전 서버 창에서 Ctrl+C로 종료한 뒤 다시 실행하세요.`:`서버 시작 실패: ${error.code||error.name}`);process.exitCode=1;
});
server.listen(port,access.enabled?'0.0.0.0':'127.0.0.1',()=>{
 console.log('AX server READY — '+(access.enabled?access.origin+'/#chat':`http://127.0.0.1:${port}/#chat`));
 console.log(access.enabled?'HTTPS 개인 작업 공간 모드 · 접속 비밀번호 필요':'PC 로컬 모드 · 이 창을 닫으면 서버가 종료됩니다.');
 if(!access.enabled&&process.env.AX_OPEN_BROWSER==='1')openLocalBrowser(port);
});
let stopping=false;
function shutdown(){
 if(stopping)return;stopping=true;
 console.log('Stopping: waiting for active requests. Incomplete model calls are never auto-retried.');
 server.close(()=>process.exit(0));server.closeIdleConnections?.();
 setTimeout(()=>process.exit(0),25000).unref();
}
process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);
