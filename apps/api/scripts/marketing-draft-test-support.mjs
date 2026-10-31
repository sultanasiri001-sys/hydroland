import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
export {sqlStatements} from './internal-research-test-support.mjs';
export function marketingTestDatabase(){
 const url=new URL(process.env.DATABASE_URL||'postgresql://invalid/invalid');
 assert(process.env.MARKETING_DRAFT_E2E_CONFIRM==='ISOLATED_LOOPBACK_DATABASE'&&process.env.NODE_ENV==='test'&&url.pathname==='/hydroland_marketing_ci'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname),'Dedicated disposable marketing database and explicit isolation confirmation required');return url;
}
export const marketingMigration=()=>readFile(new URL('../prisma/migrations/20261031010000_marketing_campaign_drafts/migration.sql',import.meta.url),'utf8');
