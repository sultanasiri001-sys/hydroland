(()=>{
  // Authored interface messages only. Account, provider and document values remain opaque.
  const uiLocale=window.HydrolandI18n?.createScope("map", {
  "رحلة HYDROLAND": "HYDROLAND trip",
  "موقع الرحلة": "Trip site",
  "جازان": "Jazan",
  "جزيرة فرسان": "Farasan Island",
  "البرك · عسير": "Al Birk · Asir",
  "عمق · عسير": "Amq · Asir",
  "القنفذة": "Al Qunfudhah",
  "تبوك": "Tabuk",
  "أملج": "Umluj",
  "ينبع": "Yanbu",
  "مركز {0}": "{0} center",
  "تعذر تحميل الخريطة ({0})": "Could not load the map ({0})",
  "حالة البحر والرياح": "Sea and wind conditions",
  "Stormglass · تجريبي": "Stormglass · Trial",
  "Stormglass · متصل": "Stormglass · Connected",
  "غير مفعّل": "Disabled",
  "بانتظار إعداد المزود": "Awaiting provider setup",
  "غير جاهز": "Not ready",
  "غير متاح": "Unavailable",
  "الخريطة متصلة · {0}": "Map connected · {0}",
  "مزود الخرائط": "Map provider",
  "الخريطة التفاعلية غير متاحة": "Interactive map unavailable",
  "الخريطة التفاعلية غير مفعّلة": "Interactive map disabled",
  "HYDROLAND MAPS · الخرائط": "HYDROLAND MAPS",
  "خريطة المملكة ومواقع الرحلات": "Map of the Kingdom and trip sites",
  "إغلاق": "Close",
  "جارٍ تحميل المواقع...": "Loading sites...",
  "المراكز ومواقع الرحلات": "Centers and trip sites",
  "● مواقع الرحلات": "● Trip sites",
  "◆ مراكز مخططة": "◆ Planned centers",
  "لا توجد رحلات مفتوحة بإحداثيات تشغيلية حاليًا.": "No open trips currently have operational coordinates.",
  "مركز مخطط · موقع تقريبي · غير متاح للحجز": "Planned center · Approximate location · Not available to book",
  "الموعد من النظام": "Time from the system",
  "عرض على الخريطة": "Show on map",
  "مركز مخطط · إحداثيات تقريبية للمنطقة، وليست عنوان مركز قائم": "Planned center · Approximate regional coordinates, not the address of an existing center",
  "مراجعة الطقس: {0}": "Weather review: {0}",
  "مراجعة الطقس: غير متوفرة": "Weather review: unavailable",
  "تكبير الخريطة": "Zoom in",
  "تصغير الخريطة": "Zoom out",
  "المملكة": "The Kingdom",
  "فتح الموقع في OpenStreetMap": "Open location in OpenStreetMap",
  "موقع {0}": "Site {0}",
  " · عسير": " · Asir",
  " · نظرة جغرافية عامة": " · Geographic overview",
  "طبقة المزود غير متاحة؛ عرض جغرافي محلي للمواقع المنشورة": "Provider layer unavailable; local geographic view of published sites",
  "جارٍ تشغيل الخريطة...": "Starting map...",
  "تعذر تحميل طبقة المزود؛ عرض جغرافي محلي": "Could not load the provider layer; local geographic view",
  "{0} موقع رحلة · {1} مراكز مخططة": "{0} trip sites · {1} planned centers",
  "تعذر تشغيل طبقة الخريطة: {0}": "Could not start the map layer: {0}",
  "تعذر تشغيل طبقة الخريطة": "Could not start the map layer",
  "مواقع الرحلات المنشورة والمراكز المخططة في المملكة.": "Published trip sites and planned centers in the Kingdom.",
  "فتح الخريطة": "Open map",
  "{0} · نظرة جغرافية عامة": "{0} · Geographic overview",
  "· عسير": "· Asir",
  "· نظرة جغرافية عامة": "· Geographic overview"
}) || {messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),attribute:(name,text,values=[])=>name+'=\"'+String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))+'\"',message:(text,values=[])=>String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),setMessage:(node,value)=>(node.textContent=value??''),t:value=>value,label:(text,values=[])=>String(text??'').replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  const card=document.querySelector('.map-card');if(!card)return;
  card.classList.add('hl-map-card');
  const MAPLIBRE_VERSION='6.11.2',MAPLIBRE_BASE=`https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VERSION}/dist`;
  const apiBase=()=>window.HydrolandAuth?.apiBase||window.HYDROLAND_API_BASE||(/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)?'http://localhost:3001/api/v1':'https://hydroland.onrender.com/api/v1');
  const state={config:null,trips:[],dialog:null,map:null,maplibre:null,markers:[],maplibrePromise:null,overview:null};
  const validLocation=trip=>{const location=trip?.location;if(!location||typeof location!=='object'||location.latitude==null||location.longitude==null||String(location.latitude).trim()===''||String(location.longitude).trim()==='')return null;const latitude=Number(location.latitude),longitude=Number(location.longitude);if(!Number.isFinite(latitude)||latitude < -90||latitude > 90||!Number.isFinite(longitude)||longitude < -180||longitude > 180)return null;return{tripId:trip.id,title:String(trip.title||'رحلة HYDROLAND'),type:String(trip.type||''),startsAt:trip.startsAt,locationName:String(location.locationName||'موقع الرحلة'),latitude,longitude,weatherStatus:trip.weather?.reviewStatus||null}};
  const plannedCenters=[['جازان',16.90,42.54],['جزيرة فرسان',16.70,42.17],['البرك · عسير',18.22,41.52],['عمق · عسير',18.44,41.45],['القنفذة',19.12,41.07],['تبوك',28.37,36.62],['أملج',25.04,37.25],['ينبع',24.09,38.06]].map(([name,latitude,longitude])=>({title:`مركز ${name}`,locationName:name,latitude,longitude,planned:true}));
  const points=()=>state.trips.map(validLocation).filter(Boolean);
  const mapPoints=()=>[...points(),...plannedCenters];
  const request=async path=>{const response=await fetch(`${apiBase()}${path}`);const body=await response.json().catch(()=>null);if(!response.ok)throw new Error(body?.message||uiLocale.format("تعذر تحميل الخريطة ({0})", [response.status]));return body};
  const marineWeatherRow=()=>[...document.querySelectorAll('.marine-signal__row')].find(row=>row.querySelector('span')?.textContent.trim()==='حالة البحر والرياح');
  const setMarineWeatherState=(text,ready=false)=>{const row=marineWeatherRow();if(!row)return;const dot=row.querySelector('.signal-dot'),label=row.querySelector('small');if(label)uiLocale.setMessage(label, text);if(dot){dot.classList.toggle('ready',ready);dot.classList.toggle('waiting',!ready)}};
  const refreshMarineWeather=async()=>{try{const config=await request('/integrations/weather/public-config');if(config?.configured){setMarineWeatherState(config.sandbox?uiLocale.message('Stormglass · تجريبي'):uiLocale.message('Stormglass · متصل'), true);return}if(config?.status==='NOT_SELECTED'||config?.status==='DISABLED'){setMarineWeatherState(uiLocale.message('غير مفعّل'));return}if(config?.status==='SANDBOX'||config?.status==='PRODUCTION_ENABLED'){setMarineWeatherState(uiLocale.message('بانتظار إعداد المزود'));return}setMarineWeatherState(uiLocale.message('غير جاهز'))}catch(error){setMarineWeatherState(uiLocale.message('غير متاح'));console.warn('HYDROLAND weather readiness unavailable',error)}};
  const mapReady=()=>Boolean(state.config?.enabled&&state.config?.styleUrl);
  const providerLabel=()=>mapReady()?uiLocale.format("الخريطة متصلة · {0}", [state.config.provider||uiLocale.t('مزود الخرائط')]):state.config?.status==='UNAVAILABLE'?uiLocale.t('الخريطة التفاعلية غير متاحة'):uiLocale.t('الخريطة التفاعلية غير مفعّلة');
  const renderPreview=()=>{
    const preview=card.querySelector('[data-hl-map-preview] svg');if(!preview)return;
    const merc=latitude=>Math.log(Math.tan(Math.PI/4+latitude*Math.PI/360));
    const north=merc(34),scale=200/(north-merc(14)),seen=new Set();
    for(const point of mapPoints()){
      const key=point.latitude.toFixed(4)+','+point.longitude.toFixed(4);if(seen.has(key))continue;seen.add(key);
      const x=150+(point.longitude-44)*Math.PI/180*scale,y=(north-merc(point.latitude))*scale;
      if(x<0||x>300||y<0||y>200)continue;
      const ns='http://www.w3.org/2000/svg',pin=document.createElementNS(ns,'g'),halo=document.createElementNS(ns,'circle'),shape=document.createElementNS(ns,'path'),title=document.createElementNS(ns,'title');
      pin.setAttribute('class','hl-map-preview-pin'+(point.planned?' hl-map-planned':''));pin.setAttribute('transform',`translate(${x} ${y})`);title.textContent=point.locationName;
      halo.setAttribute('r','10');halo.setAttribute('cy','-6');halo.setAttribute('class','hl-map-preview-halo');
      shape.setAttribute('d','M0 0C-2-3-6-6-6-10a6 6 0 0 1 12 0C6-6 2-3 0 0Z');
      pin.append(title,halo,shape);preview.appendChild(pin);
    }
  };
  const ensureCss=()=>{if(document.querySelector('link[data-hl-maplibre]'))return;const link=document.createElement('link');link.rel='stylesheet';link.href=`${MAPLIBRE_BASE}/maplibre-gl.css`;link.dataset.hlMaplibre=MAPLIBRE_VERSION;document.head.appendChild(link)};
  const loadMapLibre=async()=>{if(state.maplibre)return state.maplibre;if(window.maplibregl){state.maplibre=window.maplibregl;return state.maplibre}if(window.HydrolandMapLibreTestDouble){state.maplibre=window.HydrolandMapLibreTestDouble;return state.maplibre}if(state.maplibrePromise)return state.maplibrePromise;ensureCss();state.maplibrePromise=new Promise((resolve,reject)=>{const existing=document.querySelector('script[data-hl-maplibre]');if(existing){existing.addEventListener('load',()=>window.maplibregl?resolve(window.maplibregl):reject(new Error('MapLibre runtime unavailable')),{once:true});existing.addEventListener('error',()=>reject(new Error('MapLibre runtime failed to load')),{once:true});return}const script=document.createElement('script');script.src=`${MAPLIBRE_BASE}/maplibre-gl.js`;script.dataset.hlMaplibre=MAPLIBRE_VERSION;script.crossOrigin='anonymous';script.onload=()=>window.maplibregl?resolve(window.maplibregl):reject(new Error('MapLibre runtime unavailable'));script.onerror=()=>reject(new Error('MapLibre runtime failed to load'));document.head.appendChild(script)}).then(runtime=>(state.maplibre=runtime)).finally(()=>{state.maplibrePromise=null});return state.maplibrePromise};
  const externalUrl=point=>`https://www.openstreetmap.org/?mlat=${encodeURIComponent(point.latitude)}&mlon=${encodeURIComponent(point.longitude)}#map=13/${encodeURIComponent(point.latitude)}/${encodeURIComponent(point.longitude)}`;
  const ensureDialog=()=>{if(state.dialog)return state.dialog;const dialog=document.createElement('dialog');dialog.id='hl-map-dialog';dialog.className='hl-map-dialog';uiLocale.setHTML(dialog, uiLocale.html`<div class="hl-map-dialog__head"><div><span class="eyebrow">HYDROLAND MAPS · الخرائط</span><h2>خريطة المملكة ومواقع الرحلات</h2><p data-hl-map-provider></p></div><button type="button" data-hl-map-close aria-label="إغلاق">×</button></div><div class="hl-map-layout"><div class="hl-map-canvas-wrap"><div class="hl-map-canvas" data-hl-map-canvas></div><div class="hl-map-state" data-hl-map-state>جارٍ تحميل المواقع...</div></div><aside class="hl-map-list"><h3>المراكز ومواقع الرحلات</h3><p class="hl-map-legend"><span>● مواقع الرحلات</span><span>◆ مراكز مخططة</span></p><div class="hl-map-selection" aria-live="polite"></div><div data-hl-map-list></div></aside></div>`);document.body.appendChild(dialog);dialog.querySelector('[data-hl-map-close]').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{if(state.map?.resize)state.map.resize()});state.dialog=dialog;return dialog};
  const renderList=()=>{const dialog=ensureDialog(),list=dialog.querySelector('[data-hl-map-list]'),items=mapPoints();if(!list)return;uiLocale.setHTML(list, '');if(!items.length){const empty=document.createElement('p');empty.className='hl-map-list__empty';uiLocale.setText(empty, ...['لا توجد رحلات مفتوحة بإحداثيات تشغيلية حاليًا.']);list.appendChild(empty);return}items.forEach(point=>{const article=document.createElement('article');const title=document.createElement('strong');title.textContent=point.title;const location=document.createElement('small');location.textContent=`${point.locationName} · ${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;const time=document.createElement('small');time.textContent=point.planned?uiLocale.t('مركز مخطط · موقع تقريبي · غير متاح للحجز'):point.startsAt?new Date(point.startsAt).toLocaleString('ar-SA'):uiLocale.t('الموعد من النظام');const action=document.createElement('button');uiLocale.setText(action, ...['عرض على الخريطة']);action.type='button';action.addEventListener('click',()=>{if(state.overview)state.overview.focus(point);else state.map?.flyTo?.({center:[point.longitude,point.latitude],zoom:12})});article.append(title,location,time,action);list.appendChild(article)})};
  const popupNode=point=>{const node=document.createElement('div');node.className='hl-map-popup';const title=document.createElement('strong');title.textContent=point.title;const location=document.createElement('small');location.textContent=point.locationName;const weather=document.createElement('small');uiLocale.setText(weather, ...(point.planned?['مركز مخطط · إحداثيات تقريبية للمنطقة، وليست عنوان مركز قائم']:(point.weatherStatus?["مراجعة الطقس: {0}", [point.weatherStatus]]:['مراجعة الطقس: غير متوفرة'])));node.append(title,location,weather);return node};
  // The overview shares the canonical published-trip coordinates; no invented POIs.
  const renderOverview=(canvas,status,message)=>{
    state.map?.remove?.();state.map=null;state.markers=[];
    uiLocale.setHTML(canvas, uiLocale.html`<div class="hl-map-overview"><svg viewBox="0 0 300 200" role="group" aria-label="خريطة المملكة ومواقع الرحلات"><g data-map-scene transform="matrix(1 .06 -.18 .88 21 5)"><image href="./assets/saudi-marine-overview.svg" width="300" height="200"/></g></svg><div class="hl-map-controls"><button type="button" data-map-zoom="in" aria-label="تكبير الخريطة">+</button><button type="button" data-map-zoom="out" aria-label="تصغير الخريطة">−</button><button type="button" data-map-zoom="reset">المملكة</button></div></div>`);
    const svg=canvas.querySelector('svg'),detail=ensureDialog().querySelector('.hl-map-selection'),ns='http://www.w3.org/2000/svg';let box=[0,0,300,200];detail.replaceChildren();
    const merc=lat=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360)),scale=200/(merc(34)-merc(14));
    const project=p=>[150+(p.longitude-44)*Math.PI/180*scale,(merc(34)-merc(p.latitude))*scale];
    const draw=()=>{svg.setAttribute('viewBox',box.join(' '));svg.classList.toggle('hl-map-zoomed',box[2]<200)};
    const select=point=>{detail.replaceChildren(popupNode(point));const link=document.createElement('a');link.href=externalUrl(point);link.target='_blank';link.rel='noopener noreferrer';uiLocale.setText(link, ...['فتح الموقع في OpenStreetMap']);detail.appendChild(link);ensureDialog().querySelector('.hl-map-list').scrollTop=0;};
    const focus=point=>{const [px,py]=project(point),x=px-.18*py+21,y=.06*px+.88*py+5;box=[x-45,y-30,90,60];draw();select(point)};
    mapPoints().forEach(point=>{const [x,y]=project(point),pin=document.createElementNS(ns,'g');pin.setAttribute('transform',`translate(${x} ${y})`);pin.setAttribute('class','hl-map-overview-pin'+(point.planned?' hl-map-planned':''));pin.setAttribute('tabindex','0');pin.setAttribute('role','button');uiLocale.setAttribute(pin, "aria-label", ...["موقع {0}", [point.title]]);uiLocale.setHTML(pin, uiLocale.html`<circle r="5" class="hl-map-pin-halo"/><path d="M0 0C-1.5-2-3-4-3-6a3 3 0 0 1 6 0C3-4 1.5-2 0 0Z"/><circle cy="-6" r="1.1" class="hl-map-pin-core"/>`);
      if(point.planned){const slots=[[48,181],[61,193],[43,160],[40,147],[39,132],[63,43],[45,74],[42,95]],slot=slots[plannedCenters.indexOf(point)];if(slot){const [lx,ly]=slot,callout=document.createElementNS(ns,'g'),line=document.createElementNS(ns,'path'),label=document.createElementNS(ns,'text');callout.setAttribute('class','hl-map-callout');line.setAttribute('d',`M0 0L${lx-x+20} ${ly-y-1}H${lx-x}`);label.setAttribute('x',lx-x);label.setAttribute('y',ly-y-3);label.textContent=point.locationName.replace(' · عسير','');callout.append(line,label);pin.prepend(callout)}}pin.addEventListener('click',()=>select(point));pin.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(point)}});svg.querySelector('[data-map-scene]').appendChild(pin)});
    canvas.querySelectorAll('[data-map-zoom]').forEach(button=>button.addEventListener('click',()=>{const mode=button.dataset.mapZoom;if(mode==='reset'){box=[0,0,300,200];detail.replaceChildren();ensureDialog().querySelector('.hl-map-list').scrollTop=0;}else{const factor=mode==='in'?.7:1/.7,width=Math.max(30,Math.min(300,box[2]*factor)),height=width*2/3;box=[box[0]+(box[2]-width)/2,box[1]+(box[3]-height)/2,width,height]}draw()}));
    let drag=null;svg.addEventListener('pointerdown',e=>{if(e.target.closest('[role="button"]'))return;drag={x:e.clientX,y:e.clientY,box:[...box]};svg.setPointerCapture(e.pointerId)});svg.addEventListener('pointermove',e=>{if(!drag)return;const rect=svg.getBoundingClientRect(),ratio=Math.min(rect.width/box[2],rect.height/box[3]);box=[drag.box[0]-(e.clientX-drag.x)/ratio,drag.box[1]-(e.clientY-drag.y)/ratio,box[2],box[3]];draw()});['pointerup','pointercancel','lostpointercapture'].forEach(name=>svg.addEventListener(name,()=>{drag=null}));
    state.overview={focus};uiLocale.setText(status, ...["{0} · نظرة جغرافية عامة", [message]]);
  };
  const renderInteractiveMap=async()=>{const dialog=ensureDialog(),canvas=dialog.querySelector('[data-hl-map-canvas]'),status=dialog.querySelector('[data-hl-map-state]'),items=mapPoints();if(!canvas||!status)return;if(!mapReady()){renderOverview(canvas,status,uiLocale.t('طبقة المزود غير متاحة؛ عرض جغرافي محلي للمواقع المنشورة'));return}try{uiLocale.setText(status, ...['جارٍ تشغيل الخريطة...']);const maplibre=await loadMapLibre();if(!dialog.open)return;if(state.map?.remove)state.map.remove();state.markers=[];state.overview=null;state.map=new maplibre.Map({container:canvas,style:state.config.styleUrl,center:[44,24],zoom:4.5,attributionControl:true});state.map.on?.('error',()=>{if(state.map&&!state.map.isStyleLoaded?.())renderOverview(canvas,status,uiLocale.t('تعذر تحميل طبقة المزود؛ عرض جغرافي محلي'))});if(maplibre.NavigationControl)state.map.addControl(new maplibre.NavigationControl({showCompass:true,showZoom:true}),'top-left');items.forEach(point=>{const markerEl=document.createElement('button');markerEl.type='button';markerEl.className='hl-map-marker'+(point.planned?' hl-map-planned':'');uiLocale.setAttribute(markerEl, "aria-label", ...["موقع {0}", [point.title]]);const popup=maplibre.Popup?new maplibre.Popup({offset:18}).setDOMContent(popupNode(point)):null;let marker=new maplibre.Marker({element:markerEl}).setLngLat([point.longitude,point.latitude]);if(popup&&marker.setPopup)marker=marker.setPopup(popup);marker.addTo(state.map);state.markers.push(marker)});if(items.length>1&&maplibre.LngLatBounds){const bounds=new maplibre.LngLatBounds();items.forEach(point=>bounds.extend([point.longitude,point.latitude]));state.map.fitBounds(bounds,{padding:52,maxZoom:12,duration:0})}uiLocale.setText(status, ...["{0} موقع رحلة · {1} مراكز مخططة", [points().length, plannedCenters.length]]);setTimeout(()=>state.map?.resize?.(),40)}catch(error){uiLocale.setText(status, ...(error instanceof Error?["تعذر تشغيل طبقة الخريطة: {0}", [error.message]]:['تعذر تشغيل طبقة الخريطة']));renderOverview(canvas,status,uiLocale.t('تعذر تحميل طبقة المزود؛ عرض جغرافي محلي'))}};
  const updateCard=()=>{const items=points();uiLocale.setHTML(card, uiLocale.html`<div class="hl-map" aria-hidden="true"><div class="hl-map-preview" data-hl-map-preview><svg viewBox="0 0 300 200" aria-hidden="true"><image href="./assets/saudi-marine-overview.svg" width="300" height="200"/></svg></div></div><div class="hl-map-info"><p class="eyebrow">HYDROLAND MAP</p><h3>خريطة المملكة ومواقع الرحلات</h3><p>مواقع الرحلات المنشورة والمراكز المخططة في المملكة.</p><span class="hl-map-provider"><i></i><span data-hl-map-card-provider></span></span><small class="hl-map-card__count" data-hl-map-count></small><button type="button" data-hl-map-open>فتح الخريطة</button></div>`);const provider=card.querySelector('[data-hl-map-card-provider]'),count=card.querySelector('[data-hl-map-count]'),badge=card.querySelector('.hl-map-provider');if(provider)provider.textContent=providerLabel();if(count)uiLocale.setText(count, ...["{0} موقع رحلة · {1} مراكز مخططة", [items.length, plannedCenters.length]]);if(mapReady())badge?.classList.add('ready');card.querySelector('[data-hl-map-open]')?.addEventListener('click',openMap);renderPreview()};
  const load=async()=>{refreshMarineWeather();try{const [config,trips]=await Promise.allSettled([request('/integrations/maps/public-config'),request('/trips')]);state.config=config.status==='fulfilled'?config.value:{enabled:false,status:'UNAVAILABLE'};state.trips=trips.status==='fulfilled'&&Array.isArray(trips.value)?trips.value:[];updateCard();if(state.dialog?.open){state.dialog.querySelector('[data-hl-map-provider]').textContent=providerLabel();renderList();await renderInteractiveMap()}}catch(error){state.config={enabled:false,status:'UNAVAILABLE',provider:'UNCONFIGURED'};state.trips=[];updateCard();console.warn('HYDROLAND maps unavailable',error)}};
  const openMap=async()=>{const dialog=ensureDialog();dialog.querySelector('[data-hl-map-provider]').textContent=providerLabel();renderList();dialog.showModal();await renderInteractiveMap()};
  document.addEventListener('hydroland:trip-location-changed',load);document.addEventListener('hydroland:trip-created',load);document.addEventListener('hydroland:trip-status-changed',load);document.addEventListener('hydroland:weather-gate-changed',refreshMarineWeather);updateCard();load();window.HydrolandMap={reload:load,open:openMap,getState:()=>({config:state.config,trips:state.trips,points:points(),plannedCenters})};
})();
