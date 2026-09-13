import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [html, css, js] = await Promise.all(['src/index.html','src/styles.css','src/app.js'].map(file => readFile(path.join(root,file),'utf8')));
const roles = ['diver','instructor','center','boat','organization','admin'];
const required = ['lang="ar"','dir="rtl"','viewport','aria-live','skip-link'];
for (const marker of required) if (!html.includes(marker)) throw new Error(`Missing accessibility marker: ${marker}`);
for (const role of roles) if (!js.includes(`${role}:`)) throw new Error(`Missing role workspace: ${role}`);
for (const token of ['@media','prefers-reduced-motion',':focus-visible']) if (!css.includes(token)) throw new Error(`Missing responsive/accessibility rule: ${token}`);
new Function(js.replace(/^export .*$/gm,''));
console.log('Validated six role workspaces, RTL shell, responsiveness, and JavaScript syntax.');
