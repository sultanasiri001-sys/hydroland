import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(path.join(root,p),'utf8');
const [adminGuard,admin,tripAdmin,trips,profile,access]=await Promise.all([
  read('src/admin/admin.guard.ts'),read('src/admin/admin.controller.ts'),read('src/trips/trip-admin.controller.ts'),
  read('src/trips/trips.controller.ts'),read('src/profile/profile.controller.ts'),read('src/auth/access-token.guard.ts')
]);

for(const source of [admin,tripAdmin]) assert.ok(source.includes('@UseGuards(AccessTokenGuard,AdminGuard)')||source.includes('@UseGuards(AccessTokenGuard, AdminGuard)'),'Admin controller must require auth + admin guard');
for(const marker of ["role:'ADMIN'","status:'ACTIVE'","Admin scope required."]) assert.ok(adminGuard.includes(marker),`Missing admin RBAC invariant: ${marker}`);
assert.ok(profile.includes('@UseGuards(AccessTokenGuard)'),'Profile must be protected');
for(const marker of ["@Post(':id/bookings')","@Get('bookings/mine')","@Delete('bookings/:bookingId')","@Get('bookings/:bookingId/participants')"]) assert.ok(trips.includes(marker),`Missing protected trip route: ${marker}`);
assert.ok((trips.match(/@UseGuards\(AccessTokenGuard\)/g)||[]).length>=4,'Authenticated trip actions must remain guarded');
assert.ok(access.includes("authorization?.startsWith('Bearer ')"),'Bearer token guard required');
assert.ok(access.includes('authenticateAccessToken(token)'),'Guard must authenticate token against active account state');
console.log('Validated protected routes and RBAC invariants for admin, profile and authenticated trip operations.');
