import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const source=fileURLToPath(new URL('../source/',import.meta.url));
const run=script=>execFileSync(process.execPath,[script],{cwd:source,stdio:'inherit'});
// Verifiers read source/dist, which is gitignored; build it first on a fresh clone.
if(!fs.existsSync(new URL('../source/dist/library.js',import.meta.url)))run('build.mjs');
for(const script of ['verify-writing-paths.mjs','verify-models.mjs','verify-highlights-topics.mjs','verify-concept-explanations.mjs','verify-junior.mjs','verify-merged.mjs'])run(script);
