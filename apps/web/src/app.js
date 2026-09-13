const API_BASE = window.HYDROLAND_API_URL || '/api/v1';

const sharedNav = [
  ['home','⌂','الرئيسية','Home'],['explore','⌕','استكشاف','Explore'],['trips','◈','الرحلات','Trips'],['notifications','♢','الإشعارات','Notifications']
];

const workspaces = {
  diver:{label:'مساحة الغواص',labelEn:'Diver workspace',title:'أهلًا سلطان، جاهز لمغامرة جديدة؟',copy:'استكشف الرحلات، راجع تجهيزاتك، وتابع كل تفاصيلك من مكان واحد.',action:'استكشف الرحلات',focus:'رحلة جزيرة سمر',state:'GO',metrics:[['12','غوصة مسجلة'],['3','رحلات قادمة'],['Rescue','مستوى الشهادة'],['240','نقطة العضوية']],details:[['الموعد','الجمعة، 7:00 ص'],['الانطلاق','مرسى القحمة'],['التجهيز','8 من 10']],activities:[['✓','تأكيد الحجز','مكتمل'],['◌','قائمة المعدات','عنصران متبقيان'],['!','نموذج اللياقة','يتطلب تحديثًا']],services:[['◈','احجز رحلة','شاطئية أو بالقارب'],['◎','سجل الغوص','توثيق الغوصات والتقييم'],['▣','بطاقتي الرقمية','الشهادة والعضوية وQR'],['+','الطوارئ','معلومات واتصال سريع'],['□','استئجار المعدات','اختر مقاسك وموعدك'],['◇','الدورات','تدريب حسب منطقتك']]},
  instructor:{label:'مساحة المدرب',labelEn:'Instructor workspace',title:'إدارة التدريب والمتدربين',copy:'تابع الجلسات، اعتمد السجلات، وراقب تقدم كل متدرب.',action:'إضافة جلسة',focus:'دورة المياه المفتوحة',state:'REVIEW',metrics:[['18','متدربًا نشطًا'],['4','جلسات اليوم'],['96%','نسبة الحضور'],['47','طالبًا معتمدًا']],details:[['الجلسة','مهارات المياه المحصورة'],['الموعد','اليوم، 4:30 م'],['الحضور','5 متدربين']],activities:[['✓','خطة الجلسة','جاهزة'],['◌','تقييم المهارات','بانتظار الإدخال'],['!','اعتماد سجل غوص','طلب جديد']],services:[['▤','المتدربون','التقدم والحضور'],['◈','جدول التدريب','الجلسات والمواقع'],['✓','تقييم المهارات','معايير واعتمادات'],['◎','سجلات الغوص','مراجعة وتوقيع'],['□','المحتوى التدريبي','الدروس والواجبات'],['♢','الرسائل','تواصل آمن']]},
  center:{label:'إدارة مركز الغوص',labelEn:'Dive centre workspace',title:'مركز العمليات البحرية',copy:'إدارة الرحلات والمدربين والمعدات والحجوزات من لوحة واحدة.',action:'إنشاء رحلة',focus:'رحلة القارب الصباحية',state:'REVIEW',metrics:[['28','حجزًا نشطًا'],['6','مدربين'],['84%','إشغال الأسبوع'],['14','طلب مراجعة']],details:[['القارب','HYDRO 01'],['السعة','8 من 10'],['قرار السلامة','يحتاج مراجعة']],activities:[['◌','اعتماد قائمة السلامة','قبل 6:00 ص'],['✓','توزيع المدربين','مكتمل'],['!','أسطوانة تحتاج فحصًا','المستودع']],services:[['◈','الرحلات','الجدولة والسعة'],['▥','الحجوزات','العملاء والمدفوعات'],['♙','الفريق','المدربون والصلاحيات'],['□','المستودع','المعدات والصيانة'],['✓','السلامة','القوائم والقرارات'],['▤','التقارير','التشغيل والمالية']]},
  boat:{label:'مساحة صاحب القارب',labelEn:'Boat owner workspace',title:'تشغيل القارب والرحلات',copy:'تابع الجاهزية، الطاقم، التصاريح والرحلات البحرية.',action:'فحص الجاهزية',focus:'القارب HYDRO 01',state:'GO',metrics:[['4','رحلات قادمة'],['2','أفراد الطاقم'],['100%','جاهزية الوثائق'],['82%','إشغال']],details:[['المغادرة','مرسى القحمة'],['الوقود','92%'],['الصيانة','بعد 18 ساعة']],activities:[['✓','التأمين والترخيص','ساريان'],['✓','تكليف القبطان','مؤكد'],['◌','فحص ما قبل الإبحار','موعده 6:00 ص']],services:[['◈','جدول الرحلات','المواعيد والمسارات'],['⚓','القوارب','الوثائق والحالة'],['♙','الطاقم','التكليفات والرخص'],['✓','فحص الإبحار','قائمة الجاهزية'],['□','الصيانة','السجل والتنبيهات'],['▤','الإيرادات','التسويات والفواتير']]},
  organization:{label:'بوابة الشركات والجهات',labelEn:'Organizations workspace',title:'إدارة الحجوزات الجماعية',copy:'خطط البرامج البحرية، اعتمد المشاركين، وتابع الفواتير والتقارير.',action:'طلب برنامج',focus:'برنامج فريق السلامة',state:'GO',metrics:[['2','برامج نشطة'],['24','مشاركًا'],['1','فاتورة مفتوحة'],['100%','اكتمال النماذج']],details:[['التاريخ','21 سبتمبر'],['الموقع','ساحل عسير'],['المشاركون','12 شخصًا']],activities:[['✓','قائمة المشاركين','مكتملة'],['✓','العرض المالي','معتمد'],['◌','توقيع العقد','بانتظار المفوض']],services:[['◇','البرامج','الطلبات والعروض'],['♙','المشاركون','الأسماء والمتطلبات'],['▥','العقود','التوقيع الإلكتروني'],['▤','الفواتير','الدفع والتسويات'],['✓','الامتثال','النماذج والتصاريح'],['◎','التقارير','الحضور والنتائج']]},
  admin:{label:'الإدارة الرئيسية',labelEn:'Administration workspace',title:'نظرة تشغيلية شاملة',copy:'راقب المنصة واعتمد الطلبات دون تجاوز القيود التنظيمية أو قرارات السلامة.',action:'فتح المراجعات',focus:'طلبات التفعيل',state:'REVIEW',metrics:[['1,284','حسابًا'],['14','مراجعة معلقة'],['19','رحلة مفتوحة'],['63','حجزًا نشطًا']],details:[['الأولوية','3 طلبات عالية'],['الأقدم','منذ ساعتين'],['المراجعون','2 متاحان']],activities:[['!','طلب مركز غوص','يتطلب مراجعة'],['◌','مؤهل مدرب','التحقق من الإثبات'],['✓','تفعيل صاحب قارب','تم اليوم']],services:[['▤','صندوق المراجعة','التفعيل والمؤهلات'],['♙','المستخدمون','الأدوار والصلاحيات'],['◈','العمليات','الرحلات والحجوزات'],['✓','السلامة','القرارات والسجلات'],['▥','المالية','المدفوعات والفواتير'],['◎','سجل التدقيق','الأحداث غير القابلة للحذف']]}
};

