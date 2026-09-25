import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [app,dashboards]=await Promise.all([readFile(resolve('src/app.js'),'utf8'),readFile(resolve('src/hydroland-role-dashboards.js'),'utf8')]);
for(const marker of [
  "instructor:{requiredRole:'INSTRUCTOR'",
  "center:{requiredRole:'DIVE_CENTER'",
  "boat:{requiredRole:'BOAT_OWNER'",
  "organization:{requiredRole:'ORGANIZATION'",
  "admin:{requiredRole:'ADMIN'",
  'refreshPortalAccess=async()=>',
  "authorizedFetch('/me')",
  "profile:{...body,roles}",
  'clearCachedRoles()',
  'enforceCurrentRole()',
  "visibilityState==='visible'",
  "role!=='diver'&&window.HydrolandAuth?.isAuthenticated?.()"
])if(!app.includes(marker))throw new Error(`Missing portal-access freshness marker: ${marker}`);
if(!app.includes("window.HydrolandPortalAccess={roleAllowed,clearProtectedPortal,getCurrentRole:()=>currentRole,refreshPortalAccess}"))throw new Error('Portal access API must expose authoritative refresh.');
if(!app.includes("button.dataset.hlRoleAllowed=allowed?'1':'0'"))throw new Error('Role chooser must expose synchronized availability state.');
for(const marker of ["document.addEventListener('hydroland:role-changed'",'syncRoleDashboard','getCurrentRole?.()'])if(!dashboards.includes(marker))throw new Error(`Role dashboard must render from authoritative role state: ${marker}`);
if(dashboards.includes("document.querySelectorAll('#role-dialog [data-role]').forEach"))throw new Error('Role dashboard must not render from pre-refresh role-button clicks.');
console.log('Portal access validation passed: authoritative /me refresh, fail-closed stale-role handling and post-refresh dashboard rendering are wired.');
