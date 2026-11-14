import fs from 'node:fs';
import vm from 'node:vm';
const json=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^﻿/,''));
const len=s=>[...String(s??'').replace(/\s/gu,'')].length;
const fail=m=>{throw Error(m);};
const q=json('modules/qingyi/data.json'),ctx={window:{}};
vm.runInNewContext(fs.readFileSync('modules/zhixing/data.js','utf8'),ctx);
const uids=[...ctx.window.LIBRARY.concepts.map(c=>'T'+c.id),...q.cards.map(c=>'E'+c.id)];
const items=json('content/real-materials.json'),full=json('content/full-models.json');
const TYPES=new Set(['經典課文','歷史事件','科學研究','臺灣社會','國際時事','文學影視','真實人物']);
const range=(v,[a,b],where)=>{const n=len(v);if(n<a||n>b)fail(`${where} length ${n} not in ${a}-${b}`);};
const titles=new Map();let others=0,selves=0;
for(const uid of uids){const m=items[uid];if(!m)fail('Missing materials '+uid);const isT=uid[0]==='T';
 if(m.others?.length!==(isT?4:3))fail(uid+' others count');if(m.self?.length!==2)fail(uid+' self count');
 if(new Set(m.others.map(o=>o.type)).size<(isT?3:2))fail(uid+' needs more varied types');
 if(new Set(m.others.map(o=>o.title)).size!==m.others.length)fail(uid+' duplicate title');
 m.others.forEach((o,i)=>{const w=`${uid} other ${i+1}`;if(!TYPES.has(o.type))fail(w+' type '+o.type);range(o.title,[4,26],w+' title');range(o.fact,[45,145],w+' fact');range(o.source,[3,140],w+' source');range(o.use,[18,85],w+' use');range(o.caution,[10,65],w+' caution');titles.set(o.title,(titles.get(o.title)||0)+1);others++;});
 m.self.forEach((s,i)=>{const w=`${uid} self ${i+1}`;range(s.scene,[8,42],w+' scene');if(s.questions?.length!==3)fail(w+' questions');s.questions.forEach((x,j)=>range(x,[6,48],w+' question '+(j+1)));range(s.angle,[18,85],w+' angle');selves++;});}
const extra=Object.keys(items).filter(k=>!uids.includes(k));if(extra.length)fail('Unknown materials '+extra);
const repeated=[...titles].filter(([,n])=>n>3);if(repeated.length)fail('Overused examples '+repeated.map(([t,n])=>t+'×'+n).join('、'));
const groups=['T-1','T-2','T-3','T-4','T-5','T-6','T-7','T-8','E-1','E-2','E-3','E-4','E-5','E-6'];
const counts={};
for(const g of groups){const f=full[g];if(!f)fail('Missing full model '+g);const n=len(f.paragraphs.join(''));const [a,b]=g[0]==='T'?[360,400]:[580,720];if(n<a||n>b)fail(`${g} full model length ${n}`);if(f.count!==n)fail(g+' count field '+f.count+' vs '+n);if(f.roles.length!==f.paragraphs.length||f.notes.length!==f.paragraphs.length)fail(g+' roles/notes');if(!f.task||!f.title)fail(g+' task/title');if(g[0]==='T'&&!f.others?.length)fail(g+' must use a real example');counts[g]=n;}
console.log(JSON.stringify({materialCards:uids.length,othersExamples:others,selfPrompts:selves,distinctOthers:titles.size,fullModels:Object.keys(counts).length,fullModelRange:{T:[Math.min(...groups.filter(g=>g[0]==='T').map(g=>counts[g])),Math.max(...groups.filter(g=>g[0]==='T').map(g=>counts[g]))],E:[Math.min(...groups.filter(g=>g[0]==='E').map(g=>counts[g])),Math.max(...groups.filter(g=>g[0]==='E').map(g=>counts[g]))]}}));
