import { readFile } from 'fs/promises';
import { createHash } from 'crypto';
import { resolve } from 'path';
import { DatabaseService } from './database.service';

export async function runMigrations(db:DatabaseService):Promise<void>{
 await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations(
  version TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
 )`);
 const migrations=['001_general_l1.sql'];
 for(const version of migrations){
  const path=resolve(process.cwd(),'src/database/migrations',version);
  const sql=await readFile(path,'utf8');
  const checksum=createHash('sha256').update(sql).digest('hex');
  const prior=await db.query<{checksum:string}>('SELECT checksum FROM schema_migrations WHERE version=$1',[version]);
  if(prior.rows[0]){
   if(prior.rows[0].checksum!==checksum) throw new Error(`Migration checksum mismatch: ${version}`);
   continue;
  }
  await db.transaction(async client=>{
   await client.query(sql);
   await client.query('INSERT INTO schema_migrations(version,checksum) VALUES($1,$2)',[version,checksum]);
  });
 }
}
if(require.main===module){ const db=new DatabaseService(); runMigrations(db).then(()=>db.onModuleDestroy()).catch(async e=>{console.error(e);await db.onModuleDestroy();process.exit(1);}); }
