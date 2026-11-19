(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = (typeof window==='undefined'?globalThis:window).HydrolandI18n?.createScope("greeting-cards", {
  "مثال: اسمك": "Example: your name",
  "بطاقة معايدة باسمك": "A greeting card in your name",
  "بطاقة موسمية قابلة للمشاركة، ولا تتضمن أي بيانات عضوية خاصة.": "A shareable seasonal card without private membership data.",
  "مبارك عليكم الموسم": "Season's greetings",
  "كل عام وأنتم بخير": "Wishing you a wonderful year",
  "الغواص عضو HYDROLAND يهنئكم": "Greetings from a HYDROLAND member and diver",
  "تابع رحلتك البحرية معنا · hydroland-web.onrender.com": "Continue your marine journey with us · hydroland-web.onrender.com",
  "اسمك": "Your name",
  "صفتك": "Your role",
  "غواص": "Diver",
  "مدرب": "Instructor",
  "صاحب وسيلة بحرية": "Marine vessel owner",
  "مركز غوص": "Dive center",
  "تحديث البطاقة": "Update card",
  "مشاركة التهنئة": "Share greeting",
  "عيد الفطر المبارك": "Eid al-Fitr",
  "عيدكم مبارك وكل عام وأنتم بخير": "Eid Mubarak and best wishes",
  "عيد الأضحى المبارك": "Eid al-Adha",
  "كل عام وأنتم بخير، أعاده الله عليكم بالخير": "Wishing you a blessed Eid and a wonderful year",
  "اليوم الوطني السعودي": "Saudi National Day",
  "دام عزك يا وطن": "May our homeland continue to flourish",
  "يوم التأسيس": "Founding Day",
  "يوم بدينا، إرث نفخر به": "Our beginnings, a heritage we cherish",
  "موسم الشتاء": "Winter season",
  "شتاء بحري آمن ومغامرات أجمل": "A safe marine winter and wonderful adventures",
  "موسم الصيف": "Summer season",
  "صيف بحري مليء بالمغامرات": "A marine summer full of adventures",
  "موسم HYDROLAND": "HYDROLAND season",
  "أجمل التحايا من مجتمعنا البحري": "Warm greetings from our marine community",
  "عضو HYDROLAND": "HYDROLAND member",
  "يهنئكم": "sends greetings",
  "{0} {1} يهنئكم": "{0} {1} sends greetings"
}) || {t:value=>value,message(text,values=[]){return this.format(text,values)},messageHTML(value){return String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},setMessage:(node,value)=>(node.textContent=value??''),attribute(name,text,values=[]){return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'},label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

const a=document.querySelector('.membership');if(!a)return;const s=document.createElement('section');s.className='greeting-cards';uiLocale.setHTML(s, uiLocale.html`<header><div><small>HYDROLAND GREETING CARDS</small><h2>بطاقة معايدة باسمك</h2><p>بطاقة موسمية قابلة للمشاركة، ولا تتضمن أي بيانات عضوية خاصة.</p></div></header><div class="greeting-grid"><article class="greeting-preview"><div class="greeting-brand"><img src="./assets/hydroland-mark-reference.webp" alt=""><b>HYDROLAND</b></div><span data-occasion>مبارك عليكم الموسم</span><h3 data-greeting>كل عام وأنتم بخير</h3><p data-sender>الغواص عضو HYDROLAND يهنئكم</p><small>تابع رحلتك البحرية معنا · hydroland-web.onrender.com</small></article><form class="greeting-form"><label>اسمك<input name="name" maxlength="60" placeholder="مثال: اسمك"></label><label>صفتك<select name="role"><option value="غواص">غواص</option><option value="مدرب">مدرب</option><option value="صاحب وسيلة بحرية">صاحب وسيلة بحرية</option><option value="مركز غوص">مركز غوص</option></select></label><button>تحديث البطاقة</button><button type="button" data-share>مشاركة التهنئة</button></form></div>`);a.insertAdjacentElement('afterend',s);const text=()=>{const id=document.documentElement.dataset.theme||'ocean-horizon',map={'eid-al-fitr':['عيد الفطر المبارك','عيدكم مبارك وكل عام وأنتم بخير'],'eid-al-adha':['عيد الأضحى المبارك','كل عام وأنتم بخير، أعاده الله عليكم بالخير'],'national-day':['اليوم الوطني السعودي','دام عزك يا وطن'],'founding-day':['يوم التأسيس','يوم بدينا، إرث نفخر به'],'winter-current':['موسم الشتاء','شتاء بحري آمن ومغامرات أجمل'],'summer-coast':['موسم الصيف','صيف بحري مليء بالمغامرات']};return map[id]||['موسم HYDROLAND','أجمل التحايا من مجتمعنا البحري']};const update=()=>{const f=s.querySelector('form'),[o,g]=text(),n=f.elements.namedItem('name').value.trim()||uiLocale.message('عضو HYDROLAND'),r=f.elements.namedItem('role').value;uiLocale.setText(s.querySelector('[data-occasion]'), o);uiLocale.setText(s.querySelector('[data-greeting]'), g);uiLocale.setMessage(s.querySelector('[data-sender]'), uiLocale.message("{0} {1} يهنئكم", [['غواص','مدرب','صاحب وسيلة بحرية','مركز غوص'].includes(r)?uiLocale.message(r):r, n]))};s.querySelector('form').onsubmit=e=>{e.preventDefault();update()};s.querySelector('[data-share]').onclick=async()=>{update();const t=s.querySelector('[data-greeting]').textContent+' — '+s.querySelector('[data-sender]').textContent+' · HYDROLAND';if(navigator.share)await navigator.share({title:'HYDROLAND',text:t,url:location.href});else navigator.clipboard?.writeText(t);};document.addEventListener('hydroland:theme-changed',update);update()})();
