(() => {
  if (window.HydrolandCampaignLifecycle) return;
  const ui = window.HydrolandI18n.createScope('campaign-lifecycle', {
    'الحقوق والميزانية وقرار الحملة':'Campaign rights, budget and decision', 'تحديث التفاصيل':'Refresh details',
    'جاهزية تجهيز داخلية؛ لا تنفذ هذه الصفحة نشرًا أو صرفًا ولا تمنح إذن القنوات الخارجية.':'Internal preparation readiness. This page does not publish, spend, or authorize external channels.',
    'جارٍ تحميل دورة الحملة…':'Loading campaign lifecycle…', 'جارٍ حفظ الإجراء…':'Saving the action…',
    'تم حفظ الإجراء.':'The action was saved.', 'تم تحديث دورة الحملة.':'Campaign lifecycle refreshed.',
    'تعذر التحقق من استجابة دورة الحملة.':'The campaign lifecycle response could not be verified.',
    'تعذرت قراءة دورة الحملة.':'Could not read the campaign lifecycle.',
    'تعذر تأكيد الحفظ. يمكنك إعادة المحاولة بالبيانات نفسها.':'Could not confirm the save. You can retry with the same details.',
    'تغيّرت البيانات. حدّث التفاصيل وراجع المصادر قبل إعادة الإجراء.':'The details changed. Refresh and review the sources before acting again.',
    'لم تُحسم نتيجة إنشاء المستند. افحص المستندات قبل إنشاء نسخة أخرى.':'The document creation outcome is unresolved. Check documents before creating another copy.',
    'المسودة الأصلية':'Original draft', 'الإصدار':'Version', 'حالة التجهيز':'Preparation status',
    'لم يُجهز بعد':'Not prepared', 'بانتظار قرار المالك':'Awaiting owner decision', 'تجهيز معتمد':'Preparation approved',
    'مرفوض':'Declined', 'مسحوب':'Revoked', 'جاهز للتجهيز الداخلي':'Ready for internal preparation',
    'يتطلب إجراء':'Action required', 'جاهزية المصادر الحالية':'Current source readiness',
    'يجب تجهيز الحقوق والميزانية أولًا.':'Prepare rights and budget first.',
    'تغيّر إصدار المسودة الأصلية.':'The original draft version changed.',
    'المسودة مؤرشفة.':'The draft is archived.', 'تغيّرت سلطة المالك.':'Owner authority changed.',
    'انتهى سريان المصدر أو لم يبدأ بعد.':'Source validity expired or has not started.',
    'تغيّر مصدر مرتبط أو إصداره.':'A linked source or its version changed.',
    'تغيّر ربط الميزانية أو الحساب المالي.':'The budget or finance account binding changed.',
    'قرار المالك مطلوب.':'An owner decision is required.', 'سُحب اعتماد التجهيز.':'Preparation approval was revoked.',
    'رفض المالك التجهيز.':'The owner declined preparation.', 'الدليل المرتبط غير نافذ حاليًا.':'Linked evidence is not current.',
    'دليل النشر المرتبط غير متاح.':'Linked publication evidence is unavailable.',
    'المصدر غير معتمد أو غير فعال.':'The source is not approved or active.',
    'تغيّر نطاق المصدر بالنسبة للحملة.':'The source no longer matches the campaign scope.',
    'تعذر تأكيد اعتماد المصدر الحالي.':'Current source approval could not be verified.',
    'تعذر تأكيد الحساب المالي الحالي.':'The current finance account could not be verified.',
    'المراجع الحالية':'Current references', 'مصدر الحقوق':'Rights source', 'مصدر الميزانية':'Budget source',
    'نسخة الحقوق المحفوظة':'Saved rights snapshot', 'نسخة الميزانية المحفوظة':'Saved budget snapshot',
    'هذه نسخة المصدر المرتبطة بالتجهيز. راجع الجاهزية أعلاه لمعرفة صلاحيتها الحالية.':'This source snapshot is bound to the preparation. Check readiness above for its current validity.',
    'نافذ':'Current', 'غير نافذ':'Not current', 'اختر مصدرًا معتمدًا':'Choose an approved source',
    'لا توجد مصادر صالحة في القائمة الحالية.':'No eligible sources are available in the current list.',
    'إعداد مصادر الحملة':'Prepare campaign sources', 'حفظ نماذج المصادر':'Save source templates',
    'إنشاء مصدر الحقوق':'Create rights source', 'إنشاء مصدر الميزانية':'Create budget source',
    'تُحفظ مسودة مستند ثم تمر بالمراجعة الأصلية المستقلة. المصدر المعتمد يكفي؛ لا يلزم توقيع إضافي هنا.':'A document draft follows its original independent review workflow. An approved source is sufficient; no additional signature is required here.',
    'فتح المستندات':'Open documents', 'فتح المستند الأصلي':'Open original document',
    'تثبيت النماذج فعل صريح، ولا ينشئ اعتمادًا أو إذنًا.':'Saving templates is an explicit action and creates no approval or permission.',
    'بداية السريان بتوقيت جهازك':'Valid from in your device time', 'نهاية السريان بتوقيت جهازك':'Valid until in your device time',
    'يجب أن تكون نهاية السريان بعد بدايته.':'Validity must end after it starts.',
    'مرجع صاحب الحق':'Rights holder reference', 'نطاق المحتوى':'Content scope', 'مرجع إذن المحتوى الأصلي':'Original content permission reference',
    'نطاق البيانات المستخدمة':'Data use scope', 'مرجع إذن البيانات أو أساس عدم استخدامها':'Data permission or non-use basis',
    'القيود الصريحة':'Explicit restrictions', 'الحساب المالي الأصلي':'Original finance account', 'عملة الحساب':'Account currency',
    'السقف شامل الضريبة':'Budget cap including tax', 'الضريبة الصريحة':'Explicit tax', 'أساس الضريبة أو عدم الإنفاق':'Tax or no-spend basis',
    'ضريبة مشمولة صريحة':'Explicit included tax', 'نسبة صفرية':'Zero-rated', 'معفى':'Exempt', 'لا إنفاق':'No spending',
    'سبب المعالجة الضريبية':'Tax treatment reason', 'نطاق الميزانية والمصروف المسموح':'Budget and permitted spending scope',
    'المبالغ بعملة الحساب؛ استخدم النقطة للفاصل العشري. لا تُستنتج نسبة ضريبة.':'Amounts use the account currency; use a decimal point. No tax rate is inferred.',
    'راجع المبلغ والضريبة وأساس المعالجة. الميزانية الصفرية تتطلب لا إنفاق.':'Review the amount, tax and treatment. A zero budget requires no spending.',
    'اختر حسابًا ماليًا من القائمة الحالية.':'Choose a finance account from the current list.',
    'إرفاق الأصل PDF (اختياري)':'Attach original PDF (optional)', 'ملف PDF، حتى 10 ميغابايت.':'PDF file, up to 10 MB.',
    'اختر ملف PDF لا يتجاوز 10 ميغابايت.':'Choose a PDF up to 10 MB.', 'حفظ مسودة المصدر':'Save source draft',
    'إلغاء إعداد المصدر':'Cancel source preparation', 'حُفظت المسودة؛ تابع مراجعتها في المستندات.':'Draft saved; continue its review in Documents.',
    'حُفظت المسودة وتعذر إرفاق الملف؛ أكمل المرفق من المستند الأصلي.':'Draft saved, but the attachment failed; finish it in the original document.',
    'الربط مأخوذ من إصدار الحملة الحالي والقنوات المحددة فيه.':'The binding comes from the current campaign version and its channels.',
    'توصية التجهيز':'Preparation recommendation', 'حفظ تجهيز الحملة':'Save campaign preparation',
    'قرار المالك الفعلي':'Actual owner decision', 'سبب القرار':'Decision reason',
    'راجعت المصادر والميزانية وحدود التجهيز الداخلي':'I reviewed the sources, budget and internal preparation boundary',
    'الموافقة على التجهيز':'Approve preparation', 'رفض التجهيز':'Decline preparation',
    'لا يمكن الموافقة قبل معالجة أسباب عدم الجاهزية؛ يبقى الرفض متاحًا وفق الصلاحية.':'Approval requires resolving readiness reasons; decline remains available when authorized.',
    'القرار المحفوظ':'Recorded decision', 'تاريخ القرار':'Decision time', 'ملاحظة القرار':'Decision note',
    'سحب التجهيز':'Revoke preparation', 'سبب السحب':'Revocation reason', 'راجعت أثر سحب التجهيز':'I reviewed the effect of revocation',
    'النشر وأدلة القياس':'Publication and measurement evidence', 'بانتظار القناة':'Pending channel',
    'واقعة نشر سجلها المالك':'Owner-recorded publication', 'القنوات الخارجية غير مربوطة؛ إذن النشر الخارجي مطلوب ولم يُمنح.':'External channels are not connected; external publication authorization is requested and not granted.',
    'دليل مسجل من المالك؛ غير متحقق من المزود.':'Owner-recorded evidence; not verified by the provider.',
    'لا يوجد دليل نشر نافذ مرتبط حاليًا.':'No current publication evidence is linked.', 'القناة':'Channel', 'مرجع النشر':'Publication reference',
    'وقت الواقعة':'Occurrence time', 'سجل الوقائع الأصلي':'Original evidence register',
    'سجّل الوقائع الفعلية ومستنداتها في السجل الأصلي، ثم اربطها هنا؛ الربط لا ينفذ النشر.':'Record actual observations and their documents in the original register, then link them here. Linking does not publish.',
    'ربط الأدلة الحالية':'Link current evidence', 'دليل نشر':'Publication evidence', 'دليل قياس':'Measurement evidence',
    'سبب تحديث الربط':'Reason for changing links', 'راجعت مجموعة الأدلة المحددة كاملة':'I reviewed the complete selected evidence set',
    'حفظ روابط الأدلة':'Save evidence links', 'مرجع محفوظ خارج القائمة الحالية':'Saved reference outside the current list',
    'هذه قائمة محدودة. المراجع المرتبطة خارجها محفوظة، ولا تُزال إلا باختيارك الصريح.':'This list is limited. Linked references outside it are preserved and are only removed by your explicit choice.',
    'هذه قائمة مصادر محدودة؛ افتح المستندات لعرض بقية السجل.':'This source list is limited; open Documents to view the rest.',
    'هذه قائمة حسابات محدودة.':'This finance account list is limited.', 'لا توجد أدلة متاحة للربط في القائمة الحالية.':'No evidence is available to link in this list.',
    'نوافذ القياس':'Measurement windows', 'بداية النافذة':'Window start', 'نهاية النافذة':'Window end',
    'مرات الظهور':'Impressions', 'النقرات':'Clicks', 'التحويلات':'Conversions',
    'لا تتوفر نوافذ قياس نافذة.':'No current measurement windows are available.',
    'توجد نوافذ متداخلة؛ تُعرض منفصلة ولا تُجمع.':'Overlapping windows are shown separately and are not summed.',
    'القياس لكل نافذة فقط؛ لا يوجد مجموع موثوق أو عائد استثمار متاح.':'Measurements are per window only; a verified aggregate and return on investment are unavailable.',
    'الصرف الفعلي':'Actual spending', 'غير متاح؛ لا يوجد مصدر تنفيذ مالي':'Unavailable; no financial execution source',
    'العائد على الاستثمار':'Return on investment', 'غير متاح':'Unavailable',
    'سجل المراجعة':'Review history', 'لا توجد إجراءات محفوظة بعد.':'No actions have been recorded yet.',
    'تجهيز':'Preparation', 'قرار':'Decision', 'سحب':'Revocation', 'تحديث روابط الأدلة':'Evidence link update',
    'يُعرض أحدث 50 إجراء؛ التاريخ الأقدم محفوظ.':'Showing the latest 50 actions; earlier history is retained.',
    'التطبيق':'App', 'الموقع':'Website', 'البريد الإلكتروني':'Email', 'الرسائل النصية':'Text messages',
    'واتساب':'WhatsApp', 'التواصل الاجتماعي':'Social media', 'الإعلانات المدفوعة':'Paid advertising',
    'السريان من':'Valid from', 'السريان حتى':'Valid until', 'مرجع المصدر':'Source reference',
    'صافي السقف دون الضريبة':'Budget cap excluding tax', 'سقف تجهيز؛ ليس حجزًا ماليًا أو مبلغًا مصروفًا.':'Preparation cap; not a financial reservation or spending.',
    '{0} · الإصدار {1}':'{0} · Version {1}'
  });
  const stylesheet='./hydroland-campaign-lifecycle.css';
  if(!document.querySelector('link[href="'+stylesheet+'"]')){const node=document.createElement('link');node.rel='stylesheet';node.href=stylesheet;document.head.appendChild(node);}
  const auth=()=>window.HydrolandAuth, access=()=>window.HydrolandPortalAccess;
  const unresolvedDocuments=new Map();
  for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,()=>unresolvedDocuments.clear());
  const dictionary={PREPARED:'بانتظار قرار المالك',APPROVED:'تجهيز معتمد',DECLINED:'مرفوض',REVOKED:'مسحوب',APPROVE:'تجهيز معتمد',DECLINE:'مرفوض',APP:'التطبيق',WEB:'الموقع',EMAIL:'البريد الإلكتروني',SMS:'الرسائل النصية',WHATSAPP:'واتساب',SOCIAL:'التواصل الاجتماعي',PAID_ADS:'الإعلانات المدفوعة',TAX_INCLUDED:'ضريبة مشمولة صريحة',ZERO_RATED:'نسبة صفرية',EXEMPT:'معفى',NO_SPEND:'لا إنفاق',PREPARE:'تجهيز',REVOKE:'سحب',BIND_EVIDENCE:'تحديث روابط الأدلة'};
  const reasons={PREPARATION_REQUIRED:'يجب تجهيز الحقوق والميزانية أولًا.',DRAFT_CHANGED:'تغيّر إصدار المسودة الأصلية.',CAMPAIGN_ARCHIVED:'المسودة مؤرشفة.',OWNER_AUTHORITY_CHANGED:'تغيّرت سلطة المالك.',SOURCE_EXPIRED:'انتهى سريان المصدر أو لم يبدأ بعد.',CAMPAIGN_SOURCE_EXPIRED:'انتهى سريان المصدر أو لم يبدأ بعد.',SOURCE_BINDING_CHANGED:'تغيّر مصدر مرتبط أو إصداره.',BUDGET_BINDING_CHANGED:'تغيّر ربط الميزانية أو الحساب المالي.',OWNER_DECISION_REQUIRED:'قرار المالك مطلوب.',OWNER_APPROVAL_REVOKED:'سُحب اعتماد التجهيز.',OWNER_DECLINED:'رفض المالك التجهيز.',EVIDENCE_NOT_CURRENT:'الدليل المرتبط غير نافذ حاليًا.',PUBLICATION_BINDING_UNAVAILABLE:'دليل النشر المرتبط غير متاح.',CAMPAIGN_SOURCE_NOT_ACTIVE:'المصدر غير معتمد أو غير فعال.',CAMPAIGN_SOURCE_SCOPE_CHANGED:'تغيّر نطاق المصدر بالنسبة للحملة.'};
  const own=(value,key)=>Object.prototype.hasOwnProperty.call(value||{},key);
  const object=value=>Boolean(value&&typeof value==='object'&&!Array.isArray(value));
  const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
  const text=value=>typeof value==='string';
  const integer=value=>Number.isSafeInteger(value)&&value>=0;
  const locale=()=>window.HydrolandI18n.getLocale()==='en'?'en-GB':'ar-SA';
  function date(value){if(!value||!Number.isFinite(Date.parse(value)))return ui.t('غير متاح');return new Intl.DateTimeFormat(locale(),{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Riyadh'}).format(new Date(value));}
  function money(value,currency){if(!integer(value)||!/^[A-Z]{3}$/.test(currency||''))return ui.t('غير متاح');try{const f=new Intl.NumberFormat(locale(),{style:'currency',currency});return f.format(value/10**f.resolvedOptions().maximumFractionDigits);}catch{return ui.t('غير متاح');}}
  function element(tag,parent,label){const node=document.createElement(tag);if(label!==undefined)ui.setText(node,label);if(parent)parent.append(node);return node;}
  function opaque(tag,parent,value){const node=element(tag,parent);node.textContent=value??'';return node;}
  function button(parent,label,fn){const node=element('button',parent,label);node.type='button';if(fn)node.addEventListener('click',fn);return node;}
  function control(parent,label,name,type='text',required=true){const wrap=element('label',parent,label),node=element(type==='textarea'?'textarea':type==='select'?'select':'input',wrap);node.name=name;if(node.tagName==='INPUT')node.type=type;node.required=required;ui.setAttribute(node,'aria-label',label);if(type==='text'||type==='textarea')node.maxLength=2000;return node;}
  function option(select,value,label,authored=false){const node=element('option',select);node.value=value;if(authored)ui.setText(node,label);else node.textContent=label;return node;}
  function field(parent,label,value){const row=element('div',parent);element('dt',row,label);opaque('dd',row,value);return row;}
  function reasonList(parent,codes){const list=element('ul',parent);for(const code of codes||[]){const node=element('li',list);if(reasons[code])ui.setText(node,reasons[code]);else if(String(code).startsWith('CAMPAIGN_SOURCE_'))ui.setText(node,'تعذر تأكيد اعتماد المصدر الحالي.');else if(String(code).includes('FINANCE_ACCOUNT'))ui.setText(node,'تعذر تأكيد الحساب المالي الحالي.');else node.textContent=code;}return list;}
  const invalid=()=>new Error(ui.t('تعذر التحقق من استجابة دورة الحملة.'));
  function validateView(value,draftId){
    if(!object(value)||value.schemaVersion!==1||value.policy!=='MARKETING_CAMPAIGN_LIFECYCLE_V1'||!text(value.organizationId)||value.campaign?.id!==draftId||!integer(value.campaign.revision)||value.campaign.revision<1||!hash(value.campaign.recordDigest)||!text(value.campaign.title)||!Array.isArray(value.campaign.channels)||!value.campaign.channels.every(key=>own(dictionary,key)))throw invalid();
    if(!object(value.readiness)||typeof value.readiness.ready!=='boolean'||typeof value.readiness.canApprove!=='boolean'||value.readiness.scope!=='INTERNAL_PREPARATION'||!hash(value.readiness.hash)||!Array.isArray(value.readiness.reasonCodes)||!value.readiness.reasonCodes.every(text))throw invalid();
    if(!object(value.capabilities)||!['prepare','decide','revoke','bindEvidence','installTemplates'].every(key=>typeof value.capabilities[key]==='boolean')||!Array.isArray(value.history)||typeof value.historyTruncated!=='boolean'||!Array.isArray(value.evidenceStates))throw invalid();
    if(value.lifecycle!==null&&(!object(value.lifecycle)||!integer(value.lifecycle.revision)||value.lifecycle.revision<1||!hash(value.lifecycle.recordDigest)||!['PREPARED','APPROVED','DECLINED','REVOKED'].includes(value.lifecycle.status)||!object(value.lifecycle.rights)||!object(value.lifecycle.budget)||!Array.isArray(value.lifecycle.evidenceBindings)))throw invalid();
    if(!['PENDING_CHANNEL','OWNER_RECORDED'].includes(value.publication?.status)||value.publication.channelConnection!=='NOT_CONNECTED'||value.publication.externalAuthorization!=='REQUESTED_NOT_GRANTED'||value.publication.providerVerified!==false||!Array.isArray(value.publication.ownerRecordedPublication))throw invalid();
    if(!Array.isArray(value.measurements?.windows)||!Array.isArray(value.measurements.overlaps)||value.measurements.aggregate!==null||value.measurements.roi!==null||value.spend?.executed!==false||value.spend.amountMinor!==null)throw invalid();
    if(value.measurements.windows.some(row=>!['impressions','clicks','conversions'].every(key=>integer(row[key]))||row.providerVerified!==false||row.provenance!=='OWNER_RECORDED'))throw invalid();
    return value;
  }
  function validateSources(value,view){
    const bound=value?.campaignBinding;
    if(value?.schemaVersion!==1||bound?.campaignDraftId!==view.campaign.id||bound.draftRevision!==view.campaign.revision||bound.draftDigest!==view.campaign.recordDigest||!Array.isArray(bound.channels)||JSON.stringify([...bound.channels].sort())!==JSON.stringify([...view.campaign.channels].sort())||!Array.isArray(value.templates)||!Array.isArray(value.financeAccounts)||!Array.isArray(value.evidence)||!object(value.documents))throw invalid();
    for(const key of ['rights','budgets'])if(!Array.isArray(value.documents[key])||typeof value.documentsTruncated?.[key]!=='boolean'||value.documents[key].some(row=>!text(row.id)||!integer(row.version)||typeof row.eligible!=='boolean'||!Array.isArray(row.reasonCodes)||(row.eligible? !hash(row.hash)||!object(row.summary):row.hash!==null||row.summary!==null)))throw invalid();
    if(typeof value.evidenceTruncated!=='boolean'||typeof value.financeAccountsTruncated!=='boolean'||value.financeAccounts.some(row=>!text(row.id)||!text(row.name)||!/^[A-Z]{3}$/.test(row.currency))||value.evidence.some(row=>!text(row.id)||!['CAMPAIGN_PUBLICATION','CAMPAIGN_ANALYTICS'].includes(row.kind)||typeof row.eligible!=='boolean'||!Array.isArray(row.reasonCodes)||row.providerVerified!==false||(row.eligible?!hash(row.hash)||!object(row.details):row.hash!==null||row.details!==null)))throw invalid();
    return value;
  }
  function mount(host,options){
    let alive=true,busy=false,needsRefresh=false,version=0,view=null,sources=null;
    const session=auth().getSessionVersion(),commands=new Map(),requests=new Set();
    host.classList.add('hl-campaign-lifecycle');host.replaceChildren();
    const header=element('header',host);element('h4',header,'الحقوق والميزانية وقرار الحملة');const refreshButton=button(header,'تحديث التفاصيل',()=>void refresh());refreshButton.dataset.c06Refresh='';
    element('p',host,'جاهزية تجهيز داخلية؛ لا تنفذ هذه الصفحة نشرًا أو صرفًا ولا تمنح إذن القنوات الخارجية.').className='hl-campaign-notice';
    const status=element('p',host);status.setAttribute('role','status');status.dataset.c06Status='';const content=element('div',host);content.dataset.c06Content='';
    const current=()=>alive&&host.isConnected&&options.isCurrent()&&session===auth().getSessionVersion()&&auth().isAuthenticated()&&access()?.getCurrentRole?.()==='admin'&&access()?.roleAllowed?.('admin');
    const path=suffix=>'/admin/marketing-campaign-drafts/'+encodeURIComponent(options.draftId)+'/lifecycle'+suffix;
    function lock(value){busy=value;content.inert=value;refreshButton.disabled=value;host.setAttribute('aria-busy',String(value));options.onBusy(value);if(!value&&needsRefresh)content.querySelectorAll('[data-c06-write]').forEach(node=>node.disabled=true);}
    function destroy(){alive=false;version++;view=sources=null;commands.clear();for(const request of requests)request.abort();requests.clear();host.replaceChildren();}
    async function authorize(){const allowed=await access()?.authorizeRole?.('admin',{sessionVersion:session,isCurrent:current});if(!allowed){if(alive&&session===auth().getSessionVersion())options.onAccessLost();return false;}return current();}
    async function request(url,body){const controller=new AbortController();requests.add(controller);try{const response=await auth().authorizedFetch(url,{cache:'no-store',signal:controller.signal,...(body===undefined?{}:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})});const data=await response.json().catch(()=>null);if(!response.ok)throw Object.assign(new Error(typeof data?.message==='string'?data.message:''),{status:response.status});return data;}finally{requests.delete(controller);}}
    function error(error,writing=false){if(!current())return;if([401,403,404].includes(error?.status)){options.onAccessLost();return;}if(error?.status===409){needsRefresh=true;ui.setText(status,'تغيّرت البيانات. حدّث التفاصيل وراجع المصادر قبل إعادة الإجراء.');if(error.message)opaque('span',status,' '+error.message);}else if(error?.message&&error.name!=='TypeError'&&error.name!=='AbortError')status.textContent=error.message;else ui.setText(status,writing?'تعذر تأكيد الحفظ. يمكنك إعادة المحاولة بالبيانات نفسها.':'تعذرت قراءة دورة الحملة.');}
    async function refresh(){
      if(busy||!current())return;const ticket=++version;lock(true);ui.setText(status,'جارٍ تحميل دورة الحملة…');
      try{if(!await authorize())return;const pair=await Promise.all([request(path('')),request(path('/sources'))]);if(!current()||ticket!==version)return;const next=validateView(pair[0],options.draftId),nextSources=validateSources(pair[1],next);view=next;sources=nextSources;needsRefresh=false;render();ui.setText(status,'تم تحديث دورة الحملة.');}
      catch(e){if(current()&&ticket===version){view=sources=null;content.replaceChildren();error(e);}}
      finally{if(current()&&ticket===version)lock(false);}
    }
    async function write(action,payload,form){
      if(busy||needsRefresh||!current()||!view||!form?.isConnected||!form.reportValidity())return;
      const capability={prepare:'prepare',decision:'decide',revoke:'revoke',evidence:'bindEvidence'}[action];if(!view.capabilities[capability]||(action==='decision'&&payload.decision==='APPROVE'&&!view.readiness.canApprove))return;
      const body={expectedRevision:view.lifecycle?.revision??0,expectedDigest:view.lifecycle?.recordDigest??null,...payload};
      const fingerprint=action+':'+JSON.stringify(body);if(!commands.has(fingerprint))commands.set(fingerprint,crypto.randomUUID());const requestId=commands.get(fingerprint);const ticket=version;lock(true);ui.setText(status,'جارٍ حفظ الإجراء…');
      try{if(!await authorize()||!form.isConnected)return;const result=await request(path('/'+action),{requestId,...body});if(!current()||ticket!==version)return;view=validateView(result,options.draftId);commands.delete(fingerprint);render();ui.setText(status,'تم حفظ الإجراء.');}
      catch(e){if(current()&&ticket===version)error(e,true);}
      finally{if(current()&&ticket===version)lock(false);}
    }
    function writeForm(parent,label,allowed){const form=element('form',parent),fields=element('fieldset',form);fields.dataset.c06Write='';fields.disabled=!allowed||needsRefresh;element('legend',fields,label);return{form,fields};}
    function confirmed(fields,label){return control(fields,label,'confirmed','checkbox');}
    function submit(fields,label){const node=button(fields,label);node.type='submit';return node;}
    function nativeDocument(id,department,templateId){if(!current()||busy)return;void(async()=>{lock(true);try{if(!await authorize())return;if(current())await window.HydrolandDocuments?.open({organizationId:view.organizationId,documentId:id,department,templateId,internal:true});}catch(e){error(e);}finally{if(current())lock(false);}})();}
    function documentButton(parent,id,department,templateId,label='فتح المستند الأصلي'){return button(parent,label,()=>nativeDocument(id,department,templateId));}
    function openEvidence(){if(busy||!current())return;const panel=document.querySelector('[data-operational-evidence]'),outer=panel?.closest('[data-agent-workforce]');if(!panel||!outer)return;outer.open=true;panel.open=true;const summary=panel.querySelector('summary');summary?.focus();summary?.scrollIntoView({block:'nearest',behavior:'instant'});}
    function sourceCard(parent,source,kind){const card=element('article',parent);card.dataset.c06Source=kind;const data=element('dl',card);field(data,'مرجع المصدر',source.referenceNumber);field(data,'الإصدار',source.version);field(data,'السريان من',date(source.validFrom));field(data,'السريان حتى',date(source.validUntil));if(kind==='rights'){for(const [key,label]of [['rightsHolderReference','مرجع صاحب الحق'],['contentScope','نطاق المحتوى'],['contentPermissionReference','مرجع إذن المحتوى الأصلي'],['dataScope','نطاق البيانات المستخدمة'],['dataPermissionReference','مرجع إذن البيانات أو أساس عدم استخدامها'],['restrictions','القيود الصريحة']])field(data,label,source[key]);}else{field(data,'الحساب المالي الأصلي',sources.financeAccounts.find(a=>a.id===source.financeAccountId)?.name||ui.t('غير متاح'));field(data,'السقف شامل الضريبة',money(source.amountMinor,source.currency));field(data,'الضريبة الصريحة',money(source.taxMinor,source.currency));field(data,'صافي السقف دون الضريبة',money(source.amountMinor-source.taxMinor,source.currency));field(data,'أساس الضريبة أو عدم الإنفاق',ui.t(dictionary[source.taxBasis]||'غير متاح'));field(data,'سبب المعالجة الضريبية',source.taxReason);field(data,'نطاق الميزانية والمصروف المسموح',source.budgetScope);element('p',card,'سقف تجهيز؛ ليس حجزًا ماليًا أو مبلغًا مصروفًا.');}documentButton(card,source.id,source.department);}
    function renderSourceOptions(parent,kind,label){const select=control(parent,label,kind,'select');option(select,'','اختر مصدرًا معتمدًا',true);for(const row of sources.documents[kind]){const node=option(select,row.id,row.referenceNumber+' · '+row.title+' · '+ui.t(row.eligible?'نافذ':'غير نافذ'));node.disabled=!row.eligible;}if(!sources.documents[kind].some(row=>row.eligible))element('p',parent,'لا توجد مصادر صالحة في القائمة الحالية.');return select;}
    function render(){
      content.replaceChildren();const intro=element('section',content),data=element('dl',intro);field(data,'المسودة الأصلية',view.campaign.title);field(data,'الإصدار',view.campaign.revision);field(data,'حالة التجهيز',ui.t(view.lifecycle?dictionary[view.lifecycle.status]:'لم يُجهز بعد'));
      const ready=element('section',content);ready.dataset.c06Readiness='';element('h5',ready,'جاهزية المصادر الحالية');element('strong',ready,view.readiness.ready?'جاهز للتجهيز الداخلي':'يتطلب إجراء');reasonList(ready,view.readiness.reasonCodes);
      const sourceSection=element('section',content);element('h5',sourceSection,'المراجع الحالية');
      if(view.lifecycle){element('h6',sourceSection,'نسخة الحقوق المحفوظة');element('p',sourceSection,'هذه نسخة المصدر المرتبطة بالتجهيز. راجع الجاهزية أعلاه لمعرفة صلاحيتها الحالية.');sourceCard(sourceSection,view.lifecycle.rights,'rights');element('h6',sourceSection,'نسخة الميزانية المحفوظة');sourceCard(sourceSection,view.lifecycle.budget,'budget');}
      for(const [kind,label]of [['rights','مصدر الحقوق'],['budgets','مصدر الميزانية']])for(const row of sources.documents[kind]){const details=element('details',sourceSection);details.dataset.c06SourceOption=row.id;opaque('summary',details,row.referenceNumber+' · '+ui.t(label)+' · '+ui.t(row.eligible?'نافذ':'غير نافذ'));if(row.summary)sourceCard(details,{...row.summary,...row,department:kind==='rights'?'MARKETING_GROWTH':'FINANCE'},kind==='rights'?'rights':'budget');else{reasonList(details,row.reasonCodes);documentButton(details,row.id,kind==='rights'?'MARKETING_GROWTH':'FINANCE');}}
      if(sources.documentsTruncated.rights||sources.documentsTruncated.budgets)element('p',sourceSection,'هذه قائمة مصادر محدودة؛ افتح المستندات لعرض بقية السجل.');
      const tools=element('section',content);element('h5',tools,'إعداد مصادر الحملة');element('p',tools,'تُحفظ مسودة مستند ثم تمر بالمراجعة الأصلية المستقلة. المصدر المعتمد يكفي؛ لا يلزم توقيع إضافي هنا.');
      const templateCodes=['C06-CAMPAIGN-RIGHTS-V1','C06-CAMPAIGN-BUDGET-V1'];
      if(templateCodes.some(code=>!sources.templates.some(t=>t.code===code))){const install=button(tools,'حفظ نماذج المصادر',()=>void installTemplates());install.dataset.c06Write='';install.disabled=!view.capabilities.installTemplates;element('p',tools,'تثبيت النماذج فعل صريح، ولا ينشئ اعتمادًا أو إذنًا.');}
      for(const [index,label]of ['إنشاء مصدر الحقوق','إنشاء مصدر الميزانية'].entries()){const create=button(tools,label,()=>sourceForm(index===0?'rights':'budget'));create.dataset.c06Write='';create.disabled=!sources.templates.some(t=>t.code===templateCodes[index])||!view.capabilities.prepare;}
      documentButton(tools,undefined,undefined,undefined,'فتح المستندات');const compose=element('div',tools);compose.dataset.c06Compose='';
      const prep=writeForm(content,'توصية التجهيز',view.capabilities.prepare),rights=renderSourceOptions(prep.fields,'rights','مصدر الحقوق'),budget=renderSourceOptions(prep.fields,'budgets','مصدر الميزانية'),recommendation=control(prep.fields,'توصية التجهيز','recommendation','textarea');submit(prep.fields,'حفظ تجهيز الحملة');prep.form.dataset.c06Prepare='';
      prep.form.addEventListener('submit',event=>{event.preventDefault();const one=sources.documents.rights.find(r=>r.id===rights.value&&r.eligible),two=sources.documents.budgets.find(r=>r.id===budget.value&&r.eligible);if(!one||!two)return;void write('prepare',{expectedDraftRevision:view.campaign.revision,expectedDraftDigest:view.campaign.recordDigest,rightsDocument:{id:one.id,version:one.version,hash:one.hash},budgetDocument:{id:two.id,version:two.version,hash:two.hash},recommendation:recommendation.value.trim()},prep.form);});
      if(view.lifecycle){
        if(view.lifecycle.recommendation)field(element('dl',content),'توصية التجهيز',view.lifecycle.recommendation);
        const decision=writeForm(content,'قرار المالك الفعلي',view.capabilities.decide),note=control(decision.fields,'سبب القرار','note','textarea'),confirm=confirmed(decision.fields,'راجعت المصادر والميزانية وحدود التجهيز الداخلي');decision.form.dataset.c06Decision='';const approve=submit(decision.fields,'الموافقة على التجهيز');approve.value='APPROVE';approve.name='decision';approve.disabled=!view.readiness.canApprove;const decline=submit(decision.fields,'رفض التجهيز');decline.value='DECLINE';decline.name='decision';if(view.capabilities.decide&&!view.readiness.canApprove)element('p',decision.fields,'لا يمكن الموافقة قبل معالجة أسباب عدم الجاهزية؛ يبقى الرفض متاحًا وفق الصلاحية.');decision.form.addEventListener('submit',event=>{event.preventDefault();if(!['APPROVE','DECLINE'].includes(event.submitter?.value))return;void write('decision',{expectedReadinessHash:view.readiness.hash,decision:event.submitter.value,note:note.value.trim(),confirmed:confirm.checked},decision.form);});
        if(view.lifecycle.decision){const recorded=element('dl',content);recorded.dataset.c06RecordedDecision='';field(recorded,'القرار المحفوظ',ui.t(dictionary[view.lifecycle.decision.status]||'غير متاح'));field(recorded,'تاريخ القرار',date(view.lifecycle.decision.recordedAt));field(recorded,'ملاحظة القرار',view.lifecycle.decision.note);}
        const revoke=writeForm(content,'سحب التجهيز',view.capabilities.revoke),reason=control(revoke.fields,'سبب السحب','reason','textarea'),confirmRevoke=confirmed(revoke.fields,'راجعت أثر سحب التجهيز');revoke.form.dataset.c06Revoke='';submit(revoke.fields,'سحب التجهيز');revoke.form.addEventListener('submit',event=>{event.preventDefault();void write('revoke',{reason:reason.value.trim(),confirmed:confirmRevoke.checked},revoke.form);});
      }
      renderEvidence();renderMeasurements();renderHistory();
    }
    function renderEvidence(){
      const section=element('section',content);section.dataset.c06Publication='';element('h5',section,'النشر وأدلة القياس');element('strong',section,view.publication.status==='OWNER_RECORDED'?'واقعة نشر سجلها المالك':'بانتظار القناة');element('p',section,'القنوات الخارجية غير مربوطة؛ إذن النشر الخارجي مطلوب ولم يُمنح.');
      if(!view.publication.ownerRecordedPublication.length)element('p',section,'لا يوجد دليل نشر نافذ مرتبط حاليًا.');
      for(const row of view.publication.ownerRecordedPublication){const card=element('article',section),data=element('dl',card);opaque('h6',card,row.reference);element('p',card,'دليل مسجل من المالك؛ غير متحقق من المزود.');field(data,'القناة',ui.t(dictionary[row.channel]||'غير متاح'));field(data,'مرجع النشر',row.publicationReference);field(data,'وقت الواقعة',date(row.occurredAt));if(row.proof?.id)documentButton(card,row.proof.id,'MARKETING_GROWTH');}
      element('p',section,'سجّل الوقائع الفعلية ومستنداتها في السجل الأصلي، ثم اربطها هنا؛ الربط لا ينفذ النشر.');button(section,'سجل الوقائع الأصلي',openEvidence);
      const linked=new Map((view.lifecycle?.evidenceBindings||[]).map(row=>[row.id,row])),form=writeForm(section,'ربط الأدلة الحالية',view.capabilities.bindEvidence);form.form.dataset.c06Evidence='';const selections=new Map();
      const entries=[...sources.evidence,...[...linked.values()].filter(row=>!sources.evidence.some(e=>e.id===row.id)).map((row,index)=>({...row,reference:ui.t('مرجع محفوظ خارج القائمة الحالية')+' '+(index+1),eligible:view.evidenceStates.find(e=>e.id===row.id)?.current===true,outside:true,reasonCodes:view.evidenceStates.find(e=>e.id===row.id)?.reasonCodes||[]}))];
      for(const row of entries){const wrap=element('div',form.fields),label=element('label',wrap),input=element('input',label);input.type='checkbox';input.checked=linked.has(row.id);input.disabled=!row.eligible&&!linked.has(row.id);input.dataset.c06EvidenceId=row.id;const caption=element('span',label);caption.textContent=row.reference+' · '+ui.t(row.kind==='CAMPAIGN_PUBLICATION'?'دليل نشر':'دليل قياس')+' · '+ui.t(row.eligible?'نافذ':'غير نافذ');selections.set(row.id,input);if(row.reasonCodes?.length)reasonList(wrap,row.reasonCodes);}
      if(sources.evidenceTruncated||entries.some(row=>row.outside))element('p',form.fields,'هذه قائمة محدودة. المراجع المرتبطة خارجها محفوظة، ولا تُزال إلا باختيارك الصريح.');if(!entries.length)element('p',form.fields,'لا توجد أدلة متاحة للربط في القائمة الحالية.');const reason=control(form.fields,'سبب تحديث الربط','reason','textarea'),confirm=confirmed(form.fields,'راجعت مجموعة الأدلة المحددة كاملة');submit(form.fields,'حفظ روابط الأدلة');form.form.addEventListener('submit',event=>{event.preventDefault();void write('evidence',{evidenceIds:[...selections].filter(([,input])=>input.checked).map(([id])=>id).sort(),reason:reason.value.trim(),confirmed:confirm.checked},form.form);});
    }
    function renderMeasurements(){const section=element('section',content);section.dataset.c06Measurements='';element('h5',section,'نوافذ القياس');if(!view.measurements.windows.length)element('p',section,'لا تتوفر نوافذ قياس نافذة.');for(const row of view.measurements.windows){const card=element('article',section),data=element('dl',card);opaque('h6',card,row.reference);field(data,'القناة',ui.t(dictionary[row.channel]||'غير متاح'));field(data,'بداية النافذة',date(row.windowStart));field(data,'نهاية النافذة',date(row.windowEnd));for(const[key,label]of [['impressions','مرات الظهور'],['clicks','النقرات'],['conversions','التحويلات']])field(data,label,new Intl.NumberFormat(locale()).format(row[key]));element('p',card,'دليل مسجل من المالك؛ غير متحقق من المزود.');if(row.proof?.id)documentButton(card,row.proof.id,'MARKETING_GROWTH');}if(view.measurements.overlaps.length)element('p',section,'توجد نوافذ متداخلة؛ تُعرض منفصلة ولا تُجمع.');element('p',section,'القياس لكل نافذة فقط؛ لا يوجد مجموع موثوق أو عائد استثمار متاح.');const data=element('dl',section);field(data,'الصرف الفعلي',ui.t('غير متاح؛ لا يوجد مصدر تنفيذ مالي'));field(data,'العائد على الاستثمار',ui.t('غير متاح'));}
    function renderHistory(){const section=element('section',content);section.dataset.c06History='';element('h5',section,'سجل المراجعة');if(!view.history.length)element('p',section,'لا توجد إجراءات محفوظة بعد.');for(const row of view.history){const card=element('article',section);opaque('p',card,[date(row.createdAt),row.actor?.name,ui.t(dictionary[row.action]||row.action)].filter(Boolean).join(' · '));opaque('p',card,row.reason);}if(view.historyTruncated)element('p',section,'يُعرض أحدث 50 إجراء؛ التاريخ الأقدم محفوظ.');}
    async function installTemplates(){if(busy||needsRefresh||!current()||!view.capabilities.installTemplates)return;lock(true);try{if(!await authorize())return;await request('/admin/marketing-campaign-drafts/lifecycle/templates/install',{});if(!current())return;sources=validateSources(await request(path('/sources')),view);if(current()){render();ui.setText(status,'تم حفظ الإجراء.');}}catch(e){error(e,true);}finally{if(current())lock(false);}}
    function sourceForm(kind){
      if(busy||needsRefresh||!current()||!view.capabilities.prepare)return;
      const template=sources.templates.find(row=>row.code===(kind==='rights'?'C06-CAMPAIGN-RIGHTS-V1':'C06-CAMPAIGN-BUDGET-V1'));if(!template)return;
      const compose=content.querySelector('[data-c06-compose]');compose.replaceChildren();const form=writeForm(compose,kind==='rights'?'إنشاء مصدر الحقوق':'إنشاء مصدر الميزانية',true);form.form.dataset.c06SourceDraft=kind;element('p',form.fields,'الربط مأخوذ من إصدار الحملة الحالي والقنوات المحددة فيه.');const inputs={};
      for(const[name,label]of [['validFrom','بداية السريان بتوقيت جهازك'],['validUntil','نهاية السريان بتوقيت جهازك']])inputs[name]=control(form.fields,label,name,'datetime-local');
      if(kind==='rights')for(const[name,label,max,type]of [['rightsHolderReference','مرجع صاحب الحق',500,'text'],['contentScope','نطاق المحتوى',2000,'textarea'],['contentPermissionReference','مرجع إذن المحتوى الأصلي',1000,'text'],['dataScope','نطاق البيانات المستخدمة',2000,'textarea'],['dataPermissionReference','مرجع إذن البيانات أو أساس عدم استخدامها',1000,'text'],['restrictions','القيود الصريحة',2000,'textarea']]){inputs[name]=control(form.fields,label,name,type);inputs[name].maxLength=max;}
      else{
        inputs.financeAccountId=control(form.fields,'الحساب المالي الأصلي','financeAccountId','select');option(inputs.financeAccountId,'','اختر حسابًا ماليًا من القائمة الحالية.',true);for(const account of sources.financeAccounts)option(inputs.financeAccountId,account.id,account.name+' · '+account.currency);const currency=element('p',form.fields);currency.dataset.c06Currency='';inputs.financeAccountId.addEventListener('change',()=>{const account=sources.financeAccounts.find(row=>row.id===inputs.financeAccountId.value);currency.textContent=account?ui.t('عملة الحساب')+': '+account.currency:'';});if(sources.financeAccountsTruncated)element('p',form.fields,'هذه قائمة حسابات محدودة.');
        for(const[name,label]of [['amount','السقف شامل الضريبة'],['tax','الضريبة الصريحة']]){inputs[name]=control(form.fields,label,name);inputs[name].inputMode='decimal';inputs[name].maxLength=24;}
        element('p',form.fields,'المبالغ بعملة الحساب؛ استخدم النقطة للفاصل العشري. لا تُستنتج نسبة ضريبة.');inputs.taxBasis=control(form.fields,'أساس الضريبة أو عدم الإنفاق','taxBasis','select');option(inputs.taxBasis,'','أساس الضريبة أو عدم الإنفاق',true);for(const value of ['TAX_INCLUDED','ZERO_RATED','EXEMPT','NO_SPEND'])option(inputs.taxBasis,value,dictionary[value],true);inputs.taxReason=control(form.fields,'سبب المعالجة الضريبية','taxReason');inputs.taxReason.maxLength=1000;inputs.budgetScope=control(form.fields,'نطاق الميزانية والمصروف المسموح','budgetScope','textarea');
      }
      const file=control(form.fields,'إرفاق الأصل PDF (اختياري)','originalPdf','file',false);file.accept='application/pdf,.pdf';element('p',form.fields,'ملف PDF، حتى 10 ميغابايت.');submit(form.fields,'حفظ مسودة المصدر');button(form.fields,'إلغاء إعداد المصدر',()=>{if(!busy)compose.replaceChildren();});
      const bound={...sources.campaignBinding,channels:[...sources.campaignBinding.channels]},organizationId=view.organizationId;
      form.form.addEventListener('submit',event=>{event.preventDefault();if(busy||needsRefresh||!current()||!form.form.isConnected||!form.form.reportValidity())return;void saveSource(form,inputs,file,template,kind,bound,organizationId,compose);});
      inputs.validFrom.focus();form.form.scrollIntoView({block:'nearest',behavior:'instant'});
    }
    function minor(value,currency){const digits=new Intl.NumberFormat('en',{style:'currency',currency}).resolvedOptions().maximumFractionDigits;const match=/^(0|[1-9]\d*)(?:\.(\d+))?$/.exec(value.trim());if(!match||(match[2]||'').length>digits)throw new Error(ui.t('راجع المبلغ والضريبة وأساس المعالجة. الميزانية الصفرية تتطلب لا إنفاق.'));const result=Number(match[1])*10**digits+Number((match[2]||'').padEnd(digits,'0'));if(!integer(result)||result>2147483647)throw new Error(ui.t('راجع المبلغ والضريبة وأساس المعالجة. الميزانية الصفرية تتطلب لا إنفاق.'));return result;}
    async function attachment(input){const file=input.files?.[0];if(!file)return null;if(!/\.pdf$/i.test(file.name)||file.size<5||file.size>10*1024*1024)throw new Error(ui.t('اختر ملف PDF لا يتجاوز 10 ميغابايت.'));const bytes=new Uint8Array(await file.arrayBuffer());if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw new Error(ui.t('اختر ملف PDF لا يتجاوز 10 ميغابايت.'));let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return{filename:file.name,mimeType:'application/pdf',base64:btoa(binary)};}
    async function saveSource(form,inputs,file,template,kind,bound,organizationId,compose){
      lock(true);ui.setText(status,'جارٍ حفظ الإجراء…');let sent=false;
      try{
        if(!await authorize()||!form.form.isConnected)return;
        const payload={purpose:kind==='rights'?'C06_CAMPAIGN_RIGHTS_V1':'C06_CAMPAIGN_BUDGET_V1',campaignDraftId:bound.campaignDraftId,draftRevision:bound.draftRevision,draftDigest:bound.draftDigest,channelScope:bound.channels.map(channel=>({channel})),validFrom:new Date(inputs.validFrom.value).toISOString(),validUntil:new Date(inputs.validUntil.value).toISOString()};
        if(payload.validFrom>=payload.validUntil)throw new Error(ui.t('يجب أن تكون نهاية السريان بعد بدايته.'));
        if(kind==='rights')for(const key of ['rightsHolderReference','contentScope','contentPermissionReference','dataScope','dataPermissionReference','restrictions'])payload[key]=inputs[key].value.trim();
        else{const account=sources.financeAccounts.find(row=>row.id===inputs.financeAccountId.value);if(!account)throw new Error(ui.t('اختر حسابًا ماليًا من القائمة الحالية.'));Object.assign(payload,{financeAccountId:account.id,currency:account.currency,amountMinor:minor(inputs.amount.value,account.currency),taxMinor:minor(inputs.tax.value,account.currency),taxBasis:inputs.taxBasis.value,taxReason:inputs.taxReason.value.trim(),budgetScope:inputs.budgetScope.value.trim()});if(payload.taxMinor>payload.amountMinor||(payload.taxBasis==='TAX_INCLUDED'?payload.taxMinor===0:payload.taxMinor!==0)||(payload.amountMinor===0)!==(payload.taxBasis==='NO_SPEND'))throw new Error(ui.t('راجع المبلغ والضريبة وأساس المعالجة. الميزانية الصفرية تتطلب لا إنفاق.'));}
        const fileData=await attachment(file),digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(payload))),contentHash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
        if(!current()||!form.form.isConnected)return;const key=session+':'+organizationId+':'+template.id+':'+contentHash;
        if(unresolvedDocuments.has(key)){const previous=unresolvedDocuments.get(key);if(previous?.id){compose.replaceChildren();element('p',compose,'حُفظت المسودة؛ تابع مراجعتها في المستندات.');documentButton(compose,previous.id,template.department,template.id);ui.setText(status,'حُفظت المسودة؛ تابع مراجعتها في المستندات.');return;}throw new Error(ui.t('لم تُحسم نتيجة إنشاء المستند. افحص المستندات قبل إنشاء نسخة أخرى.'));}
        unresolvedDocuments.set(key,true);sent=true;let saved;
        try{saved=await request('/documents',{organizationId,templateId:template.id,department:template.department,contentHash,payload});}catch(e){if(e.status&&e.status<500)unresolvedDocuments.delete(key);throw e;}
        if(!current())return;if(!saved?.id||saved.organizationId!==organizationId||saved.templateId!==template.id)throw new Error(ui.t('لم تُحسم نتيجة إنشاء المستند. افحص المستندات قبل إنشاء نسخة أخرى.'));unresolvedDocuments.set(key,{id:saved.id});
        let attachmentFailed=false;if(fileData){try{await request('/documents/'+encodeURIComponent(saved.id)+'/attachments',fileData);}catch(e){if([401,403].includes(e.status))throw e;attachmentFailed=true;}}
        if(!current())return;compose.replaceChildren();element('p',compose,attachmentFailed?'حُفظت المسودة وتعذر إرفاق الملف؛ أكمل المرفق من المستند الأصلي.':'حُفظت المسودة؛ تابع مراجعتها في المستندات.');documentButton(compose,saved.id,template.department,template.id);ui.setText(status,'حُفظت المسودة؛ تابع مراجعتها في المستندات.');
      }catch(e){error(e,sent);if(current()&&sent&&(!e.status||e.status>=500)){element('p',compose,'لم تُحسم نتيجة إنشاء المستند. افحص المستندات قبل إنشاء نسخة أخرى.');documentButton(compose,undefined,template.department,template.id,'فتح المستندات');}}
      finally{if(current())lock(false);}
    }
    return{refresh,destroy};
  }
  window.HydrolandCampaignLifecycle={mount};
})();
