(()=>{
  const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
  let section=null,viewVersion=0;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('center')&&access()?.getCurrentRole?.()==='center');
  const date=value=>{if(!value)return '—';const parsed=new Date(value);return Number.isNaN(parsed.getTime())?'—':parsed.toLocaleString('ar-SA')};
  const clear=()=>{viewVersion++;section?.remove();section=null};
  const ensure=()=>{if(section?.isConnected)return section;section=document.createElement('section');section.className='hl-center-documents';section.id='hl-center-documents';section.hidden=true;section.innerHTML='<header><div><small>DIVE CENTER · مركز الغوص</small><h2>المستندات والتراخيص</h2><p>سجلات المركز التنظيمية والأصول المرفوعة ضمن نطاق المركز المُدار فقط.</p></div></header><div data-center-documents aria-live="polite"></div>';section.addEventListener('click',event=>{if(event.target.closest?.('[data-center-documents-retry]'))void open()});document.getElementById('main')?.prepend(section);return section};
  async function open(){
    if(!eligible()){clear();return;}
    const host=ensure(),list=host.querySelector('[data-center-documents]'),version=++viewVersion,session=auth().getSessionVersion?.();
    const current=()=>version===viewVersion&&host.isConnected&&eligible()&&session===auth()?.getSessionVersion?.();
    host.hidden=false;window.HydrolandWorkspaceUI?.show?.(host);list.setAttribute('aria-busy','true');list.innerHTML='<p>جارٍ تحميل مستندات المركز...</p>';
    try{
      const response=await auth().authorizedFetch('/center/me/documents'),data=await response.json().catch(()=>null);
      if(!current())return;
      if(!response.ok)throw new Error(response.status===403?'لا تملك صلاحية عرض مستندات هذا المركز.':data?.message||'تعذر تحميل المستندات');
      if(!Array.isArray(data?.assets)||!Array.isArray(data?.licenses))throw new Error('استجابة مستندات المركز غير مكتملة. أعد المحاولة.');
      const assets=data.assets,licenses=data.licenses;
      list.innerHTML=`<p>الملفات المرفوعة: ${assets.length} · التراخيص والتصاريح: ${licenses.length}</p><h3>التراخيص والتصاريح</h3>`+
        (licenses.length?licenses.map(row=>`<article class="hl-course" data-center-license="${esc(row.id)}"><div class="hl-course-top"><div><b>${esc(row.subject||row.type||'سجل تنظيمي')}</b><small>${esc(row.referenceNumber||'بدون رقم مرجعي')} · ${esc(row.type||'RECORD')}</small></div><span>${esc(row.status||'—')}</span></div><small>آخر تحديث: ${esc(date(row.updatedAt||row.createdAt))}</small></article>`).join(''):'<p>لا توجد تراخيص أو تصاريح مرتبطة بهذا المركز.</p>')+
        '<h3>الملفات المرفوعة</h3>'+(assets.length?assets.map(row=>`<article class="hl-course" data-center-asset="${esc(row.id)}"><div class="hl-course-top"><div><b>${esc(row.kind||'مستند')}</b><small>${esc(row.mimeType||'ملف')} · ${Number.isFinite(Number(row.byteSize))?Number(row.byteSize).toLocaleString('ar-SA')+' بايت':'الحجم غير متاح'}</small></div><span>محفوظ</span></div><small>تاريخ الإضافة: ${esc(date(row.createdAt))}</small></article>`).join(''):'<p>لا توجد ملفات مرفوعة مرتبطة بهذا المركز.</p>');
    }catch(error){if(current())list.innerHTML=`<p role="alert">${esc(error instanceof Error?error.message:'تعذر تحميل المستندات')}</p><button type="button" data-center-documents-retry>إعادة المحاولة</button>`}
    finally{if(current())list.removeAttribute('aria-busy')}
  }
  for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,clear);
  for(const name of ['hydroland:auth-changed','hydroland:role-changed','hydroland:profile-data-ready'])document.addEventListener(name,()=>{if(!eligible())clear()});
  window.HydrolandCenterDocuments=Object.freeze({open});
})();