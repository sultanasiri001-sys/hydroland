(()=>{
 const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
 const host=document.querySelector('.hl-admin > .hl-admin__grid');if(!host)return;
 const panel=document.createElement('article');panel.className='hl-admin__panel hl-training-certificate-review';panel.hidden=true;
 panel.innerHTML='<h3>مراجعة شهادات التدريب</h3><p>راجع سجل المهارات والجلسات، ثم سجّل قرارًا مستقلًا عن المدرب والمتدرب.</p><div class="hl-training-certificate-filters"><label>حالة طلب الشهادة<select data-training-certificate-filter aria-label="حالة طلب الشهادة"><option value="RECOMMENDED">بانتظار المراجعة</option><option value="APPROVED">معتمد</option><option value="REJECTED">مرفوض</option><option value="REVOKED">ملغى</option></select></label><button type="button" data-training-certificate-refresh>تحديث طلبات التدريب</button></div><p data-training-certificate-state role="status"></p><div data-training-certificate-list></div><button type="button" data-training-certificate-next hidden>الصفحة التالية</button>';
 host.append(panel);
 const list=panel.querySelector('[data-training-certificate-list]'),status=panel.querySelector('[data-training-certificate-state]'),filter=panel.querySelector('[data-training-certificate-filter]'),next=panel.querySelector('[data-training-certificate-next]');
 const labels={RECOMMENDED:'بانتظار المراجعة',APPROVED:'معتمد',REJECTED:'مرفوض',REVOKED:'ملغى'},skillLabels={COMPETENT:'متقن',IN_PROGRESS:'قيد التقييم',NEEDS_REVIEW:'يحتاج مراجعة',NOT_STARTED:'لم يبدأ'},sessionLabels={COMPLETED:'مكتمل',CANCELLED:'ملغي',IN_PROGRESS:'قيد التنفيذ',CHECK_IN_OPEN:'الحضور مفتوح',SCHEDULED:'مجدول'};
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const date=value=>value?new Intl.DateTimeFormat('ar-SA-u-ca-gregory',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Riyadh'}).format(new Date(value)):'—';
 let version=0,cursor=null;
 const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('admin')&&access()?.getCurrentRole?.()==='admin');
 const current=(v,session)=>v===version&&session===auth()?.getSessionVersion?.()&&eligible();
 const clear=()=>{version++;cursor=null;list.textContent='';status.textContent='';next.hidden=true;panel.hidden=true};
 async function authorize(v,session){const allowed=await access()?.authorizeRole?.('admin',{sessionVersion:session,isCurrent:()=>v===version});if(!allowed||!current(v,session)){if(v===version)clear();return false}return true}
 function render(row){
  const record=row.record,stages=Array.isArray(record?.stages)?record.stages:[],sessions=Array.isArray(record?.sessions)?record.sessions:[];
  return `<section class="hl-admin__credential-card" data-training-certificate="${esc(row.id)}" data-revision="${esc(row.updatedAt)}"><header><div><strong>${esc(row.courseCode)}</strong><small>${esc(row.student?.displayName)} · المدرب: ${esc(row.instructor?.displayName)} · ${esc(row.centerName)}</small></div><span>${esc(labels[row.status]||row.status)}</span></header><p>تقدم الدورة: ${Number(record?.progressPercent||0)}% · التوصية: ${esc(date(row.recommendedAt))}</p><details><summary>عرض سجل المهارات والجلسات</summary>${stages.map(stage=>`<section><h4>${esc(stage.stageType)}</h4><ul>${stage.skills.map(skill=>`<li>${esc(skill.skillCode)} · ${esc(skill.name)} · ${esc(skillLabels[skill.status]||skill.status)} · ${skill.signed?'توقيع موثق: '+esc(date(skill.signedOffAt)):'لا يوجد توقيع موثق'}</li>`).join('')}</ul></section>`).join('')||'<p>لا توجد مهارات موثقة.</p>'}<h4>الجلسات</h4><ul>${sessions.map(session=>`<li>${esc(date(session.startsAt))} · ${esc(sessionLabels[session.status]||session.status)}</li>`).join('')||'<li>لا توجد جلسات.</li>'}</ul></details>${(row.reviewReasons||[]).length?'<ul>'+row.reviewReasons.map(reason=>'<li>'+esc(reason)+'</li>').join('')+'</ul>':''}${row.certificateNumber?'<p>رقم الشهادة الداخلية: '+esc(row.certificateNumber)+'</p>':''}${row.reviewReason?'<p>ملاحظات القرار: '+esc(row.reviewReason)+'</p>':''}${row.canReview?`<form data-training-certificate-decision><fieldset><label>قرار شهادة التدريب<select name="outcome" aria-label="قرار شهادة التدريب" required><option value="">اختر القرار</option><option value="APPROVED" ${row.canApprove?'':'disabled'}>اعتماد وإصدار شهادة داخلية</option><option value="REJECTED">رفض التوصية</option></select></label><label>ملاحظات قرار شهادة التدريب<textarea name="reason" required minlength="5" maxlength="1000"></textarea></label><label class="hl-training-certificate-confirm"><input type="checkbox" name="reviewed" required>راجعت سجل المهارات والجلسات، وأنا مراجع مستقل</label><button type="submit">حفظ قرار شهادة التدريب</button></fieldset><p data-training-certificate-feedback role="status"></p></form>`:'<p>هذا الطلب محفوظ للعرض فقط.</p>'}</section>`;
 }
 async function load(pageCursor=null){
  if(!eligible()){clear();return}const v=++version,session=auth()?.getSessionVersion?.(),selected=filter.value;panel.hidden=false;list.textContent='';next.hidden=true;status.textContent='جارٍ تحميل طلبات شهادات التدريب…';
  try{
   if(!await authorize(v,session))return;
   const response=await auth().authorizedFetch('/training/certificates?status='+encodeURIComponent(selected)+(pageCursor?'&cursor='+encodeURIComponent(pageCursor):'')),data=await response.json().catch(()=>null);
   if(!current(v,session))return;if(!response.ok||!Array.isArray(data?.items))throw new Error(data?.message||'تعذر تحميل طلبات شهادات التدريب.');
   cursor=data.nextCursor||null;next.hidden=!cursor;list.innerHTML=data.items.map(render).join('');status.textContent=data.items.length?`${data.items.length} طلب — ${labels[selected]}`:'لا توجد طلبات شهادات تدريب في هذه الحالة.';
  }catch(error){if(current(v,session))status.textContent=error.message||'تعذر تحميل طلبات شهادات التدريب.'}
 }
 panel.addEventListener('change',event=>{if(event.target===filter)void load()});
 panel.addEventListener('click',event=>{if(event.target.closest('[data-training-certificate-refresh]'))void load();if(event.target.closest('[data-training-certificate-next]')&&cursor)void load(cursor)});
 panel.addEventListener('submit',async event=>{
  const form=event.target.closest('[data-training-certificate-decision]');if(!form)return;event.preventDefault();if(form.dataset.busy)return;
  const v=version,session=auth()?.getSessionVersion?.(),card=form.closest('[data-training-certificate]'),fields=new FormData(form),feedback=form.querySelector('[data-training-certificate-feedback]');
  const body={outcome:fields.get('outcome'),reason:String(fields.get('reason')||'').trim(),reviewed:fields.get('reviewed')==='on',expectedUpdatedAt:card.dataset.revision};
  if(!body.reviewed||!['APPROVED','REJECTED'].includes(body.outcome)||body.reason.length<5){feedback.textContent='اختر القرار، واكتب ملاحظاته، وأكد مراجعة السجل.';return}
  form.dataset.busy='true';form.querySelector('fieldset').disabled=true;
  try{
   if(!await authorize(v,session)||!form.isConnected)return;
   const response=await auth().authorizedFetch('/training/certificates/'+encodeURIComponent(card.dataset.trainingCertificate)+'/decision',{method:'POST',body:JSON.stringify(body)}),data=await response.json().catch(()=>null);
   if(!current(v,session)||!form.isConnected)return;if(!response.ok)throw new Error(data?.message||'تعذر حفظ قرار الشهادة.');await load();
  }catch(error){if(current(v,session)&&form.isConnected)feedback.textContent=error.message||'تعذر حفظ القرار.'}
  finally{delete form.dataset.busy;form.querySelector('fieldset').disabled=false}
 });
 for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,clear);
 document.addEventListener('hydroland:role-changed',()=>{if(eligible())void load();else clear()});
 document.addEventListener('hydroland:auth-changed',()=>{if(!eligible())clear()});
 window.HydrolandTrainingCertificateAdmin=Object.freeze({reload:load});if(eligible())void load();else clear();
})();
