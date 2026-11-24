const icons = {
  control: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  worlds: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 7h14M5 17h14"/>',
  images: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/>',
  archive: '<path d="M4 8h16v13H4zM3 3h18v5H3zM9 12h6"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9m3 12h6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  pulse: '<path d="M2 12h5l3-8 4 16 3-8h5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  sliders: '<path d="M4 7h16M4 17h16M8 4v6m8 4v6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>'
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.arrow}</svg>`;
const $ = (q, p = document) => p.querySelector(q);
const $$ = (q, p = document) => [...p.querySelectorAll(q)];
const escapeHTML = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const agents = [
  {id:'01', name:'Laszlo Torvan', initials:'LT', role:'총괄 · 작업 배분', status:'active', task:'오늘의 연구 브리핑 정리', world:'ALL WORLDS', progress:76, output:'밤새 진행한 작업과 미합의 3건을 정리한 브리핑 초안', time:'09:42', category:'ORCHESTRATION'},
  {id:'02', name:'Antoni Daddario', initials:'AD', role:'하네스 · 권한과 한도', status:'active', task:'라운드별 한도 및 권한 점검', world:'SYSTEM', progress:62, output:'원본 쓰기 권한과 반복 한도 점검표', time:'09:40', category:'GOVERNANCE'},
  {id:'03', name:'Ludovico Kahn', initials:'LK', role:'탐색 · 소주제 선정', status:'done', task:'다음 탐구 주제 3개 선별 완료', world:'AHMN', progress:100, output:'기억과 공간을 주제로 한 탐구 제안 3건', time:'09:36', category:'EXPLORATION'},
  {id:'04', name:'Marcelo Brown', initials:'MB', role:'세계관 · 기존 세계관 강화', status:'active', task:'기억 보관소의 공간 규칙 심화', world:'AHMN', progress:68, output:'보관소 출입 규칙과 기억 소유권의 연결 제안', time:'09:35', category:'WORLD DEVELOPMENT'},
  {id:'05', name:'Clody Bleu', initials:'CB', role:'세계관 · 전제 역전', status:'active', task:'기억을 소유할 수 없다면?', world:'AHMN', progress:43, output:'기억의 공동 소유를 전제로 한 대안 분기', time:'09:32', category:'WORLD DEVELOPMENT'},
  {id:'06', name:'Carmen di Scorpio', initials:'CS', role:'이미지 · Original 강화', status:'review', task:'기억의 회랑 이미지 검토 대기', world:'AHMN', progress:100, output:'회랑의 빛과 재료를 탐구한 Original 이미지 시안', time:'09:28', category:'VISUAL RESEARCH'},
  {id:'07', name:'Fyodor Zumtorf', initials:'FZ', role:'이미지 · Difference 제안', status:'done', task:'경계 없는 아카이브 시안 완료', world:'중간계', progress:100, output:'기존 공간 질서에서 벗어난 Difference 이미지 시안', time:'09:25', category:'VISUAL RESEARCH'},
  {id:'08', name:'Paul Rudolph', initials:'PR', role:'평가 · 사실과 미학', status:'review', task:'세계관 제안 독립 평가 완료', world:'AHMN', progress:100, output:'두 제안의 일관성 검토와 근거 부족 항목 2건', time:'09:22', category:'INDEPENDENT REVIEW'},
  {id:'09', name:'Shien Takamatsu', initials:'ST', role:'원본 · 순수성과 정본 관리', status:'review', task:'원본 반영 후보의 사용자 선택 대기', world:'AHMN', progress:100, output:'원본 대비 변경 범위와 정본 반영 전 확인 목록', time:'09:18', category:'CANON MANAGEMENT'},
  {id:'10', name:'Kenzar Tangetz', initials:'KT', role:'제품 · SO 3D 뷰어', status:'paused', task:'사용자 지시에 따라 보류', world:'OBJECT TRACK', progress:0, output:'새로운 결과 없음 · 보류 중', time:'—', category:'PRODUCT / OUTSIDE AX'},
  {id:'11', name:'Gottfrien Bohmers', initials:'GB', role:'제품 · EW 안경 시안', status:'idle', task:'다음 레퍼런스 입력 대기', world:'OBJECT TRACK', progress:0, output:'꽃잎·별 가시 로고 템플 레퍼런스 정리', time:'08:50', category:'PRODUCT / OUTSIDE AX'},
  {id:'12', name:'Corbière Luzen', initials:'CL', role:'오브제 · 소재와 디테일', status:'paused', task:'사용자 지시에 따라 보류', world:'OBJECT TRACK', progress:0, output:'새로운 결과 없음 · 보류 중', time:'—', category:'OBJECT / OUTSIDE AX'}
];
const statuses = { active:['작업 중','active'], review:['검토 대기','review'], done:['완료','done'], paused:['보류','paused'], idle:['대기','idle'] };
const worlds = [
  {
    "id": "AHMN",
    "sub": "World research / 01",
    "ko": "AHMN 연구실",
    "desc": "AHMN의 원본과 발전 기록, 새로운 제안을 모으는 연구 공간입니다. 아직 세계관 원본은 등록되지 않았습니다.",
    "count": 0,
    "version": "미등록",
    "tags": [
      "원본 등록 대기",
      "세계관 연구"
    ],
    "hasOriginal": false,
    "original": "아직 등록된 세계관 원본이 없습니다.",
    "question": "이 세계의 출발점이 될 원본을 기다리고 있습니다."
  },
  {
    "id": "중간계",
    "sub": "World research / 02",
    "ko": "중간계 연구실",
    "desc": "중간계의 원본과 발전 기록, 새로운 제안을 모으는 연구 공간입니다. 아직 세계관 원본은 등록되지 않았습니다.",
    "count": 0,
    "version": "미등록",
    "tags": [
      "원본 등록 대기",
      "세계관 연구"
    ],
    "hasOriginal": false,
    "original": "아직 등록된 세계관 원본이 없습니다.",
    "question": "이 세계의 출발점이 될 원본을 기다리고 있습니다."
  },
  {
    "id": "안연사",
    "sub": "World research / 03",
    "ko": "안연사 연구실",
    "desc": "안연사의 원본과 발전 기록, 새로운 제안을 모으는 연구 공간입니다. 아직 세계관 원본은 등록되지 않았습니다.",
    "count": 0,
    "version": "미등록",
    "tags": [
      "원본 등록 대기",
      "세계관 연구"
    ],
    "hasOriginal": false,
    "original": "아직 등록된 세계관 원본이 없습니다.",
    "question": "이 세계의 출발점이 될 원본을 기다리고 있습니다."
  },
  {
    "id": "언네임드1",
    "sub": "World research / 04",
    "ko": "언네임드1 연구실",
    "desc": "언네임드1의 원본과 발전 기록, 새로운 제안을 모으는 연구 공간입니다. 아직 세계관 원본은 등록되지 않았습니다.",
    "count": 0,
    "version": "미등록",
    "tags": [
      "원본 등록 대기",
      "세계관 연구"
    ],
    "hasOriginal": false,
    "original": "아직 등록된 세계관 원본이 없습니다.",
    "question": "이 세계의 출발점이 될 원본을 기다리고 있습니다."
  },
  {
    "id": "언네임드2",
    "sub": "World research / 05",
    "ko": "언네임드2 연구실",
    "desc": "언네임드2의 원본과 발전 기록, 새로운 제안을 모으는 연구 공간입니다. 아직 세계관 원본은 등록되지 않았습니다.",
    "count": 0,
    "version": "미등록",
    "tags": [
      "원본 등록 대기",
      "세계관 연구"
    ],
    "hasOriginal": false,
    "original": "아직 등록된 세계관 원본이 없습니다.",
    "question": "이 세계의 출발점이 될 원본을 기다리고 있습니다."
  }
];
const proposals = [
  {id:'P-001', title:'기억 보관소의 공간 규칙 확장', type:'세계관 제안', author:'Marcelo Brown', world:0, desc:'기증자의 동의를 확인할 수 없을 때, 기억을 양도하지 않고 보관소 안에서만 열람하는 제한적 규칙을 제안합니다.', detail:'원본의 동의 원칙은 유지합니다. 새로운 열람 권한은 임시 위원회가 아닌 기증자의 사전 지정인에게만 부여합니다. 사전 지정인이 없는 경우에는 계속 봉인합니다.', scope:'AHMN · W03 / W05 · 규칙 확장', state:'pending'},
  {id:'P-002', title:'기억의 회랑 — Original 시안', type:'이미지 시안', author:'Carmen di Scorpio', world:0, desc:'반복되는 기둥과 낮은 수평광으로 기억의 축적을 표현한 공간 시안입니다.', detail:'가상 평가 점수 9.2 / 10. 보관소의 정적인 질서를 시각화한 DEMO 일러스트입니다. 실제 Midjourney 생성물이나 사용자 컨펌 결과가 아닙니다.', scope:'AHMN · VIS-024 · 이미지 시안', state:'pending'},
  {id:'P-003', title:'경계의 소멸과 새로운 이동 질서', type:'전제 역전', author:'Clody Bleu', world:1, desc:'지도만이 이동을 허용한다는 전제를 뒤집고, 지도에 없는 경로를 공동으로 기억하는 사회를 제안합니다.', detail:'의도적인 대안 분기입니다. 원본의 지도 규칙과 섞지 않고 독립 세계관 후보로 검토합니다. 이동 권리를 공유할 때의 책임 범위는 추가 검토가 필요합니다.', scope:'중간계 · ALT-003 · 독립 대안', state:'pending'}
];
const initialRecords = [
  {id:'D-024',title:'기억 보관소 · 원본 스냅샷',type:'정본',world:'AHMN',author:'Shien Takamatsu',time:'2026.11.24 09:18',status:'DEMO 승인',desc:'가상 승인 기록을 포함한 테스트 정본 v0.4입니다. 실제 원본이 아닙니다.'},
  {id:'D-023',title:'두 세계관 제안의 독립 평가',type:'평가',world:'AHMN',author:'Paul Rudolph',time:'2026.11.24 09:22',status:'완료',desc:'사실·세계관 일관성: 부분 충족. 의도된 전제 역전과 내부 모순을 구분했습니다. 미학: 실제 기준 이미지와 사용자 컨펌이 없어 미실시.'},
  {id:'D-022',title:'이동 권한과 지도의 관계',type:'작업 기록',world:'중간계',author:'Clody Bleu',time:'2026.11.24 09:12',status:'완료',desc:'지도가 이동을 허용한다는 전제를 역전한 독립 대안의 발전 기록입니다.'},
  {id:'D-021',title:'신호 수신탑 · 공간 시안',type:'이미지',world:'안연사',author:'Fyodor Zumtorf',time:'2026.11.23 17:40',status:'완료',desc:'형태와 빛의 관계를 보여주는 DEMO 일러스트입니다.'},
  {id:'D-020',title:'오늘의 소주제 선별',type:'작업 기록',world:'AHMN',author:'Ludovico Kahn',time:'2026.11.23 16:20',status:'완료',desc:'기억 소유권, 동의, 이동 경로 세 소주제의 탐구 방향을 정리했습니다.'},
  {id:'D-019',title:'정원의 계절 · 원본 스냅샷',type:'정본',world:'언네임드1',author:'Shien Takamatsu',time:'2026.11.22 14:00',status:'DEMO 승인',desc:'가상 원본 v0.2 보관 기록. 실제 세계관 자료는 아직 반입되지 않았습니다.'}
];
const storageKey = 'ax-los-diez-demo-v1';
let store = {schema:2, decisions:{}, records:[]};
try {
 const saved = JSON.parse(localStorage.getItem(storageKey));
 if (saved && saved.decisions && typeof saved.decisions === 'object' && Array.isArray(saved.records)) {
  store = saved;
  if (store.schema !== 2) {
   const legacyWorldNames = {ATHENA:'AHMN',AHMN:'중간계',ANTENNA:'안연사',ANYEONSA:'언네임드1','UNNAMED 05':'언네임드2'};
   store.records = store.records.map(r=>({...r,world:legacyWorldNames[r.world]||r.world}));
   store.schema=2;localStorage.setItem(storageKey,JSON.stringify(store));
  }
 }
} catch { /* Storage unavailable: session-only demo. */ }

let page = ['control','worlds','images','archive'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'control';
let agentFilter = 'all', selectedWorld = 0, worldTab = 'original', imageTab = 'gallery', archiveFilter = 'all', archiveSearch = '', agentSearch = '';
const navItems = [['control','CONTROL CENTER','컨트롤 센터'],['worlds','WORLD LAB','세계관 연구실'],['images','IMAGE STUDIO','이미지 스튜디오'],['archive','ARCHIVE','기록 보관소']];
const pending = () => proposals.filter(p => !store.decisions[p.id]);
const records = () => [...store.records, ...initialRecords];
const pill = (status) => `<span class="status ${statuses[status][1]}"><i></i>${statuses[status][0]}</span>`;
const arrow = icon('arrow');
function persist() { try {localStorage.setItem(storageKey, JSON.stringify(store));} catch {toast('브라우저 저장이 제한되어 현재 화면에서만 유지됩니다.');} }
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').classList.remove('visible'), 4000); }
function navigate(target) { page = target; location.hash = target; render(); window.scrollTo({top:0, behavior:'instant'}); }
function header(eyebrow, title, desc, action='') { return `<section class="page-heading"><div><div class="eyebrow"><span></span>${eyebrow}</div><h1>${title}<span class="heading-dot">.</span></h1><p>${desc}</p></div>${action}</section>`; }
function renderNav() { $('#navigation').innerHTML = navItems.map(([id,title,ko],i) => `<a href="#${id}" data-nav="${id}" class="nav-item ${page===id?'selected':''}" ${page===id?'aria-current="page"':''}>${icon(id)}<span><strong>${title}</strong><small>${ko}</small></span><span class="nav-num">0${i+1}</span></a>`).join(''); $('#crumb').textContent = navItems.find(x=>x[0]===page)[1]; }
function render() { renderNav(); $('#main').innerHTML = ({control:controlPage,worlds:worldPage,images:imagePage,archive:archivePage}[page])(); bindPage(); }
function controlPage() {
  const list = agents.filter(a => (agentFilter==='all'||a.status===agentFilter) && `${a.name} ${a.role} ${a.task}`.toLowerCase().includes(agentSearch.toLowerCase()));
  return header('OVERVIEW / 01', 'Control center', '서로 다른 시선이 만나, 하나의 세계가 됩니다.', '<div class="heading-meta"><span class="live-tag"><i></i>DEMO WORKSPACE</span><span class="mono">2026. 11. 24 <span class="muted">TUE / KST</span></span></div>') +
  `<section class="stats" aria-label="데모 현황"><div class="stat"><span>전체 에이전트 ${icon('control')}</span><div>12<small>AGENTS</small></div><p><b class="mint-dot"></b> 4명 작업 중 <span>· 2명 보류</span></p></div><div class="stat"><span>탐구 중인 세계관 ${icon('worlds')}</span><div>05<small>WORLDS</small></div><p>서로 다른 가능성을 탐색 중</p></div><div class="stat"><span>완료된 기록 ${icon('check')}</span><div>${String(records().length).padStart(2,'0')}<small>RECORDS</small></div><p>현재 데모에서 열람 가능한 기록</p></div><button class="stat stat-interactive" data-action="pending"><span>나의 검토를 기다리는 제안 ${icon('clock')}</span><div>${String(pending().length).padStart(2,'0')}<small>PENDING</small>${arrow}</div><p><b class="mint-dot"></b> 당신의 다음 결정을 기다립니다</p></button></section>
  <section class="control-columns"><div class="hero-card"><img src="assets/world-1.svg" alt="빛과 기둥으로 구성한 가상 기억 보관소 — DEMO 일러스트"><div class="hero-shade"></div><div class="hero-top"><span class="mono">FEATURED WORLD / 001</span><span class="outline-tag">DEMO VISUAL</span></div><div class="hero-bottom"><span class="hero-kicker">WORLD RESEARCH / 01</span><h2>AHMN</h2><p>세계관의 원본과 다음 이야기를 기다리는 연구실.</p><button class="hero-link" data-world="0">세계관 살펴보기 ${arrow}</button></div><div class="hero-coordinate mono">AX—01 <span>35° 10′ N / 129° 04′ E</span></div></div>
  <div class="approval-panel"><div class="section-title"><h2>검토 대기 <span>${String(pending().length).padStart(2,'0')}</span></h2><span class="tiny-label">YOUR NEXT MOVE</span></div><div class="approval-items">${pending().length ? pending().map((p,i)=>`<button class="approval-row" data-proposal="${p.id}"><span class="approval-index">0${i+1}</span><div><div class="approval-info"><span>${p.type}</span><span>${worlds[p.world].id}</span></div><h3>${p.title}</h3><p>${p.author}</p></div>${arrow}</button>`).join('') : '<div class="empty"><span>✓</span><h3>검토를 모두 마쳤습니다</h3><p>처리한 제안은 ARCHIVE에서 확인하세요.</p></div>'}</div><div class="approval-note">${icon('lock')} 모든 승인은 DEMO에만 적용됩니다.</div></div></section>
  <section class="agent-section"><div class="section-title"><div class="title-with-sub"><h2>에이전트 현황 <span>12</span></h2><p>각자의 전문성으로 연결된 하나의 팀</p></div><div class="section-tools"><label class="compact-search">${icon('search')}<input id="agent-search" aria-label="에이전트 검색" placeholder="에이전트 검색" value="${escapeHTML(agentSearch)}"></label><span class="tiny-label demo-inline">DEMO DATA</span></div></div><div class="filter-bar" role="group" aria-label="에이전트 상태 필터">${[['all','전체',12],['active','작업 중',4],['review','검토 대기',3],['done','완료',2],['idle','대기',1],['paused','보류',2]].map(([id,label,count])=>`<button data-agent-filter="${id}" class="filter-chip ${agentFilter===id?'chosen':''}">${label}<span>${count}</span></button>`).join('')}<span class="filter-hint">${icon('pulse')} 상태는 가상 시나리오입니다</span></div><div class="agent-grid">${list.map(a=>`<button class="agent-card" data-agent="${a.id}"><div class="agent-card-head"><span class="agent-avatar ${a.status==='active'?'mint-avatar':''}">${a.initials}</span>${pill(a.status)}</div><div class="agent-identity"><span class="agent-number mono">AGENT ${a.id}</span><h3>${a.name}</h3><p>${a.role}</p></div><div class="agent-task">${a.task}</div><div class="progress-track"><span style="width:${a.progress}%" class="${a.status}"></span></div><div class="agent-card-foot"><span class="mono">${a.world}</span><span>${a.progress? a.progress+'%': '—'} ${arrow}</span></div></button>`).join('')||'<div class="empty"><h3>일치하는 에이전트가 없습니다</h3><p>다른 이름이나 상태로 검색해 주세요.</p></div>'}</div></section>
  <section class="activity-strip"><div>${icon('pulse')}<span class="tiny-label">LATEST ACTIVITY</span></div><p>Paul Rudolph <span>독립 평가 보고서 작성 완료</span></p><span class="mono">DEMO · 09:22</span><button class="text-button" data-nav="archive">모든 기록 ${arrow}</button></section>`;
}
function worldPage() {
 const w=worlds[selectedWorld], key=WorldLab.worldKeys[selectedWorld], info=WorldLab.state.worlds[key];
 const count=info?.documents.length||0, revision=info?.originalRevision||0;
 return header('RESEARCH / 02','World lab','다섯 세계관의 원본과 변화의 기록을 안전하게 보관합니다.','<span class="subtle-pill">5 WORLD SPACES</span>') +
 `<div class="world-selector" role="group" aria-label="세계관 선택">${worlds.map((x,i)=>`<button data-select-world="${i}" class="world-select ${selectedWorld===i?'selected':''}" aria-pressed="${selectedWorld===i}"><span class="mono">0${i+1} / ${WorldLab.state.worlds[WorldLab.worldKeys[i]]?.documents.length||0} DOCUMENTS</span><strong>${x.id}</strong><small>Original · Development · Progress · Proposals</small>${i===selectedWorld?'<b class="mint-dot"></b>':''}</button>`).join('')}</div>
 <section class="world-detail"><div class="world-art"><img src="assets/world-${selectedWorld+1}.svg" alt="${w.id} 연구실의 DEMO 일러스트"><span class="outline-tag">DEMO VISUAL / 0${selectedWorld+1}</span><div><span class="mono">${w.sub.toUpperCase()}</span><h2>${w.id}</h2></div></div><div class="world-intro"><div class="eyebrow"><span></span>WORLD PROFILE</div><h2>${w.ko}</h2><p>${w.id}의 문서를 네 종류로 구분해 보관합니다. Original은 사용자 승인 후 읽기 전용으로 등록되며, 이전 버전도 유지됩니다.</p><div class="tag-row"><span>실제 문서 저장</span><span>사용자 승인 원칙</span></div><blockquote>원본 파일과 추출된 텍스트, 그 변화의 기록을 함께 보존합니다.</blockquote><div class="world-meta"><div><span>승인된 원본</span><strong>${revision?'v'+revision:'미등록'}</strong></div><div><span>등록된 문서</span><strong>${count}</strong></div><div><span>원본 승인</span><strong>사용자</strong></div></div></div></section>
 <div class="content-tabs world-document-tabs" role="group" aria-label="세계관 자료 유형">${Object.entries(WorldLab.categories).map(([id,title])=>`<button data-world-tab="${id}" class="${worldTab===id?'selected':''}" aria-pressed="${worldTab===id}">${title}<small>${info?.documents.filter(d=>d.category===id).length||0}</small></button>`).join('')}<span>${icon('lock')} 승인된 원본은 읽기 전용</span></div>
 ${WorldLab.renderPanel(key,worldTab)}`;
}

const imageData = [
 {id:'VIS-024',title:'기억의 회랑',world:0,author:'Carmen di Scorpio',kind:'ORIGINAL',score:'9.2',revision:3},
 {id:'VIS-023',title:'경계 없는 아카이브',world:1,author:'Fyodor Zumtorf',kind:'DIFFERENCE',score:'8.8',revision:2},
 {id:'VIS-022',title:'침묵의 수신탑',world:2,author:'Carmen di Scorpio',kind:'ORIGINAL',score:'9.0',revision:2},
 {id:'VIS-021',title:'시간을 보관하는 정원',world:3,author:'Fyodor Zumtorf',kind:'DIFFERENCE',score:'8.6',revision:1},
 {id:'VIS-020',title:'이름 이전의 풍경',world:4,author:'Carmen di Scorpio',kind:'ORIGINAL',score:'8.9',revision:1}
];
function imagePage() {return header('VISUAL RESEARCH / 03','Image studio','세계의 분위기를 발견하고, 시각적 가능성을 기록합니다.', '<span class="subtle-pill">DEMO VISUALS ONLY</span>')+
 `<div class="studio-banner">${icon('images')}<p>모든 이미지는 프로토타입용 일러스트입니다. <span>점수·수정 이력도 가상 데이터이며 실제 생성 및 평가 결과가 아닙니다.</span></p></div><div class="content-tabs studio-tabs" role="group" aria-label="이미지 보기">${[['gallery','이미지 갤러리'],['moodboard','무드보드']].map(([id,t])=>`<button data-image-tab="${id}" class="${imageTab===id?'selected':''}" aria-pressed="${imageTab===id}">${t}</button>`).join('')}<span class="mono">${imageTab==='gallery'?'05 VISUAL STUDIES':'03 MOOD COLLECTIONS'}</span></div>
 ${imageTab==='gallery'?`<section class="image-grid">${imageData.map((x,i)=>`<button class="image-card ${i===0?'featured-image':''}" data-image="${i}"><div class="image-art"><img src="assets/world-${x.world+1}.svg" alt="${x.title} — DEMO 일러스트"><span class="outline-tag">${x.kind}</span><span class="image-expand">↗</span><span class="image-score">${x.score}<small>/ 10 · DEMO</small></span></div><div class="image-caption"><div><span class="tiny-label">${worlds[x.world].id} / ${x.id}</span><h2>${x.title}</h2><p>${x.author}</p></div><span class="revision-badge">REV. 0${x.revision}</span></div></button>`).join('')}</section>`:`<section class="mood-grid">${worlds.slice(0,3).map((w,i)=>`<button class="mood-card" data-mood="${i}"><div class="mood-collage"><img src="assets/world-${i+1}.svg" alt="${w.id} 공간 무드"><img src="assets/world-${(i+2)%5+1}.svg" alt="재료와 빛의 DEMO 참고"><div class="color-swatch" style="background:${['#bdc9b5','#c6bca6','#94acb4'][i]}"><span>MATERIAL<br>PALETTE / 0${i+1}</span></div></div><div class="mood-caption"><span class="tiny-label">DEMO MOODBOARD / 0${i+1}</span><h2>${w.id}</h2><p>${w.tags.join(' · ')} ${arrow}</p></div></button>`).join('')}</section>`}`; }
const matchText = (text, query) => String(text).toLowerCase().replace(/\s+/g,'').includes(String(query).toLowerCase().replace(/\s+/g,''));
function referenceCards(books) {
 return `<section class="reference-library" aria-labelledby="reference-heading"><div class="section-title"><div><div class="eyebrow"><span></span>REFERENCE LIBRARY</div><h2 id="reference-heading">레퍼런스 서적 <span>${String(books.length).padStart(2,'0')}</span></h2></div><span class="real-data-label">실제 첨부자료</span></div><p class="reference-description">첨부한 세 책의 서지정보와 정리 색인입니다. 세계관 정본과 분리하여 보관합니다.</p><div class="reference-grid">${books.map((book,i)=>`<button class="reference-card" data-book="${book.id}"><div class="book-cover ${book.theme}"><span class="mono">AX / REFERENCE 0${referenceBooks.indexOf(book)+1}</span><strong>${escapeHTML(book.title)}</strong><small>${escapeHTML(book.author)}</small><span class="book-cover-footer">${book.pages} SCANNED PAGES</span></div><div class="reference-card-content"><span class="reference-status">${icon('check')}${book.status}</span><h3>${escapeHTML(book.title)}</h3><p>${escapeHTML(book.author)} · ${escapeHTML(book.translation)}</p><div class="reference-facts"><span>${book.pages}면</span><span>${escapeHTML(book.chapterLabel)}</span></div><div class="reference-card-link">서지 · 장별 색인 · 핵심 개념 ${arrow}</div></div></button>`).join('')}</div>${!books.length?'<div class="empty"><h3>일치하는 레퍼런스 서적이 없습니다</h3><p>다른 제목이나 저자로 검색해 주세요.</p></div>':''}</section>`;
}
function archivePage() {
 const filtered=records().filter(x=>(archiveFilter==='all'||x.type===archiveFilter)&&matchText(`${x.title} ${x.world} ${x.author}`,archiveSearch));
 const books=referenceBooks.filter(b=>matchText(`${b.title} ${b.author} ${b.translation} ${b.tags.join(' ')}`,archiveSearch));
 const showBooks=archiveFilter==='reference'||(archiveFilter==='all'&&books.length>0);
 const showRecords=archiveFilter!=='reference';
 return header('KNOWLEDGE / 04','Archive','세계관의 기록과 창작을 위한 레퍼런스를 함께 보관합니다.',`<button class="button dark" id="export-records">${icon('download')} 기록 목록 내보내기</button>`)+
 `<div class="archive-summary"><div>${icon('archive')}<span>보존된 데모 기록<strong>${String(records().length).padStart(2,'0')}</strong></span></div><div>${icon('worlds')}<span>레퍼런스 서적 · 실제 자료<strong>03</strong></span></div><div>${icon('clock')}<span>이번 세션의 데모 결정<strong>${String(Object.keys(store.decisions).length).padStart(2,'0')}</strong></span></div></div>
 <section class="archive-panel"><div class="section-title"><h2>기록 라이브러리</h2><button class="text-button muted" id="reset-demo">데모 상태 초기화 ↺</button></div><div class="archive-toolbar"><div class="archive-filters">${[['all','전체'],['reference','레퍼런스 서적'],['정본','승인된 원본'],['작업 기록','작업 기록'],['평가','평가'],['이미지','이미지'],['승인 기록','내 결정']].map(([id,t])=>`<button class="filter-chip ${archiveFilter===id?'chosen':''}" data-archive-filter="${id}">${t}${id==='reference'?'<span>3</span>':''}</button>`).join('')}</div><label class="compact-search">${icon('search')}<input id="archive-search" aria-label="기록 검색" placeholder="책 제목, 세계관, 작성자 검색" value="${escapeHTML(archiveSearch)}"></label></div>
 ${showBooks?referenceCards(books):''}
 ${showRecords?`<div class="record-section-label"><span class="tiny-label">WORK RECORDS / DEMO</span><p>아래 작업·평가·승인 기록은 가상 시나리오입니다.</p></div><div class="table-scroll"><table><thead><tr><th>기록 이름</th><th>세계관</th><th>작성자</th><th>기록 일시 · KST</th><th>상태</th><th><span class="sr-only">상세 보기</span></th></tr></thead><tbody>${filtered.map(x=>`<tr><td><button class="record-title" data-record="${escapeHTML(x.id)}">${icon(x.type==='정본'?'lock':x.type==='이미지'?'images':'archive')}<span><strong>${escapeHTML(x.title)}</strong><small>${escapeHTML(x.id)} / ${x.type} · DEMO</small></span></button></td><td class="mono">${escapeHTML(x.world)}</td><td>${escapeHTML(x.author)}</td><td class="record-date">${escapeHTML(x.time)}</td><td><span class="record-status">${escapeHTML(x.status)}</span></td><td><button class="icon-button" data-record="${escapeHTML(x.id)}" aria-label="${escapeHTML(x.title)} 상세 보기">${arrow}</button></td></tr>`).join('')}</tbody></table>${!filtered.length?'<div class="empty"><h3>일치하는 작업 기록이 없습니다</h3><p>검색어나 필터를 바꿔 보세요.</p></div>':''}</div>`:''}
 <div class="table-foot"><span>${showRecords?filtered.length+' DEMO RECORDS · ':''}${showBooks?books.length+' REFERENCE BOOKS':''}</span><span>참고 문헌과 세계관 정본은 구분하여 보관합니다.</span></div></section>`;
}
function showBook(id, tab='overview') {
 const b=referenceBooks.find(book=>book.id===id);
 const overview=`<p class="dialog-lead">${escapeHTML(b.description)}</p><dl class="detail-dl"><div><dt>지은이</dt><dd>${escapeHTML(b.author)}</dd></div><div><dt>풀이 · 번역</dt><dd>${escapeHTML(b.translation)}</dd></div><div><dt>출판사 · 판본</dt><dd>${escapeHTML(b.publisher)} · ${escapeHTML(b.edition)}</dd></div><div><dt>스캔 면수</dt><dd>${b.pages}면 · ${escapeHTML(b.chapterLabel)}</dd></div><div><dt>보관 자료</dt><dd>원본 PDF · 추출 본문 · 장별 정리 · 개념 색인</dd></div><div><dt>처리 상태</dt><dd>자료 확보 · 초벌 분류 완료</dd></div></dl><div class="notice-inline">${icon('lock')} 전문 정독과 OCR 전체 교정은 아직 완료하지 않았습니다. 세계관 원본과는 별도로 보관합니다.</div>`;
 const contents=`<p class="book-tab-note">PDF 출처를 연결한 초벌 색인입니다. 아래 범위는 책별 PDF 연결 순서이며 종이책 쪽수와 다를 수 있습니다.</p><div class="book-section-list">${b.sections.map(s=>`<details><summary><span><small>${escapeHTML(s.label)}</small><strong>${escapeHTML(s.title)}</strong></span><span class="mono">${s.pages} ↗</span></summary><p>${escapeHTML(s.summary)}</p><small class="book-source">${escapeHTML(s.location)}</small></details>`).join('')}</div>`;
 const concepts=`<p class="book-tab-note">첨부 판본을 바탕으로 만든 핵심 개념 색인입니다. 정리자의 요약과 해석이며 책의 직접 인용문은 아닙니다.</p><div class="book-concept-list">${b.concepts.map(c=>`<article><h3>${escapeHTML(c.name)}</h3><p>${escapeHTML(c.summary)}</p><small>근거 범위: ${escapeHTML(c.pages)}</small></article>`).join('')}</div>`;
 openDialog(b.title,`<div class="tag-row"><span>레퍼런스 서적</span><span>실제 첨부자료</span><span>${b.pages}면</span></div><div class="content-tabs book-tabs" role="group" aria-label="서적 정보 유형">${[['overview','서지정보'],['contents','장별 색인'],['concepts','핵심 개념']].map(([key,title])=>`<button data-book-tab="${key}" class="${tab===key?'selected':''}" aria-pressed="${tab===key}">${title}</button>`).join('')}</div>${tab==='overview'?overview:tab==='contents'?contents:concepts}`,'book-dialog');
 $$('[data-book-tab]').forEach(button=>button.onclick=()=>showBook(id,button.dataset.bookTab));
}

function openDialog(title, content, cls='') { const dialog=$('#detail-dialog'); dialog.className=cls; $('#dialog-content').innerHTML=`<h2 id="dialog-title">${title}</h2>${content}`; if(!dialog.open)dialog.showModal(); }
function showAgent(id) { const a=agents.find(x=>x.id===id); openDialog(a.name, `<div class="detail-agent-title"><span class="agent-avatar large">${a.initials}</span><div><span class="tiny-label">AGENT ${a.id} / ${a.category}</span><p>${a.role}</p></div>${pill(a.status)}</div><div class="detail-block"><h3>현재 작업 · DEMO</h3><p>${a.task}</p><div class="progress-track"><span style="width:${a.progress}%"></span></div><small>${a.progress}% · 가상 진행률</small></div><div class="detail-block"><h3>완료 결과 / 결과 미리보기</h3><p>${a.output}</p><span class="subtle-pill">${a.world}</span></div><div class="detail-block"><h3>역할 경계</h3><p>${['04','05'].includes(id)?'두 창작자의 작업은 서로 비공유합니다. 이 대시보드는 사용자용 관제 화면이며 에이전트에 정보를 전달하지 않습니다.':id==='08'?'창작 결과를 독립 평가하고 수정 방향만 제안합니다. 채택은 사용자가 결정합니다.':id==='09'?'원본 반영은 사용자가 선택한 내용에 한합니다. 이 프로토타입에는 실제 정본 쓰기 기능이 없습니다.':'PDF의 역할 구분을 바탕으로 표시한 DEMO입니다. 실제 작업은 실행되지 않습니다.'}</p></div><div class="notice-inline">${icon('lock')} 실제 에이전트 실행·파일 접근 기능은 연결되어 있지 않습니다.</div>`); }
function showProposal(id) { const p=proposals.find(x=>x.id===id); const decision=store.decisions[id]; openDialog(p.title, `<div class="tag-row"><span>${p.type}</span><span>${worlds[p.world].id}</span><span>DEMO</span></div><p class="dialog-lead">${p.desc}</p><div class="detail-block"><h3>제안 내용</h3><p>${p.detail}</p></div><dl class="detail-dl"><div><dt>작성자</dt><dd>${p.author}</dd></div><div><dt>검토 범위</dt><dd>${p.scope}</dd></div><div><dt>승인 상태</dt><dd>${decision?escapeHTML(decision==='approved'?'DEMO 승인':'DEMO 반려'):'사용자 선택 대기'}</dd></div></dl><div class="notice-inline">${icon('lock')} 아래 선택은 브라우저의 데모 상태만 바꿉니다. 실제 원본에는 반영되지 않습니다.</div>${!decision?'<label class="note-label" for="decision-note">판단 메모 <span>(선택)</span></label><textarea id="decision-note" placeholder="채택 이유나 수정 방향을 남겨 주세요." maxlength="1000"></textarea><div class="dialog-actions"><button class="button" data-decision="rejected">데모 반려</button><button class="button dark" data-decision="approved">'+icon('check')+' 데모 승인</button></div>':''}`); $$('[data-decision]').forEach(b=>b.onclick=()=>decide(p,b.dataset.decision)); }
function decide(p, decision) { if(store.decisions[p.id])return; const note=$('#decision-note').value.trim(); store.decisions[p.id]=decision; store.records.unshift({id:`DEC-${p.id}`, title:p.title, type:'승인 기록',world:worlds[p.world].id,author:'Woojin',time:new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',dateStyle:'short',timeStyle:'short'}).format(new Date()),status:decision==='approved'?'DEMO 승인':'DEMO 반려',desc:`${decision==='approved'?'승인':'반려'}한 가상 제안입니다. 실제 정본 반영 없음.`,note});persist();$('#detail-dialog').close();render();toast(decision==='approved'?'DEMO 승인 완료 · 기록 보관소에 저장했습니다.':'DEMO 반려 완료 · 판단 기록을 보존했습니다.'); }
function showImage(i) {const x=imageData[i];openDialog(x.title,`<img class="dialog-art" src="assets/world-${x.world+1}.svg" alt="${x.title} DEMO 일러스트"><div class="image-detail-meta"><span>${worlds[x.world].id} / ${x.kind}</span><strong>${x.score}<small> / 10 · 가상 평가 점수</small></strong></div><p class="muted">${x.author} · ${x.id} · 프로토타입용 SVG 일러스트</p><div class="detail-block"><h3>수정 이력 · DEMO</h3>${Array.from({length:x.revision},(_,j)=>`<div class="revision-line"><span class="mono">REV. 0${x.revision-j}</span><p>${['빛의 방향과 공간 깊이 조정','재료의 질감과 명암 대비 탐구','초기 공간 구성 시안'][j]}</p></div>`).join('')}</div><div class="notice-inline">${icon('images')} 실제 이미지 생성·Paul의 평가·사용자 컨펌은 수행되지 않았습니다.</div>`,'image-dialog');}
function showRecord(id) {const r=records().find(x=>x.id===id);openDialog(r.title,`<div class="tag-row"><span>${r.type}</span><span>${escapeHTML(r.world)}</span><span>DEMO</span></div><p class="dialog-lead">${escapeHTML(r.desc)}</p><dl class="detail-dl"><div><dt>기록 ID</dt><dd>${escapeHTML(r.id)}</dd></div><div><dt>작성자</dt><dd>${escapeHTML(r.author)}</dd></div><div><dt>기록 시각 · KST</dt><dd>${escapeHTML(r.time)}</dd></div><div><dt>상태</dt><dd>${escapeHTML(r.status)}</dd></div></dl>${r.note?`<div class="detail-block"><h3>나의 판단 메모</h3><p class="user-note">${escapeHTML(r.note)}</p></div>`:''}<div class="notice-inline">${icon('lock')} 이 기록은 DEMO입니다. 실제 원본이나 에이전트 결과와 연결되지 않습니다.</div>`);}
function exportRecords() {const payload={mode:'PROTOTYPE',exportedAt:new Date().toISOString(),note:'작업 기록은 DEMO, 레퍼런스 서적은 실제 첨부자료의 서지·색인입니다.',decisions:store.decisions,records:records(),referenceBooks};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='AX-LOS-DIEZ-DEMO-records.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('DEMO 기록을 JSON 파일로 내보냈습니다.');}
function bindPage() {
 if(page==='worlds')WorldLab.mount(WorldLab.worldKeys[selectedWorld],worldTab,()=>{if(page==='worlds')render();});
 $$('[data-nav]').forEach(b=>b.onclick=e=>{e.preventDefault();navigate(b.dataset.nav);});
 $$('[data-agent]').forEach(b=>b.onclick=()=>showAgent(b.dataset.agent));
 $$('[data-agent-filter]').forEach(b=>b.onclick=()=>{agentFilter=b.dataset.agentFilter;render();});
 $$('[data-proposal]').forEach(b=>b.onclick=()=>showProposal(b.dataset.proposal));
 $$('[data-world]').forEach(b=>b.onclick=()=>{selectedWorld=+b.dataset.world;worldTab='original';navigate('worlds');});
 $$('[data-select-world]').forEach(b=>b.onclick=()=>{selectedWorld=+b.dataset.selectWorld;render();});
 $$('[data-world-tab]').forEach(b=>b.onclick=()=>{worldTab=b.dataset.worldTab;render();});
 $$('[data-image-tab]').forEach(b=>b.onclick=()=>{imageTab=b.dataset.imageTab;render();});
 $$('[data-image]').forEach(b=>b.onclick=()=>showImage(+b.dataset.image));
 $$('[data-mood]').forEach(b=>b.onclick=()=>{const w=worlds[+b.dataset.mood];openDialog(`${w.id} — 무드보드`,`<img class="dialog-art" src="assets/world-${+b.dataset.mood+1}.svg" alt="DEMO 무드보드"><div class="tag-row">${w.tags.map(t=>`<span>${t}</span>`).join('')}</div><p class="dialog-lead">차분한 재료, 반복되는 구조와 부드러운 빛. ${w.ko}를 위한 가상 시각 참고입니다.</p><div class="notice-inline">DEMO · 실제 무드보드 레지스트리와 연결되지 않습니다.</div>`);});
 $$('[data-archive-filter]').forEach(b=>b.onclick=()=>{archiveFilter=b.dataset.archiveFilter;render();});
 $$('[data-record]').forEach(b=>b.onclick=()=>showRecord(b.dataset.record));
 $$('[data-book]').forEach(b=>b.onclick=()=>showBook(b.dataset.book));
 const setupSearch=(selector,setter)=>{const input=$(selector);if(!input)return;const update=()=>{const pos=input.selectionStart;setter(input.value);render();const next=$(selector);next.focus();next.setSelectionRange(pos,pos);};input.oninput=e=>{if(!e.isComposing)update();};input.oncompositionend=update;};
 setupSearch('#agent-search',v=>agentSearch=v);setupSearch('#archive-search',v=>archiveSearch=v);
 $('[data-action="pending"]')?.addEventListener('click',showPending);
 $('#export-records')?.addEventListener('click',exportRecords);
 $('#reset-demo')?.addEventListener('click',()=>{openDialog('데모 상태를 초기화할까요?','<p class="dialog-lead">이 브라우저에 저장된 데모 승인·반려와 판단 메모가 지워집니다. 실제 파일에는 영향이 없습니다.</p><div class="dialog-actions"><button class="button" id="cancel-reset">취소</button><button class="button dark" id="confirm-reset">초기화</button></div>');$('#cancel-reset').onclick=()=>$('#detail-dialog').close();$('#confirm-reset').onclick=()=>{store={schema:2,decisions:{},records:[]};persist();archiveSearch='';archiveFilter='all';$('#detail-dialog').close();render();toast('데모를 처음 상태로 되돌렸습니다.');};});
}
function showPending() {if(pending().length)showProposal(pending()[0].id);else toast('남은 검토 항목이 없습니다. ARCHIVE에서 결정 기록을 확인하세요.');}
function openSearch() {openDialog('무엇을 찾고 있나요?',`<label class="global-search">${icon('search')}<input id="global-search" placeholder="에이전트, 세계관, 기록 검색" aria-label="전체 검색" autofocus></label><div id="search-results"><p class="muted">이름이나 키워드를 입력해 주세요.</p></div>`);const input=$('#global-search');input.oninput=()=>{const q=input.value.trim().toLowerCase();const matches=q?[...agents.filter(a=>`${a.name} ${a.role}`.toLowerCase().includes(q)).map(a=>({title:a.name,sub:a.role,type:'agent',id:a.id})),...worlds.filter(w=>`${w.id} ${w.ko}`.toLowerCase().includes(q)).map(w=>({title:w.id,sub:w.ko,type:'world',id:worlds.indexOf(w)})),...referenceBooks.filter(b=>matchText(`${b.title} ${b.author} ${b.translation}`,q)).map(b=>({title:b.title,sub:'레퍼런스 서적 · 실제 첨부자료',type:'book',id:b.id})),...records().filter(r=>`${r.title} ${r.world} ${r.author}`.toLowerCase().includes(q)).map(r=>({title:r.title,sub:r.type+' · DEMO',type:'record',id:r.id}))]:[];$('#search-results').innerHTML=q?(matches.length?matches.map((m,i)=>`<button class="search-result" data-result="${i}"><span><strong>${escapeHTML(m.title)}</strong><small>${escapeHTML(m.sub)}</small></span>${arrow}</button>`).join(''):'<p class="muted">검색 결과가 없습니다.</p>'):'<p class="muted">이름이나 키워드를 입력해 주세요.</p>';$$('[data-result]').forEach(b=>b.onclick=()=>{const m=matches[+b.dataset.result];if(m.type==='agent')showAgent(m.id);if(m.type==='world'){selectedWorld=m.id;worldTab='original';$('#detail-dialog').close();navigate('worlds');}if(m.type==='record')showRecord(m.id);if(m.type==='book')showBook(m.id);});};input.focus();}
$('#search-icon').innerHTML=icon('search');$('#bell-icon').innerHTML=icon('bell');
$('#dialog-close').onclick=()=>$('#detail-dialog').close();
$('#detail-dialog').addEventListener('click',e=>{if(e.target===$('#detail-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('#about').onclick=()=>openDialog('가능한 세계를 위한 연구 콘솔','<p class="dialog-lead">AX : LOS DIEZ의 12명 에이전트와 5개 세계관을 한눈에 살펴보는 인터랙티브 프로토타입입니다.</p><div class="detail-block"><h3>직접 체험해 보세요</h3><p>에이전트를 눌러 작업을 확인하고, WORLD LAB에서 다섯 세계를 둘러보세요. IMAGE STUDIO에서 시안을 확대하고, 검토 대기 제안을 데모 승인·반려하면 ARCHIVE에 기록됩니다.</p></div><div class="detail-block"><h3>데이터 안내</h3><p>에이전트 상태·일러스트·점수·승인 이력은 DEMO입니다. 세계관 연구실에는 AHMN·중간계·안연사·언네임드1·언네임드2를 등록했습니다. WORLD LAB에서 문서를 등록하고 원본을 직접 승인할 수 있습니다. 기록보관소의 레퍼런스 서적 세 권은 실제로 첨부한 자료입니다. 실제 에이전트 실행이나 원본 수정은 일어나지 않습니다.</p></div><div class="notice-inline">변경 사항은 이 브라우저에만 보관됩니다. 데모 기록은 ARCHIVE에서 내보내거나 초기화할 수 있습니다.</div>');
$('#search-open').onclick=openSearch;$('#notifications').onclick=showPending;
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch();}});
window.addEventListener('hashchange',()=>{const next=location.hash.slice(1);if(navItems.some(x=>x[0]===next)&&page!==next){page=next;render();}});
render();
