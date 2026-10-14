import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
export const relationAlignmentName='00000000000006_production_relation_alignment';
const root=join(dirname(fileURLToPath(import.meta.url)),'../prisma-fresh-install-candidate');
const digest=text=>createHash('sha256').update(text).digest('hex');
export async function verifyCandidateRelationAlignment() {
 const sql=await readFile(join(root,'relation-alignment/migration.sql'),'utf8');
 const text=await readFile(join(root,'relation-alignment/catalog.json'),'utf8');
 const catalog=JSON.parse(text);
 const manifest=JSON.parse(await readFile(join(root,'relation-alignment/manifest.json'),'utf8'));
 const reference=JSON.parse(await readFile(join(root,'production-relation-reference.json'),'utf8'));
 assert.equal(manifest.migrationName,relationAlignmentName);
 assert.equal(manifest.productionApproved,false);
 assert.equal(manifest.sha256,digest(sql));
 assert.equal(manifest.catalogSha256,digest(text));
 assert.equal(catalog.length,21);
 assert.equal(new Set(catalog.map(c=>c.table+'.'+c.name)).size,21);
 for(const c of catalog) {
  assert.deepEqual(c.production,reference.constraints.find(r=>r.table_name===c.table && r.name===c.name));
  assert.equal(c.production.kind,'f');assert.equal(c.candidate.kind,'f');
  assert.ok(c.production.validated && c.candidate.validated);
  assert.equal(c.candidate.definition.replace(' ON UPDATE CASCADE',''),c.production.definition);
 }
 assert.equal(await readFile(join(root,'migrations',relationAlignmentName,'migration.sql'),'utf8'),sql);
 return {sql,manifest,catalog};
}
