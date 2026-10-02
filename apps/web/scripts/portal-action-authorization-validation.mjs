import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const [dashboards,routing,bootstrap]=await Promise.all([
  readFile(resolve('src/hydroland-role-dashboards.js'),'utf8'),
  readFile(resolve('src/hydroland-role-task-routing.js'),'utf8'),
  readFile(resolve('src/app.js'),'utf8')
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
  "if(label==='المستندات والتراخيص')return role==='boat'?'marine-documents':'documents'",
  "['المستندات والتراخيص','documents'",
  "'marine-documents':'#hl-marine-documents'",
  'HydrolandMarineDocuments?.open?.(role)',
  'new MutationObserver',
  "d.querySelectorAll('[data-hl-route]')"
])if(!dashboards.includes(marker))throw new Error(`Missing dynamic portal-service route marker: ${marker}`);
if(dashboards.includes("['المستندات والتراخيص','community'"))throw new Error('Portal document controls must not route to the community section.');
for(const marker of [
  'authorizeCurrentRole',
  'access.refreshPortalAccess',
  'HydrolandPortalFreshness?.enforce?.()',
  'button.onclick=async()=>'
])if(!routing.includes(marker))throw new Error(`Missing role-console action authorization marker: ${marker}`);
for(const [module,label] of [["'hydroland-center-safety.js'",'Center safety'],["'hydroland-center-documents.js'",'Center documents'],["'hydroland-center-equipment.js'",'Center equipment'],["'hydroland-center-customers.js'",'Center customers'],["'hydroland-center-operations.js'",'Center operations'],["'hydroland-center-team.js'",'Center team']])if(bootstrap.split(module).length!==2||bootstrap.indexOf(module)>bootstrap.indexOf("'hydroland-role-dashboards.js'"))throw new Error(label+' must be registered once in the real bootstrap before dashboard actions.');
for(const marker of [
  "if(role==='center'&&label==='السلامة')return 'center-safety'",
  "if(role==='center'&&label==='المستندات والتراخيص')return 'center-documents'",
  "if(role==='center'&&label==='المعدات والمخزون')return 'center-equipment'",
  "if(role==='center'&&label==='العملاء')return 'center-customers'",
  "if(role==='center'&&['إدارة الحجوزات','الرحلات'].includes(label))return 'center-operations'",
  "if(role==='center'&&label==='محترفي الغوص')return 'center-team'",
  "if(role==='center'&&['السلامة','تقارير السلامة'].includes(label))return 'center-safety'",
  'id=actionRoute(role,label,node.dataset.route)',
  "if(activeRole==='center'&&['center-safety','center-documents','center-equipment','center-customers','center-operations','center-team'].includes(route))"
])if(!dashboards.includes(marker))throw new Error(`Missing scoped center route marker: ${marker}`);
console.log('Portal action authorization validation passed: dashboard and console reauthorization, registered scoped center modules and normalized action aliases.');
