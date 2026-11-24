import {readFile,mkdir,writeFile,rename,chmod} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {StoreError} from './world-store.mjs';
export const PROVIDERS={openai:{label:'OpenAI',model:'gpt-4.1-mini',endpoint:'https://api.openai.com/v1/responses',env:'OPENAI_API_KEY'},xai:{label:'xAI / Grok',model:'grok-4',endpoint:'https://api.x.ai/v1/chat/completions',env:'XAI_API_KEY'}};
export class AIClient{
 constructor(folder){this.folder=folder;this.config={provider:'openai',model:PROVIDERS.openai.model};this.agentConfigs={};this.keys={};this.diskKeys={};this.keySources={};this.lastCalls={};}
 valid(c){return c&&PROVIDERS[c.provider]&&typeof c.model==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/.test(c.model);}
 agent(id){if(id!==undefined&&id!==null&&!['marcelo','paul'].includes(id))throw new StoreError(400,'AI_AGENT','Marcelo 또는 Paul을 선택해 주세요.');return id||undefined;}
 selected(id){this.agent(id);return this.agentConfigs[id]||this.config;}
 async init(){
  try{
   const c=JSON.parse(await readFile(path.join(this.folder,'ai.json'),'utf8'));
   if(c.schema===2){
    if(this.valid(c.defaults))this.config={provider:c.defaults.provider,model:c.defaults.model};
    for(const id of ['marcelo','paul'])if(this.valid(c.agents?.[id]))this.agentConfigs[id]={provider:c.agents[id].provider,model:c.agents[id].model};
    for(const p of Object.keys(PROVIDERS))if(typeof c.providerKeys?.[p]==='string'){this.keys[p]=c.providerKeys[p];this.diskKeys[p]=c.providerKeys[p];this.keySources[p]='disk';}
   }else if(this.valid(c)){
    this.config={provider:c.provider,model:c.model};if(typeof c.apiKey==='string'){this.keys[c.provider]=c.apiKey;this.diskKeys[c.provider]=c.apiKey;this.keySources[c.provider]='disk';}
   }
  }catch(e){if(e.code!=='ENOENT')this.configError=true;}
  if(!this.keys[this.config.provider]&&!process.env[PROVIDERS[this.config.provider].env]&&process.env.XAI_API_KEY)this.config={provider:'xai',model:PROVIDERS.xai.model};
 }
 key(provider=this.config.provider){return this.keys[provider]||process.env[PROVIDERS[provider].env]||'';}
 status(agentId){
  const config=this.selected(agentId),key=this.key(config.provider);
  return {...config,agentId:agentId||null,providerStates:Object.fromEntries(Object.keys(PROVIDERS).map(id=>[id,{configured:!!this.key(id),keySource:this.keySources[id]||(this.key(id)?'environment':'none')}])),agentConfigs:Object.fromEntries(['marcelo','paul'].map(id=>[id,this.selected(id)])),providerLabel:PROVIDERS[config.provider].label,configured:!!key,keySource:this.keySources[config.provider]||(key?'environment':'none'),lastVerifiedCall:this.lastCalls[agentId||'default']||null,configError:!!this.configError,providers:Object.entries(PROVIDERS).map(([id,p])=>({id,label:p.label,defaultModel:p.model})),note:'모델은 에이전트별, 키는 공급자별로 설정합니다. 키 등록은 실제 인증 성공이 아닙니다.'};
 }
 async configure(input){
  const {provider,model}=input,agentId=this.agent(input.agentId),persistKey=input.persistKey===true;
  if(!this.valid({provider,model}))throw new StoreError(400,'AI_CONFIG','공급자와 모델 ID를 확인해 주세요.');
  const apiKey=typeof input.apiKey==='string'?input.apiKey.trim():'';
  if(apiKey&&(apiKey.length<16||apiKey.length>512||/[\r\n\x00-\x20]/.test(apiKey)))throw new StoreError(400,'AI_KEY_FORMAT','API Key 형식을 확인해 주세요.');
  const selectedKey=apiKey||this.key(provider),nextConfig=agentId?this.config:{provider,model},nextAgents={...this.agentConfigs,...(agentId?{[agentId]:{provider,model}}:{})},nextKeys={...this.diskKeys};
  if(persistKey&&selectedKey)nextKeys[provider]=selectedKey;else delete nextKeys[provider];
  await mkdir(this.folder,{recursive:true,mode:0o700});const temp=path.join(this.folder,randomUUID()+'.tmp'),target=path.join(this.folder,'ai.json');
  await writeFile(temp,JSON.stringify({schema:2,defaults:nextConfig,agents:nextAgents,providerKeys:nextKeys},null,2),{flag:'wx',mode:0o600});await rename(temp,target);await chmod(target,0o600);
  if(apiKey||persistKey&&selectedKey){this.keys[provider]=selectedKey;this.keySources[provider]=persistKey?'disk':'session';}
  else if(selectedKey&&this.keySources[provider])this.keySources[provider]=persistKey?'disk':'session';
  this.config=nextConfig;this.agentConfigs=nextAgents;this.diskKeys=nextKeys;this.lastCalls={};this.configError=false;return this.status(agentId);
 }
 capture(agentId){return {...this.selected(agentId),agentId:agentId||null,key:this.key(this.selected(agentId).provider)};}
 async complete(messages,captured=this.capture()){
  // Capture configuration for this request; changing settings cannot change an in-flight call.
  const {provider,model,key}=captured,p=PROVIDERS[provider];
  if(!key)throw new StoreError(428,'AI_AUTH_REQUIRED','AI 연결 설정에서 API Key를 등록해 주세요. ChatGPT/Grok 구독과 API 요금은 별개입니다.');
  let response;
  const body=provider==='openai'?{model,instructions:messages[0].content,input:messages.slice(1),max_output_tokens:2400,store:false}:{model,messages,max_tokens:2400,stream:false};
  try{response=await fetch(p.endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify(body),signal:AbortSignal.timeout(90000),redirect:'error'});}
  catch(e){throw new StoreError(502,e.name==='TimeoutError'?'AI_TIMEOUT':'AI_NETWORK','모델 응답을 받지 못했습니다. 자동 재호출하지 않았습니다. 공급자 측에서 요금이 발생했을 수 있으니 기록을 확인하세요.');}
  if(!response.ok){
   const messages={401:'API Key 인증에 실패했습니다.',403:'이 계정은 해당 모델을 사용할 권한이 없습니다.',404:'모델 ID 또는 API 경로를 확인해 주세요.',429:'API 사용 한도·잔액·호출 빈도를 확인해 주세요.'};
   await response.body?.cancel();throw new StoreError(502,'AI_HTTP_'+response.status,(messages[response.status]||'모델 공급자 오류가 발생했습니다.')+' 자동 재호출하지 않았습니다.');
  }
  let data;try{data=await response.json();}catch{throw new StoreError(502,'AI_PROTOCOL','모델 응답 형식을 읽지 못했습니다.');}
  const text=provider==='openai'?(data.output||[]).filter(x=>x.type==='message').flatMap(x=>x.content||[]).filter(x=>['output_text','refusal'].includes(x.type)).map(x=>x.text||x.refusal).join('\n'):data.choices?.[0]?.message?.content;
  const incomplete=provider==='openai'?data.status==='incomplete':data.choices?.[0]?.finish_reason==='length';
  if(typeof text!=='string'||!text.trim()||typeof data.model!=='string'||typeof data.id!=='string')throw new StoreError(502,'AI_EMPTY_RESPONSE','실제 모델 응답의 본문·모델명·응답 ID를 확인하지 못했습니다. 가상 답변으로 대체하지 않습니다.');
  const result={text,provider,requestedModel:model,model:data.model,responseId:data.id,usage:data.usage||null,incomplete,completedAt:new Date().toISOString()};
  this.lastCalls[captured.agentId||'default']={provider,model:result.model,responseId:result.responseId,at:result.completedAt};return result;
 }
}
