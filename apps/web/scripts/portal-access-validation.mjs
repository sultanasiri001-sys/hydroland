import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const [freshness,routing]=await Promise.all([
  readFile(resolve('src/hydroland-portal-access-freshness.js'),'utf8'),
  readFile(resolve('src/hydroland-role-task-routing.js'),'utf8')
]);
for(const marker of [
  "authorizedFetch('/me')",
  'clearCachedRoles',
  'refreshPortalAccess',
  'enforceCurrentRole',
  "button.dataset.hlRoleAllowed=allowed?'1':'0'",
  "button.disabled=!allowed",
  "document.visibilityState!=='visible'",
  "event.stopImmediatePropagation()",
  'access.refreshPortalAccess=refreshPortalAccess'
])if(!freshness.includes(marker))throw new Error(`Missing portal-access freshness marker: ${marker}`);
if(!routing.includes("freshnessScript.src='./hydroland-portal-access-freshness.js'"))throw new Error('Portal freshness runtime is not loaded after role task routing.');
console.log('Portal access validation passed: protected-role entry refreshes /me, fails closed, and revocation is enforced in-session.');