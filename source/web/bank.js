'use strict';
// 首頁「我的題材庫」：依主題累積他例與己例，提供 30 秒漸進式快記、防呆驗證、跨題遷移與完整仿題連動。
(()=>{
const bank=window.materialBank,db=window.MATERIALS,KEY=bank.key;
let view={theme:'',q:'',scope:'H'};
const KIND_LABEL={T:'高中知性',E:'高中情意',J:'國中'};
const catTitle=id=>db.categories.find(c=>c.id===id)?.title||'未分類';
const conceptTitle=uid=>db.concepts[uid]?.title||'';
const OTHER_TYPES=['經典課文','歷史事件','科學研究','臺灣社會','國際時事','文學影視','真實人物','其他'];
const TRANSFER_MAP={
  'T-1':['T-8','T-10'],'T-2':['T-7','T-8'],'T-3':['T-5','T-6'],'T-4':['T-1','T-6'],
  'T-5':['T-3','E-2'],'T-6':['T-3','T-4'],'T-7':['T-2','T-8'],'T-8':['T-1','T-7'],
  'T-9':['T-4','T-10'],'T-10':['T-1','T-8'],'T-11':['T-6','E-5'],
  'E-1':['E-2','E-5'],'E-2':['E-1','E-3'],'E-3':['E-2','E-4'],'E-4':['E-3','E-6'],'E-5':['E-1','E-6'],'E-6':['E-4','E-5'],
  'J-1':['J-2','J-4'],'J-2':['J-1','J-3'],'J-3':['J-4','J-5'],'J-4':['J-1','J-6'],'J-5':['J-3','J-6'],'J-6':['J-4','J-5']
};
const qingyiDrafts=()=>Object.entries(readStore('qingyi-v1-drafts',{})).map(([id,d])=>({id,d,theme:db.themes['E'+d.cardId]||''}));
function entries(){return Object.values(bank.read()).filter(m=>m&&typeof m==='object').map(m=>m.concept&&db.themes[m.concept]?{...m,theme:db.themes[m.concept]}:m).sort((a,b)=>(b.updated||0)-(a.updated||0));}
function text(m){return [m.title,m.fact,m.source,m.point,m.caution,m.when,m.event,m.feeling,m.insight,m.scene,conceptTitle(m.concept)].join(' ');}

function mockLinksForTheme(themeId){
  const mocks=(window.MOCK_PROMPTS||[]).filter(p=>p.theme===themeId);
  if(mocks.length)return mocks.slice(0,2);
  return [];
}

function coverage(list,drafts){
  const cats=db.categories.filter(c=>view.scope==='all'||(view.scope==='H'?c.kind!=='J':c.kind==='J'));
  return cats.map(c=>{const o=list.filter(m=>m.theme===c.id&&m.kind==='other').length,s=list.filter(m=>m.theme===c.id&&m.kind==='self').length,q=drafts.filter(d=>d.theme===c.id).length;const mine=s+q,hint=!o&&!mine?'尚未累積':!mine?'缺己例':!o?'缺他例':'';return `<button type="button" class="bank-cover ${view.theme===c.id?'active':''} ${hint?'thin':''}" data-bank-theme="${c.id}"><small>${KIND_LABEL[c.kind]}</small><strong>${H(c.title)}</strong><span>他例 ${o} · 己例 ${mine}</span>${hint?`<em>${hint}</em>`:''}</button>`;}).join('');
}

function itemHTML(m){
  const concept=conceptTitle(m.concept);
  const rows=m.kind==='other'
    ?[['發生了什麼',m.fact],['出處',m.source],['可以支持',m.point],['注意',m.caution]]
    :[['時間、地點、人物',m.when],['發生了什麼',m.event],['當時的想法',m.feeling],['後來的理解',m.insight],['可以支持',m.point]];
  const needsExpand=m.kind==='other'?(!m.source||!m.caution):(!m.insight||!m.feeling);
  const relatedMocks=mockLinksForTheme(m.theme);
  const transferThemes=(TRANSFER_MAP[m.theme]||[]).map(catTitle).filter(t=>t&&t!=='未分類');
  return `<article class="bank-item ${m.kind}">
    <div class="bank-item-head">
      <span class="mb-type ${m.kind==='other'?'mb-history':'mb-mine'}">${m.kind==='other'?'他例'+(m.type?'・'+H(m.type):''):'己例'}</span>
      ${m.draft?'<span class="bank-draft">未完成</span>':(needsExpand?'<span class="bank-draft">快記草稿・可再補深</span>':'')}
    </div>
    <h3>${H(m.title||m.scene||'未命名素材')}</h3>
    <p class="small">${H(catTitle(m.theme))}${concept?' · '+H(concept):''}</p>
    <dl>${rows.filter(r=>String(r[1]||'').trim()).map(([k,v])=>`<dt>${k}</dt><dd>${H(v)}</dd>`).join('')||'<dd class="small">尚未填寫內容。</dd>'}</dl>
    ${relatedMocks.length||transferThemes.length?`<div class="small" style="margin-top:4px;padding:7px 9px;background:#f4f7f0;border-radius:7px;line-height:1.65">${relatedMocks.length?`可直接套用：${relatedMocks.map(p=>`<a href="#mock?id=${encodeURIComponent(p.id)}">${H(p.id)} ${H(p.title)} →</a>`).join(' · ')}`:''}${relatedMocks.length&&transferThemes.length?'<br>':''}${transferThemes.length?`這個素材也能用在：${H(transferThemes.join('、'))}`:''}</div>`:''}
    <div class="bank-item-actions">
      <button type="button" class="btn" data-bank-edit="${H(m.id)}">${needsExpand?'補完／編輯':'編輯'}</button>
      ${m.concept&&db.concepts[m.concept]?`<a class="btn" href="${m.concept[0]==='J'?'/junior/#library?theme='+encodeURIComponent(catTitle(m.theme)):'#library?kind='+m.concept[0]+'&category='+H(m.theme)}">回到主題</a>`:''}
      <button type="button" class="btn danger" data-bank-delete="${H(m.id)}">刪除</button>
    </div>
  </article>`;
}

function draftHTML({id,d}){return `<a class="bank-item qingyi-card" href="qingyi/?draft=${encodeURIComponent(id)}#practice"><div class="bank-item-head"><span class="mb-type mb-mine">己例・情意素材卡</span></div><h3>${H(d.title||'我的故事')}</h3><p class="small">${H(d.exam||'自由取材')} · ${chars(d.body)} 字</p><p>${H((d.event||d.body||'繼續整理故事細節').slice(0,90))}</p><span class="small">在情意工作台編輯 →</span></a>`;}

function list(){
  const all=entries(),drafts=qingyiDrafts(),q=view.q.trim().toLowerCase();
  $('#bank-coverage').innerHTML=coverage(all,drafts);
  const keep=m=>(!view.theme||m.theme===view.theme)&&(!q||text(m).toLowerCase().includes(q));
  const keepDraft=d=>(!view.theme||d.theme===view.theme)&&(!q||[d.d.title,d.d.body,d.d.event].join(' ').toLowerCase().includes(q));
  const groups=[...db.categories.map(c=>c.id),''];
  const html=groups.map(g=>{
    const items=all.filter(m=>(m.theme||'')===g&&keep(m)),ds=drafts.filter(d=>d.theme===g&&keepDraft(d));
    if(!items.length&&!ds.length)return '';
    return `<section class="bank-group"><h2>${H(g?catTitle(g):'未分類')} <small>${items.length+ds.length}</small></h2><div class="bank-grid">${items.map(itemHTML).join('')}${ds.map(draftHTML).join('')}</div></section>`;
  }).join('');
  const total=all.length+drafts.length;
  const isJ=view.scope==='J';
  $('#bank-list').innerHTML=html||(total
    ?'<p class="empty-line">沒有符合條件的素材，換個主題或關鍵詞試試。</p>'
    :`<div class="bank-empty panel"><h2>題材庫還是空的（新手目標：先存 3 則生活己例＋2 則好用他例）</h2><p>直接點上方「＋30 秒記下己例／新增他例」快速留住靈感，或到「完整仿題演練室」邊讀題邊記下素材，會自動同步到這裡！</p><div style="display:flex;flex-wrap:wrap;gap:8px">${isJ?'<a class="btn primary" href="#mock?kind=J">回國中完整仿題（8 題附圖）→</a><a class="btn" href="/junior/#library">逛國中六個生活主題 →</a>':'<a class="btn primary" href="#mock?scope=H">前往高中完整仿題邊讀邊記 →</a><a class="btn" href="#library?kind=T">從知性題材開始 →</a><a class="btn" href="#library?kind=E">從情意題材開始 →</a>'}</div></div>`);
  $('#bank-count').textContent=`他例 ${all.filter(m=>m.kind==='other').length} 則 · 己例 ${all.filter(m=>m.kind==='self').length+drafts.length} 則（新手目標：先累積 5 則）`;
}

const field=(name,label,value,{area=false,hint='',req=false}={})=>`<label class="bank-field"><span>${label}${req?' <b style="color:#b85328">*</b>':''}</span>${area?`<textarea name="${name}" rows="3" placeholder="${H(hint)}" data-sample-provided="true">${H(value||'')}</textarea>`:`<input name="${name}" value="${H(value||'')}" placeholder="${H(hint)}">`}</label>`;
function themeSelect(m){return `<label class="bank-field"><span>主題（選主題可自動篩選相關概念）</span><select name="theme"><option value="">未分類</option>${['T','E','J'].filter(k=>db.categories.some(c=>c.kind===k)).map(k=>`<optgroup label="${KIND_LABEL[k]}">${db.categories.filter(c=>c.kind===k).map(c=>`<option value="${c.id}" ${m.theme===c.id?'selected':''}>${H(c.title)}</option>`).join('')}</optgroup>`).join('')}</select></label>`;}
function conceptSelect(m){
  const options=Object.entries(db.concepts).filter(([,c])=>!m.theme||c.theme===m.theme);
  const labelHint=m.theme?`（本主題共 ${options.length} 個概念）`:`（未選主題，顯示全部 ${options.length} 個；建議先選主題）`;
  return `<label class="bank-field"><span>相關概念（選填）<small>${labelHint}</small></span><select name="concept"><option value="">不指定</option>${options.map(([uid,c])=>`<option value="${uid}" ${m.concept===uid?'selected':''}>${uid}・${H(c.title)}</option>`).join('')}</select></label>`;
}

function form(m){
  const isOther=m.kind==='other';
  const isEditing=Boolean(m.id&&!m.draft);
  const openAdvanced=isEditing||Boolean(m.prompts?.length);
  $('#bank-form').innerHTML=`<form class="bank-form panel" data-id="${H(m.id||'')}" data-kind="${m.kind}" novalidate>
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px">
      <h2>${isEditing?'編輯':'30 秒快記・新增'}${isOther?'他例':'己例'}</h2>
      <span class="small">標示 <b style="color:#b85328">*</b> 為基本欄位，其餘可先留白之後再補</span>
    </div>
    ${!isOther&&m.prompts?.length?`<div class="bank-prompts"><strong>${H(m.scene||'追問提示')}</strong><ol>${m.prompts.map(p=>`<li>${H(p)}</li>`).join('')}</ol>${m.hint?`<p>${H(m.hint)}</p>`:''}</div>`:''}
    <div id="bank-form-error" role="alert" style="display:none;margin:10px 0;padding:10px 12px;border-radius:8px;background:#fdf1ec;border:1px solid #e6b8a5;color:#9a3b2c;font-size:13px"></div>
    <div class="bank-form-grid">
      ${field('title','素材名稱（一句話標題）',m.title,{req:true,hint:isOther?(view.scope==='J'?'例如：3M 便利貼從失敗膠水改寫世界':'例如：歐盟推動維修權／臺中萬秀洗衣店'):(view.scope==='J'?'例如：原本只想查一題數學，卻滑短片滑了一小時':'例如：打工被同事臨時推託代班，第一次學會誠實說不')})}
      ${themeSelect(m)}
    </div>
    ${isOther
      ?field('fact','發生了什麼（核心事實）',m.fact,{area:true,req:true,hint:'誰、何時、做了什麼、結果如何；客觀陳述'})
      :field('event','發生了什麼（具體細節）',m.event,{area:true,req:true,hint:'先記住關鍵畫面、動作、對話或最難忘的細節'})}
    <details style="margin:12px 0;padding:12px 14px;border:1px dashed #c8d5bf;border-radius:10px;background:#fafbf6" ${openAdvanced?'open':''}>
      <summary style="cursor:pointer;font-weight:700;font-size:13px;color:#2f5545">展開進階寫作欄位（選填・讓素材在考場更有說服力）</summary>
      <div style="margin-top:12px">
        <div class="bank-form-grid">
          ${isOther?`<label class="bank-field"><span>類型</span><select name="type">${OTHER_TYPES.map(t=>`<option ${m.type===t?'selected':''}>${t}</option>`).join('')}</select></label>`:''}
          ${conceptSelect(m)}
        </div>
        ${isOther
          ?field('source','出處（查證來源）',m.source,{hint:'作者與篇名、書名、報導或報告名稱'})+field('point','可以支持的論點',m.point,{area:true,hint:'這則事例能證明或反駁什麼？'})+field('caution','使用限制（避免過度推論）',m.caution,{area:true,hint:'哪些地方不能過度推論？'})
          :field('when','時間、地點、人物',m.when,{hint:view.scope==='J'?'八年級段考前、客廳餐桌、和家人':'某個週五晚間、打工櫃檯或教室、和同學／同事'})+field('feeling','當時的想法或感受',m.feeling,{area:true,hint:'那時候你怎麼想？為什麼？'})+field('insight','後來的理解（拉開思考深度）',m.insight,{area:true,hint:'現在回頭看，你發現了什麼？'})+field('point','可以支持的論點或體悟',m.point,{area:true,hint:'這件事能用在哪一類題目、支持什麼想法？'})}
      </div>
    </details>
    <div class="bank-form-actions">
      <button type="submit" class="btn primary">儲存至我的題材庫</button>
      <button type="button" class="btn" data-bank-cancel>取消</button>
    </div>
  </form>`;
  const f=$('#bank-form form'),errBox=$('#bank-form-error');
  f.theme.onchange=()=>{const cur={...m,theme:f.theme.value,concept:f.concept.value};f.concept.closest('label').outerHTML=conceptSelect(cur);};
  f.onsubmit=ev=>{
    ev.preventDefault();
    const data=Object.fromEntries(new FormData(f).entries());
    for(const k in data)data[k]=String(data[k]).trim();
    const coreKey=isOther?'fact':'event';
    if(!data.title&&!data[coreKey]){
      errBox.textContent=`請至少填寫「素材名稱」與「${isOther?'發生了什麼（核心事實）':'發生了什麼（具體細節）'}」，再按儲存喔！`;
      errBox.style.display='block';
      toast('請填寫標題與核心內容');
      f.title.focus();
      return;
    }
    if(!data.title){
      errBox.textContent='請幫這則素材取一個簡短好記的「素材名稱」。';
      errBox.style.display='block';
      toast('請填寫素材名稱');
      f.title.focus();
      return;
    }
    errBox.style.display='none';
    const id=bank.put({...m,...data,kind:m.kind,draft:false});
    if(!id){toast('無法儲存，請先複製文字或另存純文字檔留存。');return;}
    toast('已存入我的題材庫 ✓（可直接到完整仿題演練室調用）');
    closeForm(false);
  };
  f.title.focus();
  $('#bank-form').scrollIntoView({block:'start',behavior:'smooth'});
}

function closeForm(discardDraft=true){const id=$('#bank-form form')?.dataset.id;if(discardDraft&&id){const m=bank.read()[id];if(m?.draft)bank.remove(id);}$('#bank-form').innerHTML='';if(location.hash.includes('edit='))history.replaceState(null,'','#bank');list();}

function plainBankText(){
  const all=entries(),drafts=qingyiDrafts();
  const lines=['拾光寫作｜我收集的題材庫',`整理時間：${new Date().toLocaleString('zh-TW')}・共 ${all.length+drafts.length} 則`,''];
  for(const g of [...db.categories.map(c=>c.id),'']){
    const items=all.filter(m=>(m.theme||'')===g),ds=drafts.filter(d=>d.theme===g);
    if(!items.length&&!ds.length)continue;
    lines.push(`【${g?catTitle(g):'未分類'}】`);
    for(const m of items){
      lines.push(`・[${m.kind==='other'?'他例':'己例'}] ${m.title||m.scene||'未命名素材'}`);
      const rows=m.kind==='other'
        ?[['內容',m.fact],['出處',m.source],['扣題運用',m.point],['提醒',m.caution]]
        :[['時地人',m.when],['經過',m.event],['當時感受',m.feeling],['後來體會',m.insight],['扣題運用',m.point]];
      for(const [k,v] of rows)if(String(v||'').trim())lines.push(`  ${k}：${String(v).trim()}`);
    }
    for(const {d} of ds){
      lines.push(`・[己例・情意素材卡] ${d.title||'我的故事'}`);
      lines.push(`  ${String(d.body||d.event||'（尚未寫正文）').trim()}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

async function copyStudySheet(){
  const all=entries(),drafts=qingyiDrafts();
  if(!all.length&&!drafts.length){toast('你的素材庫目前還是空的，先存幾則素材再輸出喔');return;}
  const text=plainBankText();
  try{await navigator.clipboard.writeText(text);toast(`已複製我收集的 ${all.length+drafts.length} 則素材，可直接貼到文件留存 ✓`);}
  catch{const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');toast(`已複製我收集的 ${all.length+drafts.length} 則素材 ✓`);}catch{toast('無法自動複製，請改用「列印／另存 PDF」');}ta.remove();}
}

function printStudySheet(){
  const all=entries(),drafts=qingyiDrafts();
  if(!all.length&&!drafts.length){toast('你的素材庫目前還是空的，先存幾則素材再輸出喔');return;}
  const w=window.open('','_blank');
  if(!w){toast('瀏覽器阻擋了新分頁，請允許彈出視窗以列印或另存 PDF');return;}
  const groups=[...db.categories.map(c=>c.id),''].map(g=>{
    const items=all.filter(m=>(m.theme||'')===g),ds=drafts.filter(d=>d.theme===g);
    if(!items.length&&!ds.length)return '';
    return `<section><h2>${H(g?catTitle(g):'未分類')}</h2>${items.map(m=>`<article><h3>[${m.kind==='other'?'他例':'己例'}] ${H(m.title||m.scene||'未命名')}</h3><p style="white-space:pre-line">${H(m.kind==='other'?[m.fact,m.source?'出處：'+m.source:'',m.point?'扣題運用：'+m.point:'',m.caution?'提醒：'+m.caution:''].filter(Boolean).join('\n'):[m.when,m.event,m.feeling?'感受：'+m.feeling:'',m.insight?'理解：'+m.insight:'',m.point?'扣題運用：'+m.point:''].filter(Boolean).join('\n'))}</p></article>`).join('')}${ds.map(({d})=>`<article><h3>[情意素材卡] ${H(d.title||'我的故事')}</h3><p style="white-space:pre-line">${H(d.body||d.event||'')}</p></article>`).join('')}</section>`;
  }).join('');
  w.document.write(`<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>我收集的題材庫｜拾光寫作</title><style>body{font-family:"Noto Serif TC","Microsoft JhengHei",serif;max-width:780px;margin:24px auto;padding:0 18px;line-height:1.85;color:#1f2b24}h1{border-bottom:2px solid #244e40;padding-bottom:8px}h2{margin-top:24px;color:#244e40;border-left:4px solid #244e40;padding-left:10px}article{margin:10px 0 14px;padding:12px 14px;border:1px solid #d8dfd2;border-radius:6px;break-inside:avoid}h3{margin:0 0 6px;font-size:15px;color:#1e5641}p{margin:0;font-size:13.5px}@media print{.noprint{display:none}}</style></head><body><div class="noprint" style="margin-bottom:16px"><button onclick="window.print()">列印／另存 PDF</button></div><h1>拾光寫作｜我收集的題材庫</h1><p style="font-size:12px;color:#666">整理時間：${new Date().toLocaleString('zh-TW')}・共 ${all.length+drafts.length} 則</p>${groups}</body></html>`);
  w.document.close();
}

function downloadTxtSheet(){
  const all=entries(),drafts=qingyiDrafts();
  if(!all.length&&!drafts.length){toast('你的素材庫目前還是空的，先存幾則素材再下載喔');return;}
  const u=URL.createObjectURL(new Blob([plainBankText()],{type:'text/plain;charset=utf-8'}));
  const a=document.createElement('a');a.href=u;a.download=`拾光寫作-我收集的題材庫-${new Date().toISOString().slice(0,10)}.txt`;a.click();
  setTimeout(()=>URL.revokeObjectURL(u),2000);
  toast(`已下載純文字素材本（共 ${all.length+drafts.length} 則）✓`);
}

window.getMyMaterialBankCount=()=>entries().length+qingyiDrafts().length;
window.printMyMaterialBank=printStudySheet;
window.copyMyMaterialBank=copyStudySheet;
window.downloadMyMaterialBankTxt=downloadTxtSheet;

window.bankPage=function(){
  const qs=new URLSearchParams(location.hash.split('?')[1]);
  if(qs.get('scope')==='J'||qs.get('scope')==='H'||qs.get('scope')==='all')view.scope=qs.get('scope');
  const isJ=view.scope==='J';
  const totalCnt=window.getMyMaterialBankCount();
  $('#main').innerHTML=title('MY WRITING MATERIALS','我的題材庫','己例是自己的真實故事，他例是課本、新聞或真實人物故事。平時 30 秒記下，寫完整仿題與歷屆考題就能直接調用。')+`
    <section class="bank-summary">
      <p id="bank-count" class="bank-count"></p>
      <div class="bank-toolbar" style="justify-content:space-between;width:100%">
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${isJ?'<a class="btn" href="/junior/">← 回國中專區</a>':''}
          <button type="button" class="btn primary" data-bank-new="self">＋30 秒記下己例</button>
          <button type="button" class="btn" data-bank-new="other">＋新增他例</button>
          <a class="btn" href="${isJ?'#mock?kind=J':'#mock?scope=H'}">去完整仿題套用素材 →</a>
          <a class="btn" href="class.html">去班級觀摩牆繳交 →</a>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <button type="button" class="btn" data-bank-print ${totalCnt?'':'style="opacity:.65"'}>輸出素材庫（列印／PDF）</button>
          <button type="button" class="btn" data-bank-txt ${totalCnt?'':'style="opacity:.65"'}>下載純文字（.txt）</button>
          <button type="button" class="btn" data-bank-copy ${totalCnt?'':'style="opacity:.65"'}>複製全部素材</button>
        </div>
      </div>
    </section>
    <div class="bank-filter" style="margin-top:14px">
      <label class="search"><span>⌕</span><input id="bank-search" type="search" placeholder="搜尋素材、人物、事件…" aria-label="搜尋我的題材庫" value="${H(view.q)}"></label>
      ${view.theme?`<button type="button" class="btn" data-bank-theme="">顯示全部主題（目前：${H(catTitle(view.theme))}）</button>`:''}
    </div>
    <div id="bank-form"></div>
    <div id="bank-list"></div>
    <details class="panel" style="margin-top:18px" ${view.theme?'open':''}>
      <summary style="cursor:pointer;font-weight:700;color:#1e5641;font-size:14.5px">查看各主題累積進度與篩選（點擊主題可只看該分類）</summary>
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:12px 0 10px">
        <div class="tabs" role="group" aria-label="切換學段主題">
          <button type="button" class="${view.scope==='H'?'active':''}" data-bank-scope="H">高中 17 主題</button>
          <button type="button" class="${view.scope==='J'?'active':''}" data-bank-scope="J">國中 6 主題</button>
          <button type="button" class="${view.scope==='all'?'active':''}" data-bank-scope="all">全部 23 主題</button>
        </div>
        <span class="small">每個主題建議慢慢累積 1 則己例＋1 則他例即可</span>
      </div>
      <div id="bank-coverage" class="bank-coverage"></div>
    </details>
    <p class="notice">公用電腦提醒：題材庫存在目前瀏覽器，重開機或換電腦不會同步；下課前或考前請點上方「下載純文字（.txt）」「輸出素材庫（列印／PDF）」或「複製全部素材」帶走。</p>`;
  $('#bank-search').oninput=e=>{view.q=e.target.value;list();};
  list();
  const edit=qs.get('edit');
  const m=edit&&bank.read()[edit];
  if(m)form(m);
};

document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!document.querySelector('#bank-list'))return;
 if(b.hasAttribute('data-bank-theme')){view.theme=view.theme===b.dataset.bankTheme?'':b.dataset.bankTheme;window.bankPage();}
 else if(b.dataset.bankScope){view.scope=b.dataset.bankScope;window.bankPage();}
 else if(b.dataset.bankNew)form({kind:b.dataset.bankNew,theme:view.theme});
 else if(b.dataset.bankEdit){const m=bank.read()[b.dataset.bankEdit];if(m)form(m);}
 else if(b.dataset.bankDelete){const m=bank.read()[b.dataset.bankDelete];if(m&&confirm(`刪除「${m.title||m.scene||'這則素材'}」？刪除後無法復原。`)){bank.remove(m.id);toast('已刪除');list();}}
 else if(b.hasAttribute('data-bank-cancel'))closeForm(true);
 else if(b.hasAttribute('data-bank-print'))printStudySheet();
 else if(b.hasAttribute('data-bank-txt'))downloadTxtSheet();
 else if(b.hasAttribute('data-bank-copy'))copyStudySheet();});

backupKeys.push(KEY);
const bankImportLabel=importLabel;importLabel=function(key,id){if(key===KEY){const m=bank.read()[id];return '題材庫 '+(m?.title||id);}return bankImportLabel(key,id);};
const bankNotebook=notebook;notebook=function(){bankNotebook();const all=entries(),drafts=qingyiDrafts();$('.backup')?.insertAdjacentHTML('afterend',`<section class="notebook-section"><h2>我的題材庫 <small>${all.length+drafts.length}</small></h2><p>他例 ${all.filter(m=>m.kind==='other').length} 則、己例 ${all.filter(m=>m.kind==='self').length+drafts.length} 則（含情意素材卡）。<a href="#bank">打開我的題材庫 →</a></p></section>`);};
if(location.hash.slice(1).split('?')[0]==='bank')window.bankPage();
})();
