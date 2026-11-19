
  // Authored interface messages only. Account, provider and document values remain opaque.
  const uiLocale=window.HydrolandI18n?.createScope("membership-pass", {
  "عرض QR": "Show QR",
  "تحميل البطاقة": "Download card",
  "مشاركة البطاقة": "Share card",
  "سجّل الدخول أولًا": "Sign in first",
  "بطاقة حساب داخلية": "Internal account card",
  "حالة الحساب وقت الإصدار: نشط": "Account status when issued: active",
  "حساب عضو": "Member account",
  "QR مؤقت: يلزم تسجيل الدخول وصلاحية التحقق.": "Temporary QR: sign-in and verification permission are required.",
  "تنتهي صلاحية المرجع: ": "Reference expires: ",
  "ليست رخصة غوص أو إثبات لياقة أو اعتمادًا مهنيًا.": "This is not a diving license, proof of fitness or professional accreditation.",
  "بطاقة حساب HYDROLAND": "HYDROLAND account card",
  "إغلاق البطاقة": "Close card",
  "جارٍ التحقق من الحساب...": "Verifying account...",
  "رمز تحقق مؤقت ومحمي لبطاقة الحساب": "Temporary protected account card verification code",
  "هذه بطاقة حساب داخلية، وليست رخصة غوص أو إثبات لياقة أو اعتمادًا مهنيًا. التحقق متاح لصاحب الحساب أو إدارة المنصة المصرح لها فقط.": "This is an internal account card, not a diving license, proof of fitness or professional accreditation. Verification is available only to the account holder or authorized platform administrators.",
  "ينتهي رابط التحقق خلال خمس دقائق أو عند انتهاء جلسة الإصدار. النسخة المحفوظة على الجهاز لا تُسحب عند تسجيل الخروج.": "The verification link expires after five minutes or when the issuing session ends. A copy saved on the device is not withdrawn on sign-out.",
  "أوافق على حفظ نسخة تتضمن الاسم وحالة الحساب، أو مشاركة رابط تحقق مؤقت مع جهة مصرح لها.": "I agree to save a copy containing the name and account status, or to share a temporary verification link with an authorized party.",
  "رابط تحقق مؤقت": "Temporary verification link",
  "إعادة المحاولة": "Retry",
  "حفظ البطاقة PNG": "Save card as PNG",
  "مشاركة رابط التحقق": "Share verification link",
  "انتهت صلاحية المرجع. أعد المحاولة لإصدار بطاقة جديدة.": "The reference has expired. Try again to issue a new card.",
  "سجّل الدخول ثم أعد فتح رابط البطاقة للتحقق منها.": "Sign in, then reopen the card link to verify it.",
  "صلاحية المرجع حتى: ": "Reference valid until: ",
  "تم التحقق من بيانات الحساب. البطاقة ليست اعتمادًا رسميًا.": "Account details verified. The card is not an official accreditation.",
  "المرجع منتهي أو ليست لديك صلاحية التحقق من هذا الحساب.": "The reference has expired, or you are not authorized to verify this account.",
  "تعذر تجهيز البطاقة. أعد المحاولة دون مشاركة أي بيانات.": "Could not prepare the card. Try again without sharing any data.",
  "تم طلب حفظ البطاقة على جهازك. صلاحية التحقق تبقى مؤقتة.": "Saving the card to your device was requested. Verification remains temporary.",
  "مرجع مؤقت؛ يتطلب تسجيل الدخول والصلاحية. ليس رخصة غوص.": "Temporary reference; sign-in and permission required. Not a diving license.",
  "تم تسليم الرابط إلى أداة المشاركة.": "The link was handed to the sharing tool.",
  "تم نسخ رابط التحقق المؤقت.": "Temporary verification link copied.",
  "انسخ الرابط المحدد يدويًا؛ لم تتم مشاركة أي بيانات تلقائيًا.": "Copy the selected link manually. No data was shared automatically.",
  "تم إلغاء المشاركة.": "Sharing cancelled.",
  "تعذرت المشاركة. لم تُرسل البيانات تلقائيًا.": "Could not share. No data was sent automatically.",
  "صلاحية المرجع حتى: {0}": "Reference valid until: {0}",
  "تنتهي صلاحية المرجع:": "Reference expires:",
  "صلاحية المرجع حتى:": "Reference valid until:"
}) || {messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),attribute:(name,text,values=[])=>name+'=\"'+String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))+'\"',message:(text,values=[])=>String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),setMessage:(node,value)=>(node.textContent=value??''),t:value=>value,label:(text,values=[])=>String(text??'').replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};
(async () => {
const [{ membershipQr }, { membershipDeadline }] = await Promise.all([
  import('./hydroland-membership-qr.js'), import('./hydroland-membership-time.js'),
]);

// This is an internal account reference, never a licence or medical clearance.
const auth = () => window.HydrolandAuth;
const actions = [...document.querySelectorAll('.hl-pass > .hl-member-actions > button')].slice(0, 3);
const labels = ['عرض QR', 'تحميل البطاقة', 'مشاركة البطاقة'];
let generation = 0, state = null, timer = null;
const urls = new Set();
const style = document.createElement('style');
style.textContent = `
.hl-membership-dialog{box-sizing:border-box;width:min(96vw,620px);max-height:92dvh;overflow:auto;padding:20px;border:1px solid #39637b;border-radius:18px;background:#092236;color:#edf9ff;font:inherit;direction:inherit}
.hl-membership-dialog::backdrop{background:#020e1cd9}.hl-membership-dialog header,.hl-membership-dialog footer{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.hl-membership-dialog h2{margin:0;font-size:1.2rem}.hl-membership-dialog p{line-height:1.7;overflow-wrap:anywhere}.hl-membership-dialog button{font:inherit;color:inherit;background:#123950;border:1px solid #52758b;border-radius:10px;padding:9px 14px;cursor:pointer}.hl-membership-dialog button:disabled{opacity:.5;cursor:not-allowed}.hl-membership-dialog canvas{display:block;max-width:100%;height:auto;margin:12px auto;background:white}.hl-membership-dialog input[type=text]{box-sizing:border-box;width:100%;font:inherit;direction:ltr;background:#fff;color:#102535}.hl-membership-dialog [data-pass-notice]{color:#c9dbe5}.hl-membership-dialog label{display:flex;align-items:flex-start;gap:8px;margin:14px 0;line-height:1.7}.hl-membership-dialog [hidden]{display:none!important}
`;
document.head.appendChild(style);
function enableActions() { actions.forEach((button, i) => { uiLocale.setText(button, ...[labels[i]]); button.type = 'button'; button.dataset.membershipAction = ['qr', 'card', 'share'][i]; button.disabled = !auth()?.isAuthenticated?.(); if(button.disabled)uiLocale.setAttribute(button,'title','سجّل الدخول أولًا');else button.title=''; }); }
function clear() {
  generation++; clearInterval(timer); timer = null;
  if (state) { state.card.width = 0; state.qr.width = 0; state.dialog.close(); state.dialog.remove(); state = null; }
  for (const url of urls) URL.revokeObjectURL(url); urls.clear();
  enableActions();
}
function current(s) { return state === s && generation === s.generation && s.session === auth()?.getSessionVersion?.() && Boolean(auth()?.isAuthenticated?.()) && s.dialog.open; }
function valid(s) { return current(s) && s.data && performance.now() < s.data.deadline; }
function drawQr(canvas, matrix, scale = 4) {
  canvas.width = canvas.height = (matrix.length + 8) * scale;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('CANVAS_UNAVAILABLE');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#000000';
  matrix.forEach((row, y) => row.forEach((cell, x) => { if (cell) ctx.fillRect((x + 4) * scale, (y + 4) * scale, scale, scale); }));
}
function renderCard(s) {
  const canvas = s.card; canvas.width = 1080; canvas.height = 680;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('CANVAS_UNAVAILABLE');
  ctx.fillStyle = '#092236'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#5bc6d8'; ctx.lineWidth = 4; ctx.strokeRect(16, 16, 1048, 648);
  const english=window.HydrolandI18n?.getLocale()==='en',textX=english?80:1000;
  ctx.textAlign = english?'left':'right'; ctx.direction = english?'ltr':'rtl'; ctx.fillStyle = '#edf9ff'; ctx.font = 'bold 46px sans-serif';
  ctx.fillText('HYDROLAND', textX, 100); ctx.font = 'bold 34px "Noto Sans Arabic", sans-serif';
  ctx.fillText(uiLocale.t('بطاقة حساب داخلية'), textX, 165); ctx.font = '30px "Noto Sans Arabic", sans-serif';
  ctx.fillText(s.data.displayName.slice(0, 48), textX, 245, 610);
  ctx.fillText(uiLocale.t('حالة الحساب وقت الإصدار: نشط'), textX, 305, 610);
  ctx.font = '24px "Noto Sans Arabic", sans-serif'; ctx.fillText(s.data.roles.join(' · ').slice(0, 90) || uiLocale.t('حساب عضو'), textX, 365, 610);
  ctx.drawImage(s.qr, english?735:55, 200, 292, 292);
  ctx.fillStyle = '#c9dbe5'; ctx.font = '22px "Noto Sans Arabic", sans-serif';
  ctx.fillText(uiLocale.t('QR مؤقت: يلزم تسجيل الدخول وصلاحية التحقق.'), textX, 515, 950);
  ctx.fillText(uiLocale.t('تنتهي صلاحية المرجع: ') + new Date(s.data.expiresAt).toLocaleString(english?'en-GB':'ar-SA'), textX, 565, 950);
  ctx.fillText(uiLocale.t('ليست رخصة غوص أو إثبات لياقة أو اعتمادًا مهنيًا.'), textX, 620, 950);
}
function renderExpiry(s){uiLocale.setText(s.dialog.querySelector('[data-pass-expiry]'),'صلاحية المرجع حتى: {0}',[new Date(s.data.expiresAt).toLocaleString(window.HydrolandI18n?.getLocale()==='en'?'en-GB':'ar-SA')])}
document.addEventListener('hydroland:locale-changed',()=>{if(state&&valid(state)){renderExpiry(state);if(state.link)renderCard(state)}});
function normalized(data, requestStartedAt) {
  if (!data || data.cardType !== 'INTERNAL_ACCOUNT_REFERENCE' || data.officialLicence !== false || data.accountStatus !== 'ACTIVE' || typeof data.displayName !== 'string' || !Array.isArray(data.roles) || !data.roles.every(v => typeof v === 'string')) throw new Error('INVALID_PASS');
  return { displayName: data.displayName.slice(0, 161), roles: data.roles.slice(0, 5).map(v => v.slice(0, 80)), expiresAt: data.expiresAt, deadline: membershipDeadline(data, requestStartedAt) };
}
async function request(path, body) {
  if (!auth()?.isAuthenticated?.()) throw new Error('AUTH_REQUIRED');
  const response = await auth().authorizedFetch(path, { method: 'POST', body: JSON.stringify(body || {}) });
  if (!response.ok) throw new Error(response.status === 403 ? 'FORBIDDEN' : response.status === 401 ? 'AUTH_REQUIRED' : 'PASS_UNAVAILABLE');
  return response.json();
}
function makeDialog() {
  clear(); const dialog = document.createElement('dialog'); dialog.className = 'hl-membership-dialog'; dialog.id = 'hl-membership-pass';
  dialog.setAttribute('aria-labelledby', 'hl-pass-title');
  uiLocale.setHTML(dialog, uiLocale.html`<header><h2 id="hl-pass-title">بطاقة حساب HYDROLAND</h2><button type="button" data-pass-close aria-label="إغلاق البطاقة">×</button></header><p data-pass-status role="status" aria-live="polite">جارٍ التحقق من الحساب...</p><div data-pass-content hidden><h3 data-pass-name></h3><p data-pass-roles></p><canvas data-pass-qr role="img" aria-label="رمز تحقق مؤقت ومحمي لبطاقة الحساب"></canvas><p data-pass-expiry></p></div><p data-pass-notice>هذه بطاقة حساب داخلية، وليست رخصة غوص أو إثبات لياقة أو اعتمادًا مهنيًا. التحقق متاح لصاحب الحساب أو إدارة المنصة المصرح لها فقط.</p><p>ينتهي رابط التحقق خلال خمس دقائق أو عند انتهاء جلسة الإصدار. النسخة المحفوظة على الجهاز لا تُسحب عند تسجيل الخروج.</p><label data-pass-consent-row hidden><input type="checkbox" data-pass-consent>أوافق على حفظ نسخة تتضمن الاسم وحالة الحساب، أو مشاركة رابط تحقق مؤقت مع جهة مصرح لها.</label><input type="text" data-pass-link readonly hidden aria-label="رابط تحقق مؤقت"><footer><button type="button" data-pass-retry>إعادة المحاولة</button><button type="button" data-pass-download hidden disabled>حفظ البطاقة PNG</button><button type="button" data-pass-share hidden disabled>مشاركة رابط التحقق</button></footer>`);
  document.body.appendChild(dialog);
  const s = { dialog, generation, session: auth()?.getSessionVersion?.(), data: null, link: '', qr: dialog.querySelector('[data-pass-qr]'), card: document.createElement('canvas') };
  state = s;
  dialog.querySelector('[data-pass-close]').addEventListener('click', clear);
  dialog.addEventListener('cancel', event => { event.preventDefault(); clear(); });
  dialog.addEventListener('close', () => { if (state === s && !dialog.open) clear(); });
  if (window.HydrolandUI?.openDialog) window.HydrolandUI.openDialog(dialog); else dialog.showModal();
  return s;
}
function message(s, text) { if (state === s) uiLocale.setMessage(s.dialog.querySelector('[data-pass-status]'), text); }
function expire(s) {
  if (!current(s)) { if (state === s) clear(); return; }
  if (s.data && performance.now() >= s.data.deadline) {
    s.data = null; s.link = ''; s.card.width = s.qr.width = 0;
    s.dialog.querySelector('[data-pass-content]').hidden = true;
    s.dialog.querySelector('[data-pass-link]').value = '';
    for (const button of s.dialog.querySelectorAll('[data-pass-download],[data-pass-share]')) button.disabled = true;
    message(s, uiLocale.message('انتهت صلاحية المرجع. أعد المحاولة لإصدار بطاقة جديدة.'));
  }
}
async function prepare(s, reference) {
  const retry = s.dialog.querySelector('[data-pass-retry]'); retry.disabled = true;
  try {
    if (!auth()?.isAuthenticated?.()) { message(s, uiLocale.message('سجّل الدخول ثم أعد فتح رابط البطاقة للتحقق منها.')); return; }
    const requestStartedAt = performance.now();
    const raw = await request(reference ? '/me/membership-pass/verify' : '/me/membership-pass', reference ? { reference } : {});
    if (!current(s)) return;
    s.data = normalized(raw, requestStartedAt);
    s.dialog.querySelector('[data-pass-name]').textContent = s.data.displayName;
    uiLocale.setMessage(s.dialog.querySelector('[data-pass-roles]'),s.data.roles.join(' · ') || uiLocale.message('حساب عضو'));
    renderExpiry(s);
    if (!reference) {
      if (typeof raw.reference !== 'string' || !/^hlm1\.[A-Za-z0-9_-]{1,395}$/.test(raw.reference)) throw new Error('INVALID_PASS');
      // Fragment values are not sent in HTTP requests or referrers. No identity,
      // token or reference is written to browser storage or a QR provider.
      s.link = new URL('/#membership-pass=' + raw.reference, location.origin).href;
      drawQr(s.qr, membershipQr(s.link));
      await document.fonts.ready;
      if (!valid(s)) { expire(s); return; }
      renderCard(s);
      s.dialog.querySelector('[data-pass-consent-row]').hidden = false;
      for (const button of s.dialog.querySelectorAll('[data-pass-download],[data-pass-share]')) button.hidden = false;
    } else s.qr.hidden = true;
    s.dialog.querySelector('[data-pass-content]').hidden = false;
    message(s, uiLocale.message('تم التحقق من بيانات الحساب. البطاقة ليست اعتمادًا رسميًا.'));
    timer = setInterval(() => expire(s), 500);
  } catch (error) {
    if (current(s)) {
      s.data = null; s.link = ''; s.card.width = s.qr.width = 0;
      s.dialog.querySelector('[data-pass-content]').hidden = true;
      message(s, error?.message === 'PASS_EXPIRED'?uiLocale.message('انتهت صلاحية المرجع. أعد المحاولة لإصدار بطاقة جديدة.'):error?.message === 'FORBIDDEN'?uiLocale.message('المرجع منتهي أو ليست لديك صلاحية التحقق من هذا الحساب.'):uiLocale.message('تعذر تجهيز البطاقة. أعد المحاولة دون مشاركة أي بيانات.'));
    }
  } finally { if (state === s) retry.disabled = false; }
}
function open(reference = '') {
  const s = makeDialog();
  s.dialog.querySelector('[data-pass-retry]').addEventListener('click', () => { clearInterval(timer); s.data = null; s.link = ''; s.dialog.querySelector('[data-pass-consent]').checked = false; for (const b of s.dialog.querySelectorAll('[data-pass-download],[data-pass-share]')) b.disabled = true; void prepare(s, reference); });
  s.dialog.querySelector('[data-pass-consent]').addEventListener('change', event => { for (const button of s.dialog.querySelectorAll('[data-pass-download],[data-pass-share]')) button.disabled = !event.target.checked || !valid(s); });
  s.dialog.querySelector('[data-pass-download]').addEventListener('click', () => {
    if (!valid(s) || !s.dialog.querySelector('[data-pass-consent]').checked) { expire(s); return; }
    s.card.toBlob(blob => {
      if (!blob || !valid(s) || !s.dialog.querySelector('[data-pass-consent]').checked) return;
      const url = URL.createObjectURL(blob); urls.add(url); const link = document.createElement('a');
      link.href = url; link.download = 'HYDROLAND-account-card.png'; document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => { URL.revokeObjectURL(url); urls.delete(url); }, 1000);
      message(s, uiLocale.message('تم طلب حفظ البطاقة على جهازك. صلاحية التحقق تبقى مؤقتة.'));
    }, 'image/png');
  });
  s.dialog.querySelector('[data-pass-share]').addEventListener('click', async () => {
    if (!valid(s) || !s.dialog.querySelector('[data-pass-consent]').checked) { expire(s); return; }
    const link = s.link;
    try {
      // Called directly from the user click, after preparation, retaining the
      // transient activation required by the native share sheet.
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: uiLocale.t('بطاقة حساب HYDROLAND'), text: uiLocale.t('مرجع مؤقت؛ يتطلب تسجيل الدخول والصلاحية. ليس رخصة غوص.'), url: link });
        if (valid(s)) message(s, uiLocale.message('تم تسليم الرابط إلى أداة المشاركة.'));
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link); if (valid(s)) message(s, uiLocale.message('تم نسخ رابط التحقق المؤقت.'));
      } else {
        const field = s.dialog.querySelector('[data-pass-link]'); field.value = link; field.hidden = false; field.select();
        message(s, uiLocale.message('انسخ الرابط المحدد يدويًا؛ لم تتم مشاركة أي بيانات تلقائيًا.'));
      }
    } catch (error) {
      if (valid(s)) message(s, error?.name === 'AbortError'?uiLocale.message('تم إلغاء المشاركة.'):uiLocale.message('تعذرت المشاركة. لم تُرسل البيانات تلقائيًا.'));
    }
  });
  void prepare(s, reference);
}
actions.forEach(button => button.addEventListener('click', () => { if (auth()?.isAuthenticated?.()) open(); }));
document.addEventListener('hydroland:session-cleared', clear);
document.addEventListener('hydroland:auth-changed', clear);
window.addEventListener('pagehide', clear);
// Some mobile engines pause monotonic time during suspension. Discard the
// preview on backgrounding; require a new server response after returning.
document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
function scanHash() {
  const prefix = '#membership-pass='; if (!location.hash.startsWith(prefix)) return;
  const reference = location.hash.slice(prefix.length);
  history.replaceState(history.state, '', location.pathname + location.search);
  if (/^hlm1\.[A-Za-z0-9_-]{1,395}$/.test(reference)) open(reference);
}
window.addEventListener('hashchange', scanHash);
enableActions(); scanHash();
window.HydrolandMembership = Object.freeze({ open: () => { if (auth()?.isAuthenticated?.()) open(); } });

})().catch(() => { /* Keep the static controls disabled if the module cannot load. */ });
