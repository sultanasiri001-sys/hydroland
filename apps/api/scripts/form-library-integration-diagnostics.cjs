'use strict';
// Diagnostic replay of the unchanged grouped HTTP step, never a replacement gate.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const yaml = require('js-yaml');
const database = new URL(process.env.DATABASE_URL || 'postgresql://invalid/invalid');
if (process.env.CI !== 'true' || process.env.FORM_LIBRARY_E2E_CONFIRM !== 'ISOLATED_LOOPBACK_DATABASE' || !['localhost','127.0.0.1'].includes(database.hostname) || database.pathname !== '/hydroland_form_library_ci') throw new Error('Only the isolated CI database may be used.');
const source = fs.readFileSync('.github/workflows/api-validation.yml','utf8');
const workflow = yaml.load(source);
const step = workflow.jobs.build.steps.find(item => item.name === 'HR HTTP/DB E2E');
if (!step || typeof step.run !== 'string' || !step.env || String(step.env.PORT) !== '3101') throw new Error('Expected grouped workflow step not found.');
const evidence = '/tmp/form-library-evidence';
fs.mkdirSync(evidence,{recursive:true});
const files = [...new Set(step.run.match(/apps\/api\/scripts\/[A-Za-z0-9._-]+\.(?:mjs|cjs)/g))];
const manifest = files.map(file => {
 const bytes = fs.readFileSync(file);
 return {file,lines:bytes.toString('utf8').split('\n').length-1,gitBlob:crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')};
});
fs.writeFileSync(path.join(evidence,'grouped-source-manifest.json'),JSON.stringify(manifest,null,2));
fs.writeFileSync(path.join(evidence,'grouped-original-step.sh'),step.run);
console.log(JSON.stringify(manifest,null,2));
// Static source-only bootstrap commands used by the canonical API workflow.
for (const script of ['bootstrap-equipment-runtime-schema.mjs','bootstrap-trip-weather-runtime-schema.mjs','bootstrap-messaging-runtime-schema.mjs']) {
 const result=spawnSync(process.execPath,[`apps/api/scripts/${script}`],{env:process.env,stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status||1);
}
const env={...process.env,...Object.fromEntries(Object.entries(step.env).map(([key,value])=>[key,String(value)]))};
// This step in the canonical workflow has no NODE_ENV, unlike the form-specific test.
delete env.NODE_ENV;
const log=fs.openSync(path.join(evidence,'grouped-http.log'),'w');
const result=spawnSync('bash',['-e','-o','pipefail','-x','-c',step.run],{env,stdio:['ignore',log,log],timeout:12*60*1000});
fs.closeSync(log);
const output=fs.readFileSync(path.join(evidence,'grouped-http.log'),'utf8');
console.log(output);
if(result.error)throw result.error;
if(result.status!==0)process.exit(result.status||1);
console.log('Canonical grouped HTTP step passed in the isolated diagnostic database; this does not replace the full API gate.');
