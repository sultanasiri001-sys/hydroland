import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
export const columnCompletionName='00000000000002_production_column_completion';
const root=join(dirname(fileURLToPath(import.meta.url)),'../prisma-fresh-install-candidate');
export async function verifyCandidateColumnCompletion() {
 const sql=await readFile(join(root,'column-completion/migration.sql'),'utf8');
 const manifest=JSON.parse(await readFile(join(root,'column-completion/manifest.json'),'utf8'));
 assert.equal(manifest.migrationName,columnCompletionName);
 assert.equal(manifest.sha256,createHash('sha256').update(sql).digest('hex'),'Column completion checksum drift');
 assert.equal(manifest.productionApproved,false);
 return {sql,manifest};
}
