const $=id=>document.getElementById(id);
const workspaces={diver:{},instructor:{},center:{},boat:{},organization:{},admin:{}};
const roleData={
  instructor:{label:'INSTRUCTOR · المدرب',title:'واجهة المدرب المحترف',metrics:[['47','طالبًا نشطًا'],['4','جلسات اليوم'],['96%','نسبة الحضور']],tasks:['إدارة الطلاب وتقييم المهارات','جلسة مهارات المياه المفتوحة · 4:30 م','إصدار الشهادات بعد الاعتماد']},
  center:{label:'DIVE CENTER · مركز الغوص',title:'لوحة مركز الغوص',metrics:[['18','حجزًا جديدًا'],['4','رحلات اليوم'],['14','مراجعة سلامة']],tasks:['متابعة الحجوزات والرحلات','الطاقم والمعدات والوسائط البحرية','الامتثال والمالية والتقارير']},
  boat:{label:'MARINE OPERATOR · مشغل بحري',title:'لوحة صاحب القارب',metrics:[['3','رحلات مجدولة'],['2','فحص صيانة'],['10','طاقم ومشاركون']],tasks:['إدارة الرحلات والتقويم','فحص القارب والوثائق والتراخيص','جاهزية الطاقم والسلامة']},
  organization:{label:'ORGANIZATION · جهة',title:'لوحة الشركات والجهات',metrics:[['6','طلبات خدمة'],['2','عقود قيد المراجعة'],['12','مشاركًا']],safety:['REVIEW_REQUIRED','المراجعة التنظيمية مطلوبة','أحد الطلبات يحتاج اعتمادًا متسلسلًا قبل التفعيل.'],tasks:['طلبات التجارب البحرية','العقود والتوقيع الإلكتروني','تقارير السلامة والالتزام']},
  admin:{label:'ADMIN · الإدارة الرئيسية',title:'لوحة الإدارة الرئيسية',metrics:[['63','طلب اعتماد'],['19','رحلة مفتوحة'],['14','مراجعة امتثال']],safety:['GO','مركز قيادة السلامة','لا توجد موانع تنظيمية نشطة على الرحلات المعروضة.'],tasks:['طابور الاعتمادات والمستخدمين','برج التحكم التنظيمي والحوادث','المالية والتكاملات وتدقيق النظام']}
};
function initHydrolandIdentity(){
  document.body.classList.add('hydroland-brand');
  document.title='HYDROLAND | هيدرولاند';
  const premium=document.createElement('link');premium.rel='stylesheet';premium.href='./hydroland-premium.css';document.head.appendChild(premium);
  document.querySelectorAll('body *').forEach(node=>{
    if(node.children.length===0&&node.textContent){node.textContent=node.textContent.replace(/GHAWAS/g,'HYDROLAND').replace(/غوّاص/g,'هيدرولاند');}
  });
  const brand=document.querySelector('.brand');if(brand)brand.setAttribute('aria-label','هيدرولاند الرئيسية');
  const kicker=document.querySelector('.hero-kicker');if(kicker)kicker.textContent='HYDROLAND · ONE OCEAN · MANY OPPORTUNITIES';
  const heroTitle=document.querySelector('.landing-hero h2');if(heroTitle)heroTitle.innerHTML='اكتشف أعماق المملكة<br>بهوية بحرية أذكى';
  const heroCopy=document.querySelector('.landing-hero .hero-copy>p:not(.hero-kicker)');if(heroCopy)heroCopy.textContent='رحلات، تدريب، مجتمع، معدات وسلامة — منصة بحرية سعودية واحدة تجمع تجربتك كاملة.';
  const footer=document.querySelector('.site-footer span:first-child');if(footer)footer.textContent='HYDROLAND · هيدرولاند';
  const memberBrand=document.querySelector('.member-card header strong');if(memberBrand)memberBrand.innerHTML='HYDROLAND<small>PREMIUM DIVER MEMBER</small>';
}
initHydrolandIdentity();
const toast=$('toast');
function notify(message){toast.textContent=message;toast.classList.add('visible');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>toast.classList.remove('visible'),2600)}
$('menu').addEventListener('click',()=>document.querySelector('.sidebar').classList.toggle('open'));
document.querySelectorAll('.nav-item[href]').forEach(link=>link.addEventListener('click',()=>{document.querySelectorAll('.nav-item').forEach(item=>item.classList.remove('active'));link.classList.add('active');document.querySelector('.sidebar').classList.remove('open')}));
document.querySelectorAll('[data-toast]').forEach(button=>button.addEventListener('click',()=>notify(button.dataset.toast)));
$('search-form').addEventListener('submit',event=>{event.preventDefault();notify('سيتم البحث في الرحلات والدورات والمعدات')});
const dialog=$('role-dialog');
$('role-switch').addEventListener('click',()=>dialog.showModal());
$('close-dialog').addEventListener('click',()=>dialog.close());
function openRole(role){
  const data=roleData[role];
  if(!data){$('role-console').hidden=true;notify('تم اختيار واجهة الغواص');return}
  $('role-console').hidden=false;$('role-console-eyebrow').textContent=data.label;$('role-console-title').textContent=data.title;
  $('role-console-metrics').innerHTML=data.metrics.map(([value,label])=>`<article><strong>${value}</strong><small>${label}</small></article>`).join('');
  const [state,title,description]=data.safety||['GO','لقطة السلامة','الطقس والقائمة التشغيلية والطاقم جاهزون.'];
  $('role-console-safety').innerHTML=`<span class="safety-state ${state.toLowerCase()}">${state==='GO'?'✓ GO':state==='NO_GO'?'× NO GO':'! REVIEW'}</span><div><b>${title}</b><small>${description}</small></div><em>آخر تحديث الآن</em>`;
  $('role-console-tasks').innerHTML=data.tasks.map((task,index)=>`<button data-toast="${task}"><span>0${index+1}</span>${task}<b>←</b></button>`).join('');
  $('role-console-tasks').querySelectorAll('[data-toast]').forEach(button=>button.addEventListener('click',()=>notify(button.dataset.toast)));
  notify(`تم فتح ${data.title}`);
}
dialog.querySelectorAll('.role-options button').forEach(button=>button.addEventListener('click',()=>{openRole(button.dataset.role);dialog.close()}));
$('exit-role').addEventListener('click',()=>{ $('role-console').hidden=true;notify('تمت العودة لواجهة الغواص');});
$('language').addEventListener('click',()=>notify('الواجهة الإنجليزية جاهزة للمرحلة التالية'));
const bookingDialog=$('booking-dialog');
document.querySelectorAll('[data-book]').forEach(button=>button.addEventListener('click',()=>{
  const trip=button.dataset.book;
  $('booking-title').textContent=trip;
  $('booking-location').textContent=trip.includes('سمر')?'القحمة · عسير':'البرك · عسير';
  bookingDialog.showModal();
}));
$('close-booking').addEventListener('click',()=>bookingDialog.close());
$('confirm-booking').addEventListener('click',()=>{bookingDialog.close();notify('تم حفظ طلب الحجز — ننتقل الآن إلى مراجعة الأهلية');});
const profileDialog=$('profile-dialog');
[$('profile-open'),$('profile-open-mobile')].forEach(button=>button.addEventListener('click',()=>profileDialog.showModal()));
$('close-profile').addEventListener('click',()=>profileDialog.close());
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
