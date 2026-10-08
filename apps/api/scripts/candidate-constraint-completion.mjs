import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
export const constraintCompletionName='00000000000003_production_constraint_completion';
const root=join(dirname(fileURLToPath(import.meta.url)),'../prisma-fresh-install-candidate');
const digest=text=>createHash('sha256').update(text).digest('hex');
const identifier=value=>'"'+value.replaceAll('"','""')+'"';
export async function verifyCandidateConstraintCompletion() {
 const sql=await readFile(join(root,'constraint-completion/migration.sql'),'utf8');
 const catalogText=await readFile(join(root,'constraint-completion/catalog.json'),'utf8');
 const catalog=JSON.parse(catalogText);
 const manifest=JSON.parse(await readFile(join(root,'constraint-completion/manifest.json'),'utf8'));
 const reference=JSON.parse(await readFile(join(root,'production-relation-reference.json'),'utf8'));
 assert.equal(manifest.migrationName,constraintCompletionName);
 assert.equal(manifest.sha256,digest(sql),'Constraint completion checksum drift');
 assert.equal(manifest.catalogSha256,digest(catalogText),'Constraint catalog checksum drift');
 assert.equal(manifest.productionApproved,false);
 assert.equal(catalog.filter(c=>c.kind==='f').length,15);
 assert.equal(catalog.filter(c=>c.kind==='c').length,24);
 assert.equal(new Set(catalog.map(c=>c.table_name+'.'+c.name)).size,39);
 for (const c of catalog) {
  assert.ok(c.validated && ['f','c'].includes(c.kind));
  assert.deepEqual(c,reference.constraints.find(r=>r.table_name===c.table_name && r.name===c.name),'Constraint differs from production reference');
  assert.ok(sql.includes('ALTER TABLE '+identifier(c.table_name)+' ADD CONSTRAINT '+identifier(c.name)+' '+c.definition+';'));
 }
 assert.equal(await readFile(join(root,'migrations',constraintCompletionName,'migration.sql'),'utf8'),sql);
 return {sql,manifest,catalog};
}
