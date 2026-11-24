import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {AIClient} from '../lib/ai-client.mjs';
import {ChatStore} from '../lib/chat-store.mjs';
import {WorldStore} from '../lib/world-store.mjs';
const bytes=s=>(async function*(){yield Buffer.from(s);})();
test('Chat persistence, role isolation, credentials, model protocols and proposal decisions (test doubles only)',async t=>{
 const temp=await mkdtemp(path.join(tmpdir(),'ax-chat-test-')),realFetch=globalThis.fetch;
 const envKeys={OPENAI_API_KEY:process.env.OPENAI_API_KEY,XAI_API_KEY:process.env.XAI_API_KEY};delete process.env.OPENAI_API_KEY;delete process.env.XAI_API_KEY;
 let calls=0;const sent=[];
 globalThis.fetch=async(url,options)=>{calls++;sent.push({url,options,body:JSON.parse(options.body)});return Response.json({id:'test-response-'+calls,model:'TEST-DOUBLE-MODEL',status:'completed',output:[{type:'message',content:[{type:'output_text',text:'TEST DOUBLE ONLY — 세계관 제안 '+calls}]}],usage:{input_tokens:10,output_tokens:12}});};
 try{
  const store=new WorldStore(path.join(temp,'saved'));await store.init();const ai=new AIClient(path.join(temp,'private'));await ai.init();const chats=new ChatStore(store,ai);
  const original=await store.upload('ahmn',{filename:'original.md',category:'original',isTest:true},bytes('Original: 기억은 양도할 수 없다.'));
  await store.approve('ahmn',original.id,{confirmed:true,sha256:original.sha256,expectedRevision:0});
  const development=await store.upload('ahmn',{filename:'development.md',category:'development',isTest:true},bytes('Development: 달의 주기와 기억의 관계.'));
  const ignored=await store.upload('ahmn',{filename:'proposal.md',category:'proposals',isTest:true},bytes('제안은 자동 참고하지 않는다.'));
  const input=(extra={})=>({requestId:randomUUID(),message:'한 가지 소주제를 발전시켜줘.',documentIds:[original.id,development.id],consent:true,...extra});
  let turn;
  await t.test('No credential means no model call and no fabricated response',async()=>{
   await assert.rejects(chats.send('ahmn','marcelo',input()),e=>e.code==='AI_AUTH_REQUIRED');assert.equal(calls,0);assert.deepEqual(await chats.history('ahmn','marcelo'),[]);
  });
  await t.test('Session key is redacted and absent from settings on disk; consent required',async()=>{
   const status=await ai.configure({provider:'openai',model:'gpt-4.1-mini',apiKey:'test-only-not-a-real-credential',persistKey:false});assert(status.configured);assert(!JSON.stringify(status).includes('test-only-not-a-real'));
   assert(!String(await readFile(path.join(temp,'private','ai.json'))).includes('test-only-not-a-real'));const afterRestart=new AIClient(ai.folder);await afterRestart.init();assert.equal(afterRestart.status().configured,false);
   await assert.rejects(chats.send('ahmn','marcelo',input({consent:false})),e=>e.code==='AI_CONSENT');assert.equal(calls,0);
  });
  await t.test('Current approved Original and Development are selectable; other worlds/proposals blocked',async()=>{
   const ctx=await chats.context('ahmn');assert(ctx.hasApprovedOriginal);assert.deepEqual(new Set(ctx.documents.map(d=>d.id)),new Set([original.id,development.id]));
   await assert.rejects(chats.send('ahmn','marcelo',input({documentIds:[ignored.id]})),e=>e.code==='CHAT_SOURCE_CHANGED');assert.equal(calls,0);
   await assert.rejects(chats.send('anyeonsa','marcelo',input()),e=>e.code==='CHAT_SOURCE_CHANGED');
  });
  await t.test('One explicit send makes one OpenAI API call; actual returned model, usage and snapshots preserved',async()=>{
   turn=await chats.send('ahmn','marcelo',input());assert.equal(calls,1);assert.equal(turn.assistant.model,'TEST-DOUBLE-MODEL');assert.equal(turn.sources.length,2);
   assert.equal(sent[0].url,'https://api.openai.com/v1/responses');assert.equal(sent[0].body.store,false);assert.match(sent[0].body.instructions,/Marcelo Brown/);assert.match(sent[0].body.instructions,/原本|Original/);assert.match(sent[0].body.input[0].content,/記憶|기억/);
   const history=await new ChatStore(new WorldStore(store.root),ai).history('ahmn','marcelo');assert.equal(history[0].assistant.responseId,'test-response-1');
   const snapshot=JSON.parse(await readFile(path.join(chats.dir('ahmn','marcelo'),turn.id,'context.json')));assert.match(snapshot[0].text,/기억은 양도/);
   assert.equal((await store.content('ahmn',original.id,'original')).body.toString(),'Original: 기억은 양도할 수 없다.');
  });
  await t.test('Duplicate request and other agent calls do not reuse or leak Marcelo history',async()=>{
   await assert.rejects(chats.send('ahmn','marcelo',input({requestId:turn.id})),e=>e.code==='CHAT_DUPLICATE');assert.equal(calls,1);
   assert.deepEqual(await chats.history('ahmn','paul'),[]);assert.deepEqual(await chats.history('anyeonsa','marcelo'),[]);
   await chats.send('ahmn','paul',input({message:'평가할 자료가 있는지 알려줘.'}));assert.equal(calls,2);assert.match(sent[1].body.instructions,/Paul Rudolph/);assert(!sent[1].body.input.some(m=>m.content.includes('TEST DOUBLE ONLY')));
  });
  await t.test('Only user-selected Marcelo response is sent to Paul for independent review',async()=>{
   const reviewed=await chats.send('ahmn','paul',input({message:'선택 답변을 평가해줘.',reviewTurnId:turn.id}));assert.equal(reviewed.review.turnId,turn.id);assert.equal(calls,3);assert(sent[2].body.input.at(-1).content.includes(turn.assistant.text));
   await assert.rejects(chats.send('ahmn','marcelo',input({reviewTurnId:turn.id})),e=>e.code==='REVIEW_TARGET');assert.equal(calls,3);
  });
  await t.test('Store response in Proposals once; approval/rejection never changes Original',async()=>{
   const saved=await chats.saveProposal('ahmn','marcelo',turn.id);const again=await chats.saveProposal('ahmn','marcelo',turn.id);assert.equal(saved.id,again.id);
   const p=await store.describe('ahmn',saved.id);assert.equal(p.category,'proposals');assert(p.isTest);assert.match((await store.content('ahmn',p.id)).body.toString(),/TEST-DOUBLE-MODEL/);
   await store.decideProposal('ahmn',p.id,{decision:'approved',note:'TEST ONLY 판단',confirmed:true});assert.equal((await store.describe('ahmn',p.id)).proposalDecision.decision,'approved');
   await assert.rejects(store.decideProposal('ahmn',p.id,{decision:'rejected',note:'덮어쓰기 금지',confirmed:true}),e=>e.code==='PROPOSAL_ALREADY_DECIDED');
   assert.equal((await store.list('ahmn')).originalRevision,1);assert.equal((await store.content('ahmn',original.id,'original')).body.toString(),'Original: 기억은 양도할 수 없다.');
  });
  await t.test('Model errors persist as errors with no demo response or retry',async()=>{
   const before=calls;globalThis.fetch=async()=>{calls++;return new Response('do-not-leak-secret',{status:401});};
   await assert.rejects(chats.send('ahmn','marcelo',input()),e=>e.code==='AI_HTTP_401');assert.equal(calls,before+1);
   const failed=(await chats.history('ahmn','marcelo')).find(t=>t.status==='failed');assert(failed);assert(!failed.assistant);assert(!JSON.stringify(failed).includes('do-not-leak-secret'));
  });
  await t.test('xAI protocol uses Grok endpoint and saves returned model',async()=>{
   await ai.configure({provider:'xai',model:'grok-4',apiKey:'test-xai-not-a-real-credential',persistKey:true});assert.equal(ai.status().keySource,'disk');
   const reopened=new AIClient(ai.folder);await reopened.init();assert(reopened.status().configured);
   globalThis.fetch=async(url,options)=>{calls++;assert.equal(url,'https://api.x.ai/v1/chat/completions');const body=JSON.parse(options.body);assert.equal(body.model,'grok-4');return Response.json({id:'xai-test-response',model:'TEST-GROK-MODEL',choices:[{message:{content:'TEST DOUBLE ONLY xAI'},finish_reason:'stop'}],usage:{total_tokens:22}});};
   const result=await reopened.complete([{role:'system',content:'role'},{role:'user',content:'question'}]);assert.equal(result.model,'TEST-GROK-MODEL');assert.equal(result.provider,'xai');
   await reopened.configure({provider:'xai',model:'grok-4',persistKey:false});assert(!String(await readFile(path.join(ai.folder,'ai.json'))).includes('test-xai-not-a-real'));
  });
 }finally{
  globalThis.fetch=realFetch;for(const [k,v] of Object.entries(envKeys)){if(v===undefined)delete process.env[k];else process.env[k]=v;}
  await rm(temp,{recursive:true,force:true});
 }
});
