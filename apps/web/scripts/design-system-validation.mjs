import { readFile } from 'node:fs/promises';
const root=new URL('../src/',import.meta.url);
const [css,app,themes,themeManager]=await Promise.all([
  readFile(new URL('hydroland-design-system.css',root),'utf8'),
  readFile(new URL('app.js',root),'utf8'),
  readFile(new URL('hydroland-themes.js',root),'utf8'),
  readFile(new URL('hydroland-theme-manager.js',root),'utf8')
]);
const required=[
  '--hl-deep:#0A1E3A','--hl-cyan:#00D4FF','--hl-gold:#F6C35E',
  '--hl-success:#22C55E','--hl-danger:#FF6B6B',"'Tajawal'",
  'direction:rtl','backdrop-filter:blur','@media(max-width:760px)',
  '@media(prefers-reduced-motion:reduce)','--hl-theme-primary:var(--theme-primary,var(--hl-deep))','--hl-theme-accent:var(--theme-accent,var(--hl-cyan))','--hl-theme-gold:var(--theme-gold,var(--hl-gold))'
];
for(const token of required) if(!css.includes(token)) throw new Error('Missing approved design-system control: '+token);
if(!app.includes("'hydroland-design-system.css'")) throw new Error('Approved design system is not loaded by the app');
if(app.indexOf("'hydroland-design-system.css'")<app.indexOf("'hydroland-premium.css'")) throw new Error('Design system must load after legacy premium layer');
for(const id of ['ocean-horizon','winter-current','spring-reef','summer-coast','autumn-depth','founding-day','national-day','eid-al-fitr','eid-al-adha','marine-event']) if(!themes.includes(id)) throw new Error('Missing theme center entry: '+id);
if(!themes.includes("fetch(apiBase+'/themes/active'")) throw new Error('Theme center must sync the active server theme');
if(!themeManager.includes("aria-label','فتح الثيمات'")) throw new Error('Theme center must remain accessible from the UI');
console.log('HYDROLAND approved design system and theme center validation passed.');
