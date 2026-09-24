import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const [html, app] = await Promise.all([
  readFile(path.join(src, 'index.html'), 'utf8'),
  readFile(path.join(src, 'app.js'), 'utf8')
]);

const roles = ['diver','instructor','center','boat','organization','admin'];
const required = ['lang="ar"','dir="rtl"','viewport','aria-live','skip-link','HYDROLAND'];
for (const marker of required) if (!html.includes(marker)) throw new Error(`Missing shell marker: ${marker}`);
for (const role of roles) if (!html.includes(`data-role="${role}"`)) throw new Error(`Missing role selector: ${role}`);
if (html.includes('GHAWAS') || html.includes('<title>غوّاص') || html.includes('>غوّاص<')) throw new Error('Legacy platform branding remains in index.html');
for (const approved of ['محترفي الغوص','الوساطة البحرية']) if (!html.includes(approved) || !app.includes(approved)) throw new Error(`Missing approved portal terminology: ${approved}`);
for (const legacy of ['مدرب محترف','صاحب قارب','واجهة المدرب المحترف','لوحة مشغل القارب']) if (html.includes(legacy) || app.includes(legacy)) throw new Error(`Legacy portal terminology remains: ${legacy}`);

const mobileNav = html.match(/<nav class="mobile-nav"[\s\S]*?<\/nav>/)?.[0] || '';
for (const marker of ['href="#home"','>الرئيسية<','href="#trips"','>الرحلات<','href="#community"','>المجتمع<','>الرسائل<','id="profile-open-mobile"','>حسابي<']) if (!mobileNav.includes(marker)) throw new Error(`Missing approved mobile navigation item: ${marker}`);
if (!/disabled[^>]*[\s\S]*?>الرسائل</.test(mobileNav)) throw new Error('Messages control must remain explicitly disabled until connected');
if (mobileNav.includes('>اكتشف<') || mobileNav.includes('>أنشطتي<')) throw new Error('Legacy mobile navigation labels remain');

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicates.length) throw new Error(`Duplicate HTML ids: ${[...new Set(duplicates)].join(', ')}`);

const entries = await readdir(src, { withFileTypes: true });
const cssFiles = entries.filter(entry => entry.isFile() && entry.name.endsWith('.css')).map(entry => entry.name);
const css = (await Promise.all(cssFiles.map(name => readFile(path.join(src, name), 'utf8')))).join('\n');
for (const token of ['@media','prefers-reduced-motion',':focus-visible']) if (!css.includes(token)) throw new Error(`Missing responsive/accessibility rule: ${token}`);

const jsFiles = entries.filter(entry => entry.isFile() && entry.name.endsWith('.js')).map(entry => entry.name);
for (const name of jsFiles) {
  const code = await readFile(path.join(src, name), 'utf8');
  try { new Function(code.replace(/^export .*$/gm,'')); }
  catch (error) { throw new Error(`JavaScript syntax error in ${name}: ${error.message}`); }
}

const roleDashboard = await readFile(path.join(src, 'hydroland-role-dashboards.js'), 'utf8');
for (const marker of ['connectControl','قيد الربط بالخدمة',"node.disabled=true","aria-disabled"]) if (!roleDashboard.includes(marker)) throw new Error(`Missing role-control integrity marker: ${marker}`);
if (roleDashboard.includes("forEach(x=>x.addEventListener('click',()=>go(x)))")) throw new Error('Legacy unguarded role action binding remains');

for (const moduleName of ['hydroland-auth.js','hydroland-bookings.js','hydroland-profile-data.js','hydroland-dive-logs.js']) {
  if (!app.includes(moduleName)) throw new Error(`Missing frontend module loader: ${moduleName}`);
}

console.log(`Validated HYDROLAND shell, six role selectors, ${jsFiles.length} JavaScript modules, ${cssFiles.length} style modules, branding, IDs, responsiveness and accessibility markers.`);
