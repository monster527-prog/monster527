import {mkdtemp,open,readdir,lstat,rename,rm,chmod} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {WorldStore,StoreError,WORLD_SPACES,MAX_UPLOAD_BYTES} from './world-store.mjs';
import {ChatStore,CHAT_AGENTS} from './chat-store.mjs';
const exec=promisify(execFile);
async function containsFiles(dir){for(const e of await readdir(dir,{withFileTypes:true})){if(!e.isDirectory()||await containsFiles(path.join(dir,e.name)))return true;}return false;}
export async function restoreWorldLab(store,request){
 if(await containsFiles(store.root))throw new StoreError(409,'RESTORE_NOT_EMPTY','현재 저장소에 자료가 있습니다. 기존 파일 보호를 위해 복원을 중단했습니다. 새 빈 저장소에서 가져오거나 문서를 따로 등록하세요.');
 const temp=await mkdtemp(path.join(os.tmpdir(),'ax-restore-')),archive=path.join(temp,'backup.zip'),staging=path.join(path.dirname(store.root),'.restoring-'+randomUUID());
 try{
  const handle=await open(archive,'wx',0o600);let bytes=0;
  try{for await(const chunk of request){bytes+=chunk.length;if(bytes>MAX_UPLOAD_BYTES)throw new StoreError(413,'RESTORE_SIZE','백업 ZIP은 64MiB까지 가져올 수 있습니다.');await handle.writeFile(chunk);}}finally{await handle.close();}
  let result;try{result=await exec('python3',[fileURLToPath(new URL('../scripts/restore-world-lab.py',import.meta.url)),'--archive',archive,'--output',staging],{timeout:90000,maxBuffer:65536});}
  catch(e){throw new StoreError(422,'RESTORE_INVALID',e.code==='ENOENT'?'이 서버에는 복원 도구(Python 3)가 없습니다. 호스팅 배포판에서는 포함됩니다.':'백업 형식·경로·해시 검증에 실패했습니다. 현재 저장소는 변경하지 않았습니다.');}
  const imported=new WorldStore(staging);await imported.init();let documents=0,turns=0;
  for(const w of WORLD_SPACES){const list=await imported.list(w.id);for(const doc of list.documents){await imported.content(w.id,doc.id,'original');await imported.content(w.id,doc.id,'text');documents++;}
   for(const approval of await imported.approvals(w.id)){
    const doc=await imported.effectiveMetadata(w.id,approval.documentId);
    if(doc.category!=='original'||doc.sha256!==approval.sha256||doc.textSha256!==approval.textSha256)throw new StoreError(422,'RESTORE_APPROVAL','정본 승인과 파일 해시가 일치하지 않아 복원을 중단했습니다.');
    for(const file of ['original'+doc.extension,'text.txt','metadata.json'])await chmod(path.join(imported.dir(w.id,doc.id),file),0o444);
    if(doc.activeExtractionId)for(const file of ['text.txt','extraction.json'])await chmod(path.join(imported.dir(w.id,doc.id),'extractions',doc.activeExtractionId,file),0o444);
    await chmod(path.join(imported.world(w.id),'approvals',approval.id+'.json'),0o444);
   }
   const chats=new ChatStore(imported,null);for(const a of CHAT_AGENTS)turns+=(await chats.history(w.id,a.id)).length;
  }
  const previous=store.root+'.empty-before-restore-'+randomUUID();await rename(store.root,previous);
  try{await rename(staging,store.root);}catch(e){await rename(previous,store.root);throw e;}
  return {documents,turns,files:JSON.parse(result.stdout).files,originalHistoryPreserved:true};
 }finally{await rm(temp,{recursive:true,force:true});await rm(staging,{recursive:true,force:true});}
}
