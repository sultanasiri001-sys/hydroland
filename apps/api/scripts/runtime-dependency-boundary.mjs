import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';

// Inspect installed files, not the monorepo lockfile (which intentionally
// continues to include and audit mobile). Run inside the final API image.
const root=process.cwd(),packages=[],seen=new Set();
async function scan(directory){
  for(const entry of await fs.readdir(directory,{withFileTypes:true}).catch(error=>{if(error.code==='ENOENT')return [];throw error;})){
    if(entry.name.startsWith('.'))continue;
    const location=path.join(directory,entry.name);
    if(entry.name.startsWith('@')){await scan(location);continue;}
    const real=await fs.realpath(location);
    if(seen.has(real))continue;seen.add(real);
    const manifest=JSON.parse(await fs.readFile(path.join(real,'package.json'),'utf8'));
    packages.push({name:manifest.name,version:manifest.version,path:path.relative(root,location)});
    await scan(path.join(real,'node_modules'));
  }
}
await scan(path.join(root,'node_modules'));
await scan(path.join(root,'apps/api/node_modules'));
assert.ok(packages.length>0,'Runtime package inventory must not be empty');
// TypeScript can remain as Prisma's optional runtime peer; Nest CLI and
// mobile/browser tooling have no API runtime role.
const forbidden=/^(?:node-forge|braces|@hydroland\/(?:mobile|web)|@nestjs\/cli|@playwright\/.*|playwright(?:-.*)?|@expo\/.*|expo(?:-.*)?|@react-native\/.*|react-native(?:-.*)?|metro(?:-.*)?)$/;
assert.deepEqual(packages.filter(p=>forbidden.test(p.name)),[],'Mobile/web/build-only dependencies must not enter the API image');
for(const name of ['@nestjs/core','@prisma/client','prisma','pdf-lib','google-auth-library'])assert.ok(packages.some(p=>p.name===name),'Required runtime package missing: '+name);
const require=createRequire(path.join(root,'apps/api/package.json'));
require('reflect-metadata');
require(path.join(root,'apps/api/dist/app.module.js'));
const {PrismaClient}=require('@prisma/client');
const client=new PrismaClient();await client.$disconnect();
console.log(JSON.stringify({boundary:'API production image',count:packages.length,packages:packages.sort((a,b)=>a.name.localeCompare(b.name))},null,2));
