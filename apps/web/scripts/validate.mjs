import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const [html, app] = await Promise.all([
  readFile(path.join(src, 'index.html'), 'utf8'),
  readFile(path.join(src, 'app.js'), 'utf8')
]);

const roles = ['diver','instructor','center','boat','organization','admin'];
const required = ['lang="ar"','dir="rtl"','viewport','aria-live','skip-link','HYDROLAND'];
for (const marker of required) if (!html.includes(marker)) throw new Error(`Missing shell marker: ${marker}`);
for (const role of roles) if (!html.includes(`data-role="${role}"`)) throw new Error(`Missing role selector: ${role}`);
if (html.includes('GHAWAS') || html.includes('<title>غوّاص') || html.includes('>غوّاص<')) throw new Error('Legacy platform branding remains in index.html');
for (const approved of ['محترفي الغوص','الوساطة البحرية']) if (!html.includes(approved) || !app.includes(approved)) throw new Error(`Missing approved portal terminology: ${approved}`);
for (const legacy of ['مدرب محترف','صاحب قارب','واجهة المدرب المحترف','لوحة مشغل القارب']) if (html.includes(legacy) || app.includes(legacy)) throw new Error(`Legacy portal terminology remains: ${legacy}`);

const mobileNav = html.match(/<nav class="mobile-nav"[\s\S]*?<\/nav>/)?.[0] || '';
for (const marker of ['href="#home"','>الرئيسية<','href="#trips"','>الرحلات<','href="#community"','>المجتمع<','>الرسائل<','id="profile-open-mobile"','>حسابي<']) if (!mobileNav.includes(marker)) throw new Error(`Missing approved mobile navigation item: ${marker}`);
if (!/disabled[^>]*[\s\S]*?>الرسائل</.test(mobileNav)) throw new Error('Messages control must remain fail-closed in static HTML until messaging runtime loads');
if (mobileNav.includes('>اكتشف<') || mobileNav.includes('>أنشطتي<')) throw new Error('Legacy mobile navigation labels remain');

for (const id of ['top-search','top-notifications','profile-open']) if (!html.includes(`id="${id}"`)) throw new Error(`Missing explicit top-bar control: ${id}`);
const accountCenter = await readFile(path.join(src, 'hydroland-account-center.js'), 'utf8');
if (!app.includes("const topSearch=$('top-search')")) throw new Error('Search must bind by explicit top-search id');
if (!accountCenter.includes("getElementById('top-notifications')")) throw new Error('Notifications must bind by explicit top-notifications id');
for (const fragile of ["querySelector('.top-actions .icon-button:not([data-hl-theme-button])')","querySelectorAll('.top-actions .icon-button')","topActions[1]"]) if (app.includes(fragile) || accountCenter.includes(fragile)) throw new Error(`Fragile positional top-bar binding remains: ${fragile}`);

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicates.length) throw new Error(`Duplicate HTML ids: ${[...new Set(duplicates)].join(', ')}`);

const entries = await readdir(src, { withFileTypes: true });
const cssFiles = entries.filter(entry => entry.isFile() && entry.name.endsWith('.css')).map(entry => entry.name);
const css = (await Promise.all(cssFiles.map(name => readFile(path.join(src, name), 'utf8')))).join('\n');
for (const token of ['@media','prefers-reduced-motion',':focus-visible']) if (!css.includes(token)) throw new Error(`Missing responsive/accessibility rule: ${token}`);

const jsFiles = entries.filter(entry => entry.isFile() && entry.name.endsWith('.js')).map(entry => entry.name);
for (const name of jsFiles) {
  const code = await readFile(path.join(src, name), 'utf8');
  try { new Function(code.replace(/^export .*$/gm,'')); }
  catch (error) { throw new Error(`JavaScript syntax error in ${name}: ${error.message}`); }
}

