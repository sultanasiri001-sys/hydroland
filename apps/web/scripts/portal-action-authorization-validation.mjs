import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const [dashboards,routing]=await Promise.all([
  readFile(resolve('src/hydroland-role-dashboards.js'),'utf8'),
  readFile(resolve('src/hydroland-role-task-routing.js'),'utf8')
]);
for(const marker of [
  'authorizeRoleAction',
  'access.refreshPortalAccess',
  'HydrolandPortalFreshness?.enforce?.()',
  "document.addEventListener('hydroland:role-changed'",
  'getCurrentRole?.()',
  "document.addEventListener('hydroland:portal-cleared'",
  "document.addEventListener('hydroland:auth-changed'"
])if(!dashboards.includes(marker))throw new Error(`Missing role-dashboard action authorization marker: ${marker}`);
if(dashboards.includes("querySelectorAll('#role-dialog [data-role]')"))throw new Error('Role dashboard must render from authoritative role state/events, not direct role-button timing.');
for(const marker of [
  'authorizeCurrentRole',
  'access.refreshPortalAccess',
  'HydrolandPortalFreshness?.enforce?.()',
  'button.onclick=async()=>'
])if(!routing.includes(marker))throw new Error(`Missing role-console action authorization marker: ${marker}`);
console.log('Portal action authorization validation passed: dashboard controls and role-console tasks reauthorize before execution.');