import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
export {sqlStatements} from './internal-research-test-support.mjs';
export function warehouseTestDatabase(){
 const url=new URL(process.env.DATABASE_URL||'postgresql://invalid/invalid');
 assert(process.env.WAREHOUSE_LOCATION_E2E_CONFIRM==='ISOLATED_LOOPBACK_DATABASE'&&process.env.NODE_ENV==='test'&&url.pathname==='/hydroland_warehouse_ci'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname),'Dedicated disposable warehouse database and explicit isolation confirmation required');return url;
}
export const warehouseMigration=()=>readFile(new URL('../prisma/migrations/20261031041000_warehouse_location_registry/migration.sql',import.meta.url),'utf8');
