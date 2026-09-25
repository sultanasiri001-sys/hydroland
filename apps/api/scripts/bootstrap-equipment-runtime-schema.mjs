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
  const columns=await db.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='EquipmentRentalItem' AND column_name IN ('returnedAt','returnCondition','returnNotes','handedOverAt')`);
  const columnSet=new Set(columns.map(row=>row.column_name));
  for(const name of ['returnedAt','returnCondition','returnNotes','handedOverAt'])if(!columnSet.has(name))throw new Error(`Equipment runtime bootstrap missing EquipmentRentalItem.${name}`);
};
const splitStatements=sql=>sql.split(';').map(statement=>statement.trim()).filter(Boolean);

try{
  const existing=await tableState();
  if(existing.size===expectedTables.length){
    await verify();
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
    console.log('Equipment runtime schema bootstrap verified against production migration definitions.');
  }
} finally {
  await db.$disconnect();
}
