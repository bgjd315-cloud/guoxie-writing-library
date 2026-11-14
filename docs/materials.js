'use strict';
// 他例／己例素材、完整篇幅示範與「我的題材庫」存取；所有頁面共用。
(()=>{
const db=window.MATERIALS||{items:{},fullModels:{},themes:{},categories:[],concepts:{}};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='guoxie-materials-v1';
const bank={
 key:KEY,
 read(){try{const v=JSON.parse(localStorage.getItem(KEY));return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}catch{return {};}},
 write(v){try{localStorage.setItem(KEY,JSON.stringify(v));return true;}catch{return false;}},
 newId(){return 'm'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);},
 hasOrigin(origin){return Object.values(bank.read()).some(m=>m.origin===origin);},
 put(entry){const all=bank.read(),now=Date.now();const id=entry.id||bank.newId();all[id]={...all[id],...entry,id,updated:now,created:all[id]?.created||now};return bank.write(all)?id:null;},
 remove(id){const all=bank.read();delete all[id];return bank.write(all);}
};
window.materialBank=bank;
window.MATERIALS=db;

const typeClass=t=>({'經典課文':'classic','歷史事件':'history','科學研究':'science','臺灣社會':'taiwan','國際時事':'world','文學影視':'arts','真實人物':'person'}[t]||'other');
const statusLabel=origin=>bank.hasOrigin(origin)?'已在題材庫 ✓':'存入我的題材庫';

window.realMaterialsHTML=function(uid){const m=db.items[uid];if(!m)return '';const isT=uid[0]==='T',isJ=uid[0]==='J';
 const others=m.others.map((o,i)=>{const origin=uid+':o:'+i;return `<article class="mb-card"><span class="mb-type mb-${typeClass(o.type)}">${esc(o.type)}</span><h5>${esc(o.title)}</h5><p>${esc(o.fact)}</p><p class="mb-source">出處：${esc(o.source)}</p><p class="mb-use"><strong>${isT?'可以支持：':isJ?'可以用在：':'可以借鏡：'}</strong>${esc(o.use)}</p><p class="mb-caution"><strong>注意：</strong>${esc(o.caution)}</p><button type="button" class="mb-save" data-bank-add="${esc(origin)}" ${bank.hasOrigin(origin)?'aria-pressed="true"':''}>${statusLabel(origin)}</button></article>`;}).join('');
 const self=m.self.map((s,i)=>`<article class="mb-card mb-self"><span class="mb-type mb-mine">己例 ${i+1}</span><h5>${esc(s.scene)}</h5><ol>${s.questions.map(q=>`<li>${esc(q)}</li>`).join('')}</ol><p class="mb-use"><strong>寫出說服力：</strong>${esc(s.angle)}</p><button type="button" class="mb-save" data-bank-self="${esc(uid+':s:'+i)}">用這組追問記下我的己例 →</button></article>`).join('');
 return `<details class="material-bank-section" open><summary><span><small>MATERIALS · 他例與己例</small><strong>可以寫進文章的素材</strong></span><em>${m.others.length} 則他例 · ${m.self.length} 組己例</em></summary><p class="mb-intro">${isJ?'會考作文重視具體取材：己例是你自己的生活經驗，是文章的主體；他例是課文、書籍或真實人物的故事，放在一兩句話裡，能讓你的體會更有分量。':isT?'知性文章需要論據：他例是可以查證的真實事例，己例是你親身經歷或觀察的事。兩種一起用，論點才同時有廣度與溫度。':'情意文章以己例為主：先用追問找回你自己的經驗；他例是作家或真實人物的寫法參照，幫你看見情感可以怎麼寫深。'}存進「<a href="/guoxie-writing-library/#bank">我的題材庫</a>」，寫作時依主題取用。</p><h4 class="mb-heading">他例｜${isJ?'課文、書籍與真實人物':isT?'可以查證的真實事例':'作品與人物的寫法參照'}</h4><div class="mb-grid">${others}</div><h4 class="mb-heading">己例｜從你的生活找</h4><div class="mb-grid mb-grid-self">${self}</div><p class="mb-note">引用他例前，請再查一次原始出處，並用自己的話轉述；事例要服務論點，不必寫成故事摘要。己例必須是你真正經歷或看見的事，追問只是幫你想起來。</p></details>`;};

// 工作台只負責寫與存素材；完整概念說明、範文與主題練習統一在首頁閱讀。
window.readOnHubHTML=function(uid){const c=db.concepts[uid];if(!c)return '';return `<section class="read-on-hub"><div><strong>概念說明、範文與主題練習</strong><span>統一在首頁閱讀；這裡專心整理素材與練寫。</span></div><a class="btn" href="/guoxie-writing-library/#library?kind=${uid[0]}&read=${uid}">到首頁閱讀「${esc(c.title.split('：')[0])}」→</a></section>`;};
window.fullModelHTML=function(groupId){const f=db.fullModels[groupId];if(!f)return '';const isT=groupId[0]==='T';
 return `<details class="full-model"><summary><span><small>FULL-LENGTH MODEL · 完整篇幅示範</small><strong>${esc(f.title)}</strong></span><em>${f.count} 字 · ${f.paragraphs.length} 段</em></summary><div class="full-model-body"><p class="fm-task"><strong>回應任務：</strong>${esc(f.task)}</p><p class="fm-length">${isT?'學測知性題第二小題限 400 字以內（約 19 行）。本篇示範在字數內同時放進一則他例與一則己例，並保留反面限制與有條件的結論。':'學測情意題通常文長不限，完整作答多在 600 字以上。本篇示範如何把一件小事寫出場景、細節、情感轉折與回應。'}</p><div class="fm-materials"><span><b>他例</b>${f.others.map(esc).join('；')||'—'}</span><span><b>己例</b>${esc(f.self||'—')}</span></div><div class="fm-paragraphs">${f.paragraphs.map((p,i)=>`<section><div class="fm-role">第${i+1}段・${esc(f.roles[i])}</div><p class="fm-prose">${esc(p)}</p><p class="fm-note">${esc(f.notes[i])}</p></section>`).join('')}</div><p class="mb-note">己例為示範用的綜合情境；請換成你自己的經驗與查證過的事例。</p></div></details>`;};

const baseTopic=window.topicExamplesHTML;
if(baseTopic)window.topicExamplesHTML=function(id){const html=baseTopic(id);const g=window.TOPIC_EXAMPLES?.groups?.[id]||window.TOPIC_EXAMPLES?.groups?.[window.TOPIC_EXAMPLES?.conceptTopics?.[id]];const full=g?window.fullModelHTML(g.id):'';if(!full)return html;const at=html.lastIndexOf('</section>');return at<0?html+full:html.slice(0,at)+full+html.slice(at);};

const baseModel=window.modelHTML;
if(baseModel)window.modelHTML=function(id){const html=baseModel(id),m=window.WRITING_MODELS?.[id];if(!m||!/^高中/.test(m.level))return html;const isT=m.level==='高中知性';const note=`<p class="model-length">篇幅提醒：本篇 ${m.count} 字，是${isT?'精簡示範；學測知性題上限 400 字，正式作答可再補一則他例或己例，並把限制條件說完整':'精簡示範；學測情意題文長不限，正式作答多在 600 字以上，可擴寫場景細節、轉折前的猶豫與最後的具體回應'}。本主題另有一篇「完整篇幅示範」可對照。</p>`;return html.replace(/(<p class="model-notice">[\s\S]*?<\/p>)/,'$1'+note);};

const baseEssay=window.essayHTML;
if(baseEssay)window.essayHTML=function(id){const html=baseEssay(id),extra=window.realMaterialsHTML(id);if(!extra)return html;const at=html.indexOf('</section>');return at<0?extra+html:html.slice(0,at+10)+extra+html.slice(at+10);};

function flash(btn,text){btn.textContent=text;btn.setAttribute('aria-pressed','true');}
document.addEventListener('click',e=>{const add=e.target.closest('[data-bank-add]');if(add){const origin=add.dataset.bankAdd,[uid,,i]=origin.split(':'),o=db.items[uid]?.others?.[Number(i)];if(!o)return;if(bank.hasOrigin(origin)){location.href='/guoxie-writing-library/#bank';return;}const id=bank.put({kind:'other',title:o.title,theme:db.themes[uid]||'',concept:uid,type:o.type,fact:o.fact,source:o.source,point:o.use,caution:o.caution,origin});if(id)flash(add,'已存入 ✓ 再按一下前往題材庫');else add.textContent='無法儲存，請先匯出備份';return;}
 const self=e.target.closest('[data-bank-self]');if(self){const origin=self.dataset.bankSelf,[uid,,i]=origin.split(':'),s=db.items[uid]?.self?.[Number(i)];if(!s)return;const id=bank.put({kind:'self',title:'',theme:db.themes[uid]||'',concept:uid,scene:s.scene,prompts:s.questions,hint:s.angle,origin:'',draft:true});if(id)location.href='/guoxie-writing-library/#bank?edit='+id;}});
})();
