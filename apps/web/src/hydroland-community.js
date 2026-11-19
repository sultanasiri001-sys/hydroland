(()=>{
  // Authored interface messages only. Account, provider and document values remain opaque.
  const uiLocale=window.HydrolandI18n?.createScope("community", {
  "المجتمع والاستشارات والفعاليات البحرية": "Community, advice and marine events",
  "بانتظار الربط التشغيلي": "Awaiting operational integration",
  "عضو مجتمع": "Community member",
  "فعالية قادمة": "Upcoming event",
  "استشارة مفتوحة": "Open consultation",
  "ساعة تطوع": "Volunteer hour",
  "نشاط المجتمع": "Community activity",
  "لا توجد منشورات أو استشارات فعلية محملة من النظام حاليًا.": "No actual posts or consultations are currently loaded from the system.",
  "إنشاء منشور": "Create a post",
  "طلب استشارة": "Request a consultation",
  "حجز اجتماع": "Book a meeting",
  "التطوع والفعاليات": "Volunteering and events",
  "ستظهر الفعاليات والساعات التطوعية هنا بعد ربط الوحدة بمصدر البيانات المعتمد.": "Events and volunteer hours will appear here after this module is connected to the approved data source.",
  "سجل كمتطوع": "Register as a volunteer",
  "عرض الفعاليات": "View events",
  "الوظائف غير المرتبطة بواجهة API فعلية معطلة بوضوح ولا يتم إنشاء أو حفظ أي بيانات تجريبية.": "Features without an actual API connection are visibly disabled. No sample data is created or saved."
}) || {messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),attribute:(name,text,values=[])=>name+'=\"'+String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))+'\"',message:(text,values=[])=>String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),setMessage:(node,value)=>(node.textContent=value??''),t:value=>value,label:(text,values=[])=>String(text??'').replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};
const host=document.getElementById('community');if(!host||document.querySelector('.hl-community'))return;const s=document.createElement('section');s.className='hl-community';uiLocale.setHTML(s, uiLocale.html`<header class="hl-community-head"><div><small>HYDROLAND COMMUNITY</small><h3>المجتمع والاستشارات والفعاليات البحرية</h3></div><span>بانتظار الربط التشغيلي</span></header><div class="hl-community-stats"><article><b>—</b><small>عضو مجتمع</small></article><article><b>—</b><small>فعالية قادمة</small></article><article><b>—</b><small>استشارة مفتوحة</small></article><article><b>—</b><small>ساعة تطوع</small></article></div><div class="hl-community-grid"><section class="hl-community-panel"><h4>نشاط المجتمع</h4><div class="hl-community-note">لا توجد منشورات أو استشارات فعلية محملة من النظام حاليًا.</div><div class="hl-community-actions"><button disabled>إنشاء منشور</button><button disabled>طلب استشارة</button><button disabled>حجز اجتماع</button></div></section><section class="hl-community-panel"><h4>التطوع والفعاليات</h4><div class="hl-community-note">ستظهر الفعاليات والساعات التطوعية هنا بعد ربط الوحدة بمصدر البيانات المعتمد.</div><div class="hl-community-actions"><button disabled>سجل كمتطوع</button><button disabled>عرض الفعاليات</button></div></section></div><div class="hl-community-note">الوظائف غير المرتبطة بواجهة API فعلية معطلة بوضوح ولا يتم إنشاء أو حفظ أي بيانات تجريبية.</div>`);host.insertAdjacentElement('afterend',s);})();