let role = localStorage.getItem('hydroland-role') || 'diver';
let language = localStorage.getItem('hydroland-language') || 'ar';
const byId = id => document.getElementById(id);

function renderNavigation(){
  const items=[...sharedNav,['roles','⇄','تبديل الواجهة','Switch role']];
  const html=items.map(([key,icon,ar,en],i)=>`<button class="nav-item ${i===0?'active':''}" data-nav="${key}" type="button"><span class="nav-icon">${icon}</span><span>${language==='ar'?ar:en}</span></button>`).join('');
  byId('navigation').innerHTML=html; byId('mobile-nav').innerHTML=html;
  document.querySelectorAll('[data-nav]').forEach(button=>button.addEventListener('click',()=>button.dataset.nav==='roles'?openRoles():notify(language==='ar'?'هذه الشاشة جاهزة للربط التفصيلي.':'This view is ready for detailed integration.')));
}
function renderWorkspace(){
  const data=workspaces[role];
  document.documentElement.lang=language; document.documentElement.dir=language==='ar'?'rtl':'ltr';
  byId('role-label').textContent=language==='ar'?data.label:data.labelEn;
  byId('page-title').textContent=language==='ar'?'لوحة اليوم':'Today overview';
  byId('hero-title').textContent=data.title; byId('hero-copy').textContent=data.copy; byId('primary-action').textContent=data.action;
  byId('metrics').innerHTML=data.metrics.map(([value,label],i)=>`<article class="metric"><span>${label}</span><strong>${value}</strong><small>${i===0?'↗ '+(language==='ar'?'محدّث الآن':'Updated now'):(language==='ar'?'حالة مباشرة':'Live state')}</small></article>`).join('');
  byId('focus-title').textContent=data.focus; byId('focus-state').textContent=data.state; byId('focus-state').className=`decision ${data.state==='GO'?'go':data.state==='NO_GO'?'no-go':'review'}`;
  byId('focus-body').innerHTML=`<div class="focus-details">${data.details.map(([label,value])=>`<div class="detail"><span>${label}</span><strong>${value}</strong></div>`).join('')}</div>`;
  byId('activity-list').innerHTML=data.activities.map(([icon,title,state])=>`<div class="activity"><i>${icon}</i><div><strong>${title}</strong><span>${state}</span></div></div>`).join('');
  byId('services').innerHTML=data.services.map(([icon,title,copy])=>`<button class="service" type="button"><span class="service-icon">${icon}</span><strong>${title}</strong><span>${copy}</span></button>`).join('');
  document.querySelectorAll('.service').forEach(button=>button.addEventListener('click',()=>notify(`${button.querySelector('strong').textContent}: ${language==='ar'?'جاهزة للربط بالمسار المخصص':'ready for endpoint integration'}`)));
  localStorage.setItem('hydroland-role',role);
}
function openRoles(){
  byId('role-options').innerHTML=Object.entries(workspaces).map(([key,data])=>`<button class="role-option" type="button" data-role="${key}"><strong>${data.label}</strong><br><small>${data.labelEn}</small></button>`).join('');
  byId('role-options').querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{role=button.dataset.role;byId('role-dialog').close();renderWorkspace()}));
  byId('role-dialog').showModal();
}
function notify(message){const toast=byId('toast');toast.textContent=message;toast.classList.add('visible');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>toast.classList.remove('visible'),2800)}
async function api(path, options={}){
  const token=sessionStorage.getItem('hydroland-access-token');
  const response=await fetch(`${API_BASE}${path}`,{...options,headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{}) ,...options.headers}});
  if(!response.ok) throw new Error(`API ${response.status}`); return response.json();
}
async function refresh(){
  const endpoint=role==='admin'?'/admin/overview':role==='diver'?'/bookings/mine':'/trips';
  byId('api-state').textContent=language==='ar'?'جارٍ الاتصال…':'Connecting…';
  try{await api(endpoint);byId('api-state').textContent=language==='ar'?'متصل بالخادم':'API connected';byId('api-state').classList.add('live');notify(language==='ar'?'تم تحديث البيانات':'Data refreshed')}
  catch{byId('api-state').textContent=language==='ar'?'وضع المعاينة':'Preview mode';byId('api-state').classList.remove('live');notify(language==='ar'?'الخادم غير متاح؛ تم الحفاظ على بيانات المعاينة.':'Server unavailable; preview data retained.')}
}
byId('menu').addEventListener('click',()=>{const open=document.querySelector('.sidebar').classList.toggle('open');byId('menu').setAttribute('aria-expanded',String(open))});
byId('language').addEventListener('click',()=>{language=language==='ar'?'en':'ar';localStorage.setItem('hydroland-language',language);byId('language').textContent=language==='ar'?'EN':'العربية';renderNavigation();renderWorkspace()});
byId('primary-action').addEventListener('click',()=>notify(language==='ar'?'تم فتح الإجراء الرئيسي للواجهة':'Primary workspace action opened'));
byId('refresh').addEventListener('click',refresh);
renderNavigation();renderWorkspace();
if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});

export { api, workspaces };
