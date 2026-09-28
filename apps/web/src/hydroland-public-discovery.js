(()=>{
  if(window.HydrolandPublicUI)return;
  const main=document.getElementById('main');if(!main)return;
  const css=document.createElement('link');css.rel='stylesheet';css.href='./hydroland-public-discovery.css';document.head.appendChild(css);
  const auth=()=>Boolean(window.HydrolandAuth?.isAuthenticated?.());
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
  const icon=name=>`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[name]||icons.compass}"/></svg>`;
  const pages={home:['الرئيسية',''],explore:['استكشف هيدرولاند','اختر وجهتك التالية بين الرحلات والأنشطة والتدريب والمعدات.'],trips:['الرحلات والأنشطة','تصفح الرحلات المنشورة وراجع تفاصيلها قبل بدء الحجز.'],activities:['الأنشطة البحرية','اختر نوع التجربة، ثم استعرض الرحلات المنشورة ضمنها.'],training:['التدريب والدورات','تعرّف على مسارات التعلم، وتابع دوراتك من حسابك.'],store:['المتجر البحري','اطّلع على تفاصيل المنتجات والأسعار والمخزون المتاح.'],community:['مجتمع هيدرولاند','بحر واحد يجمعنا؛ شارك تجربتك وابقَ على اتصال.'],safety:['السلامة البحرية','معلومات الرحلة والجاهزية قبل الانطلاق.'],'marine-intelligence':['المعلومات البحرية','حالة مصادر الطقس والخرائط والرحلات.']};
  const paths=[
    {id:'open-water',title:'الغوص في المياه المفتوحة',name:'Open Water Diver',level:'البداية',description:'تعرّف على مسار البداية في الغوص، واطّلع على خطوات التعلم من خلال مركز التدريب.'},
    {id:'advanced',title:'الغوص المتقدم',name:'Advanced Open Water',level:'تطوير المهارات',description:'استكشف مسار تطوير مهاراتك، وراجع دوراتك وتقدمك التدريبي من حسابك.'},
    {id:'rescue',title:'غواص الإنقاذ',name:'Rescue Diver',level:'السلامة والإنقاذ',description:'تعرّف على مسار الإنقاذ والسلامة، وتابع التدريب والتقييمات المعتمدة على حسابك.'}
  ];
  const activities=[{id:'dive',title:'الغوص بالقارب',copy:'رحلات إلى مواقع الغوص والشعاب.',icon:'boat'},{id:'shore',title:'الغوص الشاطئي',copy:'تجارب غوص تبدأ من الشاطئ.',icon:'water'},{id:'marine',title:'التجارب البحرية',copy:'رحلات بحرية وأنشطة أخرى منشورة.',icon:'compass'}];
  const heading=document.createElement('header');heading.id='hl-public-page-heading';heading.className='hl-public-only';heading.dataset.publicSurface='heading';heading.innerHTML='<a href="#home">الرئيسية</a><span aria-hidden="true"> / </span><span data-page-crumb></span><h1 data-page-title></h1><p data-page-description></p>';document.getElementById('home')?.before(heading);
  const explore=document.querySelector('#explore .hl-public-explore-grid');
  if(explore)explore.innerHTML=[['trips','boat','الرحلات والأنشطة','الرحلات المنشورة وتفاصيل الحجز.'],['activities','water','الأنشطة البحرية','اختر نوع تجربتك البحرية.'],['training','learn','التدريب والدورات','مسارات التعلم والتطور.'],['store','bag','المتجر البحري','المنتجات والأسعار والمخزون.'],['community','people','المجتمع','تجارب مشتركة وهوية بحرية.'],['marine-intelligence','compass','المعلومات البحرية','الخرائط وحالة المصادر.']].map(([id,art,title,copy])=>`<a href="#${id}"><b>${icon(art)}</b><strong>${title}</strong><small>${copy}</small><span class="hl-public-link-arrow" aria-hidden="true">←</span></a>`).join('');
  const activitySection=document.createElement('section');activitySection.id='activities';activitySection.className='hl-public-activities hl-public-only';activitySection.innerHTML=`<div class="hl-public-activity-grid">${activities.map(item=>`<article class="hl-public-activity hl-public-art-${item.id}"><div class="hl-public-art">${icon(item.icon)}</div><div><small>اكتشف البحر الأحمر</small><h2>${item.title}</h2><p>${item.copy}</p><span data-activity-count="${item.id}">جارٍ تحميل الرحلات...</span><button type="button" data-activity-filter="${item.id}">عرض الرحلات ←</button></div></article>`).join('')}</div>`;document.getElementById('explore')?.after(activitySection);
  const training=document.getElementById('training');
  if(training)training.innerHTML=`<div class="hl-public-training-intro"><p class="eyebrow">مسارك تحت الماء</p><h2>كل غوصة تبدأ بمعرفة</h2><p>استكشف مسارات التعلم، ثم تابع تدريبك مع المركز من حسابك.</p><small>مسارات تعريفية؛ المواعيد والرسوم تظهر عند نشر الدورات من المراكز.</small><button type="button" class="primary-button" data-public-training-account>مساري التدريبي</button></div><div class="hl-public-course-grid">${paths.map((path,index)=>`<article class="hl-public-course"><div class="hl-public-course-art">${icon('learn')}<span>0${index+1}</span></div><small>${path.level}</small><h3>${path.title}</h3><p lang="en" dir="ltr">${path.name}</p><a data-public-detail="course" href="#course/${path.id}">تعرّف على المسار ←</a></article>`).join('')}</div>`;
  const tripSection=document.getElementById('trips'),tripToolbar=document.createElement('div');tripToolbar.className='hl-public-trip-toolbar';tripToolbar.innerHTML='<div class="hl-public-filters" aria-label="تصفية الرحلات">'+[['all','كل الرحلات'],['dive','غوص بالقارب'],['shore','غوص شاطئي'],['marine','تجارب بحرية']].map(([id,title])=>`<button type="button" data-public-trip-filter="${id}" aria-pressed="${id==='all'}">${title}</button>`).join('')+'</div><span data-public-trip-count-label></span>';tripSection?.querySelector('.section-heading')?.after(tripToolbar);
  const storeFilters=document.querySelector('.hl-store-filters');if(storeFilters){storeFilters.setAttribute('aria-label','تصفية المنتجات');storeFilters.innerHTML=[['all','الكل'],['available','متوفر'],['unavailable','نفد المخزون']].map(([id,title])=>`<button type="button" data-product-filter="${id}" aria-pressed="${id==='all'}">${title}</button>`).join('')}
  const teasers=document.createElement('section');teasers.className='hl-public-home-teasers hl-public-only';teasers.dataset.publicSurface='home';teasers.innerHTML=`<article class="hl-public-teaser-assistant">${icon('bot')}<h2>مساعد هيدرولاند الذكي</h2><p>تخطيط تجربتك البحرية في مكان واحد.</p><button type="button" disabled>قريبًا</button></article><article class="hl-public-teaser-safety">${icon('leaf')}<h2>معًا لمحيط أكثر أمانًا</h2><p>استكشف معلومات السلامة قبل رحلتك.</p><a href="#safety">مركز السلامة ${icon('arrow')}</a></article><article class="hl-public-teaser-community">${icon('people')}<h2>مجتمع هيدرولاند</h2><p>قصص وتجارب يجمعها حب البحر.</p><a href="#community">انضم إلى المجتمع ${icon('arrow')}</a></article>`;main.appendChild(teasers);
  const navIcons={home:'home','hl-diver-dashboard':'home',explore:'compass',trips:'boat',activities:'water',training:'learn',store:'bag',community:'people',safety:'shield'};
  document.querySelectorAll('#navigation a,.mobile-nav a').forEach(link=>{const name=navIcons[link.hash.slice(1)],target=link.querySelector('.nav-icon');if(name&&target)target.innerHTML=icon(name)});
  document.querySelector('#profile-open-mobile .nav-icon')?.replaceChildren(...new DOMParser().parseFromString(icon('user'),'text/html').body.childNodes);
  for(const [id,name] of [['visitor-auth-cta','user'],['visitor-register-cta','userPlus']]){const button=document.getElementById(id);if(button){const label=document.createElement('span');label.textContent=button.textContent;button.innerHTML=icon(name);button.appendChild(label)}}
  const menu=document.getElementById('menu');if(menu){menu.innerHTML=icon('menu');menu.setAttribute('aria-label','فتح القائمة')}
  const searchButton=document.querySelector('#search-form button');if(searchButton){searchButton.innerHTML=icon('search');searchButton.setAttribute('aria-label','بحث');searchButton.title='بحث'}
  const searchInput=document.querySelector('#search-form input');if(searchInput)searchInput.placeholder='ابحث عن رحلة أو وجهة أو تجربة…';
  document.querySelectorAll('#home .hero-ctas button').forEach(button=>{const label=document.createElement('span');label.textContent=button.textContent;button.innerHTML=icon(button.classList.contains('primary-button')?'boat':'learn');button.append(label);button.insertAdjacentHTML('beforeend',icon('arrow'))});
  const marineHeading=document.querySelector('.marine-intelligence__head h2');if(marineHeading)marineHeading.textContent='الطقس والسلامة البحرية';
  document.querySelectorAll('.marine-signal__row').forEach((row,index)=>{row.insertAdjacentHTML('afterbegin',icon(['wind','shield','bot'][index]));if(index===2)row.querySelector('small').textContent='قريبًا'});
  const footer=document.querySelector('.site-footer');if(footer){const values=document.createElement('div');values.className='hl-public-footer hl-public-only';values.innerHTML=[['compass','تجارب بحرية'],['learn','مسارات التعلم'],['shield','السلامة أولًا'],['people','مجتمع متصل'],['leaf','وعي بيئي']].map(([art,label])=>`<span>${icon(art)}<b>${label}</b></span>`).join('')+'<small>من السعودية… إلى عالم أكثر أمانًا تحت الماء</small>';footer.prepend(values)}
  for(const id of Object.keys(pages)){const node=document.getElementById(id);if(node)node.dataset.publicSurface=id}
  const routebar=document.querySelector('.hl-visitor-routebar');if(routebar){routebar.dataset.publicSurface='home';routebar.querySelectorAll('button').forEach(button=>{button.querySelector('b').innerHTML=icon(button.dataset.visitorTarget==='trips'?'island':button.dataset.visitorTarget==='training'?'learn':'shield')});routebar.prepend(routebar.querySelector('[data-hl-public-auth]'),routebar.querySelector('[data-visitor-target="training"]'))}
  document.querySelectorAll('.hl-community,.hl-support').forEach(node=>node.dataset.publicSurface='community');
  const tripsNav=document.querySelector('#navigation a[href="#trips"]');if(tripsNav){const link=document.createElement('a');link.className='nav-item hl-public-only';link.href='#activities';link.innerHTML=`<span class="nav-icon">${icon('water')}</span><span>الأنشطة البحرية</span>`;tripsNav.after(link)}
  const setView=id=>{
    if(auth()){delete document.body.dataset.publicPage;main.querySelectorAll('.hl-public-page-hidden').forEach(node=>node.classList.remove('hl-public-page-hidden'));return false}
    const page=Object.hasOwn(pages,id)?id:'home';document.body.dataset.publicPage=page;
    const visible=new Set(page==='home'?['home','trips','marine-intelligence']:['heading',page]);
    main.querySelectorAll(':scope>[data-public-surface]').forEach(node=>node.classList.toggle('hl-public-page-hidden',!visible.has(node.dataset.publicSurface)));
    heading.querySelector('[data-page-title]').textContent=pages[page][0];heading.querySelector('[data-page-description]').textContent=pages[page][1];heading.querySelector('[data-page-crumb]').textContent=pages[page][0];
    document.title=page==='home'?'HYDROLAND | هيدرولاند':pages[page][0]+' | HYDROLAND';
    document.querySelectorAll('.nav-item[href]').forEach(link=>link.classList.toggle('active',link.getAttribute('href')==='#'+page));
    return Object.hasOwn(pages,id);
  };
  const filterTrips=filter=>{window.HydrolandBookings?.setPublicFilter?.(filter);tripToolbar.querySelectorAll('[data-public-trip-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.publicTripFilter===filter)))};
  const navigate=id=>{const publicPage=setView(id);history.pushState(null,'','#'+id);if(publicPage)window.scrollTo({top:0,behavior:'instant'});else document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});document.querySelector('.sidebar')?.classList.remove('open')};
  const openTraining=()=>{if(!auth()){document.getElementById('visitor-auth-cta')?.click();return}window.HydrolandTraining?.reload?.();document.querySelector('.hl-training')?.scrollIntoView({behavior:'smooth',block:'start'})};
  const updateCounts=()=>{const client=window.HydrolandBookings,trips=client?.getPublicTrips?.()||[],status=client?.getPublicStatus?.();activitySection.querySelectorAll('[data-activity-count]').forEach(node=>{const count=trips.filter(trip=>client.publicCategory(trip)===node.dataset.activityCount).length;node.textContent=status==='loading'?'جارٍ تحميل الرحلات...':status==='error'?'تعذر تحميل الرحلات':count?`${count} رحلة منشورة`:'لا توجد رحلات منشورة حاليًا'});const count=tripSection?.querySelector('[data-public-trip-grid]')?.dataset.publicTripCount;tripToolbar.querySelector('[data-public-trip-count-label]').textContent=status==='ready'?`${count||0} رحلة منشورة`:''};
  const dialog=document.createElement('dialog');dialog.id='hl-public-detail';dialog.className='hl-public-detail';dialog.setAttribute('aria-labelledby','hl-public-detail-title');document.body.appendChild(dialog);
  let returnHash=null,detailTrigger=null;
  const routeParts=()=>{const parts=location.hash.slice(1).split('/');try{return {kind:parts[0],id:decodeURIComponent(parts.slice(1).join('/'))}}catch{return {kind:parts[0],id:''}}};
  const parentPage=kind=>({trip:'trips',product:'store',course:'training'})[kind];
  const closeDetails=()=>{
    const parent=parentPage(routeParts().kind)||'home';if(dialog.open)dialog.close();
    if(returnHash){returnHash=null;history.back()}else{history.replaceState(null,'','#'+parent);setView(parent)}
    detailTrigger?.focus?.({preventScroll:true});detailTrigger=null;
  };
  const leaveDetailsForAction=kind=>{dialog.close();history.replaceState(null,'',returnHash||'#'+parentPage(kind));returnHash=null;setView(parentPage(kind))};
  const renderDetails=()=>{
    const {kind,id}=routeParts(),parent=parentPage(kind);if(!parent){if(dialog.open)dialog.close();return false}
    setView(parent);if(!auth()&&!window.HydrolandAuth?.isGuestMode?.()){if(dialog.open)dialog.close();return true}let detail=null,status='ready',retry=null;
    if(kind==='trip'){
      const client=window.HydrolandBookings,trip=client?.getPublicTrips?.().find(item=>item.id===id);status=client?.getPublicStatus?.()||'loading';retry=()=>client.reload();
      if(trip){const reason=window.HydrolandBookingAvailability?.explain?.(trip)||'';detail={title:trip.title,label:client.tripTypeLabel(trip.type),description:trip.description||trip.summary||'راجع الموعد والموقع والسعة المتاحة، ثم ابدأ الحجز من حسابك.',art:'sea',facts:[['الموقع',client.locationText(trip)],['الموعد',client.tripDate(trip)],['المقاعد المتبقية',String(trip.remainingSeats??trip.capacity??0)],['السعر',client.formatPrice(trip.price)],['حالة الحجز',reason||'متاح للحجز']],note:'تُراجع الأهلية ومتطلبات المشاركة عند الحجز.',action:reason||(auth()?'متابعة الحجز':'سجّل الدخول للحجز'),disabled:Boolean(reason),run:()=>client.openBooking(id)}}
    }else if(kind==='product'){
      const client=window.HydrolandStore,product=client?.getProducts?.().find(item=>item.id===id);status=client?.getPublicStatus?.()||'loading';retry=()=>client.reloadProducts();
      if(product)detail={title:product.nameAr,label:'المتجر البحري',description:product.description||'لم يُضف وصف تفصيلي لهذا المنتج بعد.',art:'product',facts:[['رمز المنتج',product.sku],['السعر',new Intl.NumberFormat('ar-SA',{style:'currency',currency:product.currency||'SAR'}).format(product.priceMinor/100)],['المخزون المتاح',String(product.stockQuantity)]],note:'راجع السلة لإتمام الطلب من حسابك.',action:product.stockQuantity<1?'نفد المخزون':'أضف للسلة',disabled:product.stockQuantity<1,run:()=>client.addToCart(id)};
    }else{const path=paths.find(item=>item.id===id);if(path)detail={title:path.title,label:path.name,description:path.description,art:'course',facts:[['المسار',path.level],['نوع المحتوى','تعريف بالمسار التدريبي'],['المواعيد والرسوم','تظهر عند نشر الدورات من المراكز']],note:'هذه صفحة تعريفية؛ لا تنشئ تسجيلًا أو عملية شراء.',action:auth()?'مساري التدريبي':'سجّل الدخول لمتابعة تدريبك',run:openTraining}}
    dialog.innerHTML='<div class="hl-public-detail-head"><span data-detail-label></span><button type="button" data-detail-close aria-label="إغلاق التفاصيل">×</button></div><div class="hl-public-detail-art" aria-hidden="true"></div><div class="hl-public-detail-content"><h2 id="hl-public-detail-title"></h2><p data-detail-description></p><dl data-detail-facts></dl><p class="hl-public-detail-note" data-detail-note></p><div class="hl-public-detail-actions"><button type="button" class="primary-button" data-detail-action></button><button type="button" class="ghost-button" data-detail-back>العودة للتصفح</button></div></div>';
    dialog.querySelector('[data-detail-close]').addEventListener('click',closeDetails);dialog.querySelector('[data-detail-back]').addEventListener('click',closeDetails);
    const action=dialog.querySelector('[data-detail-action]'),art=dialog.querySelector('.hl-public-detail-art');
    if(detail){dialog.querySelector('[data-detail-label]').textContent=detail.label;dialog.querySelector('h2').textContent=detail.title;dialog.querySelector('[data-detail-description]').textContent=detail.description;dialog.querySelector('[data-detail-note]').textContent=detail.note;art.classList.add('hl-public-detail-art-'+detail.art);if(detail.art!=='sea')art.innerHTML=icon(detail.art==='product'?'bag':'learn');for(const [label,value] of detail.facts){const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;row.append(dt,dd);dialog.querySelector('dl').appendChild(row)}action.textContent=detail.action;action.disabled=Boolean(detail.disabled);action.addEventListener('click',()=>{leaveDetailsForAction(kind);detail.run()})}
    else{art.hidden=true;dialog.querySelector('h2').textContent=status==='loading'?'جارٍ تحميل التفاصيل...':status==='error'?'تعذر تحميل التفاصيل':'هذا المحتوى غير متاح';dialog.querySelector('[data-detail-description]').textContent=status==='error'?'أعد المحاولة للاتصال بالخدمة.':status==='loading'?'نحمّل أحدث البيانات المنشورة.':'قد يكون الرابط غير صحيح أو لم يعد المحتوى منشورًا.';action.hidden=status!=='error';action.textContent='إعادة المحاولة';action.addEventListener('click',()=>void retry?.())}
    if(!dialog.open)dialog.showModal();return true;
  };
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeDetails()});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)closeDetails()}});
  const syncRoute=()=>{if(!renderDetails()){const id=location.hash.slice(1)||'home';setView(id)}};
  document.addEventListener('click',event=>{
    const detail=event.target.closest?.('[data-public-detail]');if(detail){event.preventDefault();detailTrigger=detail;returnHash=location.hash||'#'+parentPage(detail.dataset.publicDetail);history.pushState(null,'',detail.getAttribute('href'));renderDetails();return}
    const tripFilter=event.target.closest?.('[data-public-trip-filter]');if(tripFilter){filterTrips(tripFilter.dataset.publicTripFilter);return}
    const activity=event.target.closest?.('[data-activity-filter]');if(activity){filterTrips(activity.dataset.activityFilter);navigate('trips');return}
    const productFilter=event.target.closest?.('[data-product-filter]');if(productFilter){const filter=productFilter.dataset.productFilter;window.HydrolandStore?.setFilter?.(filter);storeFilters.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button===productFilter)));return}
    if(event.target.closest?.('[data-public-training-account]')){openTraining();return}
    const anchor=event.target.closest?.('a[href^="#"]');if(!auth()&&anchor&&Object.hasOwn(pages,anchor.hash.slice(1))){event.preventDefault();navigate(anchor.hash.slice(1))}
  },true);
  for(const name of ['hydroland:public-trips-updated','hydroland:public-products-updated'])document.addEventListener(name,()=>{updateCounts();if(parentPage(routeParts().kind))renderDetails()});
  for(const name of ['hydroland:auth-changed','hydroland:guest-mode'])document.addEventListener(name,syncRoute);
  window.addEventListener('hashchange',syncRoute);
  window.HydrolandPublicUI={setView,navigate,filterTrips};updateCounts();syncRoute();
})();
