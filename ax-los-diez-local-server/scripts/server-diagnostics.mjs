import {writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:33000',report={node:process.versions.node,platform:process.platform,url:base,checkedAt:new Date().toISOString()};
async function check(endpoint){
 try{const r=await fetch(base+endpoint,{signal:AbortSignal.timeout(5000)});let d;try{d=await r.json();}catch{return {status:r.status,json:false};}
  return {status:r.status,json:true,version:d.appVersion||null,mode:d.mode||null,...(endpoint.includes('chat')?{keyRegistered:d.configured===true,provider:d.provider||null}:{} )};
 }catch(e){return {error:e.cause?.code||e.name||'CONNECTION_FAILED'};}
}
report.server=await check('/api/status');report.chat=await check('/api/chat/status');
console.log('AX : LOS DIEZ — server connection check');console.log(JSON.stringify(report,null,2));
if(report.server.error)console.log('33000 서버 연결 실패. START-WINDOWS.cmd 창의 오류를 확인하세요.');
else if(report.chat.status===404)console.log('채팅 API가 없는 이전 서버입니다. 이전 창에서 Ctrl+C 후 새 버전을 실행하세요.');
else if(report.chat.status===200&&!report.chat.keyRegistered)console.log('로컬 서버 연결 성공. AGENT CHAT → AI 연결 설정에서 API Key를 등록하세요.');
else if(report.chat.status===200)console.log('서버와 채팅 API가 응답합니다. 키 등록 여부는 실제 모델 인증 성공과 다릅니다.');
await writeFile(new URL('../server-diagnostics.json',import.meta.url),JSON.stringify(report,null,2));
console.log('Saved: server-diagnostics.json (no API Key or message content included)');
