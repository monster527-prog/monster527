import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {readdir,stat,cp,rename,mkdir,readFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url)),target=path.join(root,'saved-world-lab');
const rl=createInterface({input:stdin,output:stdout});
try{
 console.log('기존 서버를 먼저 종료하세요. 이전 폴더는 수정하거나 삭제하지 않습니다.');
 console.log('새 saved-world-lab 폴더가 이미 있으면 덮어쓰지 않고 중단합니다.');
 const answer=await rl.question('이전 saved-world-lab 폴더의 전체 경로를 붙여넣으세요: ');
 const source=path.resolve(answer.trim().replace(/^"|"$/g,''));
 if(!(await stat(path.join(source,'worlds'))).isDirectory())throw new Error('worlds 폴더를 찾을 수 없습니다. saved-world-lab 폴더를 선택하세요.');
 try{await stat(target);throw new Error('새 저장 폴더가 이미 있습니다. 기존 파일 보호를 위해 가져오기를 중단합니다.');}catch(e){if(e.code!=='ENOENT')throw e;}
 const stage=path.join(root,'.importing-'+randomUUID());
 await cp(source,stage,{recursive:true,force:false,errorOnExist:true,dereference:false});
 let count=0;
 async function verify(relative=''){
  for(const entry of await readdir(path.join(source,relative),{withFileTypes:true})){
   const child=path.join(relative,entry.name);
   if(entry.isSymbolicLink())throw new Error('심볼릭 링크가 있어 자동 가져오기를 중단합니다.');
   if(entry.isDirectory())await verify(child);
   else if(entry.isFile()){
    const hash=b=>createHash('sha256').update(b).digest('hex');
    if(hash(await readFile(path.join(source,child)))!==hash(await readFile(path.join(stage,child))))throw new Error('복사 검증 실패: '+child);count++;
   }
  }
 }
 await verify();await rename(stage,target);console.log(`완료: ${count}개 파일을 복사하고 해시를 확인했습니다. 이전 파일은 그대로 있습니다.`);
}catch(e){console.error('중단:',e.message);console.error('기존 폴더는 삭제하지 마세요. 실패한 .importing 폴더가 있으면 검토 후 정리하세요.');process.exitCode=1;}
finally{rl.close();}
