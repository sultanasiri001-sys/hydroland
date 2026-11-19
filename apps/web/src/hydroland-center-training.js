(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = window.HydrolandI18n?.createScope("center-training", {
  "DIVE CENTER · مركز الغوص": "DIVE CENTER",
  "التدريب والدورات": "Training and courses",
  "من عرض الدورة في المتجر إلى تسجيل المتدرب وتكليف المدرب وجدولة الجلسات وتوثيق الحضور.": "From a course listing in the store to trainee enrollment, instructor assignment, session scheduling and attendance recording.",
  "عروض الدورات وصورها": "Course listings and images",
  "أضف عنوان الدورة ومعلوماتها وصورتها، وحدد المقاعد والموعد والسعر ثم انشر العرض في المتجر.": "Add the course title, information and image, set the seats, schedule and price, then publish the listing in the store.",
  "إدارة عروض الدورات": "Manage course listings",
  "التسجيلات والتكليفات والجلسات": "Enrollments, assignments and sessions",
  "اختر تسجيل المتدرب لإسناد المدرب المؤهل، وإضافة الجلسات وتعديل مواعيدها وتوثيق الحضور. فتح الحضور وإتمام الجلسات يتبعان الحالة والصلاحيات.": "Choose a trainee enrollment to assign a qualified instructor, add sessions, edit schedules and record attendance. Attendance and completion actions depend on status and permissions.",
  "إدارة التسجيلات والجلسات": "Manage enrollments and sessions",
  "محترفو المركز": "Center professionals",
  "راجع المدربين النشطين المرتبطين بالمركز وتكليفاتهم قبل إسناد الدورة أو الجلسة.": "Review active instructors linked to the center and their assignments before assigning a course or session.",
  "عرض محترفي المركز": "View center professionals",
  "إدارة عروض الدورات جارٍ تحميلها. أعد المحاولة.": "Course listing management is loading. Try again.",
  "إدارة التدريب جارٍ تحميلها. أعد المحاولة.": "Training management is loading. Try again.",
  "تعذر فتح القسم.": "Could not open the section."
}) || {t:value=>value,message(source,values=[]){return this.format(source,values)},messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),setMessage:(node,value)=>(node.textContent=value??''),label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))},attribute(name,text,values=[]){if(!['aria-label','aria-description','placeholder','title','alt'].includes(name))throw new TypeError('Invalid display attribute');return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'}};

  // Preserve provenance of local errors; provider and user messages remain opaque.
  const localErrors=new WeakMap();
  const localError=(source,values=[])=>{const error=new Error(uiLocale.format(source,values));localErrors.set(error,{source,values});return error;};
  const localErrorMessage=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.message(known.source,known.values):error?.message||uiLocale.message(fallback);};
  const localErrorHTML=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.label(known.source,known.values):error?.message?String(error.message).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])):uiLocale.label(fallback);};
  const setLocalErrorText=(node,error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.setText(node,known.source,known.values):error?.message?(node.textContent=error.message):uiLocale.setText(node,fallback);};

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
  uiLocale.setHTML(host, uiLocale.html`<header><small>DIVE CENTER · مركز الغوص</small><h2>التدريب والدورات</h2><p>من عرض الدورة في المتجر إلى تسجيل المتدرب وتكليف المدرب وجدولة الجلسات وتوثيق الحضور.</p></header><div class="hl-center-training-cards"><article><h3>عروض الدورات وصورها</h3><p>أضف عنوان الدورة ومعلوماتها وصورتها، وحدد المقاعد والموعد والسعر ثم انشر العرض في المتجر.</p><button type="button" data-center-training-route="offers">إدارة عروض الدورات</button></article><article><h3>التسجيلات والتكليفات والجلسات</h3><p>اختر تسجيل المتدرب لإسناد المدرب المؤهل، وإضافة الجلسات وتعديل مواعيدها وتوثيق الحضور. فتح الحضور وإتمام الجلسات يتبعان الحالة والصلاحيات.</p><button type="button" data-center-training-route="assignments">إدارة التسجيلات والجلسات</button></article><article><h3>محترفو المركز</h3><p>راجع المدربين النشطين المرتبطين بالمركز وتكليفاتهم قبل إسناد الدورة أو الجلسة.</p><button type="button" data-center-training-route="professionals">عرض محترفي المركز</button></article></div><p role="status" data-center-training-feedback></p>`);
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
    if(typeof window.HydrolandStoreProvider?.openCourses!=='function')throw localError('إدارة عروض الدورات جارٍ تحميلها. أعد المحاولة.');
    await window.HydrolandStoreProvider.openCourses();
   }else{
    if(typeof window.HydrolandCenterTeam?.open!=='function')throw localError('إدارة التدريب جارٍ تحميلها. أعد المحاولة.');
    await window.HydrolandCenterTeam.open(route==='professionals'?'professionals':'assignments');
   }
  }catch(error){if(live(v,session)&&host.isConnected)setLocalErrorText(feedback, error, 'تعذر فتح القسم.')}
  finally{if(live(v,session)&&host.isConnected)button.disabled=false}
 }
 for(const event of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(event,clear);
 for(const event of ['hydroland:auth-changed','hydroland:role-changed','hydroland:profile-data-ready'])document.addEventListener(event,()=>{if(!eligible())clear()});
 window.HydrolandCenterTraining=Object.freeze({open});
})();
