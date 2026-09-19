import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const schema=read('prisma/schema.prisma'),service=read('src/marine-operations/marine-operations.service.ts'),calendar=read('src/trips/calendar-allocation.service.ts'),clearance=read('src/trips/operational-clearance.service.ts');
const checks=[
 ['MarineAsset model',schema.includes('model MarineAsset {')],
 ['Marine documents',schema.includes('model MarineAssetDocument {')],
 ['Marine maintenance',schema.includes('model MarineMaintenanceRecord {')],
 ['Readiness snapshots',schema.includes('model MarineReadinessSnapshot {')],
 ['Fail closed unlinked',service.includes("MARINE_ASSET_NOT_LINKED")],
 ['Required documents',service.includes('REQUIRED_MARINE_DOCUMENTS')],
 ['Maintenance blocker',service.includes("MAINTENANCE_BLOCKING")],
 ['Trip marine gate',calendar.includes('marine:marineReady')],
 ['Clearance tracks asset',clearance.includes('JOIN "MarineAsset" ma')],
 ['Clearance tracks docs',clearance.includes('JOIN "MarineAssetDocument" md')],
 ['Clearance tracks maintenance',clearance.includes('JOIN "MarineMaintenanceRecord" mm')]
];
const failed=checks.filter(([,ok])=>!ok);for(const [name,ok] of checks)console.log(ok?'PASS':'FAIL',name);if(failed.length)process.exit(1);
