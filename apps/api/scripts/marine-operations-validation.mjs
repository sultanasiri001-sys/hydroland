import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const schema=read('prisma/schema.prisma'),service=read('src/marine-operations/marine-operations.service.ts'),tripService=read('src/marine-operations/marine-trip-management.service.ts'),controller=read('src/marine-operations/marine-operations.controller.ts'),calendar=read('src/trips/calendar-allocation.service.ts'),clearance=read('src/trips/operational-clearance.service.ts');
const checks=[
 ['MarineAsset model',schema.includes('model MarineAsset {')],
 ['Marine brokerage dashboard summary',controller.includes("overview/mine")&&service.includes('async overviewMine')&&service.includes("role:'BOAT_OWNER'")],
 ['Marine documents',schema.includes('model MarineAssetDocument {')],
 ['Marine maintenance',schema.includes('model MarineMaintenanceRecord {')],
 ['Readiness snapshots',schema.includes('model MarineReadinessSnapshot {')],
 ['Fail closed unlinked',service.includes("MARINE_ASSET_NOT_LINKED")],
 ['Required documents',service.includes('REQUIRED_MARINE_DOCUMENTS')],
 ['Maintenance blocker',service.includes("MAINTENANCE_BLOCKING")],
 ['Owned maintenance protection',service.includes('addOwnedMaintenance')&&service.includes('completeOwnedMaintenance')],
 ['Asset readiness endpoint',controller.includes("assets/:assetId/readiness")],
 ['Admin asset review endpoint',controller.includes("admin/assets/review")],
 ['Admin activation decision',controller.includes("admin/assets/:assetId/status")],
 ['Marine organization-scoped trip routes',controller.includes("trips/mine")&&controller.includes("trips/:tripId/publish")&&tripService.includes("kind:'MARINE_OPERATOR'")],
 ['Marine trip draft and revision protection',tripService.includes("status:'DRAFT'")&&tripService.includes('updatedAt:revision')&&tripService.includes('MARINE_TRIP_UPDATED')],
 ['Marine trip price and location gate',tripService.includes('pricePerSeatMinor')&&tripService.includes('TripOperationalLocation')&&tripService.includes('Add a price and location before opening bookings.')],
 ['Publish does not grant operational approval',tripService.includes('does not approve safety, weather, or operational clearance')&&tripService.includes('operationalApprovalGranted:false')],
 ['Trip marine gate',calendar.includes('marine:marineReady')],
 ['Clearance tracks asset',clearance.includes('JOIN "MarineAsset" ma')],
 ['Clearance tracks docs',clearance.includes('JOIN "MarineAssetDocument" md')],
 ['Clearance tracks maintenance',clearance.includes('JOIN "MarineMaintenanceRecord" mm')]
];
const failed=checks.filter(([,ok])=>!ok);for(const [name,ok] of checks)console.log(ok?'PASS':'FAIL',name);if(failed.length)process.exit(1);
