'use strict';
// 完整仿題（一題到底模式）：整合 24 道完整仿題（高中知性 8・高中情意 8・國中會考 8）＋ 全站 69 道主題仿題，與「我的題材庫」雙向連動。
(()=>{
const STORE_KEY='guoxie-mock-drafts-v1';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const countChars=s=>[...String(s||'').replace(/\s+/gu,'')].length;
const estimateLines=s=>{const ps=String(s||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);return ps.reduce((sum,p)=>sum+Math.max(1,Math.ceil((countChars(p)+2)/21)),0);};
const readDrafts=()=>{try{const v=JSON.parse(localStorage.getItem(STORE_KEY));return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}catch{return {};}};
const saveDrafts=v=>{try{localStorage.setItem(STORE_KEY,JSON.stringify(v));return true;}catch{return false;}};
const readClassCfg=()=>{try{return JSON.parse(localStorage.getItem('guoxie-class-v1'))||{};}catch{return {};}};
const saveClassCfg=v=>{try{localStorage.setItem('guoxie-class-v1',JSON.stringify(v));}catch{}};
const titleModeOf=q2=>{if(q2?.titleMode)return q2.titleMode;if(/不必訂題|不訂題/.test((q2?.label||'')+(q2?.prompt||'')))return 'unnamed';return 'named';};

function highlightPassageText(text,keyPhrases=[],themePhrases=[]){
  const segs=[];
  const addMarks=(phrases,cls)=>{
    for(const p of phrases||[]){
      if(!p)continue;
      const idx=text.indexOf(p);
      if(idx>=0)segs.push({start:idx,end:idx+p.length,cls});
    }
  };
  addMarks(keyPhrases,'hl-key');
  addMarks(themePhrases,'hl-theme');
  segs.sort((a,b)=>a.start-b.start);
  const nonOverlap=[];
  for(const s of segs){
    if(!nonOverlap.length||s.start>=nonOverlap.at(-1).end)nonOverlap.push(s);
  }
  let out='',pos=0;
  for(const s of nonOverlap){
    out+=esc(text.slice(pos,s.start))+`<span class="${s.cls}">${esc(text.slice(s.start,s.end))}</span>`;
    pos=s.end;
  }
  out+=esc(text.slice(pos));
  return out.split(/\n+/).map(p=>`<p>${p}</p>`).join('');
}

function findTopicExample(topicExId){
  const groups=window.TOPIC_EXAMPLES?.groups||{};
  for(const g of Object.values(groups)){
    const ex=g.examples.find(e=>e.id===topicExId);
    if(ex)return {group:g,ex};
  }
  return null;
}

// 將 #library 任一主題仿題轉為完整「一題到底」規格
function buildTopicMock(topicExId){
  const found=findTopicExample(topicExId);
  if(!found)return null;
  const {group,ex}=found;
  const isT=group.id.startsWith('T-'),isJ=group.id.startsWith('J-');
  const m=window.WRITING_MODELS?.[ex.model];
  const rawParas=String(ex.material||'').split(/\n+/).filter(Boolean);
  const passages=rawParas.map((text,i)=>({
    label:rawParas.length>1?(text.startsWith('【')?'':`【材料 ${i+1}】`):'【引導材料】',
    tone:i%2===0?'forest':'clay',
    text:text.replace(/^【[^】]+】/,m=>m),
    summary:text.slice(0,90)+(text.length>90?'…':''),
    keyPhrases:[],
    themePhrases:[]
  }));
  const realItem=window.MATERIALS?.items?.[ex.sourceModel]||window.MATERIALS?.items?.[ex.model];
  const bridgeQuestions=[];
  if(realItem?.self?.length){
    realItem.self.forEach((s,i)=>{
      bridgeQuestions.push({
        tag:`己例追問 ${i+1}・${s.scene}`,
        kind:'self',
        question:s.questions.join(' '),
        placeholder:s.angle
      });
    });
  }else{
    bridgeQuestions.push({
      tag:'從閱讀材料延伸思考',
      kind:'self',
      question:ex.intent?.question||`回想生活裡與「${ex.title}」相近的一個具體經驗或觀察，當時發生了什麼？`,
      placeholder:'先寫下時間、場景與最令你在意的細節……'
    });
  }
  const sampleMaterials=[];
  if(realItem?.others?.length){
    realItem.others.slice(0,3).forEach((o,i)=>{
      sampleMaterials.push({id:`tm_o_${i}`,kind:'other',title:`[${o.type}] ${o.title}`,detail:o.fact,source:o.source,angle:o.use,caution:o.caution});
    });
  }
  if(m){
    sampleMaterials.push({id:'tm_s_0',kind:'self',title:`同概念己例示範：${m.title}`,detail:m.paragraphs[isT?1:0],angle:'觀察示範段如何用具體細節支持想法，正式寫作請換成自己的親身經驗。'});
  }
  return {
    id:'TOPIC_'+ex.id,
    topicExId:ex.id,
    kind:isT?'T':(isJ?'J':'E'),
    theme:group.id,
    modelId:ex.model,
    title:ex.title,
    badge:`${group.title}・${ex.form}（一題到底模式）`,
    years:[],
    instruction:isT?'閱讀下列材料，並依序回答問題（一）與問題（二）。':'閱讀下列引導材料，依作答要求完成一篇有組織的文章。',
    figure:ex.figure||null,
    passages,
    q1:ex.question1?{label:'問題（一）',meta:'占 4 分・文長限 80 字以內（約 4 行）',limit:80,prompt:ex.question1.replace(/^問題（一）[：:]\s*/,'')}:null,
    q2:{
      label:ex.question1?'問題（二）':(isJ&&/不訂題|不必訂題/.test((ex.form||'')+(ex.task||''))?'作答說明（不必訂題）':'寫作題目'),
      titleMode:isJ&&/不訂題|不必訂題/.test((ex.form||'')+(ex.task||''))?'unnamed':'named',
      meta:isT?'占 21 分・文長限 400 字以內（約 19 行）':(isJ?'會考寫作無硬性字數規定（基礎 350–450 字｜會考衝刺建議 500–650 字）':'情意寫作練習・文長不限（建議 600–800 字）'),
      coreTitle:ex.title,
      limit:isT?400:0,
      recommendedRange:isT?null:(isJ?[500,650]:[600,800]),
      prompt:ex.task
    },
    analysis:{
      q1Tip:ex.intent?.purpose||'先確認引導材料中的核心對比或處境，只客觀回應材料，不急著加個人結論。',
      q2Tip:ex.steps.map((s,i)=>`${i+1}. ${s}`).join(' '),
      pitfalls:[ex.avoid,'只喊抽象結論，沒有回到材料條件或具體事例。','段落之間缺乏承接，變成彼此獨立的幾段話。']
    },
    stances:isT?[
      {id:'a',title:'肯定正向價值，但清楚補上限制條件與代價',desc:'先說明立意或方法能解決的問題，再補上例外與限制，最後提出有條件的平衡做法。',hint:'第二段說清正面理由與事例，第三段補上反面限制或己例反思，第四段提出具操作性的原則。'},
      {id:'b',title:'先點出隱藏風險，再提出修正後的保留方案',desc:'從常見盲點切入，說明忽略限制會帶來什麼代價，再界定合理運用的範圍。',hint:'第二段先承認原本設計的用意，第三段深入剖析盲點與代價，第四段提出修正條件與界線。'}
    ]:isJ?[
      {id:'a',title:'先回應圖表或情境，再寫一件具體的生活經驗',desc:'先點出材料給你的觀察，接著細寫自己親身經歷的經過與做法，最後收束體會。',hint:'第一段回應材料破題；第二段交代事件細節；第三段寫轉折或具體做法；第四段自然回扣主旨。'},
      {id:'b',title:'從前後對比或不同看法切入，說清自己的想法',desc:'對比原本的想法與後來發現的細節，讓理由和生活經驗扣在一起。',hint:'第一段點出對比；第二段寫原先做法或看法；第三段寫改變的關鍵畫面；第四段說出自己的體會。'}
    ]:[
      {id:'a',title:'從「一個具體物件或場景」切入記憶與轉變',desc:'先讓讀者看見現場與動作，再逐步展開當時感受與後來的理解。',hint:'起段建立具體畫面，承段交代原有想法或困難，轉段用關鍵細節推動改變，合段回扣開頭留下餘韻。'},
      {id:'b',title:'從「今昔對照」切入情感層次',desc:'對比過去的理所當然或猶豫，與現在回望時多出的體貼與理解。',hint:'先寫當下觸動你的瞬間，再回溯過往經驗，透過對話或動作呈現轉折，最後自然收束。'}
    ],
    bridgeQuestions,
    sampleMaterials,
    scaffoldPrompts:m?m.roles.map((r,i)=>({
      label:`第${i+1}段｜${r}`,
      range:isT?(i===0?'建議 55–75 字':i===3?'建議 65–85 字':'建議 90–115 字'):'建議 120–170 字',
      placeholder:m.paragraphNotes?.[i]||ex.steps[i]||`圍繞「${r}」展開你的具體材料與想法……`
    })):[
      {label:'第一段｜開頭與切入',range:'建議 80–110 字',placeholder:'回應題旨，交代立場或具體場景。'},
      {label:'第二段｜展開理由或事件',range:'建議 100–150 字',placeholder:'結合具體細節、他例或親身經歷展開說明。'},
      {label:'第三段｜深化轉折或反面考量',range:'建議 100–150 字',placeholder:'補上限制條件、不同視角或關鍵情感轉折。'},
      {label:'第四段｜收束與回應',range:'建議 80–120 字',placeholder:'回扣題目與前文，提出具體原則或真實體悟。'}
    ],
    checklist:isT?[
      {id:'c1',label:'問題（一）4 分：純客觀根據材料作答，沒有混入個人立場，且控制在 80 字內。'},
      {id:'c2',label:'問題（二）21 分：有清楚立場，並能照顧反面限制或現實代價。'},
      {id:'c3',label:'已具體回應題目步驟，沒有落入「偏題警示」的陷阱。'},
      {id:'c4',label:'結合具體可查證他例或切身己例，而非只喊空泛口號。'},
      {id:'c5',label:'結尾有條件收束，且全文不超過 400 字（約 19 行）上限。'}
    ]:isJ?[
      {id:'c1',label:'立意取材：確實回應本題引導材料與任務，並舉出具體生活經驗。'},
      {id:'c2',label:'結構組織：段落分明，前後承接順暢，沒有偏離主旨。'},
      {id:'c3',label:'細節與理由：有清楚的動作、畫面或觀察理由，不只空喊大道理。'},
      {id:'c4',label:'遣詞造句：用字自然通順，句子意思完整清楚。'},
      {id:'c5',label:'格式與檢查：已檢查錯別字、標點符號與題名規定（不必訂題直接空兩格起筆）。'}
    ]:[
      {id:'c1',label:'有具體可感的場景、動作、對話或物件，避免抽象說教。'},
      {id:'c2',label:'清楚交代前後心情或理解的層次變化。'},
      {id:'c3',label:'已避開本題偏題警示，扣緊題目核心。'},
      {id:'c4',label:'轉折來自具體細節而非硬塞大道理。'},
      {id:'c5',label:'結尾自然收束並保有餘韻，未強求瞬間圓滿。'}
    ],
    reference:{
      q1Sample:m?.short||'',
      q2Outline:m?m.roles.map((r,i)=>`第${i+1}段（${r}）：${m.paragraphNotes?.[i]||ex.steps[i]||''}`):ex.steps,
      fullEssay:m?.paragraphs||null,
      rubricNote:m?`本示範對應同概念「${m.title}」，呈現段落功能與推進節奏；正式作答請緊扣本題材料並換成自己的事例與觀點。`:''
    }
  };
}

function getPrompt(query){
  const id=query.get('id'),topic=query.get('topic');
  if(topic)return buildTopicMock(topic);
  const all=window.MOCK_PROMPTS||[];
  if(id)return all.find(p=>p.id===id)||null;
  return null;
}

function bankEntriesForTheme(theme){
  const raw=Object.values(window.materialBank?.read?.()||{}).filter(m=>m&&typeof m==='object');
  const db=window.MATERIALS||{themes:{}};
  const list=raw.map(m=>m.concept&&db.themes[m.concept]?{...m,theme:db.themes[m.concept]}:m);
  return list.sort((a,b)=>{
    const am=a.theme===theme?0:1,bm=b.theme===theme?0:1;
    return am-bm||(b.updated||0)-(a.updated||0);
  });
}

function bankDetailText(m){
  if(m.kind==='other')return [m.fact,m.source?`出處：${m.source}`:'',m.point?`可支持：${m.point}`:'',m.caution?`注意：${m.caution}`:''].filter(Boolean).join('｜');
  return [m.when,m.event,m.feeling?`感受：${m.feeling}`:'',m.insight?`理解：${m.insight}`:'',m.point?`可用於：${m.point}`:''].filter(Boolean).join('｜');
}

function padletText(prompt,st){
  const k=String(st.stuClass||'').trim().replace(/班$/,'');
  const s=String(st.stuSeat||'').trim();
  const n=String(st.stuName||'').trim();
  const sPad=s?s.replace(/^0+(?=\d)/,'').padStart(2,'0'):'';
  const q2Text=(st.q2Mode==='full'&&st.q2Full.trim())?st.q2Full.trim():st.q2Parts.map(x=>x.trim()).filter(Boolean).join('\n\n');
  let head=`〔拾光｜完整仿題｜${prompt.id}〕`;
  if(k&&s&&n)head=`〔拾光｜${k}班｜${sPad}號｜${n}｜${prompt.theme||'未分類'}｜完整仿題｜${prompt.id}〕`;
  else if(k||s||n)head=`〔拾光｜完整仿題｜${prompt.id}｜${[k?k+'班':'',s?s+'號':'',n].filter(Boolean).join(' ')}〕`;
  const lines=[head,''];
  if(prompt.q1){
    lines.push(`【問題一】（${countChars(st.q1)}字）`,st.q1.trim()||'（尚未填寫問題一）','');
  }
  const tm=titleModeOf(prompt.q2);
  const q2Heading=tm==='unnamed'
    ?'【正文（不必訂題）】'
    :tm==='custom'
    ?`【正文：${(st.customTitle||'自訂題目未填').trim()}】`
    :`【${prompt.q1?'問題二':'正文'}：${prompt.q2.coreTitle}】`;
  lines.push(`${q2Heading}（${countChars(q2Text)}字）`,q2Text||'（尚未填寫作答內容）');
  return lines.join('\n');
}

async function copyText(text){
  try{await navigator.clipboard.writeText(text);return true;}catch{
    const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();
    let ok=false;try{ok=document.execCommand('copy');}catch{}ta.remove();return ok;
  }
}

let timerHandle=null;

function renderIndex(filterKind,scope){
  if(timerHandle){clearInterval(timerHandle);timerHandle=null;}
  const all=window.MOCK_PROMPTS||[],drafts=readDrafts();
  const list=all.filter(p=>filterKind?p.kind===filterKind:(scope==='H'?p.kind!=='J':true));
  const doneCount=list.filter(p=>{const d=drafts[p.id];return d&&(countChars(d.q1)+countChars(d.q2Full)+countChars((d.q2Parts||[]).join(''))>0);}).length;
  $('#main').innerHTML=title('COMPLETE MOCK PROMPTS · 一題到底','完整仿題演練室','24 道大考規格完整仿題（高中知性 8 題甲乙雙文・高中情意 8 題情境引文・附圖暖身／國中會考 8 題），一頁完成「讀題審題 → 延伸取材與題材庫連動 → 分段／全文作答 → 自評與輸出」。')+`
    <section class="filters" style="margin-bottom:18px">
      <div class="filter-row" style="border-top:0;margin-top:0;padding-top:0">
        <div class="tabs" role="group" aria-label="篩選仿題類型">
          <a href="#mock?scope=H" class="${!filterKind&&scope==='H'?'active':''}">高中全部（16 題）</a>
          <a href="#mock?kind=T" class="${filterKind==='T'?'active':''}">高中知性（D01–D08）</a>
          <a href="#mock?kind=E" class="${filterKind==='E'?'active':''}">高中情意（E41–E48）</a>
          <a href="#mock?kind=J" class="${filterKind==='J'?'active':''}">國中會考／附圖暖身（8 題）</a>
          <a href="#mock" class="${!filterKind&&!scope?'active':''}">全部 24 題</a>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          ${filterKind==='J'?'<a class="btn compact" href="/junior/">← 回國中專區</a>':''}
          <span class="mock-pill">已開始練筆 ${doneCount} / ${list.length} 題</span>
        </div>
      </div>
    </section>
    <div class="mock-index-grid">
      ${list.map(p=>{
        const d=drafts[p.id];
        const written=d?Math.max(countChars(d.q2Full),countChars((d.q2Parts||[]).join('')))+countChars(d.q1):0;
        const themeName=window.MATERIALS?.categories?.find(c=>c.id===p.theme)?.title||p.theme;
        const badgeCls=p.kind==='E'?'feeling':p.kind==='J'?'junior':'';
        const kindTag=p.kind==='T'?'高中知性雙文':p.kind==='J'?'國中會考仿題':'高中情意引文';
        return `<article class="mock-index-card">
          <div class="mock-index-meta">
            <span class="mock-badge ${badgeCls}" style="margin:0">${kindTag}・${esc(p.id)}</span>
            <span class="small">${esc(themeName)}</span>
            ${p.figure?'<span class="mock-pill" style="padding:2px 8px">附引導圖</span>':''}
            ${written?`<span class="mock-pill" style="margin-left:auto">已寫 ${written} 字</span>`:''}
          </div>
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.q2.coreTitle)}｜${esc(p.passages[0].summary)}</p>
          <div class="mock-index-foot">
            <span class="small">${esc(p.q2.meta)}</span>
            <a class="btn primary compact" href="#mock?id=${encodeURIComponent(p.id)}">${written?'繼續練筆 →':'開始一題到底 →'}</a>
          </div>
        </article>`;
      }).join('')}
    </div>
    <section class="panel" style="margin-top:24px">
      <h2>也可以練全站 69 道主題仿題（高中 51 題＋國中 18 題）</h2>
      <p>全站 23 個國高中主題的 69 道原創練習題皆已升級完整閱讀材料；點開任一練習題的「進入一題到底完整練筆 →」，都能直接套用這套四步驟工作台與「我的題材庫」連動。</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        <a class="btn" href="#library?kind=T">高中知性 11 主題（33 題）→</a>
        <a class="btn" href="#library?kind=E">高中情意 6 主題（18 題）→</a>
        <a class="btn" href="/junior/#library">國中會考 6 主題（18 題）→</a>
      </div>
    </section>
  `;
}

