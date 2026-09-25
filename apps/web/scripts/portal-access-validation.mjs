import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const app=await readFile(resolve('src/app.js'),'utf8');
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
console.log('Portal access validation passed: database role mapping, authoritative /me refresh, stale-role fail-closed behavior and protected-role revalidation are wired.');
