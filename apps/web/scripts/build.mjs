import { cp, mkdir, rm, readdir, readFile, writeFile } from 'node:fs/promises';
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

const identity = path.resolve(root, '../api/src/document-forms');
const receiptAssets = path.join(dist, 'assets/document-identity-v2');
await mkdir(receiptAssets, { recursive: true });
for (const asset of ['fonts/Tajawal-Approved-Regular.ttf', 'fonts/Tajawal-Approved-Bold.ttf', 'fonts/Tajawal-Approved-OFL.txt', 'identity/hydroland-mark-approved-v2.png']) {
  await cp(path.join(identity, asset), path.join(receiptAssets, path.basename(asset)));
}

// The print window must be able to render both formats without further requests.
let receiptCss = await readFile(path.join(dist, 'hydroland-invoice-preview.css'), 'utf8');
for (const weight of ['Regular', 'Bold']) {
  const font = `Tajawal-Approved-${weight}.ttf`;
  const bytes = await readFile(path.join(receiptAssets, font));
  receiptCss = receiptCss.replace(`./assets/document-identity-v2/${font}`, `data:font/ttf;base64,${bytes.toString('base64')}`);
}
const mark = await readFile(path.join(receiptAssets, 'hydroland-mark-approved-v2.png'));
await writeFile(path.join(receiptAssets, 'invoice-print.json'), JSON.stringify({
  css: receiptCss,
  logo: `data:image/png;base64,${mark.toString('base64')}`,
}));

const vendor=path.join(dist,'vendor/license-reader');
await mkdir(path.join(vendor,'core'),{recursive:true});
await mkdir(path.join(vendor,'lang'),{recursive:true});
const pkg=name=>path.dirname(require.resolve(name+'/package.json'));
for(const file of ['tesseract.esm.min.js','worker.min.js','worker.min.js.LICENSE.txt','tesseract.min.js.LICENSE.txt'])await cp(path.join(pkg('tesseract.js'),'dist',file),path.join(vendor,file));
for(const file of await readdir(pkg('tesseract.js-core')))if(/\.(js|wasm)$/.test(file)||file==='LICENSE')await cp(path.join(pkg('tesseract.js-core'),file),path.join(vendor,'core',file));
for(const lang of ['ara','eng'])await cp(path.join(pkg('@tesseract.js-data/'+lang),'4.0.0',lang+'.traineddata.gz'),path.join(vendor,'lang',lang+'.traineddata.gz'));
for(const file of ['pdf.min.mjs','pdf.worker.min.mjs'])await cp(path.join(pkg('pdfjs-dist'),'build',file),path.join(vendor,file));
await cp(path.join(pkg('pdfjs-dist'),'LICENSE'),path.join(vendor,'PDFJS-LICENSE'));
