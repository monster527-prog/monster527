/* Production chat client: no local/demo answers and no credentials in browser storage. */
const AgentChat=(()=>{
 const S={world:'ahmn',agent:'marcelo',status:null,token:null,connection:'idle',histories:{},contexts:{},selected:{},drafts:{},reviews:{},errors:{},loaded:new Set(),loading:new Set(),busy:false,consent:false};
 let changed=()=>{};const redraw=()=>changed(),key=()=>S.world+':'+S.agent;
 const localTime=iso=>new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'short',timeStyle:'short'}).format(new Date(iso))+' KST';
 async function api(url,options={}){
  if(!['http:','https:'].includes(location.protocol))throw new Error('HTML 파일을 직접 연 상태입니다. START-WINDOWS.cmd를 실행하고 자동으로 열리는 브라우저에서 사용하세요.');
  let r;
  try{r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(110000),...options});}
  catch(e){throw new Error(e.name==='TimeoutError'?'서버 응답 시간이 초과되었습니다. 작업이 끝났을 수 있으니 기록을 다시 읽어 확인하세요. 자동 재전송하지 않았습니다.':'로컬 서버 응답을 받지 못했습니다. START-WINDOWS.cmd 실행 창을 확인하고 서버가 준비된 뒤 다시 연결하세요.');}
  if(r.status===404&&url.startsWith('/api/chat/status'))throw new Error('이 서버에는 채팅 API가 없습니다. 이전 서버를 종료하고 새 채팅 버전 폴더의 START-WINDOWS.cmd를 실행하세요.');
  let data;try{data=await r.json();}catch{throw new Error('대시보드 서버의 JSON 응답이 아닙니다. HTML 미리보기 대신 START-WINDOWS.cmd로 연 화면을 사용하세요.');}
  if(r.status===401&&data.error==='LOGIN_REQUIRED'){location.assign('/login');throw new Error('로그인이 만료되었습니다. 다시 로그인해 주세요.');}
  if(!r.ok)throw new Error(data.message||'채팅 요청을 처리하지 못했습니다.');return data;
 }
 const post=(url,data)=>api(url,{method:'POST',headers:{'Content-Type':'application/json','X-AX-CSRF':S.token},body:JSON.stringify(data)});
 async function connect(){
  if(S.connection!=='idle')return;S.connection='loading';const agent=S.agent;
  try{const [connection,status]=await Promise.all([api('/api/status'),api('/api/chat/status?agent='+agent)]);S.token=connection.csrfToken;S.status=agent===S.agent?status:null;S.connection='ready';}
  catch(e){S.connection='failed';S.status=null;S.token=null;S.error=e.message;}redraw();
 }
 async function load(force=false){
  const world=S.world,agent=S.agent,k=world+':'+agent;
  if(S.loading.has(k)||(!force&&S.loaded.has(k)))return;S.loading.add(k);S.loaded.add(k);
  try{
   const [history,context,status]=await Promise.all([api(`/api/chat/${world}/${agent}`),api('/api/chat/context?world='+world),api('/api/chat/status?agent='+agent)]);
   if(S.world===world&&S.agent===agent)S.status=status;
   S.histories[k]=history.turns;S.contexts[world]=context;
   if(!S.selected[world])S.selected[world]=context.documents.filter(d=>d.eligible).map(d=>d.id);
   delete S.errors[k];
  }catch(e){S.errors[k]=e.message;}finally{S.loading.delete(k);redraw();}
 }
 function avatar(a,large=false){
  const colors={'01':'#ff8b32','02':'#f6ac3c','03':'#bbb8ad','04':'#bb8653','05':'#5b89ef','06':'#28b8a8','07':'#ff515f','08':'#f0f0ee','09':'#8b8b8b','10':'#b0c1cd','11':'#25c68c','12':'#b17af0'};
  const shapes=['M12 20Q17 5 34 10Q51 7 54 25Q65 39 49 49Q32 61 17 51Q1 49 9 34Q2 27 12 20Z','M13 9Q38 1 48 18Q66 34 50 49Q36 62 20 50Q1 48 7 29Q1 17 13 9Z','M18 8Q35 1 46 15L56 35Q61 49 45 53L22 58Q6 60 6 43L8 23Q8 12 18 8Z','M18 12Q30 1 44 12Q61 11 56 29Q67 43 50 50Q41 64 28 52Q7 62 10 41Q-1 27 18 12Z'];
  const n=Number(a.id)||4;
  return `<span class="chat-avatar ${large?'chat-avatar-large':''}" aria-hidden="true"><svg viewBox="0 0 64 64"><path fill="${colors[a.id]||'#d0d0d0'}" d="${shapes[n%shapes.length]}"/><g stroke="#101010" stroke-width="6" stroke-linecap="round" transform="rotate(-17 32 32)"><path d="M26 27v7M39 27v7"/></g></svg></span>`;
 }
 function renderPage(){
  const a=agents.find(a=>a.id===(S.agent==='marcelo'?'04':'08')),turns=S.histories[key()]||[],context=S.contexts[S.world],review=S.reviews[key()];
  return `<section class="page-heading"><div><span class="eyebrow">CONVERSATION / 05</span><h1>Agent chat<span>.</span></h1><p>에이전트를 선택하고, 세계관의 다음 질문을 함께 탐구하세요.</p></div><button class="button" data-chat-settings>${icon('sliders')} AI 연결 설정</button></section>
  <section class="chat-shell"><aside class="chat-agents"><span class="tiny-label">YOUR AGENTS / 12</span>${agents.map(agent=>{const enabled=['04','08'].includes(agent.id),id=agent.id==='04'?'marcelo':agent.id==='08'?'paul':'unavailable-'+agent.id;return `<button class="chat-agent ${enabled&&id===S.agent?'selected':''}" data-chat-agent="${id}" ${enabled?'':'disabled'}>${avatar(agent)}<span><strong>${agent.name}</strong><small>${enabled?agent.role:'이번 버전 채팅 미지원'}</small></span></button>`;}).join('')}<p class="chat-help">채팅 지원: Marcelo · Paul<br>나머지 10명은 이번 버전에서 선택할 수 없습니다.</p></aside>
  <div class="chat-main"><div class="chat-toolbar"><div class="chat-active-agent">${avatar(a)}<span><strong>${a.name}</strong><small>${S.status?escapeHTML(S.status.providerLabel)+' · 요청 모델 '+escapeHTML(S.status.model):(S.connection==='failed'?'로컬 서버 미연결':'서버 확인 중')}</small></span></div><label class="chat-world-label">세계관<select id="chat-world">${WorldLab.worldKeys.map((id,i)=>`<option value="${id}" ${id===S.world?'selected':''}>${worlds[i].id}</option>`).join('')}</select></label><button class="text-button" data-chat-refresh>다시 읽기</button></div>
  ${S.connection==='failed'?`<div class="world-storage-error">${escapeHTML(S.error)}<div class="chat-recovery-actions"><a class="button" href="http://127.0.0.1:33000/#chat" target="_blank" rel="noopener">실행 중인 PC 서버 열기</a><button class="text-button" data-chat-reconnect>연결 다시 확인</button></div><small>먼저 서버 실행이 필요합니다. 진단이 필요하면 CHECK-SERVER-WINDOWS.cmd를 실행하세요. 이 주소는 서버를 켠 PC에서만 사용할 수 있습니다.</small></div>`:S.status&&!S.status.configured?'<div class="chat-notice">API Key가 없습니다. AI 연결 설정에서 공급자·모델·키를 등록해야 실제 대화가 가능합니다. ChatGPT/Grok 구독과 API 이용료는 별개입니다.</div>':'<div class="chat-notice">답변은 선택한 공급자의 실제 모델 API로 생성합니다. 자료 속 지시는 참고 데이터로 취급하며 Original은 자동 수정하지 않습니다.</div>'}
  <details class="chat-context"><summary>참고 문서 선택 · ${(S.selected[S.world]||[]).length}개 선택 ${context&&!context.hasApprovedOriginal?'· 승인된 Original 없음':''}</summary><div>${context?context.documents.length?context.documents.map(d=>`<label><input type="checkbox" data-chat-doc="${d.id}" ${(S.selected[S.world]||[]).includes(d.id)?'checked':''} ${d.eligible?'':'disabled'}><span>${escapeHTML(d.title)} <small>${d.category} · ${d.isTest?'TEST ONLY · ':''}${d.eligible?Math.ceil(d.textBytes/1024)+' KB'+(d.extractionWarning?' · 추출 주의':''):'본문 추출 필요'}</small></span></label>`).join(''):'<p>사용 가능한 Original·Development 문서가 없습니다. 문서 없이 일반 대화는 할 수 있습니다.</p>':'<p>문서 목록을 읽고 있습니다…</p>'}<p>승인된 현재 Original과 Development만 선택할 수 있습니다. 선택한 본문은 모델 공급자에게 전송됩니다. 본문 16만 자를 넘으면 호출을 중단합니다.</p></div></details>
  <div class="chat-messages" aria-label="대화 기록" aria-live="polite">${!turns.length?`<div class="chat-empty">${avatar(a,true)}<h2>${a.name}에게 무엇을 물어볼까요?</h2><p>${S.agent==='marcelo'?'기존 법칙을 유지하며 한 가지 소주제를 발전시켜 보세요.':'검토할 제안을 주시면 원본과의 모순과 수정 방향을 살펴봅니다.'}</p><small>대화는 에이전트·세계관별로 서버 파일에 보관됩니다.</small></div>`:turns.map(t=>`<article class="chat-turn"><div class="chat-user"><span class="tiny-label">YOU</span><pre>${escapeHTML(t.user)}</pre>${t.review?`<small>사용자 선택 평가 대상: Marcelo · ${escapeHTML(t.review.turnId)}</small>`:''}</div><div class="chat-answer"><span class="tiny-label">${a.name.toUpperCase()}</span>${t.status==='completed'?`<pre>${escapeHTML(t.assistant.text)}</pre><div class="chat-response-meta">${escapeHTML(t.assistant.provider)} · 실제 모델 ${escapeHTML(t.assistant.model)} · ${escapeHTML(localTime(t.assistant.completedAt))}${t.assistant.incomplete?' · 길이 한도로 응답이 중단되었습니다.':''}</div><details class="chat-evidence"><summary>모델·참고 자료·사용량 기록</summary><p>응답 ID: ${escapeHTML(t.assistant.responseId)}<br>참고 문서: ${t.sources.map(s=>escapeHTML(s.title)+(s.isTest?' [TEST ONLY]':'')).join(', ')||'선택 없음'}<br>이전 대화 전달: ${t.historyTurnIds.length}회<br>토큰 기록: ${escapeHTML(JSON.stringify(t.assistant.usage))}</p></details><div class="chat-answer-actions"><button class="text-button" data-chat-save="${t.id}" ${t.proposalId?'disabled':''}>${t.proposalId?'Proposals 보관됨':'Proposals에 보관'}</button>${t.proposalId?`<button class="text-button" data-chat-open-proposal>WORLD LAB에서 보기</button>`:''}${S.agent==='marcelo'?`<button class="text-button" data-chat-review="${t.id}">Paul에게 이 답변 평가 요청</button>`:''}</div>`:`<p class="world-storage-error">${t.status==='pending'?'응답을 기다리고 있습니다.':escapeHTML(t.error?.message||'완료된 응답이 없습니다.')}<br>가상 답변으로 대체하거나 자동 재호출하지 않습니다.<br>${escapeHTML(t.service?.provider||'')} · 요청 모델 ${escapeHTML(t.service?.requestedModel||'')}</p>`}</div></article>`).join('')}</div>
  ${S.errors[key()]?`<p class="world-storage-error" role="alert">${escapeHTML(S.errors[key()])}</p>`:''}
  <form id="chat-form" class="chat-composer">${review?`<div class="chat-review-target">평가 대상: Marcelo의 선택한 답변 <button type="button" class="text-button" data-chat-clear-review>선택 해제</button></div>`:''}<label for="chat-message" class="sr-only">${a.name}에게 보낼 메시지</label><textarea id="chat-message" placeholder="${a.name}에게 메시지 보내기…" maxlength="8000" rows="3" required ${S.busy?'disabled':''}>${escapeHTML(S.drafts[key()]||'')}</textarea><div class="chat-send-row"><label><input id="chat-consent" type="checkbox" ${S.consent?'checked':''}> 선택 문서·대화를 모델 공급자에게 전송하는 데 동의합니다. API 요금이 발생할 수 있습니다.</label><button class="button dark" id="chat-send" type="submit" aria-label="메시지 전송" title="메시지 전송" ${S.busy||!S.status?.configured||!S.consent?'disabled':''}>${S.busy?icon('clock'):'↑'}</button></div><small>최근 완료 대화 최대 20회·5만 자를 모델에 전달합니다. 전체 기록은 보존합니다. API Key는 메시지에 붙여넣지 마세요.</small></form></div></section>`;
 }
 function settings(){
  if(!S.status){toast('저장 서버 연결을 먼저 확인해 주세요.');return;}
  const settingAgent=S.agent;openDialog((S.agent==='marcelo'?'Marcelo Brown':'Paul Rudolph')+' · AI 연결 설정',`<p class="dialog-lead">모델은 현재 에이전트에만 적용하고, 같은 공급자의 키는 두 에이전트가 공유합니다. 키는 서버에서 사용하며 브라우저 저장소·대화 기록·GitHub에 넣지 않습니다. 키 등록만으로 인증 성공이라고 표시하지 않습니다.</p><form id="chat-settings-form"><label class="world-form-label" for="chat-provider">모델 공급자</label><select id="chat-provider">${S.status.providers.map(p=>`<option value="${p.id}" ${p.id===S.status.provider?'selected':''}>${p.label}</option>`).join('')}</select><label class="world-form-label" for="chat-model">모델 ID</label><input id="chat-model" value="${escapeHTML(S.status.model)}" required maxlength="100"><p class="world-form-help">예시 모델은 계정에서 사용 가능해야 합니다. OpenAI: gpt-4.1-mini / xAI: grok-4. 사용 가능한 모델 ID를 직접 입력할 수 있습니다.</p><label class="world-form-label" for="chat-api-key">API Key · 기존 키를 유지하려면 비워 두세요</label><input id="chat-api-key" type="password" autocomplete="off" spellcheck="false" maxlength="512" placeholder="선택한 공급자의 API Key"><label class="world-checkbox"><input id="chat-persist-key" type="checkbox" ${S.status.keySource==='disk'?'checked':''}> 이 서버에 키 보관 · 개인 설정 파일에 저장합니다.</label><p class="world-form-help">체크하지 않으면 새 키는 서버 실행 중에만 사용합니다. 저장된 키도 체크 해제 후 저장하면 디스크에서 제거됩니다. 로컬 모드에서는 PC, 외부 배포에서는 호스팅 서버에 저장합니다. 서버 관리자 권한을 가진 사람은 파일을 읽을 수 있습니다.</p><p>현재 상태: ${S.status.configured?'키 있음 · 실제 호출 인증은 별도':'키 없음'}</p><p class="world-form-error" id="chat-settings-error"></p><div class="dialog-actions"><button class="button dark" id="chat-settings-save">설정 저장</button></div></form>`);
  $('#chat-provider').onchange=e=>{$('#chat-model').value=S.status.providers.find(p=>p.id===e.target.value).defaultModel;$('#chat-api-key').value='';$('#chat-persist-key').checked=S.status.providerStates?.[e.target.value]?.keySource==='disk';};
  $('#chat-settings-form').onsubmit=async e=>{e.preventDefault();const button=$('#chat-settings-save');button.disabled=true;
   try{S.status=await post('/api/chat/settings',{agentId:settingAgent,provider:$('#chat-provider').value,model:$('#chat-model').value,apiKey:$('#chat-api-key').value,persistKey:$('#chat-persist-key').checked});$('#chat-api-key').value='';S.consent=false;$('#detail-dialog').close();redraw();toast('설정을 저장했습니다. 인증은 실제 메시지 전송 시 확인됩니다.');}
   catch(error){$('#chat-settings-error').textContent=error.message;button.disabled=false;}
  };
 }
 async function send(e){
  e.preventDefault();if(S.connection!=='ready'||S.busy||!S.consent||!S.status?.configured)return;
  const world=S.world,agent=S.agent,k=key(),message=$('#chat-message').value;if(!message.trim())return;
  S.drafts[k]=message;S.busy=true;delete S.errors[k];redraw();
  try{
   await post(`/api/chat/${world}/${agent}`,{requestId:typeof crypto.randomUUID==='function'?crypto.randomUUID():uuidFallback(),message,documentIds:S.selected[world]||[],reviewTurnId:S.reviews[k]?.id,consent:S.consent,expectedProvider:S.status.provider,expectedModel:S.status.model});
   S.drafts[k]='';delete S.reviews[k];
  }catch(error){S.errors[k]=error.message;}
  finally{S.busy=false;try{S.histories[k]=(await api(`/api/chat/${world}/${agent}`)).turns;}catch{}redraw();if(key()===k)$('.chat-messages')?.scrollTo({top:$('.chat-messages').scrollHeight,behavior:'smooth'});}
 }
 function mount(onChange){
  changed=onChange;connect();if(S.connection==='ready')load();
  $('[data-chat-settings]')?.addEventListener('click',settings);
  $('[data-chat-reconnect]')?.addEventListener('click',()=>{S.connection='idle';connect();});
  $$('[data-chat-agent]').forEach(b=>b.onclick=()=>{S.agent=b.dataset.chatAgent;S.status=null;S.loaded.delete(key());redraw();});
  $('#chat-world')?.addEventListener('change',e=>{S.world=e.target.value;S.consent=false;redraw();});
  $('[data-chat-refresh]')?.addEventListener('click',()=>load(true));
  $$('[data-chat-doc]').forEach(input=>input.onchange=()=>{S.selected[S.world]=$$('[data-chat-doc]:checked').map(e=>e.dataset.chatDoc);S.consent=false;$('#chat-consent').checked=false;$('#chat-send').disabled=true;});
  $('#chat-message')?.addEventListener('input',e=>S.drafts[key()]=e.target.value);
  $('#chat-consent')?.addEventListener('change',e=>{S.consent=e.target.checked;$('#chat-send').disabled=S.busy||!S.status?.configured||!S.consent;});
  $('#chat-form')?.addEventListener('submit',send);
  $('[data-chat-clear-review]')?.addEventListener('click',()=>{delete S.reviews[key()];redraw();});
  $$('[data-chat-review]').forEach(b=>b.onclick=()=>{const turn=(S.histories[key()]||[]).find(t=>t.id===b.dataset.chatReview);S.agent='paul';S.status=null;S.loaded.delete(key());S.reviews[key()]={id:turn.id};S.drafts[key()]='선택한 Marcelo의 답변을 Original과 비교해 독립 평가하고, 모순·근거 부족·수정 방향을 알려줘.';redraw();});
  $$('[data-chat-save]').forEach(b=>b.onclick=async()=>{const world=S.world,agent=S.agent,k=key();b.disabled=true;try{await post(`/api/chat/${world}/${agent}/${b.dataset.chatSave}/proposal`,{});S.histories[k]=(await api(`/api/chat/${world}/${agent}`)).turns;invalidateWorld(world);redraw();toast('실제 응답과 모델·출처 기록을 Proposals에 보관했습니다.');}catch(e){toast(e.message);b.disabled=false;}});
  $$('[data-chat-open-proposal]').forEach(b=>b.onclick=()=>{selectedWorld=WorldLab.worldKeys.indexOf(S.world);worldTab='proposals';invalidateWorld(S.world);navigate('worlds');});
 }
 function uuidFallback(){const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);}
 function invalidateWorld(world){delete WorldLab.state.worlds[world];WorldLab.state.attempted.delete(world);}
 function choose(agent,world){if(agent)S.agent=agent;if(world)S.world=world;S.status=null;S.loaded.delete(key());}
 return {renderPage,mount,choose};
})();
