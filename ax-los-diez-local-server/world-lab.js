/* Local WORLD LAB storage client. No agents or external services are connected. */
const WorldLab = (()=>{
 const worldKeys=['ahmn','middle-earth','anyeonsa','unnamed-1','unnamed-2'];
 const categories={original:'Original',development:'Development',progress:'Progress',proposals:'Proposals'};
 const state={connection:'idle',token:null,worlds:{},loading:new Set(),attempted:new Set(),texts:new Map(),selected:{},errors:{},busy:false};
 let changed=()=>{};
 const notify=()=>changed();
 async function request(url,options={}){
  const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(options.method==='POST'?180000:15000),...options});
  let data;try{data=await response.json();}catch{throw new Error('저장 서버에 연결되지 않았습니다. 실행 중인 대시보드에서 열어 주세요.');}
  if(!response.ok)throw new Error(data.message||'요청을 처리하지 못했습니다.');return data;
 }
 async function connect(){
  if(state.connection!=='idle')return;state.connection='checking';
  try{
   if(!['http:','https:'].includes(location.protocol))throw new Error('preview');
   const status=await request('/api/status');if(status.mode!=='persistent-filesystem')throw new Error('preview');
   state.token=status.csrfToken;state.connection='ready';
   for(const key of worldKeys)if(!state.attempted.has(key))refresh(key);
  }catch{state.connection='unavailable';}notify();
 }
 async function refresh(key){
  if(state.loading.has(key))return;state.loading.add(key);state.attempted.add(key);
  try{state.worlds[key]=await request(`/api/worlds/${key}/documents`);delete state.errors[key];}
  catch(e){state.errors[key]=e.message;}finally{state.loading.delete(key);notify();}
 }
 function chosen(key,category){
  const all=(state.worlds[key]?.documents||[]).filter(d=>d.category===category);
  const selected=state.selected[key+':'+category];
  return all.find(d=>d.id===selected)||all.find(d=>d.id===state.worlds[key]?.currentOriginalId)||all[0];
 }
 async function text(key,doc){
  if(!doc||state.texts.has(doc.id))return;
  state.texts.set(doc.id,{loading:true});
  try{state.texts.set(doc.id,await request(`/api/worlds/${key}/documents/${doc.id}/text`));}
  catch(e){state.texts.set(doc.id,{error:e.message});}notify();
 }
 const badge=d=>d.isTest?'<span class="document-badge test">TEST ONLY</span>':'<span class="document-badge">실제 등록 문서</span>';
 function renderPanel(key,category){
  if(state.connection==='idle'||state.connection==='checking')return '<section class="document-panel world-storage-message" role="status">저장소 연결을 확인하고 있습니다…</section>';
  if(state.connection!=='ready')return `<section class="document-panel world-storage-message"><span class="subtle-pill">미리보기 · 저장 서버 미연결</span><h2>실제 문서 저장은 실행 중인 대시보드에서 사용할 수 있습니다.</h2><p>현재 HTML 미리보기에서는 업로드를 실행하지 않습니다. 저장 서버가 연결되면 PDF·TXT·MD 문서를 등록하고 다시 열 수 있습니다.</p></section>`;
  const info=state.worlds[key],docs=(info?.documents||[]).filter(d=>d.category===category),doc=chosen(key,category),body=doc&&state.texts.get(doc.id);
  const date=iso=>new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'medium',timeStyle:'short'}).format(new Date(iso));
  return `<section class="world-document-panel"><div class="world-document-toolbar"><div><span class="tiny-label">${categories[category].toUpperCase()} / ${docs.length} DOCUMENTS</span><h2>${categories[category]} <small>${category==='original'?'승인된 원본과 승인 대기 후보':category==='development'?'세계관 발전 문서':category==='progress'?'진행 기록':'새로운 제안'}</small></h2></div><div class="world-document-actions"><span class="storage-ready"><i></i>파일 저장 연결됨</span><button class="button" data-pdf-diagnostics>PDF 진단</button><button class="button dark" data-upload-document>${icon('plus')} 문서 등록</button></div></div>
   ${state.errors[key]?`<div class="world-storage-error" role="alert">${escapeHTML(state.errors[key])} <button class="text-button" data-refresh-world>다시 읽기</button></div>`:''}
   ${!info?'<div class="empty" role="status">문서 목록을 읽고 있습니다…</div>':!docs.length?`<div class="empty world-doc-empty"><span>${icon('archive')}</span><h3>아직 ${categories[category]} 문서가 없습니다</h3><p>PDF, TXT, MD 원본 파일과 추출 텍스트를 함께 보관합니다.${category==='original'?'<br>Original 후보는 본문 확인과 사용자 승인 후 원본으로 등록됩니다.':''}</p><button class="button" data-upload-document>첫 문서 등록</button></div>`:`<div class="world-document-layout"><div class="world-document-list" aria-label="등록 문서 목록">${docs.map(d=>`<button class="world-document-row ${d.id===doc.id?'selected':''}" data-document-id="${d.id}" aria-pressed="${d.id===doc.id}"><span>${badge(d)}<small>${d.status==='approved'?'Original v'+d.approval.revision:d.status==='pending_approval'?'승인 대기':'등록 완료'}</small></span><strong>${escapeHTML(d.title)}</strong><small>${escapeHTML(d.filename)} · ${date(d.createdAt)}</small></button>`).join('')}</div><article class="world-document-view"><div class="document-view-header"><div>${badge(doc)}<h3>${escapeHTML(doc.title)}</h3><p>${escapeHTML(doc.filename)} · ${Math.ceil(doc.bytes/1024)} KB · ${date(doc.createdAt)} KST</p></div><a class="button" href="/api/worlds/${key}/documents/${doc.id}/original" download>${icon('download')} 원본 파일</a></div>
   ${doc.status==='approved'?`<div class="notice-inline">${icon('lock')} 승인된 Original v${doc.approval.revision} · 읽기 전용. 변경하려면 새 후보를 등록하고 다시 승인해야 합니다. 이전 원본은 유지됩니다.</div>`:doc.category==='original'?`<div class="original-pending"><p>이 문서는 아직 승인되지 않은 Original 후보입니다.</p><button class="button" data-approve-document="${doc.id}" ${doc.extraction.status!=='ready'?'disabled':''}>본문 확인 후 Original 승인</button></div>`:''}
   ${doc.extraction.status!=='ready'?`<div class="world-storage-error">${escapeHTML(doc.extraction.message||'추출된 본문이 없습니다.')} · 원본 파일은 보존되어 있습니다.</div>`:''}
   ${doc.extension==='.pdf'?`<div class="document-foot"><span>추출기: ${escapeHTML(doc.extraction.method)} · 재추출 기록 ${doc.extractionRevision||0}회</span><button class="text-button" data-reextract-document="${doc.id}" ${doc.status==='approved'?'disabled title="승인된 Original 본문은 고정됩니다."':''}>텍스트 다시 추출</button><button class="text-button" data-extraction-history="${doc.id}">추출 이력</button></div>`:''}
   <div class="document-text-label"><span class="tiny-label">EXTRACTED TEXT / 읽기 전용</span><span>${doc.encoding}</span></div>
   ${!body||body.loading?'<p class="document-text-placeholder" role="status">저장된 본문을 읽고 있습니다…</p>':body.error?`<div class="world-storage-error" role="alert">${escapeHTML(body.error)}</div>`:`<pre class="document-text">${escapeHTML(body.text.slice(0,200000))||'추출된 텍스트가 없습니다.'}</pre>${body.text.length>200000?'<p class="document-text-placeholder">화면에는 앞부분 20만 글자를 표시합니다. 전체 내용은 텍스트 파일로 내려받을 수 있습니다.</p>':''}<button class="text-button" data-download-text="${doc.id}">${icon('download')} 추출 텍스트 내려받기</button>`}
   <div class="document-hash">SHA-256 <code>${doc.sha256}</code></div></article></div>`}
   <div class="document-foot storage-foot"><span>원본 파일 · 추출 텍스트 · 메타데이터 · 승인 이력을 파일로 보관합니다.</span><a class="text-button" href="/api/backup" download>${icon('download')} 전체 세계관 백업 ZIP</a></div></section>`;
 }
 function openUpload(key,category){
  if(state.busy){toast('문서를 저장하고 있습니다. 잠시 기다려 주세요.');return;}
  const name=worlds[worldKeys.indexOf(key)].id;
  openDialog('세계관 문서 등록',`<p class="dialog-lead">${name}에 파일 원본과 추출 텍스트를 함께 보관합니다.</p><form id="world-upload-form"><label class="world-form-label" for="world-file">문서 파일 · PDF / TXT / MD</label><input id="world-file" type="file" accept=".pdf,.txt,.md" required><p class="world-form-help">PDF 최대 64MiB · TXT/MD 최대 24MiB. 이미지형 PDF는 원본을 보관하고 OCR 필요 상태로 표시합니다.</p><label class="world-form-label" for="world-doc-title">문서 제목 <small>(선택)</small></label><input id="world-doc-title" type="text" maxlength="200" placeholder="입력하지 않으면 파일명을 사용합니다."><label class="world-form-label" for="world-category">문서 분류</label><select id="world-category">${Object.entries(categories).map(([id,label])=>`<option value="${id}" ${id===category?'selected':''}>${label}</option>`).join('')}</select><label class="world-checkbox"><input id="world-test-document" type="checkbox"> 테스트 문서로 표시 · 실제 세계관과 구분</label><div class="notice-inline">${icon('lock')} Original은 업로드만으로 승인되지 않습니다. 문서를 확인한 후 별도 승인해야 합니다.</div><p id="world-upload-error" class="world-form-error" role="alert"></p><div class="dialog-actions"><button class="button dark" type="submit" id="world-upload-submit">문서 등록</button></div></form>`);
  $('#world-upload-form').onsubmit=async e=>{
   e.preventDefault();const file=$('#world-file').files[0],cat=$('#world-category').value,title=$('#world-doc-title').value.trim(),isTest=$('#world-test-document').checked,error=$('#world-upload-error'),submit=$('#world-upload-submit');
   if(!file)return;if(file.size>64*1024*1024){error.textContent='파일 하나당 최대 64MiB입니다.';return;}
   submit.disabled=true;submit.textContent='원본 저장 및 텍스트 추출 중…';error.textContent='';state.busy=true;
   try{
    const query=new URLSearchParams({filename:file.name,title,category:cat,isTest:String(isTest)});
    const data=await request(`/api/worlds/${key}/documents?${query}`,{method:'POST',headers:{'Content-Type':'application/octet-stream','X-AX-CSRF':state.token},body:file});
    state.selected[key+':'+cat]=data.document.id;worldTab=cat;await refresh(key);$('#detail-dialog').close();
    toast(data.document.extraction.status==='ready'?'원본 파일과 추출 텍스트를 저장했습니다.':'원본을 저장했습니다. 본문 추출 상태를 확인해 주세요.');
   }catch(e){error.textContent=e.message;}finally{state.busy=false;submit.disabled=false;submit.textContent='문서 등록';}
  };
 }
 function openApproval(key,id){
  const doc=state.worlds[key].documents.find(d=>d.id===id),revision=state.worlds[key].originalRevision;
  openDialog('Original로 승인할까요?',`<p class="dialog-lead"><strong>${escapeHTML(doc.title)}</strong>를 승인된 원본 v${revision+1}로 등록합니다. 기존 원본은 덮어쓰지 않고 보존합니다.</p><div class="document-hash">확인할 파일 SHA-256<code>${doc.sha256}</code></div><label class="world-checkbox"><input type="checkbox" id="confirm-original"> 본문과 파일을 확인했으며, 이 문서를 Original로 승인합니다.</label><p class="world-form-error" id="approval-error" role="alert"></p><div class="dialog-actions"><button class="button" id="cancel-approval">취소</button><button class="button dark" id="approve-original" disabled>승인하고 원본 등록</button></div>`);
  $('#cancel-approval').onclick=()=>$('#detail-dialog').close();$('#confirm-original').onchange=e=>$('#approve-original').disabled=!e.target.checked;
  $('#approve-original').onclick=async()=>{
   const button=$('#approve-original');button.disabled=true;
   try{await request(`/api/worlds/${key}/documents/${id}/approve`,{method:'POST',headers:{'Content-Type':'application/json','X-AX-CSRF':state.token},body:JSON.stringify({confirmed:$('#confirm-original').checked,sha256:doc.sha256,textSha256:doc.textSha256,expectedRevision:revision})});await refresh(key);$('#detail-dialog').close();toast('Original을 승인했습니다. 이전 버전과 파일은 보존됩니다.');}
   catch(e){$('#approval-error').textContent=e.message;button.disabled=false;}
  };
 }
 async function diagnostics(){
  openDialog('PDF 추출 진단','<p class="dialog-lead">내장 추출기와 Poppler 실행 경로를 확인하고 있습니다…</p>');
  try{
   const d=await request('/api/pdf-diagnostics');
   openDialog('PDF 추출 진단',`<p class="dialog-lead">Node.js ${escapeHTML(d.node)} · ${escapeHTML(d.platform)}</p><dl class="detail-dl"><dt>내장 PDF.js</dt><dd>${d.bundled.available?'사용 가능 · '+d.bundled.version:'파일 누락 — 새 패키지를 완전히 압축 해제해 주세요.'}</dd><dt>Poppler (선택)</dt><dd>${d.poppler.available?'설치 확인':'사용 불가 · '+escapeHTML(d.poppler.code||'')}</dd><dt>실행 경로 / 명령</dt><dd>${escapeHTML(d.poppler.command)}</dd><dt>버전 / 원인</dt><dd>${escapeHTML(d.poppler.version||d.poppler.message||'')}</dd></dl><p class="dialog-lead">일반 텍스트 PDF는 내장 추출기로 처리하므로 Poppler 설치가 필요하지 않습니다. 스캔/윤곽선 PDF의 OCR은 아직 포함되어 있지 않습니다.</p>`);
  }catch(e){openDialog('PDF 추출 진단',`<p class="dialog-lead">${escapeHTML(e.message)}</p>`);}
 }
 async function extractionHistory(key,id){
  try{const data=await request(`/api/worlds/${key}/documents/${id}/extractions`);
   openDialog('PDF 재추출 이력',`<p class="dialog-lead">처음 저장한 PDF·텍스트·문서 정보는 그대로 보존됩니다. 실패한 재추출은 기존의 성공한 본문을 대체하지 않습니다.</p>${data.history.length?data.history.map((r,i)=>`<div class="detail-block"><h3>재추출 ${i+1} · ${escapeHTML(r.extraction.status)}</h3><p>${escapeHTML(r.createdAt)} · ${escapeHTML(r.extraction.method)}<br>${escapeHTML(r.extraction.message||'추출 완료')}<br>오류 코드: ${escapeHTML((r.extraction.attempts||[]).map(a=>a.engine+': '+a.code).join(', ')||'없음')}<br>텍스트 SHA-256: ${r.textSha256}</p></div>`).join(''):'<p>재추출 기록이 없습니다. 첫 등록 시 추출 결과가 사용됩니다.</p>'}`);
  }catch(e){toast(e.message);}
 }
 function reextract(key,id){
  if(state.busy){toast('다른 파일 작업이 진행 중입니다.');return;}
  openDialog('PDF 텍스트 다시 추출',`<p class="dialog-lead">저장된 PDF 원본은 그대로 두고 새 추출 결과를 추가합니다. 기존 텍스트와 승인된 원본은 덮어쓰지 않습니다.</p><p class="world-form-error" id="reextract-error"></p><div class="dialog-actions"><button class="button dark" id="reextract-start">다시 추출 시작</button></div>`);
  $('#reextract-start').onclick=async()=>{
   const button=$('#reextract-start');button.disabled=true;button.textContent='PDF 텍스트 추출 중…';state.busy=true;
   try{
    const data=await request(`/api/worlds/${key}/documents/${id}/reextract`,{method:'POST',headers:{'X-AX-CSRF':state.token}});
    state.texts.delete(id);await refresh(key);$('#detail-dialog').close();
    const attempt=data.document.lastExtractionAttempt;
    toast(attempt?.extraction.status==='ready'?'새 텍스트를 추출하여 보관했습니다.':attempt?.extraction.message||'추출 상태를 확인해 주세요.');
   }catch(e){$('#reextract-error').textContent=e.message;button.disabled=false;button.textContent='다시 추출 시작';}finally{state.busy=false;}
  };
 }
 function mount(key,category,onChange){
  changed=onChange;connect();
  if(state.connection==='ready'&&!state.worlds[key]&&!state.loading.has(key)&&!state.attempted.has(key))refresh(key);
  if(state.connection==='ready')text(key,chosen(key,category));
  $('[data-pdf-diagnostics]')?.addEventListener('click',diagnostics);
  $('[data-reextract-document]')?.addEventListener('click',e=>reextract(key,e.currentTarget.dataset.reextractDocument));
  $('[data-extraction-history]')?.addEventListener('click',e=>extractionHistory(key,e.currentTarget.dataset.extractionHistory));
  $$('[data-upload-document]').forEach(button=>button.onclick=()=>openUpload(key,category));
  $$('[data-document-id]').forEach(button=>button.onclick=()=>{state.selected[key+':'+category]=button.dataset.documentId;notify();});
  $$('[data-approve-document]').forEach(button=>button.onclick=()=>openApproval(key,button.dataset.approveDocument));
  $('[data-refresh-world]')?.addEventListener('click',()=>refresh(key));
  $('[data-download-text]')?.addEventListener('click',async()=>{
   const doc=chosen(key,category);try{const data=await request(`/api/worlds/${key}/documents/${doc.id}/text`);const url=URL.createObjectURL(new Blob([data.text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=doc.title+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){toast(e.message);}
  });
 }
 return {state,worldKeys,categories,renderPanel,mount};
})();
