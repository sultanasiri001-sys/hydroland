// Isolated CI only. Production uses the real ordered migration history.
import {PrismaClient} from '@prisma/client';
import {readFile} from 'node:fs/promises';
import {sqlStatements} from './warehouse-location-test-support.mjs';
const url=new URL(process.env.DATABASE_URL||'postgresql://invalid/invalid');
if(process.env.NODE_ENV!=='test'||process.env.C05_E2E_CONFIRM!=='ISOLATED_LOOPBACK_DATABASE'||!['127.0.0.1','localhost'].includes(url.hostname)||url.pathname!=='/hydroland_form_library_ci')throw Error('Dedicated isolated loopback C05 test database required');
const db=new PrismaClient();
try{
 if(await db.account.count())throw Error('C05 preparation refuses a database with accounts');
 await import('./bootstrap-equipment-runtime-schema.mjs');
 const sql=await readFile(new URL('../prisma/migrations/20261127013000_maintenance_work_orders/migration.sql',import.meta.url),'utf8');
 for(const statement of sqlStatements(sql))await db.$executeRawUnsafe(statement);
 await db.$executeRawUnsafe('ALTER DATABASE "hydroland_form_library_ci" SET timezone TO \'Asia/Riyadh\'');
 console.log('PASS isolated canonical equipment bootstrap and exact C05 migration; new connections deliberately use Asia/Riyadh');
}finally{await db.$disconnect();}
