(()=>{
  // Authored interface messages only. Account, provider and document values remain opaque.
  const uiLocale=window.HydrolandI18n?.createScope("public-discovery", {
  "الرئيسية": "Home",
  "استكشف هيدرولاند": "Explore HYDROLAND",
  "اختر وجهتك التالية بين الرحلات والأنشطة والتدريب والمعدات.": "Choose your next destination among trips, activities, training and equipment.",
  "الرحلات والأنشطة": "Trips and activities",
  "تصفح الرحلات المنشورة وراجع تفاصيلها قبل بدء الحجز.": "Browse published trips and review their details before booking.",
  "الأنشطة البحرية": "Marine activities",
  "اختر نوع التجربة، ثم استعرض الرحلات المنشورة ضمنها.": "Choose an experience, then browse its published trips.",
  "التدريب والدورات": "Training and courses",
  "تعرّف على مسارات التعلم، وتابع دوراتك من حسابك.": "Discover learning paths and track your courses from your account.",
  "المتجر البحري": "Marine store",
  "تصفح السلع والرحلات والدورات والخدمات المتاحة من مكان واحد.": "Browse available goods, trips, courses and services in one place.",
  "مجتمع هيدرولاند": "HYDROLAND community",
  "بحر واحد يجمعنا؛ شارك تجربتك وابقَ على اتصال.": "One sea connects us. Share your experience and stay in touch.",
  "السلامة البحرية": "Marine safety",
  "معلومات الرحلة والجاهزية قبل الانطلاق.": "Trip and readiness information before departure.",
  "المعلومات البحرية": "Marine information",
  "حالة مصادر الطقس والخرائط والرحلات.": "Status of weather, map and trip sources.",
  "الغوص في المياه المفتوحة": "Open water diving",
  "البداية": "Start",
  "تعرّف على مسار البداية في الغوص، واطّلع على خطوات التعلم من خلال مركز التدريب.": "Discover the starting path in diving and learn about its steps through a training center.",
  "الغوص المتقدم": "Advanced diving",
  "تطوير المهارات": "Skill development",
  "استكشف مسار تطوير مهاراتك، وراجع دوراتك وتقدمك التدريبي من حسابك.": "Explore the path to developing your skills and review your courses and training progress from your account.",
  "غواص الإنقاذ": "Rescue diver",
  "السلامة والإنقاذ": "Safety and rescue",
  "تعرّف على مسار الإنقاذ والسلامة، وتابع التدريب والتقييمات المعتمدة على حسابك.": "Discover the rescue and safety path and track training and assessments approved for your account.",
  "الغوص بالقارب": "Boat diving",
  "رحلات إلى مواقع الغوص والشعاب.": "Trips to dive sites and reefs.",
  "الغوص الشاطئي": "Shore diving",
  "تجارب غوص تبدأ من الشاطئ.": "Diving experiences starting from shore.",
  "التجارب البحرية": "Marine experiences",
  "رحلات بحرية وأنشطة أخرى منشورة.": "Published marine trips and other activities.",
  "الرحلات المنشورة وتفاصيل الحجز.": "Published trips and booking details.",
  "اختر نوع تجربتك البحرية.": "Choose your marine experience.",
  "مسارات التعلم والتطور.": "Learning and development paths.",
  "السلع والرحلات والدورات والخدمات.": "Goods, trips, courses and services.",
  "المجتمع": "Community",
  "تجارب مشتركة وهوية بحرية.": "Shared experiences and a marine identity.",
  "الخرائط وحالة المصادر.": "Maps and source status.",
  "اكتشف البحر الأحمر": "Discover the Red Sea",
  "جارٍ تحميل الرحلات...": "Loading trips...",
  "عرض الرحلات ←": "View trips →",
  "مسارك تحت الماء": "Your path underwater",
  "كل غوصة تبدأ بمعرفة": "Every dive starts with knowledge",
  "استكشف مسارات التعلم، ثم تابع تدريبك مع المركز من حسابك.": "Explore learning paths, then follow your training with the center from your account.",
  "مسارات تعريفية؛ المواعيد والرسوم تظهر عند نشر الدورات من المراكز.": "Introductory paths; schedules and fees appear when centers publish courses.",
  "الدورات المتاحة في المتجر": "Courses available in the store",
  "مساري التدريبي": "My training pathway",
  "تعرّف على المسار ←": "Explore the path →",
  "تصفية الرحلات": "Filter trips",
  "كل الرحلات": "All trips",
  "غوص بالقارب": "Boat diving",
  "غوص شاطئي": "Shore dive",
  "تجارب بحرية": "Marine experiences",
  "تصفية المنتجات": "Filter products",
  "الكل": "All",
  "متوفر": "Available",
  "نفد المخزون": "Out of stock",
  "مساعد هيدرولاند الذكي": "HYDROLAND smart assistant",
  "خطط لرحلتك المقبلة في ثوانٍ": "Plan your next trip in seconds",
  "أماكن الغوص": "Dive sites",
  "تخطيط الرحلة": "Trip planning",
  "مسارات التدريب": "Training paths",
  "قريبًا": "Coming soon",
  "معًا لمحيط أكثر أمانًا": "Together for a safer ocean",
  "السلامة وحماية البحر جزء من كل رحلة.": "Safety and protecting the sea are part of every trip.",
  "تعرّف على السلامة __HL_SLOT_1__": "Learn about safety __HL_SLOT_1__",
  "تعرّف على السلامة": "Learn about safety",
  "تعرّف على السلامة {1}": "Learn about safety {1}",
  "قصص وتجارب يجمعها حب المحيط.": "Stories and experiences united by a love of the ocean.",
  "انضم إلى المجتمع __HL_SLOT_3__": "Join the community __HL_SLOT_3__",
  "انضم إلى المجتمع": "Join the community",
  "انضم إلى المجتمع {3}": "Join the community {3}",
  "فتح القائمة": "Open menu",
  "بحث": "Search",
  "ابحث عن رحلة أو وجهة أو تجربة…": "Search for a trip, destination or experience…",
  "الطقس والسلامة البحرية": "Weather and marine safety",
  "الطقس حسب موقع الرحلة": "Weather for the trip location",
  "اختيار موقع الرحلة": "Select a trip location",
  "تحقق من جاهزية رحلتك": "Check your trip readiness",
  "السلامة قبل الانطلاق": "Safety before departure",
  "ارتفاع الموج": "Wave height",
  "سرعة الرياح": "Wind speed",
  "مدى الرؤية": "Visibility",
  "تقنية ذكية": "Smart technology",
  "شراكات استراتيجية": "Strategic partnerships",
  "تدريب الغوص": "Dive training",
  "غوص أكثر أمانًا": "Safer diving",
  "مجتمع نشط": "Active community",
  "بيئة بحرية مستدامة": "Sustainable marine environment",
  "من السعودية… إلى عالم أكثر أمانًا تحت الماء": "From Saudi Arabia… to a safer world underwater",
  "المملكة العربية السعودية": "Kingdom of Saudi Arabia",
  "الرحلات": "Trips",
  "HYDROLAND | هيدرولاند": "HYDROLAND",
  "تعذر تحميل الرحلات": "Could not load trips",
  "__HL_SLOT_0__ رحلة منشورة": "__HL_SLOT_0__ published trips",
  "رحلة منشورة": "published trips",
  "{0} رحلة منشورة": "{0} published trips",
  "لا توجد رحلات منشورة حاليًا": "No trips are currently published",
  "راجع الموعد والموقع والسعة المتاحة، ثم ابدأ الحجز من حسابك.": "Review the date, location and available capacity, then start booking from your account.",
  "الموقع": "Location",
  "الموعد": "Time",
  "المقاعد المتبقية": "Remaining seats",
  "السعر": "Price",
  "حالة الحجز": "Booking status",
  "متاح للحجز": "Available to book",
  "تُراجع الأهلية ومتطلبات المشاركة عند الحجز.": "Eligibility and participation requirements are reviewed when booking.",
  "متابعة الحجز": "Continue booking",
  "سجّل الدخول للحجز": "Sign in to book",
  "لم يُضف وصف تفصيلي لهذا المنتج بعد.": "No detailed description has been added for this product yet.",
  "رمز المنتج": "Product code",
  "المخزون المتاح": "Available stock",
  "راجع السلة لإتمام الطلب من حسابك.": "Review the cart to complete the order from your account.",
  "أضف للسلة": "Add to cart",
  "المسار": "Path",
  "نوع المحتوى": "Content type",
  "تعريف بالمسار التدريبي": "Introduction to the training path",
  "المواعيد والرسوم": "Schedules and fees",
  "تظهر عند نشر الدورات من المراكز": "Appear when centers publish courses",
  "هذه صفحة تعريفية؛ لا تنشئ تسجيلًا أو عملية شراء.": "This is an introductory page; it does not create an enrollment or purchase.",
  "سجّل الدخول لمتابعة تدريبك": "Sign in to continue your training",
  "إغلاق التفاصيل": "Close details",
  "العودة للتصفح": "Back to browsing",
  "صورة توضيحية للنشاط": "Illustrative activity image",
  "جارٍ تحميل التفاصيل...": "Loading details...",
  "تعذر تحميل التفاصيل": "Could not load details",
  "هذا المحتوى غير متاح": "This content is unavailable",
  "أعد المحاولة للاتصال بالخدمة.": "Retry the connection to the service.",
  "نحمّل أحدث البيانات المنشورة.": "Loading the latest published data.",
  "قد يكون الرابط غير صحيح أو لم يعد المحتوى منشورًا.": "The link may be incorrect or the content may no longer be published.",
  "إعادة المحاولة": "Retry",
  "تسجيل الدخول": "Sign in",
  "إنشاء حساب": "Create an account",
  "استكشف الرحلات": "Explore trips",
  "استكشف التدريب": "Explore training"
}) || {messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),attribute:(name,text,values=[])=>name+'=\"'+String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))+'\"',message:(text,values=[])=>String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),setMessage:(node,value)=>(node.textContent=value??''),t:value=>value,label:(text,values=[])=>String(text??'').replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Read the current preference for every action; do not cache a startup value.
  const publicScrollBehavior=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===false?'smooth':'instant';
  if(window.HydrolandPublicUI)return;
  const main=document.getElementById('main');if(!main)return;
  const css=document.createElement('link');css.rel='stylesheet';css.href='./hydroland-public-discovery.css';document.head.appendChild(css);
  const auth=()=>Boolean(window.HydrolandAuth?.isAuthenticated?.());
  let themeButtonHome=null;
  const placeThemeButton=()=>{
    const button=document.querySelector('[data-hl-theme-button]'),language=document.getElementById('hl-sidebar-tools-anchor');
    if(!button||!language)return;
    if(!themeButtonHome){themeButtonHome=document.createComment('theme-button-home');button.before(themeButtonHome)}
    if(!auth())language.before(button);
    else themeButtonHome.after(button);
  };
  document.addEventListener('DOMContentLoaded',placeThemeButton,{once:true});
  const icons={compass:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM15 9l-2 4-4 2 2-4 4-2Z',boat:'M3 13l9 4 9-4-3 7H6l-3-7ZM7 14V8h10v6M12 8V3M8 8l4-5 4 5',water:'M3 8c3-4 6 4 9 0s6 4 9 0M3 13c3-4 6 4 9 0s6 4 9 0M3 18c3-4 6 4 9 0s6 4 9 0',learn:'m2 9 10-6 10 6-10 6L2 9Zm4 3v6c4 3 8 3 12 0v-6M22 9v8',bag:'M5 8h14l2 13H3L5 8Zm3 2V6a4 4 0 0 1 8 0v4',people:'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21v-2a7 7 0 0 1 14 0v2M17 5a4 4 0 0 1 0 8M18 16a6 6 0 0 1 4 5',shield:'m12 2 8 3v7c0 5-8 10-8 10S4 17 4 12V5l8-3Zm-4 9 3 3 5-6'};
  Object.assign(icons,{
    home:'m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9',
    search:'M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15ZM16 16l5 5',
    user:'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 21v-2a8 8 0 0 1 16 0v2',
    userPlus:'M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM2 21v-2a7 7 0 0 1 13-3M19 9v8M15 13h8',
    menu:'M4 6h16M4 12h16M4 18h16',
    arrow:'m14 6-6 6 6 6',
    wind:'M3 8h12a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 17h6a2 2 0 1 1-2 2',
    leaf:'M20 3C8 2 2 8 5 16s14 7 15-13ZM6 19 16 8',
    bot:'M12 3v3M10 3h4M6 7h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3ZM8 11v3M16 11v3M8 17h8M1 11v5M23 11v5',
    island:'M4 19c3-3 13-3 16 0M12 17c2-5 2-9 0-12M12 5C8 1 3 3 3 7c4-2 6-1 9-2Zm0 0c3-4 8-3 9 1-4-1-6-1-9-1ZM12 5C8 5 6 8 7 11l5-6Zm0 0c3 0 6 3 5 6l-5-6Z'
  });
  Object.assign(icons,{boat:'M2 16h20l-5 5H6l-4-5ZM5 16l3-6h9l4 6M8 10l2-4h5l2 4M11 6V3M9 13h2M14 13h3',pin:'M12 22S4 14 4 9a8 8 0 0 1 16 0c0 5-8 13-8 13ZM12 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',network:'M12 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM5 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM19 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM10 9l-4 7M14 9l4 7M8 19h8'});
  const icon=name=>uiLocale.html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[name]||icons.compass}"/></svg>`;
  const pages={home:['الرئيسية',''],explore:['استكشف هيدرولاند','اختر وجهتك التالية بين الرحلات والأنشطة والتدريب والمعدات.'],trips:['الرحلات والأنشطة','تصفح الرحلات المنشورة وراجع تفاصيلها قبل بدء الحجز.'],activities:['الأنشطة البحرية','اختر نوع التجربة، ثم استعرض الرحلات المنشورة ضمنها.'],training:['التدريب والدورات','تعرّف على مسارات التعلم، وتابع دوراتك من حسابك.'],store:['المتجر البحري','تصفح السلع والرحلات والدورات والخدمات المتاحة من مكان واحد.'],community:['مجتمع هيدرولاند','بحر واحد يجمعنا؛ شارك تجربتك وابقَ على اتصال.'],safety:['السلامة البحرية','معلومات الرحلة والجاهزية قبل الانطلاق.'],'marine-intelligence':['المعلومات البحرية','حالة مصادر الطقس والخرائط والرحلات.']};
  const paths=[
    {id:'open-water',title:'الغوص في المياه المفتوحة',name:'Open Water Diver',level:'البداية',description:'تعرّف على مسار البداية في الغوص، واطّلع على خطوات التعلم من خلال مركز التدريب.'},
    {id:'advanced',title:'الغوص المتقدم',name:'Advanced Open Water',level:'تطوير المهارات',description:'استكشف مسار تطوير مهاراتك، وراجع دوراتك وتقدمك التدريبي من حسابك.'},
    {id:'rescue',title:'غواص الإنقاذ',name:'Rescue Diver',level:'السلامة والإنقاذ',description:'تعرّف على مسار الإنقاذ والسلامة، وتابع التدريب والتقييمات المعتمدة على حسابك.'}
  ];
  const activities=[{id:'dive',title:'الغوص بالقارب',copy:'رحلات إلى مواقع الغوص والشعاب.',icon:'boat'},{id:'shore',title:'الغوص الشاطئي',copy:'تجارب غوص تبدأ من الشاطئ.',icon:'water'},{id:'marine',title:'التجارب البحرية',copy:'رحلات بحرية وأنشطة أخرى منشورة.',icon:'compass'}];
  const heading=document.createElement('header');heading.id='hl-public-page-heading';heading.className='hl-public-only';heading.dataset.publicSurface='heading';uiLocale.setHTML(heading, uiLocale.html`<a href="#home">الرئيسية</a><span aria-hidden="true"> / </span><span data-page-crumb></span><h1 data-page-title></h1><p data-page-description></p>`);document.getElementById('home')?.before(heading);
  const explore=document.querySelector('#explore .hl-public-explore-grid');
  if(explore)uiLocale.setHTML(explore, [['trips','boat','الرحلات والأنشطة','الرحلات المنشورة وتفاصيل الحجز.'],['activities','water','الأنشطة البحرية','اختر نوع تجربتك البحرية.'],['training','learn','التدريب والدورات','مسارات التعلم والتطور.'],['store','bag','المتجر البحري','السلع والرحلات والدورات والخدمات.'],['community','people','المجتمع','تجارب مشتركة وهوية بحرية.'],['marine-intelligence','compass','المعلومات البحرية','الخرائط وحالة المصادر.']].map(([id,art,title,copy])=>uiLocale.html`<a href="#${id}" data-explore-art="${id}"><b>${icon(art)}</b><strong>${uiLocale.label(title)}</strong><small>${uiLocale.label(copy)}</small><span class="hl-public-link-arrow" aria-hidden="true">←</span></a>`).join(''));
  const activitySection=document.createElement('section');activitySection.id='activities';activitySection.className='hl-public-activities hl-public-only';uiLocale.setHTML(activitySection, uiLocale.html`<div class="hl-public-activity-grid">${activities.map(item=>uiLocale.html`<article class="hl-public-activity hl-public-art-${item.id}"><div class="hl-public-art">${icon(item.icon)}</div><div><small>اكتشف البحر الأحمر</small><h2>${uiLocale.label(item.title)}</h2><p>${uiLocale.label(item.copy)}</p><span data-activity-count="${item.id}">جارٍ تحميل الرحلات...</span><button type="button" data-activity-filter="${item.id}">عرض الرحلات ←</button></div></article>`).join('')}</div>`);document.getElementById('explore')?.after(activitySection);
  const training=document.getElementById('training');
  if(training)uiLocale.setHTML(training, uiLocale.html`<div class="hl-public-training-intro"><p class="eyebrow">مسارك تحت الماء</p><h2>كل غوصة تبدأ بمعرفة</h2><p>استكشف مسارات التعلم، ثم تابع تدريبك مع المركز من حسابك.</p><small>مسارات تعريفية؛ المواعيد والرسوم تظهر عند نشر الدورات من المراكز.</small><button type="button" class="primary-button" data-public-training-store>الدورات المتاحة في المتجر</button><button type="button" class="primary-button" data-public-training-account>مساري التدريبي</button></div><div class="hl-public-course-grid">${paths.map((path,index)=>uiLocale.html`<article class="hl-public-course" data-course-path="${path.id}"><div class="hl-public-course-art">${icon('learn')}<span>0${index+1}</span></div><small>${uiLocale.label(path.level)}</small><h3>${uiLocale.label(path.title)}</h3><p lang="en" dir="ltr">${path.name}</p><a data-public-detail="course" href="#course/${path.id}">تعرّف على المسار ←</a></article>`).join('')}</div>`);
  const tripSection=document.getElementById('trips'),tripToolbar=document.createElement('div');tripToolbar.className='hl-public-trip-toolbar';uiLocale.setHTML(tripToolbar, uiLocale.html`<div class="hl-public-filters" aria-label="تصفية الرحلات">${[['all','كل الرحلات'],['dive','غوص بالقارب'],['shore','غوص شاطئي'],['marine','تجارب بحرية']].map(([id,title])=>uiLocale.html`<button type="button" data-public-trip-filter="${id}" aria-pressed="${id==='all'}">${uiLocale.label(title)}</button>`).join('')}</div><span data-public-trip-count-label></span>`);tripSection?.querySelector('.section-heading')?.after(tripToolbar);
  const storeFilters=document.querySelector('.hl-store-filters');if(storeFilters){uiLocale.setAttribute(storeFilters, "aria-label", ...['تصفية المنتجات']);uiLocale.setHTML(storeFilters, [['all','الكل'],['available','متوفر'],['unavailable','نفد المخزون']].map(([id,title])=>uiLocale.html`<button type="button" data-product-filter="${id}" aria-pressed="${id==='all'}">${uiLocale.label(title)}</button>`).join(''))}
  const teasers=document.createElement('section');teasers.className='hl-public-home-teasers hl-public-only';teasers.dataset.publicSurface='home';uiLocale.setHTML(teasers, uiLocale.html`<article class="hl-public-teaser-assistant"><img class="hl-public-assistant-art" src="./assets/hydroland-assistant-reference.webp" alt="" aria-hidden="true"><h2>مساعد هيدرولاند الذكي</h2><p>خطط لرحلتك المقبلة في ثوانٍ</p><div class="hl-public-assistant-topics" aria-hidden="true"><span>أماكن الغوص</span><span>تخطيط الرحلة</span><span>مسارات التدريب</span></div><button type="button" disabled>قريبًا</button></article><article class="hl-public-teaser-safety">${icon('leaf')}<h2>معًا لمحيط أكثر أمانًا</h2><p>السلامة وحماية البحر جزء من كل رحلة.</p><a href="#safety">تعرّف على السلامة ${icon('arrow')}</a></article><article class="hl-public-teaser-community">${icon('people')}<h2>مجتمع هيدرولاند</h2><p>قصص وتجارب يجمعها حب المحيط.</p><a href="#community">انضم إلى المجتمع ${icon('arrow')}</a></article>`);main.appendChild(teasers);
  const navIcons={home:'home','hl-diver-dashboard':'home',explore:'compass',trips:'boat',activities:'water',training:'learn',store:'bag',community:'people',safety:'shield'};
  document.querySelectorAll('#navigation a,.mobile-nav a').forEach(link=>{const name=navIcons[link.hash.slice(1)],target=link.querySelector('.nav-icon');if(name&&target)uiLocale.setHTML(target, icon(name))});
  document.querySelector('#profile-open-mobile .nav-icon')?.replaceChildren(...new DOMParser().parseFromString(icon('user'),'text/html').body.childNodes);
  for(const [id,name] of [['visitor-auth-cta','user'],['visitor-register-cta','userPlus']]){const button=document.getElementById(id);if(button){const label=document.createElement('span');uiLocale.setText(label,id==='visitor-auth-cta'?'تسجيل الدخول':'إنشاء حساب');uiLocale.setHTML(button, icon(name));button.appendChild(label)}}
  const menu=document.getElementById('menu');if(menu){uiLocale.setHTML(menu, icon('menu'));uiLocale.setAttribute(menu, "aria-label", ...['فتح القائمة'])}
  const searchButton=document.querySelector('#search-form button');if(searchButton){uiLocale.setHTML(searchButton, icon('search'));uiLocale.setAttribute(searchButton, "aria-label", ...['بحث']);uiLocale.setAttribute(searchButton, "title", ...['بحث'])}
  const searchInput=document.querySelector('#search-form input');if(searchInput)uiLocale.setAttribute(searchInput, "placeholder", ...['ابحث عن رحلة أو وجهة أو تجربة…']);
  document.querySelectorAll('#home .hero-ctas button').forEach(button=>{const label=document.createElement('span');uiLocale.setText(label,button.dataset.toast==='تم فتح الرحلات المتاحة'?'استكشف الرحلات':'استكشف التدريب');uiLocale.setHTML(button, icon(button.classList.contains('primary-button')?'boat':'learn'));button.append(label);uiLocale.insertHTML(button, 'beforeend', icon('arrow'))});
  const marineHeading=document.querySelector('.marine-intelligence__head h2');if(marineHeading)uiLocale.setText(marineHeading, ...['الطقس والسلامة البحرية']);
  document.querySelectorAll('.marine-signal__row').forEach((row,index)=>{uiLocale.insertHTML(row, 'afterbegin', icon(['wind','shield','bot'][index]));if(index===2)uiLocale.setText(row.querySelector('small'), ...['قريبًا'])});
  const weatherPreview=document.createElement('div');weatherPreview.className='hl-public-weather hl-public-only';uiLocale.setHTML(weatherPreview, uiLocale.html`<div class="hl-public-weather-heading">${icon('water')}<strong>—<small>الطقس حسب موقع الرحلة</small></strong><a href="#trips" aria-label="اختيار موقع الرحلة">${icon('pin')}</a></div><div class="hl-public-weather-metrics">${[['water','ارتفاع الموج'],['wind','سرعة الرياح'],['eye','مدى الرؤية']].map(([art,label])=>uiLocale.html`<div>${icon(art)}<b>—</b><small>${uiLocale.label(label)}</small></div>`).join('')}</div><a class="hl-public-weather-safety" href="#safety">${icon('shield')}<span>تحقق من جاهزية رحلتك<small>السلامة قبل الانطلاق</small></span>${icon('arrow')}</a>`);
  document.querySelector('.marine-intelligence__head')?.after(weatherPreview);
  const footer=document.querySelector('.site-footer');if(footer){const values=document.createElement('div');values.className='hl-public-footer hl-public-only';uiLocale.setHTML(values, [['bot','تقنية ذكية','Smart Technology'],['network','شراكات استراتيجية','Strategic Partnerships'],['learn','تدريب الغوص','Dive Training'],['shield','غوص أكثر أمانًا','Safer Diving'],['people','مجتمع نشط','Active Community'],['leaf','بيئة بحرية مستدامة','Sustainable Environment']].map(([art,label,en])=>uiLocale.html`<span>${icon(art)}<b>${uiLocale.label(label)}<small lang="en" dir="ltr">${en}</small></b></span>`).join('')+uiLocale.html`<small class="hl-public-origin">من السعودية… إلى عالم أكثر أمانًا تحت الماء<span lang="en" dir="ltr">From Saudi Arabia… To A Safer Ocean World</span></small>`);footer.prepend(values)}
  const sidebarArt=document.createElement('div');sidebarArt.className='hl-public-sidebar-art hl-public-only';uiLocale.setHTML(sidebarArt, uiLocale.html`<p lang="en" dir="ltr">Explore<br>Learn<br>Protect<br>Belong</p><svg viewBox="0 0 64 70" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" aria-hidden="true"><path d="M32 39V14M32 14C22 2 14 7 12 14c8-4 14-2 20 0M32 14C42 2 50 7 52 14c-8-4-14-2-20 0M32 14C20 11 15 19 16 23l16-9M32 14c12-3 17 5 16 9l-16-9M32 14c-7 5-10 11-9 16l9-16M32 14c7 5 10 11 9 16l-9-16M10 43c10 1 20 10 34 18M54 43c-10 1-20 10-34 18M11 42l-3 5M53 42l3 5M43 57l5 7M21 57l-5 7"/></svg><strong>المملكة العربية السعودية</strong><small lang="en" dir="ltr">SAUDI ARABIA</small>`);document.getElementById('hl-sidebar-tools-anchor')?.before(sidebarArt);
  for(const id of Object.keys(pages)){const node=document.getElementById(id);if(node)node.dataset.publicSurface=id}
  const routebar=document.querySelector('.hl-visitor-routebar');if(routebar){routebar.dataset.publicSurface='home';routebar.querySelectorAll('button').forEach(button=>{uiLocale.setHTML(button.querySelector('b'), icon(button.dataset.visitorTarget==='trips'?'island':button.dataset.visitorTarget==='training'?'learn':'shield'))});routebar.prepend(routebar.querySelector('[data-hl-public-auth]'),routebar.querySelector('[data-visitor-target="training"]'))}
  document.querySelectorAll('.hl-community,.hl-support').forEach(node=>node.dataset.publicSurface='community');
  const tripsNav=document.querySelector('#navigation a[href="#trips"]');if(tripsNav)uiLocale.setText(tripsNav.querySelector('span:last-child'), ...['الرحلات']);
  const storeNav=document.querySelector('#navigation a[href="#store"]'),communityNav=document.querySelector('#navigation a[href="#community"]');if(storeNav&&communityNav)storeNav.before(communityNav);
  const setView=id=>{
    placeThemeButton();
    if(auth()){delete document.body.dataset.publicPage;main.querySelectorAll('.hl-public-page-hidden').forEach(node=>node.classList.remove('hl-public-page-hidden'));document.querySelectorAll('.nav-item[aria-current]').forEach(link=>link.removeAttribute('aria-current'));return false}
    const page=Object.hasOwn(pages,id)?id:'home';document.body.dataset.publicPage=page;
    const visible=new Set(page==='home'?['home','trips','marine-intelligence']:['heading',page]);
    main.querySelectorAll(':scope>[data-public-surface]').forEach(node=>node.classList.toggle('hl-public-page-hidden',!visible.has(node.dataset.publicSurface)));
    uiLocale.setText(heading.querySelector('[data-page-title]'),pages[page][0]);uiLocale.setText(heading.querySelector('[data-page-description]'),pages[page][1]);uiLocale.setText(heading.querySelector('[data-page-crumb]'),pages[page][0]);
    document.title=page==='home'?uiLocale.t('HYDROLAND | هيدرولاند'):uiLocale.t(pages[page][0])+' | HYDROLAND';
    document.querySelectorAll('.nav-item[href]').forEach(link=>{const current=link.getAttribute('href')==='#'+page;link.classList.toggle('active',current);if(current)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current')});
    return Object.hasOwn(pages,id);
  };
  const filterTrips=filter=>{window.HydrolandBookings?.setPublicFilter?.(filter);tripToolbar.querySelectorAll('[data-public-trip-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.publicTripFilter===filter)))};
  const navigate=id=>{const publicPage=setView(id);history.pushState(null,'','#'+id);if(publicPage)window.scrollTo({top:0,behavior:'instant'});else{const target=document.getElementById(id);window.HydrolandWorkspaceUI?.show?.(target);target?.scrollIntoView({behavior:publicScrollBehavior(),block:'start'})}document.querySelector('.sidebar')?.classList.remove('open')};
  const openTraining=()=>{if(!auth()){document.getElementById('visitor-auth-cta')?.click();return}window.HydrolandTraining?.reload?.();window.HydrolandWorkspaceUI?.show?.(document.querySelector('.hl-training'));document.querySelector('.hl-training')?.scrollIntoView({behavior:publicScrollBehavior(),block:'start'})};
  const updateCounts=()=>{const client=window.HydrolandBookings,trips=client?.getPublicTrips?.()||[],status=client?.getPublicStatus?.();activitySection.querySelectorAll('[data-activity-count]').forEach(node=>{const count=trips.filter(trip=>client.publicCategory(trip)===node.dataset.activityCount).length;uiLocale.setText(node, ...(status==='loading'?['جارٍ تحميل الرحلات...']:(status==='error'?['تعذر تحميل الرحلات']:(count?["{0} رحلة منشورة", [count]]:['لا توجد رحلات منشورة حاليًا']))))});const count=tripSection?.querySelector('[data-public-trip-grid]')?.dataset.publicTripCount;uiLocale.setMessage(tripToolbar.querySelector('[data-public-trip-count-label]'),status==='ready'?uiLocale.message('{0} رحلة منشورة',[count||0]):'')};
  const dialog=document.createElement('dialog');dialog.id='hl-public-detail';dialog.className='hl-public-detail';dialog.setAttribute('aria-labelledby','hl-public-detail-title');document.body.appendChild(dialog);
  let returnHash=null,detailTrigger=null;
  const restoreDetailFocus=()=>{
    const trigger=detailTrigger;detailTrigger=null;if(!trigger)return;
    // Fragment navigation may reset focus after dialog.close(); restore it after routing.
    requestAnimationFrame(()=>{if(dialog.open)return;const target=trigger.isConnected?trigger:[...document.querySelectorAll('[data-public-detail]')].find(link=>link.getAttribute('href')===trigger.getAttribute('href'));target?.focus({preventScroll:true})});
  };
  const routeParts=()=>{const parts=location.hash.slice(1).split('/');try{return {kind:parts[0],id:decodeURIComponent(parts.slice(1).join('/'))}}catch{return {kind:parts[0],id:''}}};
  const parentPage=kind=>({trip:'trips',product:'store',course:'training'})[kind];
  const closeDetails=()=>{
    const parent=parentPage(routeParts().kind)||'home';if(dialog.open)dialog.close();
    if(returnHash){returnHash=null;history.back()}else{history.replaceState(null,'','#'+parent);setView(parent);restoreDetailFocus()}
  };
  const leaveDetailsForAction=kind=>{detailTrigger=null;dialog.close();history.replaceState(null,'',returnHash||'#'+parentPage(kind));returnHash=null;setView(parentPage(kind))};
  const renderDetails=()=>{
    const {kind,id}=routeParts(),parent=parentPage(kind);if(!parent){if(dialog.open)dialog.close();return false}
    setView(parent);if(!auth()&&!window.HydrolandAuth?.isGuestMode?.()){if(dialog.open)dialog.close();return true}let detail=null,status='ready',retry=null;
    if(kind==='trip'){
      const client=window.HydrolandBookings,trip=client?.getPublicTrips?.().find(item=>item.id===id);status=client?.getPublicStatus?.()||'loading';retry=()=>client.reload();
      if(trip){const availability=window.HydrolandBookingAvailability,reason=(availability?.explainMessage?.(trip)??availability?.explain?.(trip))||'';detail={title:trip.title,label:client.tripTypeMessage?.(trip.type)??client.tripTypeLabel(trip.type),description:trip.description||trip.summary||uiLocale.message('راجع الموعد والموقع والسعة المتاحة، ثم ابدأ الحجز من حسابك.'),art:'sea',imageCategory:client.publicCategory(trip),facts:[[uiLocale.message('الموقع'),client.locationText(trip)],[uiLocale.message('الموعد'),client.tripDate(trip)],[uiLocale.message('المقاعد المتبقية'),String(trip.remainingSeats??trip.capacity??0)],[uiLocale.message('السعر'),client.formatPrice(trip.price)],[uiLocale.message('حالة الحجز'),reason||uiLocale.message('متاح للحجز')]],note:uiLocale.message('تُراجع الأهلية ومتطلبات المشاركة عند الحجز.'),action:reason||(auth()?uiLocale.message('متابعة الحجز'):uiLocale.message('سجّل الدخول للحجز')),disabled:Boolean(reason),run:()=>client.openBooking(id)}}
    }else if(kind==='product'){
      const client=window.HydrolandStore,product=client?.getProducts?.().find(item=>item.id===id);status=client?.getPublicStatus?.()||'loading';retry=()=>client.reloadProducts();
      if(product)detail={title:product.nameAr,label:uiLocale.message('المتجر البحري'),description:product.description||uiLocale.message('لم يُضف وصف تفصيلي لهذا المنتج بعد.'),art:'product',facts:[[uiLocale.message('رمز المنتج'),product.sku],[uiLocale.message('السعر'),new Intl.NumberFormat('ar-SA',{style:'currency',currency:product.currency||'SAR'}).format(product.priceMinor/100)],[uiLocale.message('المخزون المتاح'),String(product.stockQuantity)]],note:uiLocale.message('راجع السلة لإتمام الطلب من حسابك.'),action:product.stockQuantity<1?uiLocale.message('نفد المخزون'):uiLocale.message('أضف للسلة'),disabled:product.stockQuantity<1,run:()=>client.addToCart(id)};
    }else{const path=paths.find(item=>item.id===id);if(path)detail={title:uiLocale.message(path.title),label:path.name,description:uiLocale.message(path.description),art:'course',facts:[[uiLocale.message('المسار'),uiLocale.message(path.level)],[uiLocale.message('نوع المحتوى'),uiLocale.message('تعريف بالمسار التدريبي')],[uiLocale.message('المواعيد والرسوم'),uiLocale.message('تظهر عند نشر الدورات من المراكز')]],note:uiLocale.message('هذه صفحة تعريفية؛ لا تنشئ تسجيلًا أو عملية شراء.'),action:auth()?uiLocale.message('مساري التدريبي'):uiLocale.message('سجّل الدخول لمتابعة تدريبك'),run:openTraining}}
    uiLocale.setHTML(dialog, uiLocale.html`<div class="hl-public-detail-head"><span data-detail-label></span><button type="button" data-detail-close aria-label="إغلاق التفاصيل">×</button></div><div class="hl-public-detail-body" tabindex="0" role="region" aria-labelledby="hl-public-detail-title"><div class="hl-public-detail-art" aria-hidden="true"></div><div class="hl-public-detail-content"><h2 id="hl-public-detail-title"></h2><p data-detail-description></p><dl data-detail-facts></dl><p class="hl-public-detail-note" data-detail-note></p></div></div><div class="hl-public-detail-actions"><button type="button" class="primary-button" data-detail-action></button><button type="button" class="ghost-button" data-detail-back>العودة للتصفح</button></div>`);
    dialog.querySelector('[data-detail-close]').addEventListener('click',closeDetails);dialog.querySelector('[data-detail-back]').addEventListener('click',closeDetails);
    const action=dialog.querySelector('[data-detail-action]'),art=dialog.querySelector('.hl-public-detail-art');
    if(detail){uiLocale.setMessage(dialog.querySelector('[data-detail-label]'),detail.label);uiLocale.setMessage(dialog.querySelector('h2'),detail.title);uiLocale.setMessage(dialog.querySelector('[data-detail-description]'),detail.description);uiLocale.setMessage(dialog.querySelector('[data-detail-note]'),detail.note);art.classList.add('hl-public-detail-art-'+detail.art);if(detail.imageCategory){art.dataset.publicArt=detail.imageCategory;const note=document.createElement('small');note.className='hl-trip-art-note';uiLocale.setText(note, ...['صورة توضيحية للنشاط']);art.appendChild(note)}if(detail.art!=='sea')uiLocale.setHTML(art, icon(detail.art==='product'?'bag':'learn'));for(const [label,value] of detail.facts){const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');uiLocale.setMessage(dt,label);uiLocale.setMessage(dd,value);row.append(dt,dd);dialog.querySelector('dl').appendChild(row)}uiLocale.setMessage(action,detail.action);action.disabled=Boolean(detail.disabled);action.addEventListener('click',()=>{leaveDetailsForAction(kind);detail.run()})}
    if(detail&&['trip','product'].includes(kind))window.HydrolandServiceImages?.showPublic(art,kind,id,detail.title);
    if(!detail){art.hidden=true;uiLocale.setText(dialog.querySelector('h2'), ...[status==='loading'?'جارٍ تحميل التفاصيل...':status==='error'?'تعذر تحميل التفاصيل':'هذا المحتوى غير متاح']);uiLocale.setText(dialog.querySelector('[data-detail-description]'), ...[status==='error'?'أعد المحاولة للاتصال بالخدمة.':status==='loading'?'نحمّل أحدث البيانات المنشورة.':'قد يكون الرابط غير صحيح أو لم يعد المحتوى منشورًا.']);action.hidden=status!=='error';uiLocale.setText(action, ...['إعادة المحاولة']);action.addEventListener('click',()=>void retry?.())}
    if(!dialog.open){
      // Overflow locking does not cancel a smooth scroll already in flight.
      // Preserve the list position and stop that animation after native dialog focus.
      const position={left:window.scrollX,top:window.scrollY,behavior:'instant'};
      dialog.showModal();window.scrollTo(position);
    }
    return true;
  };
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeDetails()});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)closeDetails()}});
  const syncRoute=()=>{if(!renderDetails()){const id=location.hash.slice(1)||'home';setView(id);returnHash=null;restoreDetailFocus()}};
  document.addEventListener('click',event=>{
    const detail=event.target.closest?.('[data-public-detail]');if(detail){event.preventDefault();detailTrigger=detail;returnHash=location.hash||'#'+parentPage(detail.dataset.publicDetail);history.pushState(null,'',detail.getAttribute('href'));renderDetails();return}
    const tripFilter=event.target.closest?.('[data-public-trip-filter]');if(tripFilter){filterTrips(tripFilter.dataset.publicTripFilter);return}
    const activity=event.target.closest?.('[data-activity-filter]');if(activity){filterTrips(activity.dataset.activityFilter);navigate('trips');return}
    const productFilter=event.target.closest?.('[data-product-filter]');if(productFilter){const filter=productFilter.dataset.productFilter;window.HydrolandStore?.setFilter?.(filter);storeFilters.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button===productFilter)));return}
    if(event.target.closest?.('[data-public-training-store]')){window.HydrolandStore?.setTypeFilter?.('courses');navigate('store');return}
    if(event.target.closest?.('[data-public-training-account]')){openTraining();return}
    const anchor=event.target.closest?.('a[href^="#"]');if(!auth()&&anchor&&Object.hasOwn(pages,anchor.hash.slice(1))){event.preventDefault();navigate(anchor.hash.slice(1))}
  },true);
  for(const name of ['hydroland:public-trips-updated','hydroland:public-products-updated'])document.addEventListener(name,()=>{updateCounts();if(parentPage(routeParts().kind))renderDetails()});
  for(const name of ['hydroland:auth-changed','hydroland:guest-mode'])document.addEventListener(name,syncRoute);
  window.addEventListener('hashchange',syncRoute);
  document.addEventListener('hydroland:locale-changed',()=>{if(auth())return;const page=document.body.dataset.publicPage||'home';if(pages[page])document.title=page==='home'?uiLocale.t('HYDROLAND | هيدرولاند'):uiLocale.t(pages[page][0])+' | HYDROLAND'});
  window.HydrolandPublicUI={setView,navigate,filterTrips};updateCounts();syncRoute();
})();

