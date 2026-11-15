import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(repoRoot,'source');
const base='/guoxie-writing-library/';
const provenance=JSON.parse(fs.readFileSync(path.join(repoRoot,'site-version.json'),'utf8'));
execFileSync(process.execPath,['build.mjs'],{cwd:source,stdio:'inherit'});
const output=path.join(repoRoot,'docs');
fs.mkdirSync(output,{recursive:true});
fs.cpSync(path.join(source,'dist'),output,{recursive:true});
const textTypes=new Set(['.html','.js','.json','.css','.svg','.md','.txt']);
let files=0;
function visit(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory()){visit(p);continue;}files++;if(!textTypes.has(path.extname(p)))continue;let s=fs.readFileSync(p,'utf8');s=s.replace(/(["'`])\/(?=[A-Za-z#])/g,(_,q)=>q+base);s=s.replace(/\b(href|src|action)=(["'])\/\2/g,(_,a,q)=>a+'='+q+base+q);s=s.replace(/(["'`])\/\1\s*\+/g,(_,q)=>q+base+q+'+');s=s.replace(/url\(\s*(["']?)\/(?!\/|guoxie-writing-library\/)/g,(_,q)=>'url('+q+base);fs.writeFileSync(p,s);}}
visit(output);
fs.writeFileSync(path.join(output,'.nojekyll'),'');
fs.writeFileSync(path.join(output,'release.json'),JSON.stringify({site:'拾光寫作',...provenance,base,features:{topics:23,prompts:69,modelEntries:216,conceptExplanations:111,othersExamples:392,selfPrompts:222,fullLengthModels:17,juniorMaterialCards:27,materialBank:true}},null,2)+'\n');
console.log(`GitHub Pages ready: ${files} files, base ${base}`);
