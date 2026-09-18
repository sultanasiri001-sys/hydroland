(()=>{
  const css=document.createElement('link');
  css.rel='stylesheet';
  css.href='./hydroland-trip-ops.css';
  document.head.appendChild(css);

  const host=document.getElementById('trips');
  if(!host||document.querySelector('.hl-trip-ops'))return;

  const defaultApiBase=/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)?'http://localhost:3001/api/v1':'https://hydroland.onrender.com/api/v1';
  const api=()=>window.HydrolandAuth?.apiBase||window.HYDROLAND_API_BASE||defaultApiBase;
  const state={trips:[]};
  const panel=document.createElement('section');
  panel.className='hl-trip-ops';
  panel.innerHTML=`<header class="hl-trip-head"><div><small>TRIP OPERATIONS · HYDROLAND</small><h3>التشغيل الفعلي للرحلات</h3></div><span class="hl-trip-state" data-trip-state>بانتظار البيانات</span></header><div class="hl-trip-grid" data-trip-grid></div><div class="hl-trip-actions"><button data-trip-refresh>تحديث الرحلات</button></div>`;
  host.appendChild(panel);

  const grid=panel.querySelector('[data-trip-grid]');
  const stateLabel=panel.querySelector('[data-trip-state]');
  const formatDate=value=>new Date(value).toLocaleString('ar-SA',{dateStyle:'medium',timeStyle:'short'});
  const safetyLabel=decision=>decision==='ALLOWED'?'GO':decision==='DEFERRED'?'NO-GO':'REVIEW';
  const safetyClass=decision=>decision==='ALLOWED'?'hl-trip-ok':decision==='DEFERRED'?'hl-trip-warn':'';

  function render(){
    if(!state.trips.length){
      grid.innerHTML='<section class="hl-trip-panel"><h4>لا توجد رحلات مفتوحة حاليًا</h4><small>ستظهر الرحلات هنا مباشرة من قاعدة البيانات عند توفرها.</small></section>';
      stateLabel.textContent='لا توجد رحلات مفتوحة';
      stateLabel.dataset.state='EMPTY';
      return;
    }

    grid.innerHTML=state.trips.map(trip=>`<section class="hl-trip-panel" data-trip-id="${trip.id}"><h4>${trip.title}</h4><div class="hl-trip-row"><span>النوع</span><b>${trip.type}</b></div><div class="hl-trip-row"><span>الموعد</span><b>${formatDate(trip.startsAt)}</b></div><div class="hl-trip-row"><span>السعة</span><b>${trip.bookedSeats||0} / ${trip.capacity}</b></div><div class="hl-trip-row"><span>المقاعد المتبقية</span><b>${trip.remainingSeats??trip.capacity}</b></div><div class="hl-trip-row"><span>قرار السلامة</span><b class="${safetyClass(trip.safety?.decision)}">${safetyLabel(trip.safety?.decision)}</b></div></section>`).join('');
    const first=state.trips[0];
    const operational=safetyLabel(first.safety?.decision);
    stateLabel.textContent=`${operational} · ${first.title}`;
    stateLabel.dataset.state=operational;
  }

  async function load(){
    stateLabel.textContent='جارٍ تحميل الرحلات';
    try{
      const response=await fetch(`${api().replace(/\/$/,'')}/trips`);
      if(!response.ok)throw new Error();
      const data=await response.json();
      state.trips=Array.isArray(data)?data:[];
      render();
    }catch{
      state.trips=[];
      grid.innerHTML='<section class="hl-trip-panel"><h4>تعذر الاتصال بخادم الرحلات</h4><small>لا تُعرض أي بيانات تجريبية عند فشل الاتصال.</small></section>';
      stateLabel.textContent='تعذر الاتصال';
      stateLabel.dataset.state='OFFLINE';
    }
  }

  panel.querySelector('[data-trip-refresh]')?.addEventListener('click',load);
  document.addEventListener('hydroland:booking-created',load);
  window.addEventListener('hydroland:safety-decision-changed',load);
  load();
})();