function renderWorkspace(prompt){
  if(timerHandle){clearInterval(timerHandle);timerHandle=null;}
  const allDrafts=readDrafts(),saved=allDrafts[prompt.id]||{},clsCfg=readClassCfg();
  const examMinutes=prompt.kind==='T'?40:50;
  const tm=titleModeOf(prompt.q2);
  const st={
    step:saved.step||1,
    highlightOn:saved.highlightOn!==undefined?saved.highlightOn:true,
    examMode:false,
    splitView:saved.splitView||false,
    refTab:'full',
    stance:saved.stance||prompt.stances[0].id,
    selectedIds:Array.isArray(saved.selectedIds)?saved.selectedIds:[],
    activePinnedId:null,
    customTitle:saved.customTitle||'',
    q1:saved.q1||'',
    q2Mode:saved.q2Mode||'scaffold',
    q2Parts:Array.isArray(saved.q2Parts)&&saved.q2Parts.length===4?saved.q2Parts:['','','',''],
    q2Full:saved.q2Full||'',
    q2FullDirty:!!saved.q2FullDirty,
    q2PartsUpdated:saved.q2PartsUpdated||0,
    q2FullUpdated:saved.q2FullUpdated||0,
    checked:saved.checked||{},
    spoilerOpened:!!saved.spoilerOpened,
    stuClass:saved.stuClass||clsCfg.klass||'',
    stuSeat:saved.stuSeat||clsCfg.seat||'',
    stuName:saved.stuName||clsCfg.name||'',
    qaKind:'self',qaTitle:'',qaDetail:'',qaPrompt:'',
    sbKind:'self',sbTitle:'',sbDetail:'',
    remainingSec:examMinutes*60,
    timerRunning:false,
    timerPaused:false
  };

  function persist(){
    const drafts=readDrafts();
    drafts[prompt.id]={
      id:prompt.id,title:prompt.title,kind:prompt.kind,theme:prompt.theme,topicExId:prompt.topicExId||'',
      step:st.step,highlightOn:st.highlightOn,splitView:st.splitView,stance:st.stance,
      selectedIds:st.selectedIds,customTitle:st.customTitle,q1:st.q1,q2Mode:st.q2Mode,q2Parts:st.q2Parts,q2Full:st.q2Full,
      q2FullDirty:st.q2FullDirty,q2PartsUpdated:st.q2PartsUpdated,q2FullUpdated:st.q2FullUpdated,checked:st.checked,spoilerOpened:st.spoilerOpened,
      stuClass:st.stuClass,stuSeat:st.stuSeat,stuName:st.stuName,updated:Date.now()
    };
    saveDrafts(drafts);
  }

  function combinedParts(){return st.q2Parts.map(x=>x.trim()).filter(Boolean).join('\n\n');}
  function activeQ2Text(){return st.q2Mode==='full'?st.q2Full:combinedParts();}
  function allSelectableMaterials(){
    const mine=bankEntriesForTheme(prompt.theme).map(m=>({
      id:'bank:'+m.id,bankId:m.id,from:'mine',kind:m.kind==='other'?'other':'self',
      sameTheme:m.theme===prompt.theme,
      themeTitle:window.MATERIALS?.categories?.find(c=>c.id===m.theme)?.title||'未分類',
      title:m.title||m.scene||'未命名素材',
      detail:bankDetailText(m)||'（尚未補充細節）'
    }));
    const demo=prompt.sampleMaterials.map(m=>({...m,from:'demo'}));
    return {mine,demo,all:[...mine,...demo]};
  }

  function formatTimer(sec){const m=String(Math.floor(sec/60)).padStart(2,'0'),s=String(sec%60).padStart(2,'0');return `${m}:${s}`;}

  function draw(){
    const themeName=window.MATERIALS?.categories?.find(c=>c.id===prompt.theme)?.title||prompt.theme;
    const {mine,demo,all:allMats}=allSelectableMaterials();
    const chosen=allMats.filter(m=>st.selectedIds.includes(m.id));
    if(st.activePinnedId&&!chosen.some(m=>m.id===st.activePinnedId))st.activePinnedId=null;
    const stanceObj=prompt.stances.find(s=>s.id===st.stance)||prompt.stances[0];
    const q1Len=countChars(st.q1),q2Len=countChars(activeQ2Text());
    const q1Lines=prompt.q1?estimateLines(st.q1):0;
    const q2Lines=prompt.kind==='T'?estimateLines(activeQ2Text()):0;
    const q2Limit=prompt.q2.limit||0;
    const q2StatusClass=(q2Limit&&(q2Len>q2Limit||q2Lines>19))?'warn':'';
    const q2Label=q2Limit?`${q2Len} / ${q2Limit} 字（約 ${q2Lines} 行）`:`${q2Len} 字（建議 ${prompt.q2.recommendedRange?.[0]||500}–${prompt.q2.recommendedRange?.[1]||650} 字）`;

    const backHref=prompt.topicExId&&prompt.kind==='J'?'/junior/#library':prompt.kind==='J'?'#mock?kind=J':prompt.kind==='E'?'#mock?kind=E':prompt.kind==='T'?'#mock?kind=T':'#mock';
    const q2HeadText=tm==='unnamed'
      ?'作答說明（不必訂題，直接空兩格起筆）'
      :tm==='custom'
      ?`${prompt.q2.label}（自訂題目）`
      :`${prompt.q2.label}：${prompt.q2.coreTitle}`;
    const q2WriteTitle=tm==='unnamed'
      ?'全文作答區（不必訂題）'
      :tm==='custom'
      ?'全文作答區（請於下方自訂題目）'
      :`${prompt.q1?'問題（二）':'全文'}作答區：${prompt.q2.coreTitle}`;
    const renderMatBody=m=>{
      const ep=String(m.essayParagraph||'').trim();
      const epTag=m.kind==='other'
        ?(prompt.kind==='T'?`約 ${countChars(ep)} 字・寫進 400 字可精簡至 50 字內`:`約 ${countChars(ep)} 字・可直接參考引用`)
        :`約 ${countChars(ep)} 字・看寫法示範（請換自己故事）`;
      const epHTML=ep?`<div class="mat-essay-para ${m.kind==='other'?'other':''}"><div class="mat-essay-para-head"><strong>${m.kind==='other'?'他例完整段落示範':'己例完整段落示範'}</strong><span>${epTag}</span></div><p>${esc(ep)}</p></div>`:'';
      const el=m.elements;
      const elHTML=el?`<div class="mat-elements">${el.who?`<div><b>人：</b>${esc(el.who)}</div>`:''}${el.when?`<div><b>時：</b>${esc(el.when)}</div>`:''}${el.where?`<div><b>地：</b>${esc(el.where)}</div>`:''}${el.what?`<div><b>物：</b>${esc(el.what)}</div>`:''}${el.event?`<div class="mat-el-full"><b>事：</b>${esc(el.event)}</div>`:''}</div>`:'';
      const kpHTML=Array.isArray(m.keyPoints)&&m.keyPoints.length?`<div class="mat-keypoints"><div class="mat-keypoints-title">扣題要點</div><ul>${m.keyPoints.map(k=>`<li>${esc(k)}</li>`).join('')}</ul></div>`:'';
      const metaHTML=(m.source||(!kpHTML&&m.angle)||m.caution)?`<div class="mat-meta">${m.source?`<div><strong>出處：</strong>${esc(m.source)}</div>`:''}${!kpHTML&&m.angle?`<div><strong>扣題切入：</strong>${esc(m.angle)}</div>`:''}${m.caution?`<div class="caution-text"><strong>使用提醒：</strong>${esc(m.caution)}</div>`:''}</div>`:'';
      const detailLabel=m.kind==='other'?`展開人事時地物、扣題要點與完整背景（${countChars(m.detail)} 字・免上網查證）`:`展開人事時地物、扣題要點與完整場景擴寫（${countChars(m.detail)} 字）`;
      const bgHTML=ep?`<details class="mat-bg-details" data-stop-toggle><summary>${detailLabel}<span>▾</span></summary>${elHTML}${kpHTML}<p class="mat-detail-text">${esc(m.detail)}</p>${metaHTML}</details>`:`<p class="mat-detail-text">${esc(m.detail)}</p>${metaHTML}`;
      return `${epHTML}${bgHTML}`;
    };
    const qBoxesHTML=()=>`${prompt.q1?`<div class="mock-qbox"><div class="mock-qbox-head"><strong>${esc(prompt.q1.label)}</strong><span class="small">${esc(prompt.q1.meta)}</span></div><p>${esc(prompt.q1.prompt)}</p></div>`:''}<div class="mock-qbox q2"><div class="mock-qbox-head"><strong>${esc(q2HeadText)}</strong><span class="small">${esc(prompt.q2.meta)}</span></div><p>${esc(prompt.q2.prompt)}</p></div>`;

    const figureHTML=()=>prompt.figure?`<figure class="mock-figure"><img src="${esc(prompt.figure.src)}" alt="${esc(prompt.figure.alt)}" loading="lazy">${prompt.figure.caption?`<figcaption>${esc(prompt.figure.caption)}</figcaption>`:''}</figure>`:'';
    const passagesHTML=(compact=false)=>prompt.passages.map(p=>`
      <div class="mock-passage ${!st.highlightOn||st.examMode?'no-highlight':''}">
        ${p.label?`<div class="mock-passage-label ${p.tone==='clay'?'clay':''}">${esc(p.label)}</div>`:''}
        ${compact?`<p style="text-indent:0;font-family:inherit;font-size:13px;line-height:1.75">${esc(p.summary)}</p>`:highlightPassageText(p.text,p.keyPhrases,p.themePhrases)}
      </div>
    `).join('');

    let panelHTML='';
    if(st.step===1){
      panelHTML=`
        <div class="mock-grid mock-step1-wide">
          <div class="mock-card">
            <div class="mock-head-row">
              <div>
                <span class="mock-badge ${prompt.kind==='E'?'feeling':prompt.kind==='J'?'junior':''}">${esc(prompt.badge)}</span>
                <h2>${esc(prompt.id.replace(/^TOPIC_/,''))}｜${esc(prompt.title)}</h2>
              </div>
              <button type="button" class="btn compact" id="mock-toggle-hl">${st.highlightOn&&!st.examMode?'標色提示：開啟中':'標色提示：已關閉'}</button>
            </div>
            <p class="mock-instruction">${esc(prompt.instruction)}</p>
            ${figureHTML()}
            ${passagesHTML(false)}
            ${qBoxesHTML()}
          </div>

          <div class="mock-step1-side">
            ${st.examMode?`<div class="mock-card"><h3>考場實戰模式進行中</h3><p class="small">已自動隱藏審題解析與立場提示，模擬真實考場獨立審題。完成讀題後可直接前往作答，或於頂部切回「引導模式」。</p><button type="button" class="btn primary" data-mock-step="3">直接開始作答 →</button></div>`:`
              <div class="mock-card">
                <h3>審題 30 秒：先拆任務再動筆</h3>
                <div class="mock-tip"><strong>1. ${prompt.q1?'問題（一）閱讀理解與分歧摘述':'核心任務與切入重點'}</strong><p>${esc(prompt.analysis.q1Tip)}</p></div>
                <div class="mock-tip"><strong>2. ${prompt.q1?'問題（二）立場與推論結構':'寫作張力與篇幅提醒'}</strong><p>${esc(prompt.analysis.q2Tip)}</p></div>
                <div class="mock-tip pitfall"><strong>${prompt.kind==='J'?'對標會考六級分：避開常見三／四級分陷阱':'對標學測 A 等第：避開常見 B 等扣分陷阱'}</strong><ul>${prompt.analysis.pitfalls.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
              </div>
              <div class="mock-card">
                <h3>先定下你的基本立場／切入視角</h3>
                <p class="small" style="margin-bottom:10px">選一個最貼近你想法的方向，系統會帶入步驟 3 的分段寫作提示：</p>
                ${prompt.stances.map(s=>`
                  <button type="button" class="stance-btn ${st.stance===s.id?'active':''}" data-mock-stance="${esc(s.id)}">
                    <strong>${esc(s.title)}</strong>
                    <span>${esc(s.desc)}</span>
                  </button>`).join('')}
                <div class="step-nav-foot">
                  <a class="small" href="${backHref}">← 查看其他${prompt.kind==='J'?'國中':prompt.kind==='E'?'情意':'知性'}仿題</a>
                  <button type="button" class="btn primary" data-mock-step="2">下一步：延伸思考與調用題材庫 →</button>
                </div>
              </div>`}
          </div>
        </div>`;
    }else if(st.step===2){
      const qaPlaceholder=prompt.kind==='E'
        ?'例：段考考差卻硬發笑臉限動，熄屏才覺得好累'
        :prompt.kind==='J'
        ?'例：原本只想查一題數學公式，卻滑短影片滑到九點半'
        :'例：專題報告先讓 AI 生大綱，被老師追問卻答不出理由';
      const pickHint=prompt.kind==='E'
        ?'把 1 則自己的生活小事寫深就夠動人，他例當點綴選配即可；勾選後會釘選在步驟 3 上方（不會算進正式作答字數）。'
        :'建議挑 1 則自己的「己例」＋ 1 則「他例」，勾選後會釘選在步驟 3 上方隨時翻看（不會算進正式作答字數）。';
      panelHTML=`
        <div class="mock-grid">
          <div>
            <div class="bridge-box">
              <h3>從剛才的引文，聯想自己的經驗</h3>
              <p class="small" style="margin:0">讀完剛才的引文後，先別急著挑現成範例！點選下方任一追問，右側「30 秒靈感快記」會直接帶入引導，幫你記下自己的真實故事並存回「我的題材庫」。</p>
              <div class="bridge-list">
                ${prompt.bridgeQuestions.map((b,i)=>`
                  <button type="button" class="bridge-btn" data-bridge-idx="${i}">
                    <small>${esc(b.tag)}・${b.kind==='other'?'建議記為他例':'建議記為己例'}</small>
                    <p>${esc(b.question)}</p>
                    <em>點擊帶入右側「30 秒靈感快記」→</em>
                  </button>`).join('')}
              </div>
            </div>

            <div class="mock-card">
              <div class="mock-head-row" style="margin-bottom:10px">
                <div>
                  <h2 style="font-size:18px;margin:0">勾選本題要帶入的素材</h2>
                  <p class="small" style="margin:2px 0 0">${pickHint}</p>
                </div>
                <span class="mock-pill">已釘選 ${chosen.length} 則</span>
              </div>

              <div class="mat-group-title">
                <strong>我的題材庫（#${esc(themeName)} 相關優先）</strong>
                <a class="small" href="#bank">管理完整題材庫 →</a>
              </div>
              ${mine.length?mine.slice(0,12).map(m=>{
                const sel=st.selectedIds.includes(m.id);
                return `<div class="mat-card ${sel?'selected':''}" data-toggle-mat="${esc(m.id)}" role="button" tabindex="0">
                  <div style="min-width:0;flex:1">
                    <div><span class="mat-tag mine">我的題材庫</span><span class="mat-tag ${m.kind}">${m.kind==='other'?'他例':'己例'}</span><span class="small">${esc(m.themeTitle)}${m.sameTheme?'（本題主題）':''}</span></div>
                    <h4>${esc(m.title)}</h4>
                    <p class="mat-detail-text">${esc(m.detail)}</p>
                  </div>
                  <span class="mat-check">✓</span>
                </div>`;
              }).join(''):`<p class="small" style="padding:10px 12px;background:var(--paper);border-radius:8px;border:1px dashed var(--sage-dark)">你的題材庫目前還沒有素材——直接用右側「30 秒靈感快記」寫下第一則，它會自動存進「我的題材庫」並釘選到本題！</p>`}

              <div class="mat-group-title" style="margin-top:18px">
                <strong>本站完整示範素材（含人事時地物、完整敘述與扣題要點・免另上網查證）</strong>
              </div>
              ${demo.map(m=>{
                const sel=st.selectedIds.includes(m.id);
                const originKey='mock:'+prompt.id+':'+m.id;
                const savedInBank=window.materialBank?.hasOrigin?.(originKey);
                return `<div class="mat-card ${sel?'selected':''}" data-toggle-mat="${esc(m.id)}" role="button" tabindex="0">
                  <div style="min-width:0;flex:1">
                    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px"><span class="mat-tag demo">完整素材</span><span class="mat-tag ${m.kind}">${m.kind==='other'?'可查證他例':'己例範段'}</span>${m.kind==='other'?`<button type="button" class="btn compact" style="margin-left:auto;padding:3px 9px;font-size:11px" data-save-demo-other="${esc(m.id)}">${savedInBank?'已在題材庫 ✓':'＋存入我的題材庫'}</button>`:''}</div>
                    <h4>${esc(m.title)}</h4>
                    ${renderMatBody(m)}
                  </div>
                  <span class="mat-check">✓</span>
                </div>`;
              }).join('')}
              <div class="step-nav-foot">
                <button type="button" class="btn" data-mock-step="1">← 回到讀題</button>
                <button type="button" class="btn primary" data-mock-step="3">下一步：開始作答 →</button>
              </div>
            </div>
          </div>

          <div class="quick-add-box">
            <div class="mock-card">
              <div class="mock-head-row" style="margin-bottom:10px">
                <h3 style="margin:0">＋ 30 秒靈感快記（直存題材庫）</h3>
                <span class="mock-pill">只需 3 欄</span>
              </div>
              <p class="small" style="margin-bottom:12px">剛讀完題目想到例子？先快速留住核心畫面，會直接存入「我的題材庫（${esc(themeName)}）」並釘選到本題。</p>
              ${st.qaPrompt?`<div style="margin-bottom:10px;padding:8px 10px;border-radius:8px;background:#eef5ec;border-left:3px solid var(--forest);font-size:12px;line-height:1.6;color:#234436"><strong>正在回答追問：</strong>${esc(st.qaPrompt)}</div>`:''}
              <form id="mock-quick-add">
                <div class="quick-radio">
                  <label><input type="radio" name="kind" value="self" ${st.qaKind!=='other'?'checked':''}><span>我的經驗（己例）</span></label>
                  <label><input type="radio" name="kind" value="other" ${st.qaKind==='other'?'checked':''}><span>新聞／課本（他例）</span></label>
                </div>
                <label class="bank-field" style="margin-bottom:10px">
                  <span>具體情境（先記關鍵畫面、動作或事實）<b style="color:#b85328">*</b></span>
                  <textarea name="detail" id="mq-detail" rows="4" required placeholder="寫下當時發生的具體細節、對話或事件經過……">${esc(st.qaDetail)}</textarea>
                </label>
                <label class="bank-field" style="margin-bottom:12px">
                  <span>一句話標題（選填，留白會自動擷取前 16 字）</span>
                  <input name="title" id="mq-title" value="${esc(st.qaTitle)}" placeholder="${esc(qaPlaceholder)}">
                </label>
                <button type="submit" class="btn primary" style="width:100%">存入我的題材庫並釘選本題</button>
              </form>
            </div>
          </div>
        </div>`;
    }else if(st.step===3){
      const activePinned=chosen.find(m=>m.id===st.activePinnedId);
      const partsSyncNeeded=!st.examMode&&st.q2Mode==='full'&&combinedParts()&&st.q2Full.trim()&&st.q2PartsUpdated>st.q2FullUpdated&&st.q2Full.trim()!==combinedParts();
      const writingArea=`
        <div>
          ${prompt.q1?`
            <div class="mock-card">
              <div class="mock-head-row" style="margin-bottom:10px">
                <div>
                  <h2 style="font-size:18px;margin:0">問題（一）作答區</h2>
                  <p class="small" style="margin:2px 0 0">${esc(prompt.q1.prompt)}（含標點、不含空白）</p>
                </div>
                <span id="mock-q1-count" class="mock-pill ${q1Len>prompt.q1.limit||q1Lines>4?'warn':''}">${q1Len} / ${prompt.q1.limit} 字（約 ${q1Lines} 行）</span>
              </div>
              <textarea id="mock-q1-input" rows="3" placeholder="提示：純客觀摘述甲、乙二文的核心差異，不加入個人表態……">${esc(st.q1)}</textarea>
            </div>`:''}

          <div class="mock-card">
            <div class="mock-head-row" style="margin-bottom:12px">
              <div>
                <h2 style="font-size:18px;margin:0">${esc(q2WriteTitle)}</h2>
                <p class="small" style="margin:2px 0 0">${esc(prompt.q2.meta)}${st.examMode?'（實戰模式：純全文作答）':'・可先用四段引導分開起稿，再一鍵合併為整篇定稿'}</p>
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
                ${st.examMode?'':`
                  <div class="mode-switch">
                    <button type="button" class="${st.q2Mode==='scaffold'?'active':''}" data-q2-mode="scaffold">四段引導</button>
                    <button type="button" class="${st.q2Mode==='full'?'active':''}" data-q2-mode="full">整篇定稿</button>
                  </div>`}
                <span id="mock-q2-count" class="mock-pill ${q2StatusClass}">${q2Label}</span>
              </div>
            </div>

            ${tm==='custom'?`<label class="bank-field" style="margin-bottom:12px"><span>我的自訂題目</span><input id="mock-custom-title" value="${esc(st.customTitle)}" placeholder="${esc(prompt.q2.coreTitle)}"></label>`:''}
            ${!st.examMode?`<div class="stance-banner"><strong>目前套用方向（${esc(stanceObj.title)}）：</strong>${esc(stanceObj.hint)}</div>`:''}

            ${st.q2Mode==='scaffold'&&!st.examMode?`
              <div id="mock-scaffold-wrap">
                ${prompt.scaffoldPrompts.map((sp,i)=>`
                  <div class="scaffold-item">
                    <div class="scaffold-item-head">
                      <label for="mq2-p${i}" class="${i===2?'clay-label':''}">${esc(sp.label)} <span class="small" style="font-weight:400">（${esc(sp.range)}）</span></label>
                      <span class="small" id="mq2-cnt-${i}">${countChars(st.q2Parts[i])} 字</span>
                    </div>
                    <p class="small" style="margin:0 0 5px;color:#55665a">寫作提示：${esc(sp.placeholder)}</p>
                    <textarea id="mq2-p${i}" data-q2-part="${i}" rows="3" placeholder="可直接從這裡開始寫這一段……">${esc(st.q2Parts[i]||'')}</textarea>
                  </div>`).join('')}
                <div class="merge-bar">
                  <span>四段草稿與「整篇定稿」分開保存，不會互相誤蓋。寫完草稿後可一鍵合併去潤飾全文：</span>
                  <button type="button" class="btn primary compact" id="mock-merge-to-full">將四段合併到整篇定稿 →</button>
                </div>
              </div>
            `:`
              <div>
                ${partsSyncNeeded?`<div style="margin-bottom:10px;padding:9px 12px;border-radius:8px;background:#fdf3ee;border:1px solid #e6b8a5;font-size:12.5px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px"><span>偵測到你在「四段引導」有較新的修改尚未合併到此處：</span><button type="button" class="btn compact" id="mock-pull-scaffold">以最新四段覆蓋此處</button></div>`:''}
                <textarea id="mock-q2-full" rows="12" placeholder="在此撰寫完整文章……">${esc(st.q2Full)}</textarea>
                ${!st.examMode&&combinedParts()&&!st.q2Full.trim()?`<p class="small" style="margin-top:8px">偵測到你在「四段引導」已有草稿：<button type="button" class="btn compact" id="mock-pull-scaffold">匯入四段草稿到此處</button></p>`:''}
              </div>
            `}

            <div class="step-nav-foot">
              <button type="button" class="btn" data-mock-step="${st.examMode?1:2}">${st.examMode?'← 回題目原文':'← 回到題材庫'}</button>
              <button type="button" class="btn primary" data-mock-step="4">下一步：自評檢核與輸出 →</button>
            </div>
          </div>
        </div>`;

      const pinnedBar=`
        <div class="pinned-bar">
          <div class="pinned-bar-head">
            <strong style="font-size:13px;color:var(--forest)">${st.examMode?'考場實戰中（已隱藏示範素材，可對照題本原文）':'本題已釘選素材（點擊展開細節參考，不會算進正式字數）'}</strong>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button type="button" class="btn compact" id="mock-toggle-split">${st.splitView?'關閉左右對照':'桌機左右對照題本'}</button>
              ${st.splitView?'':`<button type="button" class="btn compact" id="mock-toggle-ref">展開／收合完整題本</button>`}
            </div>
          </div>
          ${st.examMode?'':`
          <div class="pinned-chips">
            ${chosen.length?chosen.map(m=>`
              <button type="button" class="pinned-chip ${st.activePinnedId===m.id?'active':''}" data-open-pin="${esc(m.id)}">
                <b>[${m.kind==='other'?'他例':'己例'}]</b> ${esc(m.title)}
              </button>`).join(''):`<span class="small">尚未釘選素材，可回步驟 2 挑選或快記。</span>`}
          </div>
          ${activePinned?`
            <div class="pinned-detail">
              <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:4px">
                <strong>[${activePinned.kind==='other'?'他例':'己例'}] ${esc(activePinned.title)}</strong>
                <div style="display:flex;gap:8px;align-items:center">
                  ${activePinned.from==='mine'?`<button type="button" class="btn compact" id="mock-insert-pin">帶入我的草稿 ↓</button>`:''}
                  <button type="button" class="small" id="mock-close-pin">收合 ×</button>
                </div>
              </div>
              ${renderMatBody(activePinned)}
            </div>`:''}`}
          ${st.splitView?'':`
            <div id="mock-ref-drawer" class="ref-drawer" style="display:none">
              <div class="ref-tabs">
                <button type="button" class="${st.refTab==='full'?'active':''}" data-ref-tab="full">完整原文</button>
                <button type="button" class="${st.refTab==='summary'?'active':''}" data-ref-tab="summary">重點摘要</button>
              </div>
              <div id="mock-ref-body">${figureHTML()}${passagesHTML(st.refTab==='summary')}${qBoxesHTML()}</div>
            </div>`}
        </div>`;

      panelHTML=st.splitView?`${pinnedBar}<div class="mock-grid split-writing"><div class="mock-card" style="position:sticky;top:16px;max-height:calc(100vh - 40px);overflow:auto"><div class="mock-head-row"><h3 style="margin:0">完整題本對照</h3><div class="ref-tabs" style="margin:0"><button type="button" class="${st.refTab==='full'?'active':''}" data-ref-tab="full">原文</button><button type="button" class="${st.refTab==='summary'?'active':''}" data-ref-tab="summary">摘要</button></div></div>${figureHTML()}${passagesHTML(st.refTab==='summary')}${qBoxesHTML()}</div>${writingArea}</div>`:`${pinnedBar}${writingArea}`;
    }else if(st.step===4){
      const doneCheck=prompt.checklist.filter(c=>st.checked[c.id]).length;
      const needSpoilerGuard=q2Len<50&&!st.spoilerOpened;
      const preview=padletText(prompt,st);
      const isTopicEx=Boolean(prompt.topicExId);
      const bankHref=prompt.kind==='J'?'#bank?scope=J':'#bank';
      const hasBothVersions=Boolean(combinedParts()&&st.q2Full.trim()&&combinedParts()!==st.q2Full.trim());
      const wallUrl=(()=>{
        const c=readClassCfg();
        const u=prompt.kind==='T'?c.padletT:prompt.kind==='E'?c.padletE:prompt.kind==='J'?c.padletJ:'';
        if(/^https:\/\/([a-z0-9-]+\.)?padlet\.(com|org)\//i.test(u||''))return u;
        const pub=window.GUOXIE_WALLS?.topics?.[prompt.theme];
        return /^https:\/\/([a-z0-9-]+\.)?padlet\.(com|org)\//i.test(pub||'')?pub:'';
      })();
      panelHTML=`
        <div class="mock-grid">
          <div>
            <div class="mock-card">
              <div class="mock-head-row" style="margin-bottom:12px">
                <h2 style="font-size:18px;margin:0">${prompt.kind==='T'?'學測知性自評檢核表（問題一 4 分＋問題二 21 分｜A 級 15–18、A+ 級 19–21）':prompt.kind==='J'?'國中會考寫作自評檢核表（穩五衝六｜對標四向度規準）':'學測情意自評檢核表（A 級 18–21 分｜A+ 級 22–25 分）'}</h2>
                <span class="mock-pill">${doneCheck} / ${prompt.checklist.length} 項達標</span>
              </div>
              ${prompt.checklist.map(c=>`
                <label class="check-item ${st.checked[c.id]?'checked':''}">
                  <input type="checkbox" data-check-id="${esc(c.id)}" ${st.checked[c.id]?'checked':''}>
                  <span>${esc(c.label)}</span>
                </label>`).join('')}
            </div>

            <div class="mock-card">
              <h3>寫完再看：${isTopicEx?'同概念短篇寫法對照（僅供結構觀摩）':prompt.kind==='J'?'對標會考六級分規準原創教學示範（非官方樣卷）':'對標學測 A／A+ 規準原創教學示範'}</h3>
              ${needSpoilerGuard?`
                <div class="spoiler-box">
                  <p style="margin:0 0 8px">你的正文目前為 <strong>${q2Len} 字</strong>。建議先在步驟 3 寫出至少 50 字的個人初稿再對照範文，進步最有感！（老師備課或考前複習也可直接展開）</p>
                  <button type="button" class="btn compact" id="mock-open-spoiler">仍要展開教學示範與評析</button>
                </div>
              `:`
                ${prompt.reference.q1Sample?`
                  <details class="ref-answer" open>
                    <summary>問題（一）滿分規格參考答題（${countChars(prompt.reference.q1Sample)} 字）</summary>
                    <div class="ref-answer-body"><p>${esc(prompt.reference.q1Sample)}</p></div>
                  </details>`:''}
                ${prompt.reference.fullEssay?.length?`
                  <details class="ref-answer clay" open>
                    <summary>${isTopicEx?'同概念短篇結構觀摩（非本題完整解答）':prompt.kind==='T'?'問題（二）對標 A／A+ 原創成文示範':prompt.kind==='J'?'對標會考六級分規準原創成文示範':'情意對標 A／A+ 原創成文示範'}（共 ${countChars(prompt.reference.fullEssay.join(''))} 字・${prompt.reference.fullEssay.length} 段）</summary>
                    <div class="ref-answer-body">
                      <article class="mock-full-essay">${prompt.reference.fullEssay.map(p=>`<p>${esc(p)}</p>`).join('')}</article>
                      ${prompt.reference.rubricNote?`<div class="mock-rubric-note">${esc(prompt.reference.rubricNote)}</div>`:''}
                      <p class="small" style="margin-top:8px">※ 本站原創教學示範（依${prompt.kind==='J'?'心測中心會考':'大考中心學測'}評分規準編寫，未經官方評級）；請學習其立意、推論與細節鋪陳，勿直接背誦套用。</p>
                    </div>
                  </details>`:''}
                <details class="ref-answer">
                  <summary>段落架構與推論拆解速覽</summary>
                  <div class="ref-answer-body">${prompt.reference.q2Outline.map(line=>`<p>${esc(line)}</p>`).join('')}</div>
                </details>
                ${prompt.modelId&&window.WRITING_MODELS?.[prompt.modelId]?`<a class="btn compact" href="/imitation.html?id=${encodeURIComponent(prompt.modelId)}">延伸看同概念逐段範文與仿寫 →</a>`:''}
              `}
            </div>

            <div class="mock-card">
              <h3>把這題寫出的好例子，順手存進「我的題材庫」</h3>
              <p class="small" style="margin-bottom:10px">寫作過程中想到很棒的己例或公共案例嗎？趁記憶猶新收進「我的題材庫（${esc(themeName)}）」，下次寫別題就能直接調用！</p>
              <form id="mock-save-back">
                <div class="quick-radio">
                  <label><input type="radio" name="kind" value="self" ${st.sbKind!=='other'?'checked':''}><span>存為己例</span></label>
                  <label><input type="radio" name="kind" value="other" ${st.sbKind==='other'?'checked':''}><span>存為他例</span></label>
                </div>
                <label class="bank-field" style="margin-bottom:8px"><span>素材標題 <b style="color:#b85328">*</b></span><input id="sb-title" name="title" value="${esc(st.sbTitle)}" required placeholder="替這個好例子取一個好記的名稱"></label>
                <label class="bank-field" style="margin-bottom:10px"><span>具體細節／論點連結 <b style="color:#b85328">*</b></span><textarea id="sb-detail" name="detail" rows="3" required placeholder="貼上你剛才寫得最好的一段例子，或記下它能支持什麼觀點……">${esc(st.sbDetail)}</textarea></label>
                <button type="submit" class="btn">存入我的題材庫 ✓</button>
                <div id="mock-save-back-msg" class="small" role="status" style="margin-top:8px;color:var(--forest);font-weight:600"></div>
              </form>
            </div>
          </div>

          <div>
            <div class="mock-card">
              <h3>我的作答預覽與輸出</h3>
              <p class="small" style="margin-bottom:10px">自修可直接留存，班級上課可選填班級座號姓名（未填會自動省略），一鍵複製即可貼到筆記或 Padlet 觀摩牆（格式與老師後台相容）。</p>
              <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:10px">
                <input id="mock-stu-class" value="${esc(st.stuClass)}" placeholder="班級（如 305）" style="width:100%;min-width:0;border:1px solid var(--sage-dark);border-radius:7px;padding:7px 9px;background:var(--paper);font-size:12px">
                <input id="mock-stu-seat" value="${esc(st.stuSeat)}" placeholder="座號（如 12）" style="width:100%;min-width:0;border:1px solid var(--sage-dark);border-radius:7px;padding:7px 9px;background:var(--paper);font-size:12px">
                <input id="mock-stu-name" value="${esc(st.stuName)}" placeholder="姓名（選填）" style="width:100%;min-width:0;border:1px solid var(--sage-dark);border-radius:7px;padding:7px 9px;background:var(--paper);font-size:12px">
              </div>
              ${hasBothVersions?`<div style="margin-bottom:8px;padding:7px 10px;border-radius:8px;background:#f7f4ea;border:1px solid #e1d7ba;font-size:12px;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:6px"><span>目前輸出：<strong>${st.q2Mode==='full'?'整篇定稿':'四段草稿'}</strong>（${q2Len} 字）</span><button type="button" class="btn compact" id="mock-switch-export-ver">改輸出${st.q2Mode==='full'?'四段草稿':'整篇定稿'}</button></div>`:''}
              <pre class="export-preview" id="mock-export-preview">${esc(preview)}</pre>
              <div style="display:grid;gap:8px">
                <button type="button" class="btn primary" id="mock-copy-padlet" style="width:100%">一鍵複製本次作答（可貼筆記／Padlet）</button>
                <div style="display:grid;grid-template-columns:${wallUrl?'1fr 1fr':'1fr'};gap:8px">
                  <button type="button" class="btn" id="mock-print-sheet" style="width:100%">列印／另存 PDF</button>
                  ${wallUrl?`<a class="btn" href="${esc(wallUrl)}" target="_blank" rel="noopener" style="justify-content:center">開啟觀摩牆 ↗</a>`:''}
                </div>
              </div>
              <div id="mock-bank-export-box" style="margin-top:16px;padding:12px 13px;border-radius:10px;background:#f4f7f0;border:1px solid #d5e0cd">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px">
                  <strong style="font-size:13px;color:var(--forest)">帶走我收集的素材庫（共 <span id="mock-my-bank-cnt">${window.getMyMaterialBankCount?.()??mine.length}</span> 則）</strong>
                  <a class="small" href="${bankHref}">檢視／管理 →</a>
                </div>
                ${(window.getMyMaterialBankCount?.()??mine.length)?`
                  <p class="small" style="margin:0 0 9px">一次輸出全站累積的己例與他例（學校公用電腦下課前記得帶走）：</p>
                  <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px">
                    <button type="button" class="btn compact" id="mock-export-my-bank" style="width:100%">列印／PDF</button>
                    <button type="button" class="btn compact" id="mock-txt-my-bank" style="width:100%">下載 .txt</button>
                    <button type="button" class="btn compact" id="mock-copy-my-bank" style="width:100%">複製純文字</button>
                  </div>`:`
                  <p class="small" style="margin:0 0 8px">你的素材庫目前還是空的——先在左側存下一則好例子，或去題材庫記下第一則就能一鍵輸出！</p>
                  <a class="btn compact" href="${bankHref}">前往我的題材庫 →</a>`}
              </div>
              <div class="step-nav-foot">
                <button type="button" class="btn" data-mock-step="3">← 返回修改作答</button>
                <a class="btn" href="${backHref}">切換下一題 →</a>
              </div>
            </div>
          </div>
        </div>`;
    }

    $('#main').innerHTML=`
      <div class="mock-shell ${st.examMode?'mock-exam-mode':''}">
        <div class="mock-topbar">
          <div class="mock-topbar-title">
            <div class="mock-topbar-sub">${prompt.kind==='J'?'<a href="/junior/">← 回國中專區</a> ｜ ':''}<a href="${backHref}">完整仿題演練室</a> / ${esc(themeName)} / ${esc(prompt.id.replace(/^TOPIC_/,''))}</div>
            <h1>${esc(prompt.title)}</h1>
          </div>
          <div class="mock-topbar-actions">
            <span class="mock-pill ${st.timerRunning?'timer-on':''}" id="mock-timer-pill">${st.examMode?(st.timerPaused?'已暫停 ':'考場倒數 ')+formatTimer(st.remainingSec):'本機自動儲存'}</span>
            ${st.examMode?`<button type="button" class="btn compact" id="mock-pause-timer">${st.timerPaused?'繼續計時':'暫停'}</button>`:''}
            <button type="button" class="btn compact" id="mock-toggle-exam">${st.examMode?'切回引導模式':`考場實戰模式（${examMinutes}分）`}</button>
            <button type="button" class="btn compact" id="mock-reset">重設本題</button>
          </div>
        </div>

        <nav class="mock-steps" aria-label="作答步驟">
          ${[
            [1,'讀題與審題',prompt.q1?'甲乙雙文・偏題警示':'完整引文・審題拆解'],
            [2,'延伸取材庫','引文追問・30 秒快記'],
            [3,'分段／全文作答',prompt.q1?'問題一二・即時字數':'四段引導・合併全文'],
            [4,'自評與輸出','檢核對照・帶走素材']
          ].map(([n,t,sub])=>{
            const locked=st.examMode&&n===2;
            return `<button type="button" class="mock-step-tab ${st.step===n?'active':st.step>n?'done':''}" data-mock-step="${n}" ${locked?'disabled style="opacity:.45;cursor:not-allowed" title="考場實戰模式下已隱藏示範素材"':''}>
              <span class="badge">${n}</span>
              <span><strong>${t}</strong><small>${locked?'實戰模式已隱藏':sub}</small></span>
            </button>`;
          }).join('')}
        </nav>
        ${panelHTML}
      </div>`;
    bindEvents();
  }

  function bindEvents(){
    document.querySelectorAll('[data-mock-step]').forEach(b=>b.onclick=()=>{
      st.step=Number(b.dataset.mockStep);
      persist();draw();window.scrollTo({top:0,behavior:'smooth'});
    });
    const hlBtn=$('#mock-toggle-hl');
    if(hlBtn)hlBtn.onclick=()=>{st.highlightOn=!st.highlightOn;persist();draw();};

    const examBtn=$('#mock-toggle-exam');
    if(examBtn)examBtn.onclick=()=>{
      st.examMode=!st.examMode;
      if(st.examMode){
        if(st.step===2)st.step=3;
        st.q2Mode='full';
        if(window.innerWidth>=960)st.splitView=true;
        if(!st.q2Full.trim()&&combinedParts())st.q2Full=combinedParts();
        st.remainingSec=examMinutes*60;st.timerRunning=true;st.timerPaused=false;
        if(timerHandle)clearInterval(timerHandle);
        timerHandle=setInterval(()=>{
          if(st.timerPaused)return;
          if(st.remainingSec>0)st.remainingSec--;
          const pill=$('#mock-timer-pill');
          if(pill)pill.textContent='考場倒數 '+formatTimer(st.remainingSec);
          if(st.remainingSec===0){clearInterval(timerHandle);timerHandle=null;toast(`${examMinutes} 分鐘考場計時結束，可前往步驟 4 自評與輸出！`);}
        },1000);
        const examNote=prompt.kind==='T'?'（學測國寫兩大題合 90 分，建議知性 40 分）':prompt.kind==='E'?'（學測國寫兩大題合 90 分，建議情意 50 分）':'';
        toast(`已切換考場實戰模式：隱藏提示與示範，開始 ${examMinutes} 分鐘計時${examNote}`);
      }else{
        st.timerRunning=false;st.timerPaused=false;
        if(timerHandle){clearInterval(timerHandle);timerHandle=null;}
        toast('已切回引導模式');
      }
      draw();
    };
    const pauseBtn=$('#mock-pause-timer');
    if(pauseBtn)pauseBtn.onclick=()=>{st.timerPaused=!st.timerPaused;draw();};

    const resetBtn=$('#mock-reset');
    if(resetBtn)resetBtn.onclick=()=>{
      if(!confirm('確定重設本題的作答草稿與勾選狀態？（不會刪除已存入「我的題材庫」的素材）'))return;
      const drafts=readDrafts();delete drafts[prompt.id];saveDrafts(drafts);
      toast('已重設本題作答');
      renderWorkspace(prompt);
    };

    document.querySelectorAll('[data-mock-stance]').forEach(b=>b.onclick=()=>{st.stance=b.dataset.mockStance;persist();draw();});

    // Step 2: bridge questions -> focus quick-add & preserve draft across draw()
    document.querySelectorAll('#mock-quick-add input[name="kind"]').forEach(r=>r.onchange=()=>{st.qaKind=r.value;});
    const mqTitle=$('#mq-title'),mqDetail=$('#mq-detail');
    if(mqTitle)mqTitle.oninput=e=>{st.qaTitle=e.target.value;};
    if(mqDetail)mqDetail.oninput=e=>{st.qaDetail=e.target.value;};

    document.querySelectorAll('[data-bridge-idx]').forEach(b=>b.onclick=()=>{
      const item=prompt.bridgeQuestions[Number(b.dataset.bridgeIdx)];
      if(!item)return;
      st.qaKind=item.kind==='other'?'other':'self';
      st.qaPrompt=`${item.tag}：${item.question}`;
      draw();
      const detail=$('#mq-detail');
      if(detail){detail.placeholder=item.placeholder||item.question;detail.focus();}
      toast('已帶入追問提示，寫下你的靈感即可存入題材庫！');
    });

    document.querySelectorAll('[data-save-demo-other]').forEach(btn=>btn.onclick=e=>{
      e.stopPropagation();
      const id=btn.dataset.saveDemoOther,item=prompt.sampleMaterials.find(x=>x.id===id);
      if(!item)return;
      const originKey='mock:'+prompt.id+':'+item.id;
      if(window.materialBank?.hasOrigin?.(originKey)){toast('這則他例已在「我的題材庫」中 ✓');return;}
      const factBody=item.essayParagraph||item.detail;
      const kpSummary=Array.isArray(item.keyPoints)&&item.keyPoints.length?item.keyPoints.join('；'):(item.angle||`可用於《${prompt.title}》`);
      const newId=window.materialBank?.put?.({kind:'other',title:item.title,theme:prompt.theme,type:item.type||'其他',fact:factBody,source:item.source||'',point:kpSummary,caution:item.caution||'',origin:originKey});
      if(newId){st.selectedIds=['bank:'+newId,...st.selectedIds.filter(x=>x!==item.id)];persist();toast('已將這則完整他例存入「我的題材庫」✓');draw();}
      else toast('無法儲存，請先複製文字或另存純文字檔');
    });

    document.querySelectorAll('[data-stop-toggle]').forEach(el=>{
      el.onclick=e=>e.stopPropagation();
      el.onkeydown=e=>e.stopPropagation();
    });

    document.querySelectorAll('[data-toggle-mat]').forEach(card=>{
      const toggle=()=>{
        const id=card.dataset.toggleMat;
        st.selectedIds=st.selectedIds.includes(id)?st.selectedIds.filter(x=>x!==id):[...st.selectedIds,id];
        persist();draw();
      };
      card.onclick=e=>{if(e.target.closest('[data-stop-toggle],button,a,summary,details'))return;toggle();};
      card.onkeydown=e=>{if(e.target.closest('[data-stop-toggle],button,a,summary,details'))return;if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}};
    });

    const qaForm=$('#mock-quick-add');
    if(qaForm)qaForm.onsubmit=e=>{
      e.preventDefault();
      const fd=new FormData(qaForm);
      const kind=fd.get('kind')==='other'?'other':'self';
      const detail=String(fd.get('detail')||'').trim();
      const rawTitle=String(fd.get('title')||'').trim();
      if(!detail){toast('請至少寫下具體情境或關鍵畫面');return;}
      const title=rawTitle||detail.replace(/\s+/g,'').slice(0,16)+(detail.length>16?'…':'');
      const entry=kind==='other'
        ?{kind:'other',title,theme:prompt.theme,type:'其他',fact:detail,point:`可用於《${prompt.title}》`}
        :{kind:'self',title,theme:prompt.theme,event:detail,point:`可用於《${prompt.title}》`};
      const newId=window.materialBank?.put?.(entry);
      if(!newId){toast('無法儲存至題材庫，請先複製文字留存');return;}
      st.selectedIds=['bank:'+newId,...st.selectedIds];
      st.qaTitle='';st.qaDetail='';st.qaPrompt='';
      persist();toast('已存入「我的題材庫」並釘選為本題素材 ✓');draw();
    };

    // Step 3
    const ctInput=$('#mock-custom-title');
    if(ctInput)ctInput.oninput=e=>{st.customTitle=e.target.value;persist();};

    document.querySelectorAll('[data-open-pin]').forEach(b=>b.onclick=()=>{
      const id=b.dataset.openPin;
      st.activePinnedId=st.activePinnedId===id?null:id;
      draw();
    });
    const closePin=$('#mock-close-pin');
    if(closePin)closePin.onclick=()=>{st.activePinnedId=null;draw();};
    const insertPin=$('#mock-insert-pin');
    if(insertPin)insertPin.onclick=()=>{
      const cur=allSelectableMaterials().all.find(x=>x.id===st.activePinnedId);
      if(!cur)return;
      const snippet=cur.detail||'';
      if(st.q2Mode==='scaffold'&&!st.examMode){
        st.q2Parts[2]=(st.q2Parts[2]?st.q2Parts[2]+'\n':'')+snippet;
        st.q2PartsUpdated=Date.now();
      }else{
        st.q2Full=(st.q2Full?st.q2Full+'\n\n':'')+snippet;
        st.q2FullDirty=true;st.q2FullUpdated=Date.now();
      }
      persist();toast('已帶入你的素材草稿，請再順著語氣潤飾擴寫 ✓');draw();
    };

    const splitBtn=$('#mock-toggle-split');
    if(splitBtn)splitBtn.onclick=()=>{st.splitView=!st.splitView;persist();draw();};

    const refBtn=$('#mock-toggle-ref');
    if(refBtn)refBtn.onclick=()=>{
      const dr=$('#mock-ref-drawer');
      if(dr)dr.style.display=dr.style.display==='none'?'block':'none';
    };

    document.querySelectorAll('[data-ref-tab]').forEach(b=>b.onclick=()=>{
      st.refTab=b.dataset.refTab;
      if(st.splitView)draw();
      else{
        document.querySelectorAll('[data-ref-tab]').forEach(x=>x.classList.toggle('active',x.dataset.refTab===st.refTab));
        const body=$('#mock-ref-body');
        if(body)body.innerHTML=(prompt.figure?`<figure class="mock-figure"><img src="${esc(prompt.figure.src)}" alt="${esc(prompt.figure.alt)}" loading="lazy">${prompt.figure.caption?`<figcaption>${esc(prompt.figure.caption)}</figcaption>`:''}</figure>`:'')+prompt.passages.map(p=>`<div class="mock-passage ${!st.highlightOn||st.examMode?'no-highlight':''}">${p.label?`<div class="mock-passage-label ${p.tone==='clay'?'clay':''}">${esc(p.label)}</div>`:''}${st.refTab==='summary'?`<p style="text-indent:0;font-family:inherit;font-size:13px;line-height:1.75">${esc(p.summary)}</p>`:highlightPassageText(p.text,p.keyPhrases,p.themePhrases)}</div>`).join('')+`${prompt.q1?`<div class="mock-qbox"><div class="mock-qbox-head"><strong>${esc(prompt.q1.label)}</strong><span class="small">${esc(prompt.q1.meta)}</span></div><p>${esc(prompt.q1.prompt)}</p></div>`:''}<div class="mock-qbox q2"><div class="mock-qbox-head"><strong>${esc(tm==='unnamed'?'作答說明（不必訂題，直接空兩格起筆）':tm==='custom'?prompt.q2.label+'（自訂題目）':prompt.q2.label+'：'+prompt.q2.coreTitle)}</strong><span class="small">${esc(prompt.q2.meta)}</span></div><p>${esc(prompt.q2.prompt)}</p></div>`;
      }
    });

    const q1Input=$('#mock-q1-input');
    if(q1Input)q1Input.oninput=e=>{
      st.q1=e.target.value;persist();
      const n=countChars(st.q1),ln=estimateLines(st.q1),el=$('#mock-q1-count');
      if(el){el.textContent=`${n} / ${prompt.q1.limit} 字（約 ${ln} 行）`;el.classList.toggle('warn',n>prompt.q1.limit||ln>4);}
    };

    const updateQ2Counter=()=>{
      const txt=activeQ2Text(),n=countChars(txt),el=$('#mock-q2-count'),lim=prompt.q2.limit||0;
      const ln=prompt.kind==='T'?estimateLines(txt):0;
      if(el){
        el.textContent=lim?`${n} / ${lim} 字（約 ${ln} 行）`:`${n} 字（建議 ${prompt.q2.recommendedRange?.[0]||500}–${prompt.q2.recommendedRange?.[1]||650} 字）`;
        el.classList.toggle('warn',Boolean(lim&&(n>lim||ln>19)));
      }
    };

    document.querySelectorAll('[data-q2-part]').forEach(ta=>ta.oninput=e=>{
      const idx=Number(ta.dataset.q2Part);
      st.q2Parts[idx]=e.target.value;
      st.q2PartsUpdated=Date.now();
      persist();
      const cEl=$('#mq2-cnt-'+idx);
      if(cEl)cEl.textContent=countChars(st.q2Parts[idx])+' 字';
      updateQ2Counter();
    });

    const fullTa=$('#mock-q2-full');
    if(fullTa)fullTa.oninput=e=>{
      st.q2Full=e.target.value;st.q2FullDirty=true;st.q2FullUpdated=Date.now();persist();updateQ2Counter();
    };

    document.querySelectorAll('[data-q2-mode]').forEach(b=>b.onclick=()=>{
      const next=b.dataset.q2Mode;
      if(next==='full'&&!st.q2Full.trim()&&combinedParts()){
        st.q2Full=combinedParts();st.q2FullUpdated=Date.now();
      }
      st.q2Mode=next;persist();draw();
    });

    const mergeBtn=$('#mock-merge-to-full');
    if(mergeBtn)mergeBtn.onclick=()=>{
      const merged=combinedParts();
      if(!merged){toast('四段草稿目前是空的，先寫幾句再合併喔');return;}
      if(st.q2Full.trim()&&st.q2FullDirty&&st.q2Full.trim()!==merged){
        if(!confirm('「整篇定稿」已有你先前手動潤飾的文字，確定要用目前的四段草稿覆蓋它嗎？（按取消可保留原全文）'))return;
      }
      st.q2Full=merged;st.q2FullDirty=false;st.q2FullUpdated=Date.now();st.q2Mode='full';persist();toast('已安全合併四段草稿至「整篇定稿」');draw();
    };

    const pullBtn=$('#mock-pull-scaffold');
    if(pullBtn)pullBtn.onclick=()=>{st.q2Full=combinedParts();st.q2FullDirty=false;st.q2FullUpdated=Date.now();persist();toast('已同步最新四段草稿 ✓');draw();};

    // Step 4
    document.querySelectorAll('#mock-save-back input[name="kind"]').forEach(r=>r.onchange=()=>{st.sbKind=r.value;});
    const sbT=$('#sb-title'),sbD=$('#sb-detail');
    if(sbT)sbT.oninput=e=>{st.sbTitle=e.target.value;};
    if(sbD)sbD.oninput=e=>{st.sbDetail=e.target.value;};

    document.querySelectorAll('[data-check-id]').forEach(cb=>cb.onchange=()=>{
      st.checked[cb.dataset.checkId]=cb.checked;persist();draw();
    });
    const openSp=$('#mock-open-spoiler');
    if(openSp)openSp.onclick=()=>{st.spoilerOpened=true;persist();draw();};

    const swVer=$('#mock-switch-export-ver');
    if(swVer)swVer.onclick=()=>{st.q2Mode=st.q2Mode==='full'?'scaffold':'full';persist();draw();};

    const saveBack=$('#mock-save-back');
    if(saveBack)saveBack.onsubmit=e=>{
      e.preventDefault();
      const fd=new FormData(saveBack);
      const kind=fd.get('kind')==='other'?'other':'self';
      const title=String(fd.get('title')||'').trim(),detail=String(fd.get('detail')||'').trim();
      if(!title||!detail){toast('請填寫標題與素材內容');return;}
      const entry=kind==='other'
        ?{kind:'other',title,theme:prompt.theme,type:'其他',fact:detail,point:`練寫《${prompt.title}》時整理`}
        :{kind:'self',title,theme:prompt.theme,event:detail,point:`練寫《${prompt.title}》時整理`};
      if(window.materialBank?.put?.(entry)){
        saveBack.reset();st.sbTitle='';st.sbDetail='';
        const cnt=window.getMyMaterialBankCount?.()||1;
        const bHref=prompt.kind==='J'?'#bank?scope=J':'#bank';
        const msg=$('#mock-save-back-msg');
        if(msg)msg.innerHTML=`已存入！你目前共收集 ${cnt} 則素材，可直接於右側輸出，或 <a href="${bHref}">前往我的題材庫 →</a>`;
        const box=$('#mock-bank-export-box');
        if(box){
          box.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px"><strong style="font-size:13px;color:var(--forest)">帶走我收集的素材庫（共 <span id="mock-my-bank-cnt">${cnt}</span> 則）</strong><a class="small" href="${bHref}">檢視／管理 →</a></div><p class="small" style="margin:0 0 9px">一次輸出全站累積的己例與他例（學校公用電腦下課前記得帶走）：</p><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px"><button type="button" class="btn compact" id="mock-export-my-bank" style="width:100%">列印／PDF</button><button type="button" class="btn compact" id="mock-txt-my-bank" style="width:100%">下載 .txt</button><button type="button" class="btn compact" id="mock-copy-my-bank" style="width:100%">複製純文字</button></div>`;
          $('#mock-export-my-bank').onclick=()=>window.printMyMaterialBank?.();
          $('#mock-txt-my-bank').onclick=()=>window.downloadMyMaterialBankTxt?.();
          $('#mock-copy-my-bank').onclick=()=>window.copyMyMaterialBank?.();
        }
        toast('已存進「我的題材庫」✓');
      }
      else toast('無法儲存，請稍後再試');
    };

    const syncExport=()=>{
      const pre=$('#mock-export-preview');
      if(pre)pre.textContent=padletText(prompt,st);
      const c=readClassCfg();
      const k=String(st.stuClass||'').trim().replace(/班$/,'');
      if(k||st.stuSeat||st.stuName){saveClassCfg({...c,klass:k||c.klass||'',seat:String(st.stuSeat||'').trim()||c.seat||'',name:String(st.stuName||'').trim()||c.name||''});}
    };
    const sc=$('#mock-stu-class'),ss=$('#mock-stu-seat'),sn=$('#mock-stu-name');
    if(sc)sc.oninput=e=>{st.stuClass=e.target.value;persist();syncExport();};
    if(ss)ss.oninput=e=>{st.stuSeat=e.target.value;persist();syncExport();};
    if(sn)sn.oninput=e=>{st.stuName=e.target.value;persist();syncExport();};

    const cpBtn=$('#mock-copy-padlet');
    if(cpBtn)cpBtn.onclick=async()=>{
      const ok=await copyText(padletText(prompt,st));
      toast(ok?'已複製本次作答，可直接貼到筆記、文件或課堂觀摩牆 ✓':'無法自動複製，請手動選取文字');
    };
    const prBtn=$('#mock-print-sheet');
    if(prBtn)prBtn.onclick=()=>{
      const w=window.open('','_blank');
      if(!w){toast('瀏覽器阻擋了新分頁，請允許彈出視窗或改用一鍵複製');return;}
      const who=[st.stuClass,st.stuSeat?st.stuSeat+'號':'',st.stuName].filter(Boolean).join(' ')||'未填寫';
      const q2Text=activeQ2Text().trim()||'（尚未填寫）';
      const q2TitleStr=tm==='unnamed'?'正文（不必訂題）':tm==='custom'?`正文：${(st.customTitle||'自訂題目未填').trim()}`:`${prompt.q1?'問題（二）':'正文'}：${prompt.q2.coreTitle}`;
      w.document.write(`<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>${esc(prompt.title)}｜作答列印</title><style>body{font-family:"Noto Serif TC","Microsoft JhengHei",serif;max-width:740px;margin:28px auto;padding:0 20px;line-height:2;color:#1f2b24}h1{border-bottom:2px solid #1e5641;padding-bottom:8px;font-size:22px}h2{color:#1e5641;font-size:16px;margin-top:22px}p{text-indent:2em;white-space:pre-wrap;font-size:15.5px}.meta{font-size:12.5px;color:#555}@media print{.noprint{display:none}}</style></head><body><div class="noprint" style="margin-bottom:16px"><button onclick="window.print()">列印／另存 PDF</button></div><h1>拾光寫作｜${esc(prompt.id.replace(/^TOPIC_/,''))} ${esc(prompt.title)}</h1><p class="meta" style="text-indent:0">班級姓名：${esc(who)}　｜　日期：${new Date().toLocaleDateString('zh-TW')}</p>${prompt.q1?`<h2>問題（一）（${countChars(st.q1)} 字）</h2><p>${esc(st.q1.trim()||'（尚未填寫）')}</p>`:''}<h2>${esc(q2TitleStr)}（${countChars(q2Text)} 字）</h2><p>${esc(q2Text)}</p></body></html>`);
      w.document.close();
    };
    const expBankBtn=$('#mock-export-my-bank');
    if(expBankBtn)expBankBtn.onclick=()=>window.printMyMaterialBank?.();
    const txtBankBtn=$('#mock-txt-my-bank');
    if(txtBankBtn)txtBankBtn.onclick=()=>window.downloadMyMaterialBankTxt?.();
    const copyBankBtn=$('#mock-copy-my-bank');
    if(copyBankBtn)copyBankBtn.onclick=()=>window.copyMyMaterialBank?.();
  }

  draw();
}

window.mockPage=function(){
  const query=new URLSearchParams(location.hash.split('?')[1]);
  const prompt=getPrompt(query);
  if(prompt){
    $('#crumb').textContent='完整仿題・'+prompt.title;
    document.title=prompt.title+'｜完整仿題｜拾光';
    renderWorkspace(prompt);
  }else{
    $('#crumb').textContent='完整仿題演練室';
    document.title='完整仿題演練室｜拾光・國寫題材庫';
    renderIndex(query.get('kind')||'',query.get('scope')||'');
  }
};

// 整合進全站備份與「我的學習紀錄」
if(typeof backupKeys!=='undefined')backupKeys.push(STORE_KEY);
if(typeof importLabel==='function'){
  const prevImportLabel=importLabel;
  importLabel=function(key,id){
    if(key===STORE_KEY){const d=readDrafts()[id];return '完整仿題 '+(d?.title||id);}
    return prevImportLabel(key,id);
  };
}
if(typeof notebook==='function'){
  const prevNotebook=notebook;
  notebook=function(){
    prevNotebook();
    const ds=readDrafts(),entries=Object.values(ds).sort((a,b)=>(b.updated||0)-(a.updated||0));
    $('.backup')?.insertAdjacentHTML('afterend',`
      <section class="notebook-section">
        <h2>完整仿題演練 <small>${entries.length}</small></h2>
        <div class="record-grid">
          ${entries.map(d=>{
            const body=(d.q2Mode==='full'&&d.q2Full?.trim())?d.q2Full:(d.q2Parts||[]).join('');
            const total=countChars(d.q1)+countChars(body);
            const href=d.topicExId?`#mock?topic=${encodeURIComponent(d.topicExId)}`:`#mock?id=${encodeURIComponent(d.id)}`;
            return `<a class="record" href="${href}"><strong>${esc(d.title||d.id)}</strong><span>${d.kind==='T'?'知性':d.kind==='J'?'國中會考':'情意'} · 共 ${total} 字 · 步驟 ${d.step||1}/4</span><p>${esc((body||d.q1||'繼續完成作答').slice(0,80))}</p></a>`;
          }).join('')||'<p class="empty-line">還沒有完整仿題紀錄。<a href="#mock">前往 24 道完整仿題演練室 →</a></p>'}
        </div>
      </section>`);
  };
}
window.addEventListener('hashchange',()=>{if(timerHandle){clearInterval(timerHandle);timerHandle=null;}});
// 仿題資料（約 480KB）不放在首頁一開始下載，進入仿題演練室時才載入，首頁閒置後也會先在背景載好。
const promptsSrc=(document.querySelector('script[src*="mock.js"]')?.src||'mock.js').replace(/mock\.js/,'mock-prompts.js');
let promptsLoading=null;
window.loadMockPrompts=()=>window.MOCK_PROMPTS?Promise.resolve():(promptsLoading||=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=promptsSrc;s.onload=resolve;s.onerror=()=>{promptsLoading=null;reject(new Error('mock prompts'));};document.head.append(s);}));
const renderMockPage=window.mockPage;
window.mockPage=function(){
  if(window.MOCK_PROMPTS)return renderMockPage();
  $('#main').innerHTML='<p class="empty-line" role="status">正在載入完整仿題…</p>';
  window.loadMockPrompts().then(()=>{if(location.hash.slice(1).split('?')[0]==='mock')renderMockPage();}).catch(()=>{$('#main').innerHTML='<p class="empty-line" role="status">仿題資料載入失敗，請檢查網路後重新整理頁面。</p>';});
};
if(location.hash.slice(1).split('?')[0]==='mock')window.mockPage();
const idle=window.requestIdleCallback||(f=>setTimeout(f,2500));
window.addEventListener('load',()=>idle(()=>window.loadMockPrompts().catch(()=>{})));
})();
