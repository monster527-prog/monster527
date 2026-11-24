import {randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
const sessionLifetime=7*24*60*60*1000;
export class AccessGate{
 constructor(env=process.env){
  this.enabled=env.AX_REMOTE==='1';this.sessions=new Map();this.failures=new Map();
  if(!this.enabled)return;
  const password=env.AX_ACCESS_PASSWORD||'';
  if(password.length<12)throw new Error('Remote mode requires AX_ACCESS_PASSWORD (at least 12 characters).');
  let origin;try{origin=new URL(env.AX_PUBLIC_ORIGIN||env.RENDER_EXTERNAL_URL);}catch{throw new Error('Remote mode requires AX_PUBLIC_ORIGIN or RENDER_EXTERNAL_URL.');}
  if(origin.protocol!=='https:'||origin.username||origin.password)throw new Error('Remote public origin must use HTTPS.');
  this.origin=origin.origin;this.host=origin.host;this.salt=randomBytes(16);this.passwordHash=scryptSync(password,this.salt,32);
 }
 checkHost(req){const host=req.headers.host||'';if(this.enabled)return host===this.host;
  try{return ['localhost','127.0.0.1','[::1]'].includes(new URL('http://'+host).hostname);}catch{return false;}
 }
 checkOrigin(req){return !this.enabled||req.headers.origin===this.origin;}
 encrypted(req){return !!req.socket.encrypted||req.headers['x-forwarded-proto']==='https';}
 authenticated(req){
  if(!this.enabled)return true;
  const cookie=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('ax_session='));if(!cookie)return false;
  const token=cookie.slice(11);if(!/^[a-f0-9]{64}$/.test(token))return false;
  const hash=createHash('sha256').update(token).digest('hex'),expires=this.sessions.get(hash);
  if(!expires||expires<Date.now()){this.sessions.delete(hash);return false;}return true;
 }
 login(password,ip){
  const now=Date.now(),failed=this.failures.get(ip);
  if(failed&&failed.until>now&&failed.count>=8)return {status:429,message:'로그인 시도가 많습니다. 1분 뒤 다시 시도하세요.'};
  const supplied=typeof password==='string'&&password.length<=512?password:'';
  const valid=timingSafeEqual(scryptSync(supplied,this.salt,32),this.passwordHash);
  if(!valid){this.failures.set(ip,{count:failed&&failed.until>now?failed.count+1:1,until:now+60000});return {status:401,message:'접속 비밀번호를 확인해 주세요. API Key가 아닌 작업 공간 비밀번호입니다.'};}
  this.failures.delete(ip);for(const [key,expires] of this.sessions)if(expires<now)this.sessions.delete(key);
  if(this.sessions.size>=100)this.sessions.delete(this.sessions.keys().next().value);
  const token=randomBytes(32).toString('hex');this.sessions.set(createHash('sha256').update(token).digest('hex'),now+sessionLifetime);
  return {status:200,cookie:`ax_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${sessionLifetime/1000}`};
 }
 logout(req){
  const cookie=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('ax_session='));
  if(cookie)this.sessions.delete(createHash('sha256').update(cookie.slice(11)).digest('hex'));
  return 'ax_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
 }
 loginHTML(){return `<!doctype html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#080808"><title>AX : LOS DIEZ — 로그인</title><style>*{box-sizing:border-box}body{background:#080808;color:#f2f2f2;font-family:system-ui,sans-serif;margin:0;min-height:100dvh;display:grid;place-items:center;padding:24px}main{width:100%;max-width:420px;padding:38px 30px;border:1px solid #303030;border-radius:24px;background:#141414}small{color:#aaa;letter-spacing:2px;font-size:10px}h1{font-size:28px;margin:20px 0 10px}p,label{font-size:14px;color:#bbb;line-height:1.8}label{display:block;margin-top:28px}input,button{width:100%;border-radius:14px;font-size:16px;padding:16px}input{background:#080808;border:1px solid #444;color:white;margin:10px 0 16px}button{background:#efefef;color:#111;border:0;font-weight:600;cursor:pointer}button:disabled{opacity:.5}#error{color:#f2b5a7;min-height:26px;font-size:13px}footer{font-size:12px;color:#888;margin-top:20px;line-height:1.8}</style></head><body><main><small>AX : LOS DIEZ / PRIVATE WORKSPACE</small><h1>나의 연구실에 접속</h1><p>세계관 문서와 에이전트 대화를 보관하는<br>개인 작업 공간입니다.</p><form id="login"><label for="password">작업 공간 비밀번호</label><input id="password" type="password" autocomplete="current-password" required maxlength="512" autofocus><button id="submit">로그인</button><p id="error" role="alert"></p></form><footer>호스팅 설정의 AX_ACCESS_PASSWORD입니다.<br>OpenAI / xAI API Key를 입력하는 곳이 아닙니다.</footer></main><script>document.querySelector('#login').onsubmit=async e=>{e.preventDefault();const b=document.querySelector('#submit'),error=document.querySelector('#error');b.disabled=true;error.textContent='';try{const r=await fetch('/api/access/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:document.querySelector('#password').value})});const data=await r.json();if(!r.ok)throw new Error(data.message||'로그인 실패');document.querySelector('#password').value='';location.replace('/#chat');}catch(e){error.textContent=e.message;b.disabled=false;}};</script></body></html>`;}
}
