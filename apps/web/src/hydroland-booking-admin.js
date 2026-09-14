(()=>{
  const root=document.getElementById('role-console');if(!root)return;
  const panel=document.createElement('section');panel.className='hl-booking-admin';panel.hidden=true;
  panel.innerHTML='<div class="hl-trip-admin__head"><div><span class="eyebrow">BOOKING CONTROL</span><h3>تأكيد حجوزات الرحلات</h3></div><span data-booking-admin-state>بانتظار الاتصال</span></div><div data-booking-admin-list></div>';
  root.insertAdjacentElement('afterend',panel);
  const api=()=>window.HydrolandAuth?.apiBase||window.HYDROLAND_API_BASE||'http://localhost:3001/api/v1';
  const token=()=>window.HydrolandAuth?.getAccessToken?.();
  const headers=()=>({'Content-Type':'application/json',Authorization:'Bearer '+token()});
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state=t=>{const e=panel.querySelector('[data-booking-admin-state]');if(e)e.textContent=t};
  const label=s=>s==='CONFIRMED'?'مؤكد':s==='CANCELLED'?'ملغي':'بانتظار التأكيد';

  async function tripBookings(trip){
    const r=await fetch(`${api()}/trips/admin/${trip.id}/bookings`,{headers:headers()});
    const rows=await r.json().catch(()=>[]);if(!r.ok)throw new Error();
    return {trip,rows};
  }

  function render(groups){
    const host=panel.querySelector('[data-booking-admin-list]');
    host.innerHTML=groups.length?groups.map(({trip,rows})=>{
      const confirmed=rows.filter(x=>x.status==='CONFIRMED').reduce((n,x)=>n+Number(x.seats||0),0);
      const pending=rows.filter(x=>x.status==='PENDING').reduce((n,x)=>n+Number(x.seats||0),0);
      return `<article class="hl-booking-group"><div><strong>${esc(trip.title)}</strong><small>${esc(trip.type)} · مؤكد ${confirmed} · انتظار ${pending} · السعة ${trip.capacity}</small></div>${rows.length?rows.map(x=>`<div class="hl-booking-row"><div><b>${esc(`${x.account?.person?.firstName||''} ${x.account?.person?.lastName||''}`.trim()||x.account?.email||'مستخدم')}</b><small>${esc(x.account?.email||'')} · ${x.seats} مقعد · ${label(x.status)}</small></div>${x.status==='PENDING'?`<button data-confirm-booking="${x.id}" data-trip="${trip.id}">تأكيد الحجز</button>`:''}</div>`).join(''):'<small>لا توجد حجوزات.</small>'}</article>`;
    }).join(''):'<small>لا توجد رحلات.</small>';
    host.querySelectorAll('[data-confirm-booking]').forEach(button=>button.onclick=()=>confirmBooking(button));
  }

  async function load(){
    if(!token()){state('يتطلب دخول إداري');return}
    try{
      state('جارٍ تحميل الحجوزات');
      const tripsResponse=await fetch(`${api()}/trips/admin`,{headers:headers()});
      const trips=await tripsResponse.json().catch(()=>[]);if(!tripsResponse.ok)throw new Error();
      const groups=await Promise.all(trips.map(tripBookings));render(groups);state('متصل بالخادم');
    }catch{state('تعذر تحميل الحجوزات')}
  }

  async function confirmBooking(button){
    try{
      state('جارٍ تأكيد الحجز');button.disabled=true;
      const r=await fetch(`${api()}/trips/admin/${button.dataset.trip}/bookings/${button.dataset.confirmBooking}/confirm`,{method:'PATCH',headers:headers()});
      const body=await r.json().catch(()=>null);if(!r.ok)throw new Error(body?.message||'تعذر تأكيد الحجز');
      await load();window.HydrolandBookings?.reload?.();window.dispatchEvent(new CustomEvent('hydroland:booking-confirmed',{detail:body}));state('تم تأكيد الحجز');
    }catch(error){button.disabled=false;state(error instanceof Error?error.message:'تعذر تأكيد الحجز')}
  }

  document.addEventListener('hydroland:role-changed',e=>{const active=e.detail?.role==='admin';panel.hidden=!active;if(active)load()});
  document.addEventListener('hydroland:auth-changed',()=>{if(!panel.hidden)load()});
  document.addEventListener('hydroland:trip-status-changed',()=>{if(!panel.hidden)load()});
  window.addEventListener('hydroland:booking-created',()=>{if(!panel.hidden)load()});
})();
