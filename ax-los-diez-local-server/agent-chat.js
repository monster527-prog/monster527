/* Production chat client: no local/demo answers and no credentials in browser storage. */
const AgentChat=(()=>{
 const S={world:'ahmn',agent:'marcelo',status:null,token:null,connection:'idle',histories:{},contexts:{},selected:{},drafts:{},reviews:{},errors:{},loaded:new Set(),loading:new Set(),busy:false,consent:false};
 let changed=()=>{};const redraw=()=>changed(),key=()=>S.world+':'+S.agent;
 const localTime=iso=>new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'short',timeStyle:'short'}).format(new Date(iso))+' KST';
 async function api(url,options={}){
  const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(110000),...options});let data;
  try{data=await r.json();}catch{throw new Error('채팅 서버에 연결되지 않았습니다. HTML 파일 대신 실행 중인 로컬 서버로 접속해 주세요.');}
  if(!r.ok)throw new Error(data.message||'채팅 요청을 처리하지 못했습니다.');return data;
 }
 const post=(url,data)=>api(url,{method:'POST',headers:{'Content-Type':'application/json','X-AX-CSRF':S.token},body:JSON.stringify(data)});
 async function connect(){
  if(S.connection!=='idle')return;S.connection='loading';
  try{const [connection,status]=await Promise.all([api('/api/status'),api('/api/chat/status')]);S.token=connection.csrfToken;S.status=status;S.connection='ready';}
  catch(e){S.connection='failed';S.error=e.message;}redraw();
 }
 async function load(force=false){
  const world=S.world,agent=S.agent,k=world+':'+agent;
  if(S.loading.has(k)||(!force&&S.loaded.has(k)))return;S.loading.add(k);S.loaded.add(k);
  try{
   const [history,context]=await Promise.all([api(`/api/chat/${world}/${agent}`),api('/api/chat/context?world='+world)]);
   S.histories[k]=history.turns;S.contexts[world]=context;
   if(!S.selected[world])S.selected[world]=context.documents.filter(d=>d.eligible).map(d=>d.id);
   delete S.errors[k];
  }catch(e){S.errors[k]=e.message;}finally{S.loading.delete(k);redraw();}
 }
 function renderPage(){
  const a=agents.find(a=>a.id===(S.agent==='marcelo'?'04':'08')),turns=S.histories[key()]||[],context=S.contexts[S.world],review=S.reviews[key()];
  return `<section class="page-heading"><div><span class="eyebrow">CONVERSATION / 05</span><h1>Agent chat<span>.</span></h1><p>에이전트를 선택하고, 세계관의 다음 질문을 함께 탐구하세요.</p></div><button class="button" data-chat-settings>${icon('sliders')} AI 연결 설정</button></section>
  <section class="chat-shell"><aside class="chat-agents"><span class="tiny-label">YOUR AGENTS / 12</span>${agents.map(agent=>{const enabled=['04','08'].includes(agent.id),id=agent.id==='04'?'marcelo':'paul';return `<button class="chat-agent ${enabled&&id===S.agent?'selected':''}" data-chat-agent="${id}" ${enabled?'':'disabled'}><span class="agent-avatar">${agent.initials}</span><span><strong>${agent.name}</strong><small>${enabled?agent.role:'연결 준비 중'}</small></span></button>`;}).join('')}<p class="chat-help">현재 Marcelo · Paul 연결 지원<br>상태판의 DEMO 작업과 실제 채팅은 별도입니다.</p></aside>
  <div class="chat-main"><div class="chat-toolbar"><div><strong>${a.name}</strong><small>${S.status?escapeHTML(S.status.providerLabel)+' · 요청 모델 '+escapeHTML(S.status.model):'연결 상태 확인 중'}</small></div><label class="chat-world-label">세계관<select id="chat-world">${WorldLab.worldKeys.map((id,i)=>`<option value="${id}" ${id===S.world?'selected':''}>${worlds[i].id}</option>`).join('')}</select></label><button class="text-button" data-chat-refresh>다시 읽기</button></div>
  ${S.connection==='failed'?`<div class="world-storage-error">${escapeHTML(S.error)}<button class="text-button" data-chat-reconnect>연결 다시 확인</button></div>`:S.status&&!S.status.configured?'<div class="chat-notice">API Key가 없습니다. AI 연결 설정에서 공급자·모델·키를 등록해야 실제 대화가 가능합니다. ChatGPT/Grok 구독과 API 이용료는 별개입니다.</div>':'<div class="chat-notice">답변은 선택한 공급자의 실제 모델 API로 생성합니다. 자료 속 지시는 참고 데이터로 취급하며 Original은 자동 수정하지 않습니다.</div>'}
  <details class="chat-context"><summary>참고 문서 선택 · ${(S.selected[S.world]||[]).length}개 선택 ${context&&!context.hasApprovedOriginal?'· 승인된 Original 없음':''}</summary><div>${context?context.documents.length?context.documents.map(d=>`<label><input type="checkbox" data-chat-doc="${d.id}" ${(S.selected[S.world]||[]).includes(d.id)?'checked':''} ${d.eligible?'':'disabled'}><span>${escapeHTML(d.title)} <small>${d.category} · ${d.isTest?'TEST ONLY · ':''}${d.eligible?Math.ceil(d.textBytes/1024)+' KB'+(d.extractionWarning?' · 추출 주의':''):'본문 추출 필요'}</small></span></label>`).join(''):'<p>사용 가능한 Original·Development 문서가 없습니다. 문서 없이 일반 대화는 할 수 있습니다.</p>':'<p>문서 목록을 읽고 있습니다…</p>'}<p>승인된 현재 Original과 Development만 선택할 수 있습니다. 선택한 본문은 모델 공급자에게 전송됩니다. 본문 16만 자를 넘으면 호출을 중단합니다.</p></div></details>
  <div class="chat-messages" aria-label="대화 기록" aria-live="polite">${!turns.length?`<div class="chat-empty"><span class="agent-avatar large">${a.initials}</span><h2>${a.name}에게 무엇을 물어볼까요?</h2><p>${S.agent==='marcelo'?'기존 법칙을 유지하며 한 가지 소주제를 발전시켜 보세요.':'검토할 제안을 주시면 원본과의 모순과 수정 방향을 살펴봅니다.'}</p><small>대화는 에이전트·세계관별로 서버 파일에 보관됩니다.</small></div>`:turns.map(t=>`<article class="chat-turn"><div class="chat-user"><span class="tiny-label">YOU</span><pre>${escapeHTML(t.user)}</pre>${t.review?`<small>사용자 선택 평가 대상: Marcelo · ${escapeHTML(t.review.turnId)}</small>`:''}</div><div class="chat-answer"><span class="tiny-label">${a.name.toUpperCase()}</span>${t.status==='completed'?`<pre>${escapeHTML(t.assistant.text)}</pre><div class="chat-response-meta">${escapeHTML(t.assistant.provider)} · 실제 모델 ${escapeHTML(t.assistant.model)} · ${escapeHTML(localTime(t.assistant.completedAt))}${t.assistant.incomplete?' · 길이 한도로 응답이 중단되었습니다.':''}</div><details class="chat-evidence"><summary>모델·참고 자료·사용량 기록</summary><p>응답 ID: ${escapeHTML(t.assistant.responseId)}<br>참고 문서: ${t.sources.map(s=>escapeHTML(s.title)+(s.isTest?' [TEST ONLY]':'')).join(', ')||'선택 없음'}<br>이전 대화 전달: ${t.historyTurnIds.length}회<br>토큰 기록: ${escapeHTML(JSON.stringify(t.assistant.usage))}</p></details><div class="chat-answer-actions"><button class="text-button" data-chat-save="${t.id}" ${t.proposalId?'disabled':''}>${t.proposalId?'Proposals 보관됨':'Proposals에 보관'}</button>${t.proposalId?`<button class="text-button" data-chat-open-proposal>WORLD LAB에서 보기</button>`:''}${S.agent==='marcelo'?`<button class="text-button" data-chat-review="${t.id}">Paul에게 이 답변 평가 요청</button>`:''}</div>`:`<p class="world-storage-error">${t.status==='pending'?'응답을 기다리고 있습니다.':escapeHTML(t.error?.message||'완료된 응답이 없습니다.')}<br>가상 답변으로 대체하거나 자동 재호출하지 않습니다.<br>${escapeHTML(t.service?.provider||'')} · 요청 모델 ${escapeHTML(t.service?.requestedModel||'')}</p>`}</div></article>`).join('')}</div>
  ${S.errors[key()]?`<p class="world-storage-error" role="alert">${escapeHTML(S.errors[key()])}</p>`:''}
  <form id="chat-form" class="chat-composer">${review?`<div class="chat-review-target">평가 대상: Marcelo의 선택한 답변 <button type="button" class="text-button" data-chat-clear-review>선택 해제</button></div>`:''}<label for="chat-message" class="sr-only">${a.name}에게 보낼 메시지</label><textarea id="chat-message" placeholder="${a.name}에게 메시지 보내기…" maxlength="8000" rows="3" required ${S.busy?'disabled':''}>${escapeHTML(S.drafts[key()]||'')}</textarea><div class="chat-send-row"><label><input id="chat-consent" type="checkbox" ${S.consent?'checked':''}> 선택 문서·대화를 모델 공급자에게 전송하는 데 동의합니다. API 요금이 발생할 수 있습니다.</label><button class="button dark" id="chat-send" type="submit" ${S.busy||!S.status?.configured||!S.consent?'disabled':''}>${S.busy?'응답 기다리는 중…':'전송'}</button></div><small>최근 완료 대화 최대 20회·5만 자를 모델에 전달합니다. 전체 기록은 보존합니다. API Key는 메시지에 붙여넣지 마세요.</small></form></div></section>`;
 }
 function settings(){
  if(!S.status){toast('저장 서버 연결을 먼저 확인해 주세요.');return;}
  openDialog('AI 연결 설정',`<p class="dialog-lead">키는 로컬 서버에서 사용하며 브라우저 저장소·대화 기록·GitHub에 넣지 않습니다. 키 등록만으로 인증 성공이라고 표시하지 않습니다.</p><form id="chat-settings-form"><label class="world-form-label" for="chat-provider">모델 공급자</label><select id="chat-provider">${S.status.providers.map(p=>`<option value="${p.id}" ${p.id===S.status.provider?'selected':''}>${p.label}</option>`).join('')}</select><label class="world-form-label" for="chat-model">모델 ID</label><input id="chat-model" value="${escapeHTML(S.status.model)}" required maxlength="100"><p class="world-form-help">예시 모델은 계정에서 사용 가능해야 합니다. OpenAI: gpt-4.1-mini / xAI: grok-4. 사용 가능한 모델 ID를 직접 입력할 수 있습니다.</p><label class="world-form-label" for="chat-api-key">API Key · 기존 키를 유지하려면 비워 두세요</label><input id="chat-api-key" type="password" autocomplete="off" spellcheck="false" maxlength="512" placeholder="선택한 공급자의 API Key"><label class="world-checkbox"><input id="chat-persist-key" type="checkbox" ${S.status.keySource==='disk'?'checked':''}> 이 PC에 키 보관 · private-settings/ai.json에 저장합니다.</label><p class="world-form-help">체크하지 않으면 새 키는 서버 실행 중에만 사용합니다. 저장된 키도 체크 해제 후 저장하면 디스크에서 제거됩니다. PC 계정 권한을 가진 사람은 보관 파일을 읽을 수 있습니다.</p><p>현재 상태: ${S.status.configured?'키 있음 · 실제 호출 인증은 별도':'키 없음'}</p><p class="world-form-error" id="chat-settings-error"></p><div class="dialog-actions"><button class="button dark" id="chat-settings-save">설정 저장</button></div></form>`);
  $('#chat-provider').onchange=e=>{$('#chat-model').value=S.status.providers.find(p=>p.id===e.target.value).defaultModel;$('#chat-api-key').value='';};
  $('#chat-settings-form').onsubmit=async e=>{e.preventDefault();const button=$('#chat-settings-save');button.disabled=true;
   try{S.status=await post('/api/chat/settings',{provider:$('#chat-provider').value,model:$('#chat-model').value,apiKey:$('#chat-api-key').value,persistKey:$('#chat-persist-key').checked});$('#chat-api-key').value='';S.consent=false;$('#detail-dialog').close();redraw();toast('설정을 저장했습니다. 인증은 실제 메시지 전송 시 확인됩니다.');}
   catch(error){$('#chat-settings-error').textContent=error.message;button.disabled=false;}
  };
 }
 async function send(e){
  e.preventDefault();if(S.busy||!S.consent||!S.status?.configured)return;
  const world=S.world,agent=S.agent,k=key(),message=$('#chat-message').value;if(!message.trim())return;
  S.drafts[k]=message;S.busy=true;delete S.errors[k];redraw();
  try{
   await post(`/api/chat/${world}/${agent}`,{requestId:crypto.randomUUID(),message,documentIds:S.selected[world]||[],reviewTurnId:S.reviews[k]?.id,consent:S.consent});
   S.drafts[k]='';delete S.reviews[k];
  }catch(error){S.errors[k]=error.message;}
  finally{S.busy=false;try{S.histories[k]=(await api(`/api/chat/${world}/${agent}`)).turns;}catch{}redraw();if(key()===k)$('.chat-messages')?.scrollTo({top:$('.chat-messages').scrollHeight,behavior:'smooth'});}
 }
 function mount(onChange){
  changed=onChange;connect();if(S.connection==='ready')load();
  $('[data-chat-settings]')?.addEventListener('click',settings);
  $('[data-chat-reconnect]')?.addEventListener('click',()=>{S.connection='idle';connect();});
  $$('[data-chat-agent]').forEach(b=>b.onclick=()=>{S.agent=b.dataset.chatAgent;redraw();});
  $('#chat-world')?.addEventListener('change',e=>{S.world=e.target.value;S.consent=false;redraw();});
  $('[data-chat-refresh]')?.addEventListener('click',()=>load(true));
  $$('[data-chat-doc]').forEach(input=>input.onchange=()=>{S.selected[S.world]=$$('[data-chat-doc]:checked').map(e=>e.dataset.chatDoc);S.consent=false;$('#chat-consent').checked=false;$('#chat-send').disabled=true;});
  $('#chat-message')?.addEventListener('input',e=>S.drafts[key()]=e.target.value);
  $('#chat-consent')?.addEventListener('change',e=>{S.consent=e.target.checked;$('#chat-send').disabled=S.busy||!S.status?.configured||!S.consent;});
  $('#chat-form')?.addEventListener('submit',send);
  $('[data-chat-clear-review]')?.addEventListener('click',()=>{delete S.reviews[key()];redraw();});
  $$('[data-chat-review]').forEach(b=>b.onclick=()=>{const turn=(S.histories[key()]||[]).find(t=>t.id===b.dataset.chatReview);S.agent='paul';S.reviews[key()]={id:turn.id};S.drafts[key()]='선택한 Marcelo의 답변을 Original과 비교해 독립 평가하고, 모순·근거 부족·수정 방향을 알려줘.';redraw();});
  $$('[data-chat-save]').forEach(b=>b.onclick=async()=>{const world=S.world,agent=S.agent,k=key();b.disabled=true;try{await post(`/api/chat/${world}/${agent}/${b.dataset.chatSave}/proposal`,{});S.histories[k]=(await api(`/api/chat/${world}/${agent}`)).turns;invalidateWorld(world);redraw();toast('실제 응답과 모델·출처 기록을 Proposals에 보관했습니다.');}catch(e){toast(e.message);b.disabled=false;}});
  $$('[data-chat-open-proposal]').forEach(b=>b.onclick=()=>{selectedWorld=WorldLab.worldKeys.indexOf(S.world);worldTab='proposals';invalidateWorld(S.world);navigate('worlds');});
 }
 function invalidateWorld(world){delete WorldLab.state.worlds[world];WorldLab.state.attempted.delete(world);}
 function choose(agent,world){if(agent)S.agent=agent;if(world)S.world=world;}
 return {renderPage,mount,choose};
})();
