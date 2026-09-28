import { readFile } from 'node:fs/promises';
const root=new URL('../src/',import.meta.url);
const [css,app]=await Promise.all([
  readFile(new URL('hydroland-design-system.css',root),'utf8'),
  readFile(new URL('app.js',root),'utf8')
]);
const required=[
  '--hl-deep:#0A1E3A','--hl-cyan:#00D4FF','--hl-gold:#F6C35E',
  '--hl-success:#22C55E','--hl-danger:#FF6B6B',"'Tajawal'",
  'direction:rtl','backdrop-filter:blur','@media(max-width:760px)',
  '@media(prefers-reduced-motion:reduce)'
];
for(const token of required) if(!css.includes(token)) throw new Error('Missing approved design-system control: '+token);
if(!app.includes("'hydroland-design-system.css'")) throw new Error('Approved design system is not loaded by the app');
if(app.indexOf("'hydroland-design-system.css'")<app.indexOf("'hydroland-premium.css'")) throw new Error('Design system must load after legacy premium layer');
console.log('HYDROLAND approved design system validation passed.');
