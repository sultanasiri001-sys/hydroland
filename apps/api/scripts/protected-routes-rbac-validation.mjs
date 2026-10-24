import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(path.join(root,p),'utf8');
const [adminGuard,admin,tripAdmin,trips,profile,access,organizationCases,customerCases,organizationBookings,bookingManagement,organizationSafety,safetyService]=await Promise.all([
  read('src/admin/admin.guard.ts'),read('src/admin/admin.controller.ts'),read('src/trips/trip-admin.controller.ts'),
  read('src/trips/trips.controller.ts'),read('src/profile/profile.controller.ts'),read('src/auth/access-token.guard.ts'),
  read('src/customer-service/organization-customer-case.controller.ts'),read('src/customer-service/customer-case.service.ts'),
  read('src/trips/organization-bookings.controller.ts'),read('src/trips/booking-management.service.ts'),
  read('src/safety/organization-safety-incidents.controller.ts'),read('src/safety/safety-incidents.service.ts')
]);

for(const source of [admin,tripAdmin]) assert.ok(source.includes('@UseGuards(AccessTokenGuard,AdminGuard)')||source.includes('@UseGuards(AccessTokenGuard, AdminGuard)'),'Admin controller must require auth + admin guard');
for(const marker of ["role:'ADMIN'","status:'ACTIVE'","Admin scope required."]) assert.ok(adminGuard.includes(marker),`Missing admin RBAC invariant: ${marker}`);
assert.ok(profile.includes('@UseGuards(AccessTokenGuard)'),'Profile must be protected');
for(const marker of ["@Post(':id/bookings')","@Get('bookings/mine')","@Delete('bookings/:bookingId')","@Get('bookings/:bookingId/participants')"]) assert.ok(trips.includes(marker),`Missing protected trip route: ${marker}`);
assert.ok((trips.match(/@UseGuards\(AccessTokenGuard\)/g)||[]).length>=4,'Authenticated trip actions must remain guarded');
assert.ok(access.includes("authorization?.replace(/^Bearer\\s+/i, '')"),'Bearer token extraction guard required');
assert.ok(access.includes('authenticateAccessToken(token)'),'Guard must authenticate token against active account state');
assert.ok(organizationCases.includes("@UseGuards(AccessTokenGuard)"),'Organization customer cases must require an authenticated account');
for(const marker of ["@Controller('organizations/:organizationId/requests')","@Post(':caseId/replies')","@Param('organizationId')"]) assert.ok(organizationCases.includes(marker),`Missing organization-scoped customer case route: ${marker}`);
for(const marker of ["status: 'ACTIVE'","organizationId, accountId, status: 'ACTIVE'","where: { id: caseId, organizationId }"]) assert.ok(customerCases.includes(marker),`Missing organization case authorization invariant: ${marker}`);
assert.ok(customerCases.includes('this.audit.record('),'Organization customer case mutations must be audited');
console.log('Validated protected routes and RBAC invariants for admin, profile, trip operations, and organization customer cases.');
assert.ok(organizationBookings.includes("@UseGuards(AccessTokenGuard)"),'Organization bookings must require an authenticated account');
for(const marker of ["@Controller('organizations/:organizationId/bookings')","@Patch(':bookingId/participants/:participantId')","@Post(':bookingId/cancel')"]) assert.ok(organizationBookings.includes(marker),`Missing organization booking route: ${marker}`);
for(const marker of ["mode === 'organization'","organizationId, accountId, status: 'ACTIVE'","where: { id, status: booking.status, updatedAt: booking.updatedAt }"]) assert.ok(bookingManagement.includes(marker),`Missing organization booking invariant: ${marker}`);
assert.ok(organizationSafety.includes("@UseGuards(AccessTokenGuard)"),'Organization safety reports must require an authenticated account');
assert.ok(organizationSafety.includes("@Controller('organizations/:organizationId/safety/incidents')"),'Missing organization safety report route');
for(const marker of ["where:{id:input.bookingId,organizationId}","bookingId:booking.id,tripId:booking.tripId","organization.safety_incident.reported"]) assert.ok(safetyService.includes(marker),`Missing tenant-scoped safety-report invariant: ${marker}`);
console.log('Validated organization booking lifecycle, roster authorization, and booking-linked safety-report route invariants.');
