import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
export const indexCompletionName='00000000000004_production_index_completion';
const root=join(dirname(fileURLToPath(import.meta.url)),'../prisma-fresh-install-candidate');
const digest=text=>createHash('sha256').update(text).digest('hex');
export async function verifyCandidateIndexCompletion() {
 const sql=await readFile(join(root,'index-completion/migration.sql'),'utf8');
 const text=await readFile(join(root,'index-completion/catalog.json'),'utf8');
 const catalog=JSON.parse(text);
 const manifest=JSON.parse(await readFile(join(root,'index-completion/manifest.json'),'utf8'));
 const reference=JSON.parse(await readFile(join(root,'production-relation-reference.json'),'utf8'));
 assert.equal(manifest.migrationName,indexCompletionName);
 assert.equal(manifest.productionApproved,false);
 assert.equal(manifest.sha256,digest(sql));
 assert.equal(manifest.catalogSha256,digest(text));
 assert.equal(catalog.length,8);
 assert.equal(new Set(catalog.map(i=>i.table_name+'.'+i.name)).size,8);
 for(const i of catalog)assert.deepEqual(i,reference.indexes.find(r=>r.table_name===i.table_name && r.name===i.name));
 assert.equal(sql,'-- Candidate-only: missing production lookup and financial uniqueness indexes.\n'+catalog.map(i=>i.definition+';\n').join(''));
 assert.equal(await readFile(join(root,'migrations',indexCompletionName,'migration.sql'),'utf8'),sql);
 return {sql,manifest,catalog};
}
