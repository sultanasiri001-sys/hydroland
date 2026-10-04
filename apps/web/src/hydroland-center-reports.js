(()=>{
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
  host.innerHTML=`<header><small>DIVE CENTER · مركز الغوص</small><h2>تقارير المركز</h2><p>الرحلات والحجوزات وسجلات الدفع المرتبطة بالمركز، حسب موعد بداية الرحلة بتوقيت الرياض.</p></header><form data-center-report-filter><label>من تاريخ<input type="date" name="from" required value="${today.slice(0,8)+'01'}"></label><label>إلى تاريخ<input type="date" name="to" required value="${today}"></label><button type="submit">عرض التقرير</button></form><div data-center-report-result aria-live="polite"></div>`;
  host.addEventListener('submit',event=>{if(event.target.matches('[data-center-report-filter]')){event.preventDefault();void load()}});host.addEventListener('click',event=>{if(event.target.closest('[data-center-report-retry]'))void load()});section=host;document.getElementById('main')?.append(host);return host;
 }
 async function load(){
  if(!eligible()){clear();return}const host=ensure(),version=++viewVersion,session=auth().getSessionVersion?.(),form=host.querySelector('form'),result=host.querySelector('[data-center-report-result]'),button=form.querySelector('button');
  const query=new URLSearchParams({from:form.elements.from.value,to:form.elements.to.value});button.disabled=true;result.setAttribute('aria-busy','true');result.innerHTML='<p>جارٍ إعداد التقرير…</p>';
  try{
   if(!(await authorize(host,version,session)))return;
   const response=await auth().authorizedFetch('/center/me/reports?'+query),data=await response.json().catch(()=>null);if(!current(host,version,session))return;
   if(!response.ok)throw new Error(data?.message||'تعذر تحميل التقرير.');
   if(!data?.period||!Array.isArray(data.trips)||!Array.isArray(data.bookings)||!Array.isArray(data.payments))throw new Error('استجابة التقرير غير مكتملة.');
   const table=(caption,head,rows)=>`<div class="hl-center-report-table"><table><caption>${caption}</caption><thead><tr>${head.map(x=>`<th scope="col">${x}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
   result.innerHTML=`<h3>${esc(data.center?.displayName||'المركز')}</h3><p>الفترة: ${esc(data.period.from)} إلى ${esc(data.period.to)} — توقيت الرياض. تشمل جميع الحجوزات وسجلات الدفع المرتبطة برحلات هذه الفترة.</p>`+
    (data.trips.length?table('الرحلات',['الحالة','عدد الرحلات','مجموع المقاعد'],data.trips.map(row=>`<tr><td>${esc(tripLabel(row.status))}</td><td>${esc(row.count)}</td><td>${esc(row.capacity)}</td></tr>`)):'<p>لا توجد رحلات للمركز في هذه الفترة.</p>')+
    (data.bookings.length?table('الحجوزات',['الحالة','عدد الحجوزات','المقاعد المحجوزة'],data.bookings.map(row=>`<tr><td>${esc(bookingLabel(row.status))}</td><td>${esc(row.count)}</td><td>${esc(row.seats)}</td></tr>`)):'<p>لا توجد حجوزات لرحلات هذه الفترة.</p>')+
    '<h3>سجلات الدفع</h3><p>هذه حالات سجلات النظام، وليست كشف تسوية بنكية. لا تُحتسب السجلات المنشأة أو المعلّقة أو المفوّضة كتحصيل، وتُعرض كل عملة منفصلة.</p>'+
    (data.payments.length?table('سجلات الدفع بحسب الحالة والعملة',['الحالة','العملة','عدد السجلات','المبلغ'],data.payments.map(row=>`<tr><td>${esc(paymentLabel(row.status))}</td><td>${esc(row.currency)}</td><td>${esc(row.count)}</td><td>${esc(row.currency==='SAR'&&Number.isSafeInteger(row.amountMinor)?(row.amountMinor/100).toFixed(2):String(row.amountMinor)+' وحدة نقدية صغرى')}</td></tr>`)):'<p>لا توجد سجلات دفع مرتبطة برحلات هذه الفترة.</p>');
  }catch(error){if(current(host,version,session))result.innerHTML=`<p role="alert">${esc(error.message||'تعذر تحميل التقرير.')}</p><button type="button" data-center-report-retry>إعادة المحاولة</button>`}
  finally{if(current(host,version,session)){button.disabled=false;result.removeAttribute('aria-busy')}}
 }
 async function open(){if(!eligible()){clear();return}const host=ensure();host.hidden=false;window.HydrolandWorkspaceUI?.show?.(host);await load()}
 for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,clear);
 for(const name of ['hydroland:auth-changed','hydroland:role-changed','hydroland:profile-data-ready'])document.addEventListener(name,()=>{if(!eligible())clear()});
 window.HydrolandCenterReports=Object.freeze({open});
})();
