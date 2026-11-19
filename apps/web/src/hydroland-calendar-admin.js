(()=>{
  // Authored interface messages only. Account, provider and document values remain opaque.
  const uiLocale=window.HydrolandI18n?.createScope("calendar-admin", {
  "التقويم التشغيلي الموحد": "Unified operations calendar",
  "بانتظار الاتصال": "Awaiting connection",
  "الأسبوع السابق": "Previous week",
  "الأسبوع التالي": "Next week",
  "طقس مناسب": "Suitable weather",
  "الطقس يحتاج مراجعة": "Weather needs review",
  "مؤجلة بالطقس": "Postponed due to weather",
  "بيانات الطقس غير متاحة": "Weather data unavailable",
  "بدون تقييم طقس": "No weather assessment",
  "قارب": "Boat",
  "مدرب": "Instructor",
  "طاقم": "Crew",
  "موقع": "Site",
  "معدات": "Equipment",
  "الطاقم غير مؤكد": "Crew not confirmed",
  "يحتاج بديل ({0})": "Replacement needed ({0})",
  "بانتظار رد الطاقم ({0})": "Awaiting crew response ({0})",
  "الطاقم جاهز {0}/{1}": "Crew ready {0}/{1}",
  "جاهزية الطاقم {0}/{1}": "Crew readiness {0}/{1}",
  "مقبول": "Accepted",
  "مرفوض": "Declined",
  "تم الاستبدال": "Replaced",
  "بانتظار الرد": "Awaiting response",
  "جاهزة للتشغيل": "Ready to operate",
  "غير جاهزة للتشغيل": "Not ready to operate",
  "تحتاج مراجعة تشغيلية": "Operations review needed",
  "الطاقم": "Crew",
  "السلامة": "Safety",
  "الطقس": "Weather",
  "الموارد": "Resources",
  "اعتماد إداري ساري": "Current administrative approval",
  "اعتماد التشغيل ساري": "Current operating approval",
  "اعتماد التشغيل ملغى": "Operating approval revoked",
  "لا يوجد اعتماد تشغيل": "No operating approval",
  "جارٍ حفظ الموارد": "Saving resources",
  "تعذر حفظ الموارد": "Could not save resources",
  "تم تحديث الموارد": "Resources updated",
  "تخصيص الموارد": "Allocate resources",
  "حفظ الموارد": "Save resources",
  "استجابة طاقم الرحلة": "Trip crew responses",
  "لم يتم إنشاء تكليفات للطاقم بعد.": "No crew assignments have been created yet.",
  "جاهزية التشغيل: {0}": "Operating readiness: {0}",
  "لا توجد رحلات أو أنشطة في هذا الأسبوع.": "No trips or activities this week.",
  "{0}–{1} · {2} · {3}/{4} متاح": "{0}–{1} · {2} · {3}/{4} available",
  "السلامة معتمدة": "Safety approved",
  "السلامة تحتاج مراجعة": "Safety review needed",
  "التشغيل: {0}": "Operations: {0}",
  "يتطلب دخول إداري": "Administrator sign-in required",
  "جارٍ تحميل التقويم": "Loading calendar",
  "متصل بالخادم": "Connected to server",
  "تعذر تحميل التقويم": "Could not load calendar",
  "{0} · {1}": "{0} · {1}",
  "{0} {1}": "{0} {1}"
}) || {messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),attribute:(name,text,values=[])=>name+'=\"'+String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))+'\"',message:(text,values=[])=>String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),setMessage:(node,value)=>(node.textContent=value??''),t:value=>value,label:(text,values=[])=>String(text??'').replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Only this module's authored Error instances retain translatable messages.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? error?.message;

  const root=document.getElementById('role-console')||document.querySelector('main');if(!root)return;
  const panel=document.createElement('section');panel.className='hl-calendar-admin';panel.hidden=true;uiLocale.setHTML(panel, uiLocale.html`<div class="hl-trip-admin__head"><div><span class="eyebrow">UNIFIED OPERATIONS CALENDAR</span><h3>التقويم التشغيلي الموحد</h3></div><span data-calendar-state>بانتظار الاتصال</span></div><div class="hl-calendar-toolbar"><button type="button" data-calendar-prev>الأسبوع السابق</button><strong data-calendar-range>—</strong><button type="button" data-calendar-next>الأسبوع التالي</button></div><div data-calendar-list></div>`);root.insertAdjacentElement('afterend',panel);
  const defaultApiBase=/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)?'http://localhost:3001/api/v1':'https://hydroland.onrender.com/api/v1';
  const api=()=>window.HydrolandAuth?.apiBase||window.HYDROLAND_API_BASE||defaultApiBase,token=()=>window.HydrolandAuth?.getAccessToken?.(),headers=()=>({'Content-Type':'application/json',Authorization:'Bearer '+token()}),state=t=>{const e=panel.querySelector('[data-calendar-state]');if(e)uiLocale.setMessage(e, t)},fmt=d=>new Intl.DateTimeFormat('ar-SA',{timeZone:'Asia/Riyadh',weekday:'short',day:'numeric',month:'short'}).format(d),time=d=>new Intl.DateTimeFormat('ar-SA',{timeZone:'Asia/Riyadh',hour:'2-digit',minute:'2-digit'}).format(d);let anchor=new Date(),resources=[],tripAdmin=[];
  const startOfWeek=d=>{const x=new Date(d),day=x.getUTCDay();x.setUTCDate(x.getUTCDate()-day);x.setUTCHours(0,0,0,0);return x},endOfWeek=s=>{const x=new Date(s);x.setUTCDate(x.getUTCDate()+7);return x},weatherLabel=w=>{const d=w?.evaluation?.decision;if(d==='ALLOWED')return 'طقس مناسب';if(d==='REVIEW_REQUIRED')return 'الطقس يحتاج مراجعة';if(d==='DEFERRED')return 'مؤجلة بالطقس';if(d==='UNAVAILABLE')return 'بيانات الطقس غير متاحة';return 'بدون تقييم طقس'},typeLabel=t=>({BOAT:'قارب',INSTRUCTOR:'مدرب',CREW:'طاقم',SITE:'موقع',EQUIPMENT:'معدات'})[t]||t,crewLabel=c=>{const s=c?.summary;if(!s||!s.total)return uiLocale.message('الطاقم غير مؤكد');if(s.replacementRequired)return uiLocale.message("يحتاج بديل ({0})", [s.replacementRequired]);if(s.pending)return uiLocale.message("بانتظار رد الطاقم ({0})", [s.pending]);if(s.ready)return uiLocale.message("الطاقم جاهز {0}/{1}", [s.accepted, s.total]);return uiLocale.message("جاهزية الطاقم {0}/{1}", [s.accepted, s.total])},crewStatus=s=>s==='ACCEPTED'?'مقبول':s==='REJECTED'?'مرفوض':s==='REASSIGNED'?'تم الاستبدال':'بانتظار الرد';
  const readinessLabel=r=>r?.status==='READY'?'جاهزة للتشغيل':r?.status==='NOT_READY'?'غير جاهزة للتشغيل':'تحتاج مراجعة تشغيلية',checkLabel=k=>({crew:'الطاقم',safety:'السلامة',weather:'الطقس',resources:'الموارد'})[k]||k,clearanceLabel=c=>c?.status==='ACTIVE'?(c.reviewRequired?'اعتماد إداري ساري':'اعتماد التشغيل ساري'):c?.status==='REVOKED'?'اعتماد التشغيل ملغى':'لا يوجد اعتماد تشغيل';
  async function saveResources(tripId,select,button){try{state(uiLocale.message('جارٍ حفظ الموارد'));button.disabled=true;const resourceIds=[...select.selectedOptions].map(o=>o.value).filter(Boolean),r=await fetch(`${api()}/trips/admin/calendar/${tripId}/allocations`,{method:'POST',headers:headers(),body:JSON.stringify({resourceIds})}),body=await r.json().catch(()=>null);if(!r.ok)throw localError(body?.message||uiLocale.message('تعذر حفظ الموارد'));state(uiLocale.message('تم تحديث الموارد'));await load()}catch(error){state(error instanceof Error?localErrorMessage(error):uiLocale.message('تعذر حفظ الموارد'));button.disabled=false}}
  function resourceEditor(item){const wrap=document.createElement('div');wrap.className='hl-calendar-resource-editor',label=document.createElement('label'),select=document.createElement('select');uiLocale.setText(label, ...['تخصيص الموارد']);select.multiple=true;const assigned=new Set((item.resources||[]).map(r=>r.resourceId));resources.filter(r=>r.active!==false).forEach(resource=>{const option=document.createElement('option');option.value=resource.id;uiLocale.setText(option,'{0} · {1}',[uiLocale.message(typeLabel(resource.type)),resource.name]);option.selected=assigned.has(resource.id);select.appendChild(option)});const button=document.createElement('button');button.type='button';uiLocale.setText(button, ...['حفظ الموارد']);button.onclick=()=>saveResources(item.id,select,button);wrap.append(label,select,button);return wrap}
  function crewDetails(item){const members=item.crew?.members||[],wrap=document.createElement('div');wrap.className='hl-calendar-crew-status';const heading=document.createElement('strong');uiLocale.setText(heading, ...['استجابة طاقم الرحلة']);wrap.appendChild(heading);if(!members.length){const empty=document.createElement('small');uiLocale.setText(empty, ...['لم يتم إنشاء تكليفات للطاقم بعد.']);wrap.appendChild(empty);return wrap}members.forEach(member=>{const row=document.createElement('div'),name=document.createElement('span'),status=document.createElement('b');uiLocale.setText(name,'{0} · {1}',[member.name,uiLocale.message(typeLabel(member.roleType))]);uiLocale.setText(status, ...[crewStatus(member.status)]);row.append(name,status);wrap.appendChild(row)});return wrap}
  function readiness(item){const r=item.readiness||{},wrap=document.createElement('div');wrap.className='hl-operational-readiness';wrap.dataset.readiness=r.status||'REVIEW_REQUIRED';const title=document.createElement('strong');uiLocale.setText(title, ...["جاهزية التشغيل: {0}", [uiLocale.message(readinessLabel(r))]]);wrap.appendChild(title);const checks=document.createElement('div');checks.className='hl-readiness-checks';Object.entries(r.checks||{}).forEach(([key,ok])=>{const chip=document.createElement('span');chip.dataset.ready=ok?'true':'false';uiLocale.setText(chip,'{0} {1}',[ok?'✓':'✕',uiLocale.message(checkLabel(key))]);checks.appendChild(chip)});wrap.appendChild(checks);return wrap}
  function render(items,start,end){const host=panel.querySelector('[data-calendar-list]');host.textContent='';panel.querySelector('[data-calendar-range]').textContent=`${fmt(start)} — ${fmt(new Date(end.getTime()-1))}`;const clearanceById=new Map(tripAdmin.map(t=>[t.id,t.operationalClearance]));if(!items.length){uiLocale.setText(host, ...['لا توجد رحلات أو أنشطة في هذا الأسبوع.']);return}const byDay=new Map();items.forEach(item=>{const key=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(item.startsAt));if(!byDay.has(key))byDay.set(key,[]);byDay.get(key).push(item)});[...byDay.values()].forEach(rows=>{const section=document.createElement('section');section.className='hl-calendar-day';const h=document.createElement('h4');h.textContent=fmt(new Date(rows[0].startsAt));section.appendChild(h);rows.forEach(item=>{const clearance=clearanceById.get(item.id),card=document.createElement('article');card.className='hl-calendar-event';card.dataset.readiness=item.readiness?.status||'REVIEW_REQUIRED';card.dataset.clearance=clearance?.status||'MISSING';const head=document.createElement('div'),title=document.createElement('strong'),meta=document.createElement('small');title.textContent=item.title;uiLocale.setText(meta, ...["{0}–{1} · {2} · {3}/{4} متاح", [time(new Date(item.startsAt)), time(new Date(item.endsAt)), item.type, item.remainingSeats, item.capacity]]);head.append(title,meta);const tags=document.createElement('div');tags.className='hl-calendar-tags';[uiLocale.message(weatherLabel(item.weather)),uiLocale.message(item.safety?.decision==='ALLOWED'?'السلامة معتمدة':'السلامة تحتاج مراجعة'),crewLabel(item.crew),uiLocale.message('التشغيل: {0}',[uiLocale.message(readinessLabel(item.readiness))]),uiLocale.message(clearanceLabel(clearance))].forEach(text=>{const tag=document.createElement('span');uiLocale.setMessage(tag,text);tags.appendChild(tag)});card.append(head,readiness(item),tags,crewDetails(item),resourceEditor(item));section.appendChild(card)});host.appendChild(section)})}
  async function load(){if(!token()){state(uiLocale.message('يتطلب دخول إداري'));return}try{state(uiLocale.message('جارٍ تحميل التقويم'));const start=startOfWeek(anchor),end=endOfWeek(start),[calendarResponse,resourcesResponse,tripsResponse]=await Promise.all([fetch(`${api()}/trips/admin/calendar?from=${encodeURIComponent(start.toISOString())}&to=${encodeURIComponent(end.toISOString())}`,{headers:headers()}),fetch(`${api()}/trips/admin/calendar/resources`,{headers:headers()}),fetch(`${api()}/trips/admin`,{headers:headers()})]),rows=await calendarResponse.json().catch(()=>[]),resourceRows=await resourcesResponse.json().catch(()=>[]),tripRows=await tripsResponse.json().catch(()=>[]);if(!calendarResponse.ok||!resourcesResponse.ok||!tripsResponse.ok)throw new Error();resources=Array.isArray(resourceRows)?resourceRows:[];tripAdmin=Array.isArray(tripRows)?tripRows:[];render(Array.isArray(rows)?rows:[],start,end);state(uiLocale.message('متصل بالخادم'))}catch{state(uiLocale.message('تعذر تحميل التقويم'))}}
  panel.querySelector('[data-calendar-prev]').onclick=()=>{anchor=new Date(anchor.getTime()-7*86400000);load()};panel.querySelector('[data-calendar-next]').onclick=()=>{anchor=new Date(anchor.getTime()+7*86400000);load()};['hydroland:safety-decision-changed','hydroland:weather-gate-changed','hydroland:crew-assignment-updated','hydroland:operational-clearance','hydroland:trip-status-changed'].forEach(name=>document.addEventListener(name,()=>{if(!panel.hidden)load()}));document.addEventListener('hydroland:role-changed',e=>{const active=e.detail?.role==='admin';panel.hidden=!active;if(active)load()});document.addEventListener('hydroland:auth-changed',()=>{if(!panel.hidden)load()});window.HydrolandOperationsCalendar={reload:load};
})();