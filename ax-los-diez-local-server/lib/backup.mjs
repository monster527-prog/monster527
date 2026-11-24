import {Zip,ZipDeflate,strToU8} from '../vendor/fflate/esm/index.mjs';
import {createReadStream,createWriteStream} from 'node:fs';
import {readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import path from 'node:path';
export async function backupWorldLab(root,output){
 root=path.resolve(root);output=path.resolve(output);if(output===root||output.startsWith(root+path.sep))throw new Error('Backup output must be outside world data');
 const out=createWriteStream(output,{flags:'wx',mode:0o600}),manifest=[];let zipError;
 const done=new Promise((resolve,reject)=>{out.once('finish',resolve);out.once('error',error=>{zipError=error;reject(error);});});done.catch(()=>{});
 const zip=new Zip((error,data,final)=>{if(error){zipError=error;out.destroy(error);return;}out.write(data);if(final)out.end();});
 async function walk(relative=''){
  for(const entry of await readdir(path.join(root,relative),{withFileTypes:true})){
   if(entry.name.startsWith('.staging-')||entry.name.endsWith('.tmp'))continue;
   const rel=path.join(relative,entry.name),full=path.join(root,rel);
   if(entry.isSymbolicLink())throw new Error('Backup does not follow symbolic links');
   if(entry.isDirectory())await walk(rel);
   else if(entry.isFile()){
    const name=rel.split(path.sep).join('/'),file=new ZipDeflate('world-lab/'+name,{level:1}),hash=createHash('sha256');let bytes=0;zip.add(file);
    for await(const chunk of createReadStream(full)){hash.update(chunk);bytes+=chunk.length;file.push(chunk);if(out.writableNeedDrain)await once(out,'drain');if(zipError)throw zipError;}
    file.push(new Uint8Array(),true);manifest.push({path:name,bytes,sha256:hash.digest('hex')});
   }
  }
 }
 try{
  await walk();const m=new ZipDeflate('BACKUP-MANIFEST.json',{level:1});zip.add(m);m.push(strToU8(JSON.stringify({schema:1,files:manifest},null,2)),true);
  const r=new ZipDeflate('RESTORE.txt');zip.add(r);r.push(strToU8('로그인 후 WORLD LAB의 백업 ZIP 가져오기로 빈 저장소에 복원하세요. 기존 데이터는 덮어쓰지 않습니다.\n'),true);zip.end();await done;
 }catch(e){out.destroy(e);await done.catch(()=>{});throw e;}
 return manifest.length;
}
