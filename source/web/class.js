'use strict';
// 班級版（學生端）：讀取本機「我的題材庫」，產生帶身分標記的貼文，貼到班級 Padlet 觀摩牆。
(()=>{
const db=window.MATERIALS,bank=window.materialBank,$=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='guoxie-class-v1';
const load=()=>{try{const v=JSON.parse(localStorage.getItem(KEY));return v&&typeof v==='object'?v:{};}catch{return {};}};
const save=v=>{try{localStorage.setItem(KEY,JSON.stringify(v));return true;}catch{return false;}};
let cfg=load();cfg.posted=cfg.posted||{};
const url=new URLSearchParams(location.search);
if(url.get('padlet'))cfg.padlet=url.get('padlet');if(url.get('class'))cfg.klass=url.get('class');save(cfg);
const KIND={T:'高中知性',E:'高中情意',J:'國中'};
const cat=id=>db.categories.find(c=>c.id===id);
const catLabel=id=>cat(id)?`${id} ${cat(id).title}`:'未分類';
const seat=s=>String(s||'').trim().padStart(2,'0');
function toast(s){const t=$('#toast');t.textContent=s;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2600);}
function items(){return Object.values(bank.read()).filter(m=>m&&typeof m==='object'&&!m.draft).map(m=>m.concept&&db.themes[m.concept]?{...m,theme:db.themes[m.concept]}:m).sort((a,b)=>(a.theme||'zz').localeCompare(b.theme||'zz')||(a.created||0)-(b.created||0));}
const validPadlet=u=>/^https:\/\/([a-z0-9-]+\.)?padlet\.(com|org)\//i.test(u||'');
// 第一行是給老師後台辨識的標記，請學生不要修改。
function tag(m){return `〔拾光｜${cfg.klass}班｜${seat(cfg.seat)}號｜${cfg.name}｜${catLabel(m.theme)}｜${m.kind==='self'?'己例':'他例'}〕`;}
function postText(m){const concept=db.concepts[m.concept]?.title;const L=(k,v)=>String(v||'').trim()?`${k}：${String(v).trim()}`:'';
 const body=m.kind==='self'?[`【己例】${m.title||m.scene||'我的經驗'}`,L('什麼時候',m.when),L('發生什麼',m.event),L('當時的感受',m.feeling),L('後來的理解',m.insight),L('可以支持',m.point)]:[`【他例】${m.title}`,L('類型',m.type),L('事實',m.fact),L('出處',m.source),L('可以支持',m.point),L('使用注意',m.caution)];
 return [tag(m),...body,L('相關概念',concept)].filter(Boolean).join('\n');}
async function copy(text){try{await navigator.clipboard.writeText(text);return true;}catch{const t=document.createElement('textarea');t.value=text;document.body.append(t);t.select();let ok=false;try{ok=document.execCommand('copy');}catch{}t.remove();return ok;}}
function identityForm(){return `<section class="class-panel"><h2>${cfg.name?'我的班級資料':'第一次使用：填寫班級資料'}</h2><p class="small">資料只存在這台電腦，用來標記你貼到觀摩牆的素材，讓老師統計。</p><form id="who" class="class-who"><label>班級<input name="klass" required inputmode="numeric" maxlength="6" value="${esc(cfg.klass||'')}" placeholder="301"></label><label>座號<input name="seat" required inputmode="numeric" maxlength="3" value="${esc(cfg.seat||'')}" placeholder="5"></label><label>姓名<input name="name" required maxlength="20" value="${esc(cfg.name||'')}" placeholder="王小明"></label><label class="wide">班級觀摩牆（Padlet 網址，老師提供）<input name="padlet" type="url" value="${esc(cfg.padlet||'')}" placeholder="https://padlet.com/…"></label><button class="btn primary">儲存</button></form></section>`;}
function render(){const list=items(),ready=cfg.klass&&cfg.seat&&cfg.name;
 const byTheme={};for(const m of list)(byTheme[m.theme||'']=byTheme[m.theme||'']||[]).push(m);
 const postedCount=list.filter(m=>cfg.posted[m.id]).length;
 $('#main').innerHTML=`<section class="class-hero"><p class="eyebrow">CLASS EDITION · 班級版</p><h1>把素材貼上班級觀摩牆</h1><p>單機版的「我的題材庫」只存在你的電腦。班級版把你整理好的他例、己例，一則一則貼到班級 Padlet，老師能看到每個人的收集情形，同學之間也能互相觀摩。</p><ol class="class-steps"><li>先在<a href="/#bank">我的題材庫</a>或各概念卡收集素材。</li><li>在下方按「複製貼文」，再按「開啟觀摩牆」。</li><li>在 Padlet 找到同一個主題的欄位，按＋，把內容貼進內文；第一行〔拾光｜…〕是老師統計用的標記，請不要修改。</li></ol></section>${identityForm()}
 ${ready?`<section class="class-panel"><div class="class-bar"><h2>我的素材 <small>${list.length} 則 · 已貼 ${postedCount} 則</small></h2>${validPadlet(cfg.padlet)?`<a class="btn" href="${esc(cfg.padlet)}" target="_blank" rel="noopener">開啟觀摩牆 ↗</a>`:'<span class="small">還沒有觀摩牆網址，請向老師索取。</span>'}</div>
 ${list.length?Object.entries(byTheme).map(([th,ms])=>`<h3 class="class-theme">${esc(cat(th)?KIND[cat(th).kind]+'・'+cat(th).title:'未分類')} <small>他例 ${ms.filter(m=>m.kind!=='self').length} · 己例 ${ms.filter(m=>m.kind==='self').length}</small></h3>${ms.map(m=>`<article class="class-item ${cfg.posted[m.id]?'posted':''}"><pre>${esc(postText(m))}</pre><div class="class-actions"><button class="btn primary" data-copy="${esc(m.id)}">複製貼文</button>${validPadlet(cfg.padlet)?`<a class="btn" href="${esc(cfg.padlet)}" target="_blank" rel="noopener">開啟觀摩牆 ↗</a>`:''}<label class="class-done"><input type="checkbox" data-posted="${esc(m.id)}" ${cfg.posted[m.id]?'checked':''}>已貼上</label></div></article>`).join('')}`).join(''):'<p class="empty-line">題材庫還是空的。先到<a href="/#library">高中主題</a>或<a href="/junior/">國中作文區</a>，在概念卡下方把他例存進題材庫，或記下自己的己例。</p>'}</section>`:''}
 <section class="class-panel"><h2>觀摩同學的素材</h2><p>打開觀摩牆，看看同學在同一個主題找到哪些他例、寫下哪些己例。讀到好素材，可以按讚或留言說明它好在哪裡；想借用的話，請用自己的話轉述，並換成你自己的經驗。</p></section>`;
 $('#who').onsubmit=e=>{e.preventDefault();const f=e.target;const p=f.padlet.value.trim();if(p&&!validPadlet(p)){toast('觀摩牆網址需為 padlet.com 的連結');return;}Object.assign(cfg,{klass:f.klass.value.trim(),seat:f.seat.value.trim(),name:f.name.value.trim(),padlet:p});save(cfg);toast('已儲存班級資料');render();};}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-copy]');if(!b)return;const m=bank.read()[b.dataset.copy];if(!m)return;const full=items().find(x=>x.id===m.id)||m;if(await copy(postText(full))){b.textContent='已複製 ✓';toast('已複製，請到觀摩牆貼上');}else toast('無法自動複製，請手動選取文字');});
document.addEventListener('change',e=>{const c=e.target.closest('[data-posted]');if(!c)return;if(c.checked)cfg.posted[c.dataset.posted]=Date.now();else delete cfg.posted[c.dataset.posted];save(cfg);c.closest('.class-item').classList.toggle('posted',c.checked);});
render();
})();
