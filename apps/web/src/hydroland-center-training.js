(()=>{
 const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
 const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('center')&&access()?.getCurrentRole?.()==='center');
 let section=null,version=0;
 const clear=()=>{version++;section?.remove();section=null};
 const live=(v,session)=>v===version&&eligible()&&session===auth()?.getSessionVersion?.();
 async function authorize(v,session){
  if(!live(v,session))return false;
  const allowed=await access()?.authorizeRole?.('center',{sessionVersion:session,isCurrent:()=>v===version&&session===auth()?.getSessionVersion?.()});
  if(!allowed||!live(v,session)){if(v===version)clear();return false}return true;
 }
 function ensure(){
  if(section?.isConnected)return section;
  const host=document.createElement('section');host.id='hl-center-training';host.className='hl-center-training';
  host.innerHTML='<header><small>DIVE CENTER · مركز الغوص</small><h2>التدريب والدورات</h2><p>من عرض الدورة في المتجر إلى تسجيل المتدرب وتكليف المدرب وجدولة الجلسات وتوثيق الحضور.</p></header><div class="hl-center-training-cards"><article><h3>عروض الدورات وصورها</h3><p>أضف عنوان الدورة ومعلوماتها وصورتها، وحدد المقاعد والموعد والسعر ثم انشر العرض في المتجر.</p><button type="button" data-center-training-route="offers">إدارة عروض الدورات</button></article><article><h3>التسجيلات والتكليفات والجلسات</h3><p>اختر تسجيل المتدرب لإسناد المدرب المؤهل، وإضافة الجلسات وتعديل مواعيدها وتوثيق الحضور. فتح الحضور وإتمام الجلسات يتبعان الحالة والصلاحيات.</p><button type="button" data-center-training-route="assignments">إدارة التسجيلات والجلسات</button></article><article><h3>محترفو المركز</h3><p>راجع المدربين النشطين المرتبطين بالمركز وتكليفاتهم قبل إسناد الدورة أو الجلسة.</p><button type="button" data-center-training-route="professionals">عرض محترفي المركز</button></article></div><p role="status" data-center-training-feedback></p>';
  host.addEventListener('click',event=>{const button=event.target.closest('[data-center-training-route]');if(button)void navigate(button)});section=host;document.getElementById('main')?.append(host);return host;
 }
 async function open(){
  if(!eligible()){clear();return}const v=++version,session=auth().getSessionVersion?.();
  if(!(await authorize(v,session)))return;
  const host=ensure();host.hidden=false;window.HydrolandWorkspaceUI?.show?.(host);
 }
 async function navigate(button){
  if(button.disabled||!section||!eligible())return;
  const v=version,session=auth().getSessionVersion?.(),host=section,feedback=host.querySelector('[data-center-training-feedback]');button.disabled=true;feedback.textContent='';
  try{
   if(!(await authorize(v,session)))return;
   const route=button.dataset.centerTrainingRoute;
   if(route==='offers'){
    if(typeof window.HydrolandStoreProvider?.openCourses!=='function')throw new Error('إدارة عروض الدورات جارٍ تحميلها. أعد المحاولة.');
    await window.HydrolandStoreProvider.openCourses();
   }else{
    if(typeof window.HydrolandCenterTeam?.open!=='function')throw new Error('إدارة التدريب جارٍ تحميلها. أعد المحاولة.');
    await window.HydrolandCenterTeam.open(route==='professionals'?'professionals':'assignments');
   }
  }catch(error){if(live(v,session)&&host.isConnected)feedback.textContent=error.message||'تعذر فتح القسم.'}
  finally{if(live(v,session)&&host.isConnected)button.disabled=false}
 }
 for(const event of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(event,clear);
 for(const event of ['hydroland:auth-changed','hydroland:role-changed','hydroland:profile-data-ready'])document.addEventListener(event,()=>{if(!eligible())clear()});
 window.HydrolandCenterTraining=Object.freeze({open});
})();
