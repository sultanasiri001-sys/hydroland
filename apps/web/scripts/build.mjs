import { cp, mkdir, rm, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(path.join(root, 'src'), dist, { recursive: true });
await cp(path.join(root, 'public'), dist, { recursive: true });
console.log('HYDROLAND web built in apps/web/dist');

const vendor=path.join(dist,'vendor/license-reader');
await mkdir(path.join(vendor,'core'),{recursive:true});
await mkdir(path.join(vendor,'lang'),{recursive:true});
const pkg=name=>path.dirname(require.resolve(name+'/package.json'));
for(const file of ['tesseract.esm.min.js','worker.min.js','worker.min.js.LICENSE.txt','tesseract.min.js.LICENSE.txt'])await cp(path.join(pkg('tesseract.js'),'dist',file),path.join(vendor,file));
for(const file of await readdir(pkg('tesseract.js-core')))if(/\.(js|wasm)$/.test(file)||file==='LICENSE')await cp(path.join(pkg('tesseract.js-core'),file),path.join(vendor,'core',file));
for(const lang of ['ara','eng'])await cp(path.join(pkg('@tesseract.js-data/'+lang),'4.0.0',lang+'.traineddata.gz'),path.join(vendor,'lang',lang+'.traineddata.gz'));
for(const file of ['pdf.min.mjs','pdf.worker.min.mjs'])await cp(path.join(pkg('pdfjs-dist'),'build',file),path.join(vendor,file));
await cp(path.join(pkg('pdfjs-dist'),'LICENSE'),path.join(vendor,'PDFJS-LICENSE'));
