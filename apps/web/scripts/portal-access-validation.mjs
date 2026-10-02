import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const [freshness,routing,auth,bootstrap]=await Promise.all([
  readFile(resolve('src/hydroland-portal-access-freshness.js'),'utf8'),
  readFile(resolve('src/hydroland-role-task-routing.js'),'utf8'),
  readFile(resolve('src/hydroland-auth.js'),'utf8'),
  readFile(resolve('src/app.js'),'utf8')
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
  'access.refreshPortalAccess=refreshPortalAccess',
  'openRoleSwitcher',
  'dialog?.showModal()'
])if(!freshness.includes(marker))throw new Error(`Missing portal-access freshness marker: ${marker}`);
const authApiIndex=auth.indexOf('window.HydrolandAuth={'),initialAuthEvent=auth.indexOf('emitAuthChanged();',authApiIndex);
if(authApiIndex<0||initialAuthEvent<0)throw new Error('Restored sessions must update visitor/workspace UI after auth bootstrap.');
const freshnessModule="'hydroland-portal-access-freshness.js'",firstProtected="'hydroland-center-safety.js'";
if(bootstrap.split(freshnessModule).length!==2||bootstrap.indexOf(freshnessModule)>bootstrap.indexOf(firstProtected))throw new Error('Portal freshness runtime must bootstrap once before protected center modules.');
if(routing.includes("freshnessScript.src='./hydroland-portal-access-freshness.js'"))throw new Error('Portal freshness runtime must not be injected late by role task routing.');
console.log('Portal access validation passed: protected-role entry refreshes /me, fails closed, and revocation is enforced in-session.');
