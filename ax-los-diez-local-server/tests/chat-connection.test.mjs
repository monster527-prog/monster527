import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../agent-chat.js',import.meta.url),'utf8');
async function page(protocol,fetch){
 const context=vm.createContext({location:{protocol},fetch,AbortSignal,Intl,Date,console,
  agents:[{id:'04',name:'Marcelo Brown',initials:'MB',role:'기존 강화'},{id:'08',name:'Paul Rudolph',initials:'PR',role:'독립 평가'}],
  worlds:[{id:'AHMN'}],WorldLab:{worldKeys:['ahmn']},icon:()=>'',escapeHTML:s=>String(s).replaceAll('<','&lt;'),$:()=>null,$$:()=>[]});
 vm.runInContext(source+';globalThis.chatTest=AgentChat;',context);context.chatTest.mount(()=>{});
 await new Promise(resolve=>setTimeout(resolve,20));return context.chatTest.renderPage();
}
test('Direct file opening makes no API calls and explains how to start the real server',async()=>{
 let calls=0;const html=await page('file:',async()=>{calls++;throw new TypeError('Failed to fetch');});
 assert.equal(calls,0);assert.match(html,/HTML 파일을 직접 연 상태/);assert.match(html,/START-WINDOWS.cmd/);assert.match(html,/로컬 서버 미연결/);assert.match(html,/http:\/\/127.0.0.1:33000/);assert(!html.includes('서버 확인 중'));
});
test('Network failure is localized and does not pretend API authentication was checked',async()=>{
 const html=await page('http:',async()=>{throw new TypeError('Failed to fetch');});assert.match(html,/로컬 서버 응답을 받지 못했습니다/);assert(!html.includes('Failed to fetch'));assert.match(html,/CHECK-SERVER-WINDOWS.cmd/);
});
test('Older server with no chat endpoint is identified separately from missing credentials',async()=>{
 const html=await page('http:',async url=>url==='/api/chat/status'?Response.json({message:'not found'},{status:404}):Response.json({csrfToken:'test'}));
 assert.match(html,/이 서버에는 채팅 API가 없습니다/);assert.match(html,/이전 서버를 종료/);
});
