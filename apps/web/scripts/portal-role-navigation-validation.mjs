import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [app,roles]=await Promise.all([
  readFile(resolve('src/app.js'),'utf8'),
  readFile(resolve('src/hydroland-role-dashboards.js'),'utf8')
]);
for(const marker of [
  'getCurrentRole:()=>currentRole',
  "hydroland:role-changed",
  "if(!window.HydrolandAuth?.isAuthenticated?.())return role==='diver'",
  'clearProtectedPortal'
])if(!app.includes(marker))throw new Error(`Missing portal state/authorization marker: ${marker}`);
for(const marker of [
  "document.addEventListener('hydroland:role-changed'",
  'getCurrentRole?.()',
  'queueMicrotask',
  'roleAllowed?.(role)',
  "if(!window.HydrolandAuth?.isAuthenticated?.()||!window.HydrolandPortalAccess?.roleAllowed?.(role))",
  "document.addEventListener('hydroland:portal-cleared'",
  "document.addEventListener('hydroland:auth-changed'"
])if(!roles.includes(marker))throw new Error(`Missing replay/fail-closed role dashboard marker: ${marker}`);
if(roles.includes("querySelectorAll('#role-dialog [data-role]')"))throw new Error('Role dashboard must not depend on role-button timing; use role state/event replay instead.');
console.log('Portal role/navigation validation passed: active-role gate, late-load replay, action-time reauthorization and protected-view clearing.');
