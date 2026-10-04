import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const [dashboards,routing,bootstrap,...centerModules]=await Promise.all([
  readFile(resolve('src/hydroland-role-dashboards.js'),'utf8'),
  readFile(resolve('src/hydroland-role-task-routing.js'),'utf8'),
  readFile(resolve('src/app.js'),'utf8'),
  ...['safety','documents','equipment','customers','operations','team','reports'].map(name=>readFile(resolve(`src/hydroland-center-${name}.js`),'utf8'))
]);
for(const marker of [
  'authorizeRoleAction',
  'access.authorizeRole',

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
  'access.authorizeRole',

  'button.onclick=async()=>'
])if(!routing.includes(marker))throw new Error(`Missing role-console action authorization marker: ${marker}`);
if(bootstrap.split("'hydroland-portal-access-freshness.js'").length!==2||bootstrap.indexOf("'hydroland-portal-access-freshness.js'")>bootstrap.indexOf("'hydroland-center-safety.js'"))throw new Error('Portal freshness must bootstrap once before protected center modules.');
for(const [module,label] of [["'hydroland-center-safety.js'",'Center safety'],["'hydroland-center-documents.js'",'Center documents'],["'hydroland-center-equipment.js'",'Center equipment'],["'hydroland-center-customers.js'",'Center customers'],["'hydroland-center-business-profile.js'",'Center business profile'],["'hydroland-center-operations.js'",'Center operations'],["'hydroland-center-bookings.js'",'Center bookings'],["'hydroland-center-team.js'",'Center team']])if(bootstrap.split(module).length!==2||bootstrap.indexOf(module)>bootstrap.indexOf("'hydroland-role-dashboards.js'"))throw new Error(label+' must be registered once in the real bootstrap before dashboard actions.');
for(const marker of [
  "if(role==='center'&&label==='السلامة')return 'center-safety'",
  "if(role==='center'&&label==='المستندات والتراخيص')return 'center-documents'",
  "if(role==='center'&&label==='المعدات والمخزون')return 'center-equipment'",
  "if(role==='center'&&label==='العملاء')return 'center-customers'",
  "if(role==='center'&&label==='إدارة الحجوزات')return 'center-bookings'",
  "if(role==='center'&&label==='الرحلات')return 'center-operations'",
  "if(role==='center'&&label==='محترفي الغوص')return 'center-team'",
  "if(role==='center'&&['السلامة','تقارير السلامة'].includes(label))return 'center-safety'",
  'id=actionRoute(role,label,node.dataset.route)',
  "if(activeRole==='center'&&['center-safety','center-documents','center-equipment','center-customers','center-business-profile','center-operations','center-bookings','center-team','center-reports'].includes(route))"
])if(!dashboards.includes(marker))throw new Error(`Missing scoped center route marker: ${marker}`);
if(!dashboards.includes("const trainingTarget=document.querySelector('.hl-training');window.HydrolandWorkspaceUI?.show?.(trainingTarget)"))throw new Error('Managed instructor training must route to the actual .hl-training service node.');
if(!dashboards.includes("target=professionalTraining?document.querySelector('.hl-training'):targetFor(resolvedId)"))throw new Error('Professional training availability must be evaluated against the managed .hl-training service node.');
if(!dashboards.includes("available=professionalTraining?Boolean(target&&window.HydrolandPortalAccess?.roleAllowed?.('instructor'))"))throw new Error('Professional training capability must not depend on current workspace visibility.');
if(!dashboards.includes("resolvedId=['training-schedule','training-skills','training-certificates','training-earnings'].includes(id)?'training':id,target=targetFor(resolvedId)"))throw new Error('Portal nav must resolve scoped training routes before the target existence guard.');
if(!dashboards.includes("controllerRoute=route==='professional-profile'||['training-schedule','training-skills','training-certificates','training-earnings'].includes(route)"))throw new Error('Controller-owned portal routes must bypass the generic DOM target guard.');
for(const marker of [
  "if(role==='instructor'&&label==='الجدول الزمني')return 'training-schedule'",
  "if(role==='instructor'&&label==='التقييمات')return 'training-skills'",
  "if(role==='instructor'&&label==='الشهادات')return 'training-certificates'",
  "if(role==='instructor'&&label==='الإيرادات')return 'training-earnings'",
  "if(role==='instructor'&&label==='الملف المهني')return 'professional-profile'"
])if(!dashboards.includes(marker))throw new Error(`Missing scoped professional route marker: ${marker}`);
for(const [index,source] of centerModules.entries()){
  const name=['safety','documents','equipment','customers','operations','team','reports'][index];
  const authorizationCalls=name==='safety'?['if(!await authorize(host,session,()=>v===listVersion))return','if(!await authorize(host,session,()=>v===detailVersion))return','if(!await authorize(host,session,()=>v===composeVersion))return']:['if(!(await authorize(host,version,session)))return'];
  for(const marker of ['async function authorize','access()?.authorizeRole',...authorizationCalls])if(!source.includes(marker))throw new Error(`Center ${name} must refresh authoritative role state before scoped reads: missing ${marker}`);
  for(const marker of ['getSessionVersion','hydroland:session-cleared','hydroland:portal-cleared'])if(!source.includes(marker))throw new Error(`Center ${name} must fence session/workspace lifecycle: missing ${marker}`);
}
const freshness=await readFile(resolve('src/hydroland-portal-access-freshness.js'),'utf8');
for(const marker of ['const authorizeRole=async(role,context={})=>','await refreshPortalAccess()','session===auth.getSessionVersion?.()','access.authorizeRole=authorizeRole','HydrolandPortalFreshness={refresh:refreshPortalAccess,authorizeRole'])if(!freshness.includes(marker))throw new Error(`Missing centralized portal authorization marker: ${marker}`);
const workspace=await readFile(resolve('src/hydroland-workspace-ui.js'),'utf8'),workspaceCss=await readFile(resolve('src/hydroland-workspace-ui.css'),'utf8');
if(!workspace.includes("while(serviceRoot.parentElement&&serviceRoot.parentElement!==main)serviceRoot=serviceRoot.parentElement"))throw new Error('Managed training must resolve its real direct child service root under #main.');
if(!workspace.includes("const show=target=>{\n    if(!auth()||!target)return false;\n    setWorkspace();"))throw new Error('Workspace show must refresh role policy before checking service visibility.');
if(!workspace.includes("if(selected?.isConnected&&isAuthed)"))throw new Error('Workspace policy refresh must preserve the selected managed service.');
for(const marker of ["data-hl-workspace-service","hl-training-service","hl-managed-service-root"])if(!workspace.includes(marker)&&!workspaceCss.includes(marker))throw new Error(`Missing managed professional training workspace marker: ${marker}`);
console.log('Portal action authorization validation passed: centralized role authorization, registered scoped center modules and normalized action aliases.');

if(!bootstrap.includes("'hydroland-center-reports.js'")||!dashboards.includes("if(role==='center'&&label==='التقارير')return 'center-reports'"))throw new Error('Center reports must use scoped bootstrap and routing.');
