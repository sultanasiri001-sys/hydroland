import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const [html, css, app] = await Promise.all([
  readFile(path.join(src, 'index.html'), 'utf8'),
  readFile(path.join(src, 'styles.css'), 'utf8'),
  readFile(path.join(src, 'app.js'), 'utf8')
]);

const roles = ['diver','instructor','center','boat','organization','admin'];
const required = ['lang="ar"','dir="rtl"','viewport','aria-live','skip-link','HYDROLAND'];
for (const marker of required) if (!html.includes(marker)) throw new Error(`Missing shell marker: ${marker}`);
for (const role of roles) if (!html.includes(`data-role="${role}"`)) throw new Error(`Missing role selector: ${role}`);
for (const token of ['@media','prefers-reduced-motion',':focus-visible']) if (!css.includes(token)) throw new Error(`Missing responsive/accessibility rule: ${token}`);
if (/GHAWAS|غوّاص/.test(html)) throw new Error('Legacy platform branding remains in index.html');

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicates.length) throw new Error(`Duplicate HTML ids: ${[...new Set(duplicates)].join(', ')}`);

const entries = await readdir(src, { withFileTypes: true });
const jsFiles = entries.filter(entry => entry.isFile() && entry.name.endsWith('.js')).map(entry => entry.name);
for (const name of jsFiles) {
  const code = await readFile(path.join(src, name), 'utf8');
  try { new Function(code.replace(/^export .*$/gm,'')); }
  catch (error) { throw new Error(`JavaScript syntax error in ${name}: ${error.message}`); }
}

for (const moduleName of ['hydroland-auth.js','hydroland-bookings.js','hydroland-profile-data.js','hydroland-dive-logs.js']) {
  if (!app.includes(moduleName)) throw new Error(`Missing frontend module loader: ${moduleName}`);
}

console.log(`Validated HYDROLAND shell, six role selectors, ${jsFiles.length} JavaScript modules, branding, IDs, responsiveness and accessibility markers.`);
