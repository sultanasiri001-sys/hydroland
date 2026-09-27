(()=>{
  if(!document.querySelector('link[data-hl-visual-qa]')){const visual=document.createElement('link');visual.rel='stylesheet';visual.href='./hydroland-visual-qa.css';visual.dataset.hlVisualQa='1';document.head.appendChild(visual)}
  if(!document.getElementById('hl-brand-fonts')){const fonts=document.createElement('link');fonts.id='hl-brand-fonts';fonts.rel='stylesheet';fonts.href='https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Tajawal:wght@400;500;700;800&display=swap';document.head.appendChild(fonts)}
  const approvedTerms=new Map([['مدرب معتمد','محترفي الغوص'],['INSTRUCTOR','DIVE PROFESSIONALS'],['مشغل قارب','الوساطة البحرية'],['BOAT OPERATOR','MARINE BROKERAGE'],['الوسائط البحرية','الوساطة البحرية']]);
  const normalizeTerms=root=>{const walker=document.createTreeWalker(root||document.body,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const node of nodes){const exact=String(node.nodeValue||'').trim();if(approvedTerms.has(exact))node.nodeValue=node.nodeValue.replace(exact,approvedTerms.get(exact))}};
  normalizeTerms(document.body);new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{if(node.nodeType===Node.TEXT_NODE){const exact=String(node.nodeValue||'').trim();if(approvedTerms.has(exact))node.nodeValue=node.nodeValue.replace(exact,approvedTerms.get(exact))}else if(node.nodeType===Node.ELEMENT_NODE)normalizeTerms(node)}))).observe(document.body,{childList:true,subtree:true});
  if(document.getElementById('hl-diver-dashboard'))return;
  const css=document.createElement('link');css.rel='stylesheet';css.href='./hydroland-diver-dashboard.css';css.dataset.hlDiverDashboard='1';document.head.appendChild(css);
  const host=document.getElementById('role-console')||document.querySelector('.landing-hero');if(!host)return;
  const dashboard=document.createElement('section');dashboard.id='hl-diver-dashboard';dashboard.className='hl-diver-dashboard';dashboard.hidden=true;
  host.insertAdjacentElement('afterend',dashboard);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const isAuthenticated=()=>Boolean(window.HydrolandAuth?.isAuthenticated?.());
  const isDiverView=()=>{const role=window.HydrolandPortalAccess?.getCurrentRole?.()||'diver';return role==='diver'};
  const displayName=profile=>{const first=profile?.person?.firstName||'',last=profile?.person?.lastName||'',name=`${first} ${last}`.trim();return name&&name!=='Pending Profile'?name:'عضو HYDROLAND'};
  const statusForMedical=status=>status==='FIT'?['ok','لائق','الفحص الطبي صالح حسب بيانات ملفك']:status==='UNFIT'?['blocked','غير لائق','يلزم معالجة الحالة الطبية قبل الأنشطة المقيدة']:status==='REVIEW'?['review','مراجعة','الحالة الطبية تحتاج مراجعة']:['review','غير محدد','أكمل بيانات اللياقة الطبية في ملف الغواص'];
  const verifiedCredentials=credentials=>(Array.isArray(credentials)?credentials:[]).filter(item=>['VERIFIED','DOCUMENT_VERIFIED'].includes(item?.verificationStatus));
  function render(){
    if(!isAuthenticated()||!isDiverView()){dashboard.hidden=true;return}
    dashboard.hidden=false;
    const data=window.HydrolandProfileData||{},profile=data.profile||null,credentials=Array.isArray(data.credentials)?data.credentials:[],equipment=Array.isArray(data.equipment)?data.equipment:[],diver=data.diverProfile||null;
    const verified=verifiedCredentials(credentials),activeEquipment=equipment.filter(item=>item?.status==='ACTIVE'),medical=statusForMedical(diver?.medicalFitnessStatus),hasActiveDiver=(profile?.roles||[]).some(role=>role?.role==='DIVER'&&role?.status==='ACTIVE');
    const accountState=profile?.status==='ACTIVE'?['ok','نشط','الحساب متصل بالنظام']:['review',profile?.status||'بانتظار البيانات','حالة الحساب من الخادم'];
    const credentialState=verified.length?['ok',`${verified.length} موثقة`,'شهادات تم التحقق منها في الحساب']:['review','لا توجد موثقة','أضف شهادة واطلب التحقق عند توفر المستند'];
    const equipmentState=activeEquipment.length?['ok',`${activeEquipment.length} نشطة`,'معدات شخصية مسجلة كجاهزة']:['review','غير مكتمل','أضف معداتك وحدّث حالة الصيانة'];
    dashboard.innerHTML=`
      <header class="hl-diver-head"><div><small>DIVER WORKSPACE · مساحة الغواص</small><h3>مرحبًا، ${esc(displayName(profile))}</h3><p>رحلاتك، سجل الغوص، الشهادات، المعدات وبيانات الجاهزية في مساحة واحدة مرتبطة بالخدمات الحالية.</p></div><div class="hl-diver-head-actions"><div class="hl-diver-utility" aria-label="إشعارات ورسائل الحساب"><button type="button" data-diver-notifications aria-label="فتح الإشعارات">♢<span>الإشعارات</span></button><button type="button" data-diver-messages aria-label="فتح الرسائل الداخلية">✉<span>الرسائل</span></button></div><div class="hl-diver-level"><b>${hasActiveDiver?'DIVER MEMBER':'HYDROLAND MEMBER'}</b><span>الحالة من الحساب الفعلي</span></div></div></header>
      <div class="hl-diver-overview">
        <article class="hl-diver-metric"><small>سجل الغوص</small><strong>—</strong><span>العدد من سجل الغوص</span></article>
        <article class="hl-diver-metric"><small>الشهادات الموثقة</small><strong>${verified.length}</strong><span>من حسابك</span></article>
        <article class="hl-diver-metric"><small>المعدات النشطة</small><strong>${activeEquipment.length}</strong><span>من ملف المعدات</span></article>
        <article class="hl-diver-metric"><small>اللياقة الطبية</small><strong>${esc(medical[1])}</strong><span>من ملف الغواص</span></article>
      </div>
      <div class="hl-diver-body">
        <section class="hl-diver-actions"><header class="hl-diver-section-head"><div><small>DIVER ACTIONS</small><h4>إجراءات الغواص</h4></div><span>الخدمات الحالية فقط</span></header><div class="hl-diver-action-grid">
          <button type="button" data-diver-route="trips"><i>⌖</i><b>الرحلات والحجوزات</b><small>استعراض الرحلات المتاحة</small></button>
          <button type="button" data-hl-action="logbook"><i>≋</i><b>سجل الغوص</b><small>إضافة ومراجعة الغوصات</small></button>
          <button type="button" data-hl-action="diver-profile"><i>♟</i><b>بيانات الغواص</b><small>الطوارئ واللياقة الطبية</small></button>
          <button type="button" data-hl-action="diver-equipment-list"><i>◫</i><b>معدات الغواص</b><small>المعدات والصيانة</small></button>
          <button type="button" data-hl-action="certs"><i>◇</i><b>الشهادات</b><small>الشهادات وحالة التحقق</small></button>
          <button type="button" data-diver-route="store"><i>▣</i><b>المتجر والتأجير</b><small>المعدات والخدمات المتاحة</small></button>
        </div></section>
        <section class="hl-diver-readiness"><header class="hl-diver-section-head"><div><small>READINESS</small><h4>جاهزية الملف</h4></div><span>لا تستبدل قرار السلامة</span></header><div class="hl-diver-ready-list">
          ${[[accountState,'الحساب'],[medical,'اللياقة الطبية'],[credentialState,'الشهادات'],[equipmentState,'المعدات']].map(([state,label])=>`<article class="hl-diver-ready-row"><i class="hl-diver-ready-dot ${state[0]}"></i><div><b>${label}</b><small>${esc(state[2])}</small></div><span>${esc(state[1])}</span></article>`).join('')}
        </div></section>
      </div>
      <footer class="hl-diver-foot"><b>تنبيه:</b> مؤشرات هذه اللوحة تلخص بيانات الحساب فقط؛ قرار تشغيل الرحلة والسلامة يبقى خاضعًا لقوائم الفحص وحالة الرحلة والبيانات البحرية المعتمدة.</footer>`;
    normalizeTerms(dashboard);
  }
  dashboard.addEventListener('click',event=>{if(event.target.closest?.('[data-diver-notifications]')){window.HydrolandAccountCenter?.openNotifications?.();return}if(event.target.closest?.('[data-diver-messages]')){window.HydrolandMessages?.open?.();return}const route=event.target.closest?.('[data-diver-route]')?.dataset.diverRoute;if(!route)return;const target=document.getElementById(route);if(!target)return;target.scrollIntoView({behavior:'smooth',block:'start'});history.replaceState(null,'','#'+route)});
  document.addEventListener('hydroland:auth-changed',()=>{render();setTimeout(render,650);setTimeout(render,1600)});
  document.addEventListener('hydroland:role-changed',()=>{render();setTimeout(render,250)});
  document.addEventListener('click',event=>{if(event.target.closest?.('[data-hl-action="diver-profile"],[data-hl-action="diver-equipment-list"],[data-hl-action="certs"],[data-hl-action="logbook"]'))setTimeout(render,1200)});
  setInterval(()=>{if(isAuthenticated()&&isDiverView())render()},5000);
  window.HydrolandDiverDashboard={refresh:render};
  render();setTimeout(render,900);
})();
