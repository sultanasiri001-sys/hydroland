(()=>{
  const auth=()=>window.HydrolandAuth;
  const toast=message=>{const t=document.getElementById('toast');if(!t)return;t.textContent=message;t.classList.add('visible');setTimeout(()=>t.classList.remove('visible'),2200)};
  const request=async(path,options={})=>{
    const client=auth()?.authorizedFetch;if(!client)throw new Error('AUTH_REQUIRED');
    const response=await client(path,options);const body=await response.json().catch(()=>null);
    if(!response.ok){if(response.status===401)throw new Error('AUTH_REQUIRED');throw new Error(body?.message||`HTTP_${response.status}`)}
    return body;
  };
  const text=(v,fallback='—')=>v===null||v===undefined||v===''?fallback:String(v);
  const displayName=profile=>{const first=profile?.person?.firstName||'';const last=profile?.person?.lastName||'';const name=`${first} ${last}`.trim();return name&&name!=='Pending Profile'?name:'عضو HYDROLAND'};
  const credentialLabel=status=>({VERIFIED:'موثقة',DOCUMENT_VERIFIED:'وثائق موثقة',PENDING:'قيد التحقق',UNVERIFIED:'غير موثقة',REJECTED:'مرفوضة',EXPIRED:'منتهية'})[status]||status||'غير محدد';
  const roleLabel=role=>({DIVER:'غواص',INSTRUCTOR:'مدرب',DIVE_CENTER:'مركز غوص',BOAT_OWNER:'مشغل بحري',STAFF:'موظف',ORGANIZATION:'جهة',ADMIN:'إدارة',REVIEWER:'مراجع'})[role]||role;
  function renderProfile(profile,credentials=[]){
    const dash=document.querySelector('.hl-profile-dashboard');
    if(dash){
      const name=displayName(profile);const pro=profile?.person?.professional;const avatar=dash.querySelector('.hl-profile-avatar');if(avatar)avatar.textContent=name.trim().charAt(0)||'H';
      const h3=dash.querySelector('h3');if(h3)h3.textContent=name;
      const p=dash.querySelector('header p');if(p)p.textContent=[pro?.headline,pro?.regionCode].filter(Boolean).join(' · ')||text(profile?.email);
      const verified=dash.querySelector('.hl-verified');if(verified){const active=profile?.status==='ACTIVE';verified.textContent=active?'✓ حساب نشط':text(profile?.status,'حالة غير محددة');verified.classList.toggle('pending',!active)}
      const stats=dash.querySelectorAll('.hl-profile-stats strong');if(stats[0])stats[0].textContent='—';if(stats[1])stats[1].textContent=String(credentials.length);if(stats[2])stats[2].textContent=String((profile?.roles||[]).filter(r=>r.status==='ACTIVE').length);
    }
    const member=document.querySelector('.hl-pass-card');if(member){const paragraphs=member.querySelectorAll('p');if(paragraphs[0])paragraphs[0].textContent=`الحساب: ${text(profile?.email)}`;if(paragraphs[1])paragraphs[1].textContent=`الحالة: ${text(profile?.status)}`;let roles=member.querySelector('.hl-role-statuses');if(!roles){roles=document.createElement('div');roles.className='hl-role-statuses';member.appendChild(roles)}roles.innerHTML=(profile?.roles||[]).map(r=>`<span>${roleLabel(r.role)} · ${r.status==='ACTIVE'?'نشط':r.status==='PENDING_REVIEW'?'قيد المراجعة':r.status}</span>`).join('')||'<span>لا توجد أدوار مفعلة</span>'}
    const certHost=document.querySelector('.hl-certificates');if(certHost){certHost.querySelectorAll(':scope > article').forEach(n=>n.remove());const action=certHost.querySelector('.hl-member-actions');credentials.forEach(c=>{const article=document.createElement('article');const exp=c.expiresAt?new Date(c.expiresAt).toLocaleDateString('ar-SA'):'بدون تاريخ انتهاء';article.innerHTML=`<div><b>${text(c.title)}</b><small>${text(c.issuer)} · ${exp}</small></div><span class="hl-status ${['VERIFIED','DOCUMENT_VERIFIED'].includes(c.verificationStatus)?'ok':'review'}">${credentialLabel(c.verificationStatus)}</span>`;certHost.insertBefore(article,action)});if(!credentials.length){const article=document.createElement('article');article.innerHTML='<div><b>لا توجد شهادات محفوظة</b><small>يمكن إضافة شهادة من زر إضافة شهادة.</small></div><span class="hl-status review">فارغ</span>';certHost.insertBefore(article,action)}}
  }
  async function load(){
    if(!auth()?.isAuthenticated?.())return;
    try{const [profile,credentials]=await Promise.all([request('/me'),request('/credentials')]);renderProfile(profile,Array.isArray(credentials)?credentials:[]);window.HydrolandProfileData={profile,credentials};}
    catch(error){if(error.message!=='AUTH_REQUIRED')toast('تعذر تحميل بيانات الحساب من الخادم');}
  }
  async function saveProfile(input){try{const updated=await request('/me',{method:'PATCH',body:JSON.stringify(input)});toast('تم حفظ بيانات الحساب');await load();return updated}catch(error){toast(error.message==='AUTH_REQUIRED'?'سجل الدخول أولًا':'تعذر حفظ بيانات الحساب');throw error}}
  document.addEventListener('click',async event=>{const btn=event.target.closest?.('[data-hl-action="settings"]');if(!btn)return;if(!auth()?.isAuthenticated?.()){toast('سجل الدخول أولًا لفتح بيانات الحساب');return}const profile=window.HydrolandProfileData?.profile;const first=prompt('الاسم الأول',profile?.person?.firstName==='Pending'?'':profile?.person?.firstName||'');if(first===null)return;const last=prompt('اسم العائلة',profile?.person?.lastName==='Profile'?'':profile?.person?.lastName||'');if(last===null)return;const headline=prompt('الصفة أو المستوى',profile?.person?.professional?.headline||'');if(headline===null)return;const regionCode=prompt('المنطقة',profile?.person?.professional?.regionCode||'');if(regionCode===null)return;if(!first.trim()){toast('الاسم الأول مطلوب');return}try{await saveProfile({firstName:first.trim(),lastName:last.trim(),headline:headline.trim(),regionCode:regionCode.trim()})}catch{}});
  document.addEventListener('hydroland:auth-changed',load);setTimeout(load,500);window.HydrolandProfile={load,saveProfile};
})();