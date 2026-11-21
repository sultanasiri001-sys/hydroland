import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const db=new PrismaClient();
const here=dirname(fileURLToPath(import.meta.url));
const prismaRoot=resolve(here,'..','prisma');
const migrations=[
  '20260915024500_equipment_barcode_inventory',
  '20260915031500_equipment_inspections',
  '20260915042000_inventory_stocktake',
  '20260915044000_inventory_asset_value',
  '20260915045500_equipment_rentals',
  '20260915052000_equipment_rental_returns',
  '20260915053500_equipment_rental_due_extensions',
  '20260915054500_equipment_tag_profiles',
  '20260915060000_equipment_rental_handover',
  '20261119170500_equipment_rental_hold',
  '20261121042000_rental_collection_contract',
];
const expectedTables=['EquipmentBarcode','EquipmentMovement','EquipmentInspection','InventoryStocktake','InventoryStocktakeScan','EquipmentRental','EquipmentRentalItem'];
const expectedConstraints=['EquipmentBarcode_resourceId_fkey','EquipmentInspection_status_check','EquipmentBarcode_acquisitionCostHalala_check','EquipmentRental_status_check','EquipmentRental_payment_check','EquipmentRentalItem_return_condition_check','EquipmentRental_extension_status_check','EquipmentBarcode_tag_method_check'];
const expectedIndexes=['InventoryStocktakeScan_session_resource_key','EquipmentRentalItem_rental_handover_idx','EquipmentBarcode_tag_method_idx'];

const tableState=async()=>{
  const rows=await db.$queryRawUnsafe(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename = ANY($1::text[])`,expectedTables);
  return new Set(rows.map(row=>row.tablename));
};
const verify=async()=>{
  const tables=await tableState();
  const missingTables=expectedTables.filter(name=>!tables.has(name));
  if(missingTables.length)throw new Error(`Equipment runtime bootstrap missing tables: ${missingTables.join(', ')}`);
  const constraints=await db.$queryRawUnsafe(`SELECT conname FROM pg_constraint WHERE conname = ANY($1::text[])`,expectedConstraints);
  const constraintSet=new Set(constraints.map(row=>row.conname));
  const missingConstraints=expectedConstraints.filter(name=>!constraintSet.has(name));
  if(missingConstraints.length)throw new Error(`Equipment runtime bootstrap missing constraints: ${missingConstraints.join(', ')}`);
  const indexes=await db.$queryRawUnsafe(`SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname = ANY($1::text[])`,expectedIndexes);
  const indexSet=new Set(indexes.map(row=>row.indexname));
  const missingIndexes=expectedIndexes.filter(name=>!indexSet.has(name));
  if(missingIndexes.length)throw new Error(`Equipment runtime bootstrap missing indexes: ${missingIndexes.join(', ')}`);
  const holds=await db.$queryRaw`SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='EquipmentRental' AND column_name='holdExpiresAt'`;
  if(holds[0]?.data_type!=='timestamp with time zone')throw new Error('Equipment rental hold migration must be applied.');
  const columns=await db.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='EquipmentRentalItem' AND column_name IN ('returnedAt','returnCondition','returnNotes','handedOverAt')`);
  const columnSet=new Set(columns.map(row=>row.column_name));
  for(const name of ['returnedAt','returnCondition','returnNotes','handedOverAt'])if(!columnSet.has(name))throw new Error(`Equipment runtime bootstrap missing EquipmentRentalItem.${name}`);
};
const splitStatements=sql=>sql.split(';').map(statement=>statement.trim()).filter(Boolean);

async function restoreRentalContract(){
  const columns=await db.$queryRaw`SELECT column_name,data_type FROM information_schema.columns
    WHERE table_schema='public' AND table_name='EquipmentRental' AND column_name IN ('scheduledHandoverAt','contractSnapshot')`;
  if(columns.length===0){
    const sql=await readFile(resolve(prismaRoot,'migrations','20261121042000_rental_collection_contract','migration.sql'),'utf8');
    for(const statement of splitStatements(sql))await db.$executeRawUnsafe(statement);
  }else if(columns.length!==2||columns.find(row=>row.column_name==='scheduledHandoverAt')?.data_type!=='timestamp without time zone'
    ||columns.find(row=>row.column_name==='contractSnapshot')?.data_type!=='jsonb'){
    throw new Error('Partial or incompatible rental contract schema; no existing contract was changed.');
  }
  const constraints=await db.$queryRaw`SELECT conname FROM pg_constraint WHERE conrelid='"EquipmentRental"'::regclass AND conname='EquipmentRental_contract_pair_check'`;
  if(constraints.length!==1)throw new Error('Rental contract pair constraint is missing.');
}

