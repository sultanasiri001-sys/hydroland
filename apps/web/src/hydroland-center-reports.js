(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = window.HydrolandI18n?.createScope("center-reports", {
  "مؤكد": "Confirmed",
  "بانتظار التأكيد": "Awaiting confirmation",
  "إعادة المحاولة": "Try again",
  "ملغى": "Cancelled",
  "مفتوحة للحجز": "Open for booking",
  "مغلقة للحجز": "Closed for booking",
  "مكتملة": "Completed",
  "DIVE CENTER · مركز الغوص": "DIVE CENTER",
  "غير معروفة": "Unknown",
  "الحجوزات": "Bookings",
  "المركز": "Center",
  "المبلغ": "Amount",
  "عرض التقرير": "View report",
  "محفوظة — غير منشورة": "Saved — unpublished",
  "ملغاة": "Cancelled",
  "الذمم والتحصيل": "Receivables and collections",
  "الحالة": "Status",
  "منشأ": "Created",
  "معلّق": "Pending",
  "مفوّض — لم يُحصّل": "Authorized — not captured",
  "محصّل بحسب السجل": "Captured according to the record",
  "فاشل": "Failed",
  "مسترد بحسب السجل": "Refunded according to the record",
  "تقارير الحجوزات والمدفوعات": "Booking and payment reports",
  "الرحلات والحجوزات وسجلات الدفع المرتبطة بالمركز، حسب موعد بداية الرحلة بتوقيت الرياض.": "Trips, bookings and payment records linked to the center, grouped by trip start date in Riyadh time.",
  "مساحات المالية للمركز": "Center finance workspaces",
  "ورديات المحاسب والإقفالات": "Cashier shifts and closures",
  "التقرير اليومي وإقفالات الورديات والفترات داخل صفحة الورديات. تظهر العمليات المتاحة بحسب صلاحيات حسابك.": "Daily reports and shift and period closures are available on the shifts page. Available actions depend on your account permissions.",
  "من تاريخ": "From date",
  "إلى تاريخ": "To date",
  "الخدمة جارٍ تحميلها. أعد المحاولة.": "The service is loading. Try again.",
  "تعذر فتح مساحة المالية.": "Could not open the finance workspace.",
  "جارٍ إعداد التقرير…": "Preparing report…",
  "تعذر تحميل التقرير.": "Could not load the report.",
  "استجابة التقرير غير مكتملة.": "The report response is incomplete.",
  "الفترة:": "Period:",
  "إلى": "to",
  "— توقيت الرياض. تشمل جميع الحجوزات وسجلات الدفع المرتبطة برحلات هذه الفترة.": "— Riyadh time. Includes all bookings and payment records linked to trips in this period.",
  "الرحلات": "Trips",
  "عدد الرحلات": "Number of trips",
  "مجموع المقاعد": "Total seats",
  "لا توجد رحلات للمركز في هذه الفترة.": "No center trips in this period.",
  "عدد الحجوزات": "Number of bookings",
  "المقاعد المحجوزة": "Booked seats",
  "لا توجد حجوزات لرحلات هذه الفترة.": "No bookings for trips in this period.",
  "سجلات الدفع": "Payment records",
  "هذه حالات سجلات النظام، وليست كشف تسوية بنكية. لا تُحتسب السجلات المنشأة أو المعلّقة أو المفوّضة كتحصيل، وتُعرض كل عملة منفصلة.": "These are system record statuses, not a bank settlement statement. Created, pending and authorized records are not counted as collections. Each currency is shown separately.",
  "سجلات الدفع بحسب الحالة والعملة": "Payment records by status and currency",
  "العملة": "Currency",
  "عدد السجلات": "Record count",
  "وحدة نقدية صغرى": "minor currency units",
  "لا توجد سجلات دفع مرتبطة برحلات هذه الفترة.": "No payment records are linked to trips in this period.",
  " وحدة نقدية صغرى": " minor currency units"
}) || {t:value=>value,message(source,values=[]){return this.format(source,values)},messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),setMessage:(node,value)=>(node.textContent=value??''),label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))},attribute(name,text,values=[]){if(!['aria-label','aria-description','placeholder','title','alt'].includes(name))throw new TypeError('Invalid display attribute');return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'}};

  // Preserve provenance of local errors; provider and user messages remain opaque.
  const localErrors=new WeakMap();
  const localError=(source,values=[])=>{const error=new Error(uiLocale.format(source,values));localErrors.set(error,{source,values});return error;};
  const localErrorMessage=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.message(known.source,known.values):error?.message||uiLocale.message(fallback);};
  const localErrorHTML=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.label(known.source,known.values):error?.message?String(error.message).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])):uiLocale.label(fallback);};
  const setLocalErrorText=(node,error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.setText(node,known.source,known.values):error?.message?(node.textContent=error.message):uiLocale.setText(node,fallback);};

  // Local labels retain identity; unknown API values remain plain text.
  const authoredTripLabel=(s)=>((value=>value?uiLocale.message(value):value)({DRAFT:'محفوظة — غير منشورة',OPEN:'مفتوحة للحجز',CLOSED:'مغلقة للحجز',CANCELLED:'ملغاة',COMPLETED:'مكتملة'}[s]) || uiLocale.message('غير معروفة'));
  const authoredBookingLabel=(s)=>((value=>value?uiLocale.message(value):value)({PENDING:'بانتظار التأكيد',CONFIRMED:'مؤكد',CANCELLED:'ملغى'}[s]) || uiLocale.message('غير معروفة'));
  const authoredPaymentLabel=(s)=>((value=>value?uiLocale.message(value):value)({CREATED:'منشأ',PENDING:'معلّق',AUTHORIZED:'مفوّض — لم يُحصّل',CAPTURED:'محصّل بحسب السجل',FAILED:'فاشل',CANCELLED:'ملغى',REFUNDED:'مسترد بحسب السجل'}[s]) || uiLocale.message('غير معروفة'));

 const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
 let section=null,viewVersion=0;
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('center')&&access()?.getCurrentRole?.()==='center');
 const clear=()=>{viewVersion++;section?.remove();section=null};
 const current=(host,version,session)=>host===section&&host.isConnected&&version===viewVersion&&eligible()&&session===auth()?.getSessionVersion?.();
 const tripLabel=s=>({DRAFT:'محفوظة — غير منشورة',OPEN:'مفتوحة للحجز',CLOSED:'مغلقة للحجز',CANCELLED:'ملغاة',COMPLETED:'مكتملة'}[s]||'غير معروفة');
 const bookingLabel=s=>({PENDING:'بانتظار التأكيد',CONFIRMED:'مؤكد',CANCELLED:'ملغى'}[s]||'غير معروفة');
 const paymentLabel=s=>({CREATED:'منشأ',PENDING:'معلّق',AUTHORIZED:'مفوّض — لم يُحصّل',CAPTURED:'محصّل بحسب السجل',FAILED:'فاشل',CANCELLED:'ملغى',REFUNDED:'مسترد بحسب السجل'}[s]||'غير معروفة');
 async function authorize(host,version,session){
  const valid=await access()?.authorizeRole?.('center',{sessionVersion:session,isCurrent:()=>host===section&&host.isConnected&&version===viewVersion});
  if(!valid||!current(host,version,session)){if(host===section&&host.isConnected)clear();return false}return true;
 }
 function ensure(){
  if(section?.isConnected)return section;const host=document.createElement('section');host.id='hl-center-reports';host.className='hl-center-reports';
  const today=new Date(Date.now()+3*3600000).toISOString().slice(0,10);
  uiLocale.setHTML(host, uiLocale.html`<header><small>DIVE CENTER · مركز الغوص</small><h2>تقارير الحجوزات والمدفوعات</h2><p>الرحلات والحجوزات وسجلات الدفع المرتبطة بالمركز، حسب موعد بداية الرحلة بتوقيت الرياض.</p></header><nav class="hl-center-report-links" aria-label="مساحات المالية للمركز"><button type="button" data-center-report-route="finance">ورديات المحاسب والإقفالات</button><button type="button" data-center-report-route="receivables">الذمم والتحصيل</button></nav><p>التقرير اليومي وإقفالات الورديات والفترات داخل صفحة الورديات. تظهر العمليات المتاحة بحسب صلاحيات حسابك.</p><p data-center-report-links-feedback role="status"></p><form data-center-report-filter><label>من تاريخ<input type="date" name="from" required value="${today.slice(0,8)+'01'}"></label><label>إلى تاريخ<input type="date" name="to" required value="${today}"></label><button type="submit">عرض التقرير</button></form><div data-center-report-result aria-live="polite"></div>`);
  host.addEventListener('submit',event=>{if(event.target.matches('[data-center-report-filter]')){event.preventDefault();void load()}});host.addEventListener('click',event=>{if(event.target.closest('[data-center-report-retry]'))void load();const button=event.target.closest('[data-center-report-route]');if(button)void openFinancialWorkspace(button)});section=host;document.getElementById('main')?.append(host);return host;
 }
 async function openFinancialWorkspace(button){
  if(!section||button.disabled||!eligible())return;
  const host=section,version=viewVersion,session=auth().getSessionVersion?.(),feedback=host.querySelector('[data-center-report-links-feedback]');button.disabled=true;feedback.textContent='';
  try{
   if(!(await authorize(host,version,session)))return;
   const service=button.dataset.centerReportRoute==='finance'?window.HydrolandCenterFinance:window.HydrolandCenterReceivables;
   if(typeof service?.open!=='function')throw localError('الخدمة جارٍ تحميلها. أعد المحاولة.');
   await service.open();
  }catch(error){if(current(host,version,session))setLocalErrorText(feedback, error, 'تعذر فتح مساحة المالية.')}
  finally{if(current(host,version,session))button.disabled=false}
 }
 async function load(){
  if(!eligible()){clear();return}const host=ensure(),version=++viewVersion,session=auth().getSessionVersion?.(),form=host.querySelector('form'),result=host.querySelector('[data-center-report-result]'),button=form.querySelector('button');
  const query=new URLSearchParams({from:form.elements.from.value,to:form.elements.to.value});button.disabled=true;result.setAttribute('aria-busy','true');uiLocale.setHTML(result, uiLocale.html`<p>جارٍ إعداد التقرير…</p>`);
  try{
   if(!(await authorize(host,version,session)))return;
   const response=await auth().authorizedFetch('/center/me/reports?'+query),data=await response.json().catch(()=>null);if(!current(host,version,session))return;
   if(!response.ok)throw (value=>value?new Error(value):localError('تعذر تحميل التقرير.'))(data?.message);
   if(!data?.period||!Array.isArray(data.trips)||!Array.isArray(data.bookings)||!Array.isArray(data.payments))throw localError('استجابة التقرير غير مكتملة.');
   const table=(caption,head,rows)=>uiLocale.html`<div class="hl-center-report-table"><table><caption>${uiLocale.messageHTML(caption)}</caption><thead><tr>${head.map(x=>uiLocale.html`<th scope="col">${uiLocale.label(x)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
   uiLocale.setHTML(result, uiLocale.html`<h3>${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('المركز')))(data.center?.displayName)}</h3><p>الفترة: ${esc(data.period.from)} إلى ${esc(data.period.to)} — توقيت الرياض. تشمل جميع الحجوزات وسجلات الدفع المرتبطة برحلات هذه الفترة.</p>${(data.trips.length?table(uiLocale.message('الرحلات'), ['الحالة','عدد الرحلات','مجموع المقاعد'], data.trips.map(row=>uiLocale.html`<tr><td>${uiLocale.messageHTML(authoredTripLabel(row.status))}</td><td>${esc(row.count)}</td><td>${esc(row.capacity)}</td></tr>`)):uiLocale.html`<p>لا توجد رحلات للمركز في هذه الفترة.</p>`)}${(data.bookings.length?table(uiLocale.message('الحجوزات'), ['الحالة','عدد الحجوزات','المقاعد المحجوزة'], data.bookings.map(row=>uiLocale.html`<tr><td>${uiLocale.messageHTML(authoredBookingLabel(row.status))}</td><td>${esc(row.count)}</td><td>${esc(row.seats)}</td></tr>`)):uiLocale.html`<p>لا توجد حجوزات لرحلات هذه الفترة.</p>`)}<h3>سجلات الدفع</h3><p>هذه حالات سجلات النظام، وليست كشف تسوية بنكية. لا تُحتسب السجلات المنشأة أو المعلّقة أو المفوّضة كتحصيل، وتُعرض كل عملة منفصلة.</p>${(data.payments.length?table(uiLocale.message('سجلات الدفع بحسب الحالة والعملة'), ['الحالة','العملة','عدد السجلات','المبلغ'], data.payments.map(row=>uiLocale.html`<tr><td>${uiLocale.messageHTML(authoredPaymentLabel(row.status))}</td><td>${esc(row.currency)}</td><td>${esc(row.count)}</td><td>${esc(row.currency==='SAR'&&Number.isSafeInteger(row.amountMinor)?(row.amountMinor/100).toFixed(2):String(row.amountMinor)+uiLocale.t(' وحدة نقدية صغرى'))}</td></tr>`)):uiLocale.html`<p>لا توجد سجلات دفع مرتبطة برحلات هذه الفترة.</p>`)}`);
  }catch(error){if(current(host,version,session))uiLocale.setHTML(result, uiLocale.html`<p role="alert">${localErrorHTML(error, 'تعذر تحميل التقرير.')}</p><button type="button" data-center-report-retry>إعادة المحاولة</button>`)}
  finally{if(current(host,version,session)){button.disabled=false;result.removeAttribute('aria-busy')}}
 }
 async function open(){if(!eligible()){clear();return}const host=ensure();host.hidden=false;window.HydrolandWorkspaceUI?.show?.(host);await load()}
 for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,clear);
 for(const name of ['hydroland:auth-changed','hydroland:role-changed','hydroland:profile-data-ready'])document.addEventListener(name,()=>{if(!eligible())clear()});
 window.HydrolandCenterReports=Object.freeze({open});
})();
