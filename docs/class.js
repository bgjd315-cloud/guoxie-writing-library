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
const normKlass=s=>String(s||'').trim().replace(/班$/,'');
const incomingClass=url.get('class')?normKlass(url.get('class')):'';
let switchedClassNotice='';
if(incomingClass&&cfg.klass&&normKlass(cfg.klass)!==incomingClass){cfg.seat='';cfg.name='';cfg.posted={};switchedClassNotice=`已切換為 ${incomingClass} 班，為避免誤用前一位同學身分，已自動清空座號與姓名，請重新填寫。`;}
// 知性題、情意題各一面觀摩牆（t、e）；舊連結的 padlet 參數仍可用，當作兩面共用。
if(url.get('padlet'))cfg.padlet=url.get('padlet');if(url.get('t'))cfg.padletT=url.get('t');if(url.get('e'))cfg.padletE=url.get('e');if(url.get('j'))cfg.padletJ=url.get('j');if(incomingClass)cfg.klass=incomingClass;save(cfg);
const KIND={T:'高中知性',E:'高中情意',J:'國中'};
const cat=id=>db.categories.find(c=>c.id===id);
const WALL_NAME={T:'知性題觀摩牆',E:'情意題觀摩牆',J:'國中觀摩牆'};
function wallFor(kind){const u=kind==='T'?cfg.padletT:kind==='E'?cfg.padletE:kind==='J'?cfg.padletJ:'';return validPadlet(u)?u:validPadlet(cfg.padlet)?cfg.padlet:'';}
// 老師沒有填自己的牆時，改用拾光寫作的公用主題素材牆（一個主題一面，見 walls.js）。
const PUB=window.GUOXIE_WALLS||{topics:{}};
const customName=k=>k==='J'||(cfg.padletT&&cfg.padletE)?WALL_NAME[k]:'觀摩牆';
const walls=()=>{const out=[];for(const k of ['T','E','J']){const u=wallFor(k);if(u&&!out.some(w=>w.url===u))out.push({kind:k,url:u,name:customName(k)});}if(!out.length&&validPadlet(PUB.hub))out.push({url:PUB.hub,name:'素材牆總目錄'});return out;};
function topicWall(theme){const k=cat(theme)?.kind;const u=wallFor(k);if(u)return {url:u,name:customName(k)};const p=PUB.topics[theme];return validPadlet(p)?{url:p,name:' '+theme+' 素材牆'}:null;}
const wallBtn=(u,label)=>`<a class="btn" href="${esc(u)}" target="_blank" rel="noopener">${esc(label)} ↗</a>`;
const catLabel=id=>cat(id)?`${id} ${cat(id).title}`:'未分類';
const seat=s=>String(s||'').trim().padStart(2,'0');
function toast(s){const t=$('#toast');t.textContent=s;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2600);}
function items(){
  const raw=Object.values(bank.read()).filter(m=>m&&typeof m==='object'&&!m.draft).map(m=>m.concept&&db.themes[m.concept]?{...m,theme:db.themes[m.concept]}:m);
  let qDrafts=[];
  try{const q=JSON.parse(localStorage.getItem('qingyi-v1-drafts'))||{};qDrafts=Object.entries(q).filter(([,d])=>d&&(d.body||d.event)).map(([id,d])=>({id:'q:'+id,kind:'self',title:d.title||'我的故事',theme:db.themes['E'+d.cardId]||'',when:d.exam||'',event:d.event||'',feeling:d.before||'',insight:d.change||'',point:d.response||d.body||'',created:d.updated||0}));}catch{}
  return [...raw,...qDrafts].sort((a,b)=>(a.theme||'zz').localeCompare(b.theme||'zz')||(a.created||0)-(b.created||0));
}
const validPadlet=u=>/^https:\/\/([a-z0-9-]+\.)?padlet\.(com|org)\//i.test(u||'');
// 第一行是給老師後台辨識的標記，請學生不要修改。
function tag(m){return `〔拾光｜${normKlass(cfg.klass)}班｜${seat(cfg.seat)}號｜${cfg.name}｜${catLabel(m.theme)}｜${m.kind==='self'?'己例':'他例'}〕`;}
function postText(m){const concept=db.concepts[m.concept]?.title;const L=(k,v)=>String(v||'').trim()?`${k}：${String(v).trim()}`:'';
 const body=m.kind==='self'?[`【己例】${m.title||m.scene||'我的經驗'}`,L('什麼時候',m.when),L('發生什麼',m.event),L('當時的感受',m.feeling),L('後來的理解',m.insight),L('可以支持',m.point)]:[`【他例】${m.title}`,L('類型',m.type),L('事實',m.fact),L('出處',m.source),L('可以支持',m.point),L('使用注意',m.caution)];
 return [tag(m),...body,L('相關概念',concept)].filter(Boolean).join('\n');}