// This production extension predates the canonical TEXT-identity CI schema.
// Restore its same column/FK/index using the observed Organization.id type;
// existing ownership rows are never rewritten or coerced.
async function restoreCenterOwnership(){
  await db.$transaction(async tx=>{
    const columns=await tx.$queryRaw`
      SELECT table_name,column_name,udt_name FROM information_schema.columns
      WHERE table_schema='public' AND ((table_name='Organization' AND column_name='id')
        OR (table_name='EquipmentBarcode' AND column_name='organizationId'))`;
    const organization=columns.find(row=>row.table_name==='Organization');
    const ownership=columns.find(row=>row.table_name==='EquipmentBarcode');
    if(!organization||!['text','uuid'].includes(organization.udt_name))throw new Error('Unsupported Organization identity type for equipment center scope.');
    if(ownership&&ownership.udt_name!==organization.udt_name)throw new Error('Existing equipment center scope has a different identity type; no data was altered.');
    if(!ownership)await tx.$executeRawUnsafe(`ALTER TABLE "EquipmentBarcode" ADD COLUMN "organizationId" ${organization.udt_name==='uuid'?'UUID':'TEXT'}`);
    const constraints=await tx.$queryRaw`
      SELECT c.contype::text,c.confdeltype::text,c.confupdtype::text,c.confrelid::regclass::text AS target,
        ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY k(attnum,ord)
          JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum ORDER BY k.ord) AS source_columns,
        ARRAY(SELECT a.attname::text FROM unnest(c.confkey) WITH ORDINALITY k(attnum,ord)
          JOIN pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=k.attnum ORDER BY k.ord) AS target_columns
      FROM pg_constraint c WHERE c.conrelid='"EquipmentBarcode"'::regclass AND c.conname='EquipmentBarcode_organizationId_fkey'`;
    if(!constraints.length)await tx.$executeRawUnsafe('ALTER TABLE "EquipmentBarcode" ADD CONSTRAINT "EquipmentBarcode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE');
    else{
      const fk=constraints[0];
      if(fk.contype!=='f'||fk.confdeltype!=='r'||fk.confupdtype!=='c'||fk.target!=='"Organization"'
        ||JSON.stringify(fk.source_columns)!==JSON.stringify(['organizationId'])||JSON.stringify(fk.target_columns)!==JSON.stringify(['id'])){
        throw new Error('Existing equipment center scope FK differs from its production definition.');
      }
    }
    const indexes=await tx.$queryRaw`SELECT indexdef FROM pg_indexes WHERE schemaname='public' AND indexname='EquipmentBarcode_organizationId_stockStatus_idx'`;
    if(!indexes.length)await tx.$executeRawUnsafe('CREATE INDEX "EquipmentBarcode_organizationId_stockStatus_idx" ON "EquipmentBarcode"("organizationId","stockStatus")');
    else if(!/ON public\."EquipmentBarcode" USING btree \("organizationId", "stockStatus"\)$/.test(indexes[0].indexdef)){
      throw new Error('Existing equipment center scope index differs from its production definition.');
    }
  });
}

try{
  const existing=await tableState();
  if(existing.size===expectedTables.length){
    await restoreRentalContract();
    await verify();
    await restoreCenterOwnership();
    console.log('Equipment runtime schema already present and verified.');
    process.exitCode=0;
  }else{
    if(existing.size!==0)throw new Error(`Partial equipment runtime schema detected before bootstrap: ${[...existing].join(', ')}`);
    for(const migration of migrations){
      const file=resolve(prismaRoot,'migrations',migration,'migration.sql');
      const sql=await readFile(file,'utf8');
      for(const statement of splitStatements(sql))await db.$executeRawUnsafe(statement);
      console.log(`Applied equipment runtime schema migration ${migration}.`);
    }
    await verify();
    await restoreRentalContract();
    await restoreCenterOwnership();
    console.log('Equipment runtime schema bootstrap verified against production migration definitions.');
  }
} finally {
  await db.$disconnect();
}
