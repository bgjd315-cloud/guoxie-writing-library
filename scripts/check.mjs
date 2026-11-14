import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const source=fileURLToPath(new URL('../source/',import.meta.url));
for(const script of ['verify-writing-paths.mjs','verify-models.mjs','verify-highlights-topics.mjs','verify-concept-explanations.mjs'])execFileSync(process.execPath,[script],{cwd:source,stdio:'inherit'});