async function copy(text){try{await navigator.clipboard.writeText(text);return true;}catch{const t=document.createElement('textarea');t.value=text;document.body.append(t);t.select();let ok=false;try{ok=document.execCommand('copy');}catch{}t.remove();return ok;}}
function identityForm(){return `<section class="class-panel"><h2>${cfg.name?'我的班級資料':'第一次使用：填寫班級資料'}</h2>${switchedClassNotice?`<p style="padding:8px 11px;border-radius:8px;background:#fbf0cf;color:#6c4f13;font-size:13px">${esc(switchedClassNotice)}</p>`:''}<p class="small">資料只存在這台電腦，用來標記你貼到觀摩牆的素材，讓老師統計。觀摩牆網址不填時，每則素材會連到拾光寫作該主題的公用素材牆。</p><form id="who" class="class-who"><label>班級<input name="klass" required maxlength="10" value="${esc(normKlass(cfg.klass))}" placeholder="301 或 高二忠"></label><label>座號<input name="seat" required inputmode="numeric" maxlength="3" value="${esc(cfg.seat||'')}" placeholder="5"></label><label>姓名<input name="name" required maxlength="20" value="${esc(cfg.name||'')}" placeholder="王小明"></label><label class="wide">知性題觀摩牆（選填：老師有自己的牆才填）<input name="padletT" type="url" value="${esc(cfg.padletT||cfg.padlet||'')}" placeholder="https://padlet.com/…"></label><label class="wide">情意題觀摩牆（選填：老師有自己的牆才填）<input name="padletE" type="url" value="${esc(cfg.padletE||cfg.padlet||'')}" placeholder="https://padlet.com/…"></label><label class="wide">國中觀摩牆（選填：老師有自己的牆才填）<input name="padletJ" type="url" value="${esc(cfg.padletJ||'')}" placeholder="https://padlet.com/…"></label><button class="btn primary">儲存</button>${cfg.name?'<button type="button" class="btn" id="clear-identity">公用電腦下課清空身分</button>':''}</form></section>`;}
function render(){const list=items(),ready=cfg.klass&&cfg.seat&&cfg.name;
 const byTheme={};for(const m of list)(byTheme[m.theme||'']=byTheme[m.theme||'']||[]).push(m);
 const postedCount=list.filter(m=>cfg.posted[m.id]).length;
 $('#main').innerHTML=`<section class="class-hero"><p class="eyebrow">CLASS EDITION · 班級版</p><h1>把素材貼上班級觀摩牆</h1><p>單機版的「我的題材庫」只存在你的電腦。班級版把你整理好的他例、己例，一則一則貼到班級 Padlet，老師能看到每個人的收集情形，同學之間也能互相觀摩。</p><ol class="class-steps"><li>先在<a href="/guoxie-writing-library/#bank">我的題材庫</a>或各概念卡收集素材。</li><li>在下方按「複製貼文」，再按「開啟觀摩牆」。知性題素材貼到知性題觀摩牆，情意題素材貼到情意題觀摩牆，按鈕會自動帶你到對的那一面。</li><li>在 Padlet 找到同一個主題的欄位，按＋，把內容貼進內文；第一行〔拾光｜…〕是老師統計用的標記，請不要修改。每欄上方有引導卡和各概念的提示卡，可以看看還有哪個概念沒收集。</li></ol></section>${identityForm()}
 ${ready?`<section class="class-panel"><div class="class-bar"><h2>我的素材 <small>${list.length} 則 · 已貼 ${postedCount} 則</small></h2><div class="class-actions">${walls().length?walls().map(w=>wallBtn(w.url,'開啟'+w.name)).join(''):''}</div></div>
 ${list.length?Object.entries(byTheme).map(([th,ms])=>`<h3 class="class-theme">${esc(cat(th)?KIND[cat(th).kind]+'・'+cat(th).title:'未分類')} <small>他例 ${ms.filter(m=>m.kind!=='self').length} · 己例 ${ms.filter(m=>m.kind==='self').length}</small></h3>${ms.map(m=>`<article class="class-item ${cfg.posted[m.id]?'posted':''}"><pre>${esc(postText(m))}</pre><div class="class-actions"><button class="btn primary" data-copy="${esc(m.id)}">複製貼文</button>${(()=>{const w=topicWall(m.theme);return w?wallBtn(w.url,'開啟'+w.name):'';})()}<label class="class-done"><input type="checkbox" data-posted="${esc(m.id)}" ${cfg.posted[m.id]?'checked':''}>已貼上</label></div></article>`).join('')}`).join(''):'<p class="empty-line">題材庫還是空的。先到<a href="/guoxie-writing-library/#library">高中主題</a>或<a href="/guoxie-writing-library/junior/">國中作文區</a>，在概念卡下方把他例存進題材庫，或記下自己的己例。</p>'}</section>`:''}
 <section class="class-panel"><h2>觀摩同學的素材</h2><p>打開觀摩牆，看看同學在同一個主題找到哪些他例、寫下哪些己例。讀到好素材，可以按讚或留言說明它好在哪裡；想借用的話，請用自己的話轉述，並換成你自己的經驗。</p></section>`;
 $('#who').onsubmit=e=>{e.preventDefault();const f=e.target;const pt=f.padletT.value.trim(),pe=f.padletE.value.trim(),pj=f.padletJ.value.trim();if([pt,pe,pj].some(u=>u&&!validPadlet(u))){toast('觀摩牆網址需為 padlet.com 的連結');return;}Object.assign(cfg,{klass:normKlass(f.klass.value),seat:f.seat.value.trim(),name:f.name.value.trim(),padletT:pt,padletE:pe,padletJ:pj,padlet:''});switchedClassNotice='';save(cfg);toast('已儲存班級資料');render();};
 const clr=$('#clear-identity');if(clr)clr.onclick=()=>{if(!confirm('確定清空這台電腦上的座號與姓名（會保留老師設定的觀摩牆網址）？'))return;cfg.seat='';cfg.name='';cfg.posted={};save(cfg);toast('已清空個人身分');render();};}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-copy]');if(!b)return;const full=items().find(x=>x.id===b.dataset.copy);if(!full)return;if(await copy(postText(full))){b.textContent='已複製 ✓';toast('已複製，請到觀摩牆貼上');}else toast('無法自動複製，請手動選取文字');});
document.addEventListener('change',e=>{const c=e.target.closest('[data-posted]');if(!c)return;if(c.checked)cfg.posted[c.dataset.posted]=Date.now();else delete cfg.posted[c.dataset.posted];save(cfg);c.closest('.class-item').classList.toggle('posted',c.checked);});
render();
})();
