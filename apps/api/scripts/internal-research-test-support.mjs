import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
export function researchTestDatabase() {
 const database=new URL(process.env.DATABASE_URL||'postgresql://invalid/invalid');
 assert(process.env.RESEARCH_E2E_CONFIRM==='ISOLATED_LOOPBACK_DATABASE'&&process.env.NODE_ENV==='test'&&database.pathname==='/hydroland_research_ci'&&['localhost','127.0.0.1','[::1]'].includes(database.hostname),'Dedicated disposable research database and explicit isolation confirmation required');
 return database;
}
export function sqlStatements(sql) {
 const result=[];let statement='';
 for(const chunk of sql.match(/\$([a-z_]*)\$[\s\S]*?\$\1\$|[^$]+/g)||[]){
  if(chunk.startsWith('$')){statement+=chunk;continue;}
  const pieces=chunk.split(';');statement+=pieces.shift();
  for(const piece of pieces){if(statement.replace(/--[^\n]*/g,'').trim())result.push(statement);statement=piece;}
 }
 if(statement.replace(/--[^\n]*/g,'').trim())result.push(statement);
 return result;
}
export const researchMigration=()=>readFile(new URL('../prisma/migrations/20261026200000_internal_research_runtime/migration.sql',import.meta.url),'utf8');
export async function prepareResearchTables(db) {
 researchTestDatabase();
 assert.equal(await db.account.count(),0,'HTTP fixture requires a fresh disposable database, not an existing account store');
 assert.equal(await db.organization.count(),0,'HTTP fixture requires a fresh disposable database');
 for(const table of ['InternalResearchReview','InternalResearchRevision','InternalResearchInitiative']){
  assert.equal(Number((await db.$queryRawUnsafe(`SELECT count(*) AS count FROM "${table}"`))[0].count),0,'Refuse to replace non-empty research tables');
 }
 // Prisma db push creates types only; replace these EMPTY new tables with the
 // exact additive migration so HTTP acceptance exercises actual DB constraints.
 await db.$transaction(async tx=>{
  for(const table of ['InternalResearchReview','InternalResearchRevision','InternalResearchInitiative'])await tx.$executeRawUnsafe(`DROP TABLE "${table}"`);
  for(const sql of sqlStatements(await researchMigration()))await tx.$executeRawUnsafe(sql);
  const audit=await readFile(new URL('../prisma/migrations/20260930080000_audit_event_append_only/migration.sql',import.meta.url),'utf8');
  for(const sql of sqlStatements(audit))await tx.$executeRawUnsafe(sql);
 });
}