const roleDashboard = await readFile(path.join(src, 'hydroland-role-dashboards.js'), 'utf8');
for (const marker of ['connectControl','قيد الربط بالخدمة',"node.disabled=true","aria-disabled"]) if (!roleDashboard.includes(marker)) throw new Error(`Missing role-control integrity marker: ${marker}`);
if (roleDashboard.includes("forEach(x=>x.addEventListener('click',()=>go(x)))")) throw new Error('Legacy unguarded role action binding remains');
for (const gate of ["window.HydrolandPortalAccess?.roleAllowed?.(role)","hydroland:portal-cleared","hydroland:auth-changed"]) if (!roleDashboard.includes(gate)) throw new Error(`Missing fail-closed role dashboard gate: ${gate}`);
for (const gate of ["if(!window.HydrolandAuth?.isAuthenticated?.())return role==='diver'","clearProtectedPortal","window.HydrolandProfileData=undefined"]) if (!app.includes(gate)) throw new Error(`Missing portal/session isolation gate: ${gate}`);

if (!html.includes('data-hl-action="logout"')) throw new Error('Missing visible logout control');
const [authModule, emailVerificationModule, googleAuthModule, experienceModule] = await Promise.all([
  readFile(path.join(src, 'hydroland-auth.js'), 'utf8'),
  readFile(path.join(src, 'hydroland-email-verification.js'), 'utf8'),
  readFile(path.join(src, 'hydroland-google-auth.js'), 'utf8'),
  readFile(path.join(src, 'hydroland-experience.js'), 'utf8')
]);
for (const marker of ["if(!accessToken||!refreshToken)","clearSession();throw new Error('استجابة الجلسة غير صالحة')","const isAuthenticated=()=>Boolean(sessionStorage.getItem('hl-refresh-token'))","showLogin('انتهت الجلسة، سجّل الدخول من جديد')","data-hl-action=\"logout\"","keepalive:true"]) if (!authModule.includes(marker)) throw new Error(`Missing fail-closed session marker: ${marker}`);
if (authModule.includes("body?.accessToken||''") || authModule.includes("body?.refreshToken||''")) throw new Error('Authentication must not store empty token fallbacks');
for (const marker of ["clearProtectedView","window.HydrolandProfileData=undefined","window.addEventListener('pageshow'","clearSession();clearProtectedView();","setTimeout(emitAuthChanged,0)","showLogin=message=>{sessionStorage.removeItem('hl-guest-mode');clearProtectedView()"] ) if (!authModule.includes(marker)) throw new Error(`Missing browser/session closure marker: ${marker}`);
for (const marker of ["const isGuestMode=()=>sessionStorage.getItem('hl-guest-mode')==='1'","if(isGuestMode()){state.panelOpen=false;state.mfaChallenge=null;root.classList.add('hidden');return}","state.panelOpen=true","actions.hidden=state.panelOpen","panel.hidden=!state.panelOpen","sessionStorage.removeItem('hl-guest-mode')","isGuestMode,refreshSession","if(!sessionStorage.getItem('hl-refresh-token'))throw new Error('AUTH_REQUIRED')"]) if (!authModule.includes(marker)) throw new Error(`Missing explicit anonymous/guest/auth-panel boundary: ${marker}`);
for(const marker of ["mfaChallenge:null","data-mfa-field","`${API_BASE}/auth/mfa/verify`","body?.mfaRequired===true","challengeToken:state.mfaChallenge","state.mfaChallenge=null","/auth/mfa/totp/setup","/auth/mfa/totp/confirm","/auth/mfa/disable","data-hl-action=\"mfa-settings\""]) if(!authModule.includes(marker)) throw new Error(`Missing MFA browser boundary: ${marker}`);
if(/sessionStorage\.setItem\([^\n]*mfa/i.test(authModule))throw new Error('MFA challenge must not be persisted in sessionStorage.');

for(const marker of ["const prefix='#verify-email='","history.replaceState(null,'',location.pathname+location.search)","/auth/email-verification/verify","/auth/email-verification/resend","data.emailVerificationResend='1'","delivery==='UNAVAILABLE'","window.HydrolandEmailVerification"])if(!emailVerificationModule.includes(marker))throw new Error(`Missing email verification browser boundary: ${marker}`);
if(emailVerificationModule.includes('?verify-email='))throw new Error('Email verification tokens must not be placed in query strings.');
if(/(?:localStorage|sessionStorage)\.setItem\([^\n]*(verify|email.*token|token.*email)/i.test(emailVerificationModule))throw new Error('Email verification token must not be persisted in browser storage.');
const clearFragmentAt=emailVerificationModule.indexOf("history.replaceState(null,'',location.pathname+location.search)"),verifyRequestAt=emailVerificationModule.indexOf('/auth/email-verification/verify');
if(clearFragmentAt<0||verifyRequestAt<0||clearFragmentAt>verifyRequestAt)throw new Error('Email verification fragment must be cleared before the verification request is sent.');

for(const marker of ["https://accounts.google.com/gsi/client","/auth/google/config","/auth/google`","window.google.accounts.id.initialize","window.google.accounts.id.renderButton","data-hl-google-signin","challengeToken=null","/auth/mfa/verify","sessionStorage.setItem('hl-access-token'","sessionStorage.setItem('hl-refresh-token'"])if(!googleAuthModule.includes(marker))throw new Error(`Missing Google sign-in browser boundary: ${marker}`);
if(/sessionStorage\.setItem\([^\n]*(credential|challenge)/i.test(googleAuthModule))throw new Error('Google credential or MFA challenge must not be persisted in sessionStorage.');
if(!app.includes("await loadScript('hydroland-email-verification.js')"))throw new Error('Email verification module must load after core authentication.');
if(!app.includes("await loadScript('hydroland-google-auth.js')"))throw new Error('Google sign-in module must load after core authentication.');
for (const marker of ["sessionStorage.setItem('hl-guest-mode','1')","hydroland:guest-mode"]) if (!experienceModule.includes(marker)) throw new Error(`Missing guest entry marker: ${marker}`);

const profileData = await readFile(path.join(src, 'hydroland-profile-data.js'), 'utf8');
for (const marker of ['hl-profile-editor','openProfileEditor','new FormData(form)',"request('/me',{method:'PATCH'"]) if (!profileData.includes(marker)) throw new Error(`Missing professional profile editor marker: ${marker}`);
if (/\bprompt\s*\(/.test(profileData)) throw new Error('Profile editing must not use prompt()');

for (const moduleName of ['hydroland-auth.js','hydroland-email-verification.js','hydroland-google-auth.js','hydroland-bookings.js','hydroland-map.js','hydroland-profile-data.js','hydroland-messages.js','hydroland-dive-logs.js']) {
  if (!app.includes(moduleName)) throw new Error(`Missing frontend module loader: ${moduleName}`);
}
if(!app.includes('hydroland-messages.css'))throw new Error('Missing messaging stylesheet loader');
const messagesModule=await readFile(path.join(src,'hydroland-messages.js'),'utf8');
for(const marker of ["mobile.disabled=false","button.id='top-messages'","/messages/conversations","kind:'TEXT'","kind:'VOICE'","sessionStorage.removeItem('hl-guest-mode')","audio controls"])if(!messagesModule.includes(marker))throw new Error(`Missing connected messaging UI boundary: ${marker}`);
if(messagesModule.includes('MediaRecorder')||messagesModule.includes('getUserMedia'))throw new Error('Messaging UI must not claim direct voice capture before object-storage upload is implemented');

const mapModule = await readFile(path.join(src, 'hydroland-map.js'), 'utf8');
for(const marker of ["MAPLIBRE_VERSION='6.11.2'",'cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VERSION}/dist','HydrolandMapLibreTestDouble','MapLibre runtime failed to load','مزود الخرائط غير مفعّل'])if(!mapModule.includes(marker))throw new Error(`Map runtime integrity marker missing: ${marker}`);
if(mapModule.includes('@latest')||mapModule.includes('maplibre-gl@latest'))throw new Error('MapLibre runtime must remain version-pinned.');

console.log(`Validated HYDROLAND shell, six role selectors, ${jsFiles.length} JavaScript modules, ${cssFiles.length} style modules, branding, IDs, responsiveness, accessibility, anonymous/guest/email/MFA/Google auth separation, connected messaging and pinned resilient MapLibre runtime markers.`);
