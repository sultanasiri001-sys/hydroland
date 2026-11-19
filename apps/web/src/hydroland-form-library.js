/* Central form editor. Uses the existing versioned DocumentTemplate endpoints.
 * Contracts, signed documents, and organization branding are never mutated here.
 */
(() => {
  'use strict';
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = (typeof window==='undefined'?globalThis:window).HydrolandI18n?.createScope("form-library", {
  "الموارد البشرية": "Human resources",
  "شؤون العمليات البحرية": "Marine operations affairs",
  "التدريب": "Training",
  "المخزون والمشتريات": "Inventory and procurement",
  "المالية": "Finance",
  "السلامة والامتثال والمخاطر": "Safety, compliance and risk",
  "خدمة العملاء": "Customer service",
  "التسويق والنمو": "Marketing and growth",
  "التقنية والأمن السيبراني": "Technology and cybersecurity",
  "المرافق والأصول والصيانة": "Facilities, assets and maintenance",
  "الشؤون الإدارية والوثائق": "Administrative affairs and records",
  "الإدارة التنفيذية والحوكمة": "Executive management and governance",
  "البحث والتطوير": "Research and development",
  "الشؤون القانونية والعقود والتأمين": "Legal affairs, contracts and insurance",
  "نص قصير": "Short text",
  "نص طويل": "Long text",
  "رقم": "Number",
  "تاريخ": "Date",
  "نعم أو لا": "Yes or no",
  "اختيار": "Selection",
  "اسم الموقّع في الحقل": "Signer's name field",
  "جدول": "Table",
  "عنوان قسم": "Section heading",
  "نص إقرار محفوظ": "Pinned acknowledgment wording",
  "إغلاق مكتبة النماذج": "Close form library",
  "سجل إصدارات القالب": "Template version history",
  "معاينة الهوية الرسمية": "Official identity preview",
  "معاينة PDF غير معتمدة": "Unapproved PDF preview",
  "مكتبة النماذج الإدارية": "Administrative form library",
  "مصدر واحد للقالب، وإصدار محفوظ لكل تعديل منشور.": "One template source, with a saved version for each published change.",
  "إغلاق": "Close",
  "الإدارة": "Department",
  "كل الإدارات": "All departments",
  "النموذج": "Template",
  "إعادة التحميل": "Reload",
  "إنشاء نموذج مخصص": "Create custom template",
  "سجل الإصدارات والاستعادة": "Version history and restore",
  "معاينة النسخ السابقة أو تحميل نسخة متوافقة للمراجعة والنشر كإصدار جديد؛ لا تتغير المستندات السابقة.": "Preview earlier versions or load a compatible version for review and publication as a new version. Existing documents remain unchanged.",
  "عرض سجل الإصدارات": "View version history",
  "إصدارات أقدم": "Older versions",
  "تحرير القالب المركزي": "Edit central template",
  "عنوان النموذج بالعربية": "Template title in Arabic",
  "عنوان النموذج بالإنجليزية": "Template title in English",
  "إدارة النموذج الجديد": "New template department",
  "إتاحة الطباعة وفق صلاحيات المستند": "Allow printing under document permissions",
  "الحقول وترتيبها": "Fields and order",
  "إضافة حقل": "Add field",
  "إضافة قسم": "Add section",
  "أوافق على نشر إصدار جديد للنماذج الجديدة فقط، وتحديث شاشة المستندات. المستندات السابقة تبقى على إصدارها.": "I agree to publish a new version for new documents only and refresh the document view. Existing documents retain their version.",
  "حفظ ونشر إصدار جديد": "Save and publish new version",
  "معاينة بصرية للقالب فقط — ليست مستندًا معتمدًا أو موقّعًا، وليست محاكاة نهائية لملف PDF.": "Visual template preview only. This is not an approved or signed document, or a final PDF rendering.",
  "معاينة PDF بالهوية الرسمية": "Preview PDF with official identity",
  "فتح المعاينة في نافذة مستقلة": "Open preview in a separate window",
  "سجّل الدخول للمتابعة.": "Sign in to continue.",
  "تعذر إكمال إجراء مكتبة النماذج.": "Could not complete the form-library action.",
  "اختر نموذجًا لعرض المعاينة.": "Select a template to preview.",
  "شعار هيدرولاند": "Hydroland logo",
  "هيدرولاند · النماذج الإدارية": "Hydroland · Administrative forms",
  "الجهة:": "Organization:",
  "الإدارة:": "Department:",
  "معاينة قالب — بيانات الاعتماد والتوقيع تُنشأ فقط في مسار المستند الفعلي.": "Template preview. Approval and signature evidence is created only through the actual document workflow.",
  "الحقول ذات العلامة * إلزامية.": "Fields marked * are required.",
  "شعار الجهة": "Organization logo",
  "HYDROLAND · هيدرولاند": "HYDROLAND · Hydroland",
  "يمكن إضافة الحقول والأقسام وحذفها وتغيير نوعها وخياراتها. ينشر التعديل إصدارًا جديدًا؛ المستندات السابقة تحتفظ بتعريفها. حقل التوقيع يسجل بيانات فقط؛ توقيع المستند يتبع مساره المستقل.": "Add or remove fields/sections and change types/options. Publishing creates a new version; existing documents retain their definitions. A signature field records data only. Document signing follows its separate workflow.",
  "مفاتيح الحقول وأنواعها ثابتة لحماية الربط التشغيلي. يمكن تعديل العناوين والإلزامية والترتيب؛ تغيير البنية يحتاج مراجعة الربط.": "Field keys and types are fixed to protect operational bindings. Labels, required flags and order can change; structural changes require binding review.",
  "نقل الحقل": "Move field",
  "لأعلى": "up",
  "لأسفل": "down",
  "عنوان الحقل بالعربية": "Field label in Arabic",
  "عنوان الحقل بالإنجليزية": "Field label in English",
  "أعلى": "Up",
  "أسفل": "Down",
  "مفتاح الحقل": "Field key",
  "نوع الحقل": "Field type",
  "حقل إلزامي": "Required field",
  "عناوين أعمدة الجدول، عنوان في كل سطر": "Table column headings, one per line",
  "الخيارات، خيار في كل سطر": "Options, one per line",
  "نص الإقرار بالعربية": "Acknowledgment wording in Arabic",
  "نص الإقرار بالإنجليزية": "Acknowledgment wording in English",
  "يُحفظ النص ضمن إصدار القالب ويظهر كما هو في المستند؛ إجابات المشارك تُضاف في حقول منفصلة.": "The text is saved in the template version and appears unchanged in the document. Participant answers belong in separate fields.",
  "حذف": "Remove",
  "· الإصدار النشط": "· Active version",
  "حقل": "fields",
  "جارٍ قراءة القوالب المحفوظة والصلاحيات...": "Reading saved templates and permissions...",
  "اختر الجهة في شاشة المستندات أولًا.": "Select an organization in the document view first.",
  "لا توجد صلاحية نشطة لهذه الجهة.": "No active authority for this organization.",
  "تعذر التحقق من نطاق مكتبة النماذج.": "Could not verify form-library scope.",
  "قالب نشط محفوظ.": "saved active templates.",
  "التعديل ينشر إصدارًا جديدًا ولا يعيد كتابة المستندات السابقة.": "Editing publishes a new version without rewriting existing documents.",
  "صلاحيتك للعرض فقط.": "Your authority is read only.",
  "تعذر قراءة المكتبة.": "Could not read the library.",
  "توجد تعديلات غير منشورة. هل تريد تركها؟": "You have unpublished changes. Discard them?",
  "قسم جديد": "New section",
  "حقل جديد": "New field",
  "رمز جديد عند النشر": "New code on publication",
  "نموذج مخصص جديد؛ لم يُحفظ بعد.": "New custom template; not yet saved.",
  "أكمل عنوان النموذج وحقوله، ثم أكّد نشر الإصدار الأول.": "Complete the template title and fields, then confirm publishing version 1.",
  "أكمل عناوين النموذج والحقول باللغتين.": "Complete template and field labels in both languages.",
  "جارٍ التحقق من الإصدار ثم حفظ التعديل...": "Checking the version, then saving the change...",
  "نُشر إصدار أحدث. تعديلاتك باقية هنا؛ راجعها ثم أعد تحميل القالب قبل النشر.": "A newer version was published. Your changes remain here. Review them and reload the template before publishing.",
  "استجاب الخادم للحفظ دون تأكيد الإصدار المتوقع. أعد قراءة المكتبة قبل المحاولة مجددًا.": "The server responded without confirming the expected version. Read the library again before retrying.",
  "حُفظ ونُشر الإصدار": "Saved and published version",
  "المستندات السابقة لم تتغير.": "Existing documents were unchanged.",
  "حُفظت مدخلات شاشة المستندات دون مسحها؛ حدّث الشاشة بعد إكمالها لتحميل القالب الجديد.": "Document-view entries were retained. Refresh after completing them to load the new template.",
  "تم تحديث شاشة المستندات.": "Document view refreshed.",
  "تم الحفظ، لكن تحديث العرض لم يكتمل:": "Saved, but the view did not finish updating:",
  "تعذر حفظ التعديل.": "Could not save the change.",
  "تعذر التحقق من نطاق سجل الإصدارات.": "Could not verify version-history scope.",
  "استجابة سجل الإصدارات غير متسقة؛ لم تُحمّل أي نسخة.": "Version-history response is inconsistent. No version was loaded.",
  "تعريف حقول الإصدار غير صالح.": "Invalid version field definition.",
  "مؤشر صفحة الإصدارات غير صالح.": "Invalid version-page cursor.",
  "يوجد إصدار أحدث؛ أعد تحميل القالب قبل الاستعادة.": "A newer version exists. Reload the template before restoring.",
  "هذا ليس إصدارًا أقدم من القالب النشط.": "This is not an earlier version of the active template.",
  "تختلف مفاتيح الحقول أو أنواعها أو خياراتها؛ يلزم فحص الربط قبل الاستعادة.": "Field keys, types or options differ. Review bindings before restoring.",
  "الاستعادة تحمل المحتوى للمراجعة فقط. النشر يتطلب تأكيدًا مستقلًا وينشئ إصدارًا جديدًا.": "Restore loads content for review only. Publishing requires separate confirmation and creates a new version.",
  "معاينة الإصدار": "Preview version",
  "الطباعة:": "Printing:",
  "تحميل هذا الإصدار للمراجعة": "Load this version for review",
  "عرض تعريف القالب فقط؛ لا يتضمن مستندًا أو توقيعًا أو اعتمادًا.": "Template definition only. No document, signature or approval is included.",
  "متاحة وفق الصلاحيات": "Available under permissions",
  "غير متاحة": "Unavailable",
  "الإصدار": "Version",
  "معاينة": "Preview",
  "نشط": "Active",
  "سابق": "Previous",
  "جارٍ قراءة سجل الإصدارات…": "Reading version history…",
  "يوجد إصدار أحدث؛ أعد تحميل القالب قبل النشر أو الاستعادة.": "A newer version exists. Reload the template before publishing or restoring.",
  "إصدار معروض.": "versions shown.",
  "نهاية السجل.": "End of history.",
  "توجد إصدارات أقدم.": "Earlier versions are available.",
  "تعذر قراءة سجل الإصدارات.": "Could not read version history.",
  "· محتوى الإصدار": "· Content from version",
  "للمراجعة": "for review",
  "حُمّل محتوى الإصدار": "Loaded content from version",
  "للمراجعة فقط. لم يُحفظ أو يُنشر بعد؛ راجعه ثم أكّد نشر إصدار جديد.": "for review only. It has not been saved or published. Review it, then confirm publishing a new version.",
  "مكتبة النماذج": "Form library",
  "تعذر قراءة شعار الجهة.": "Could not read organization logo.",
  "شعار الجهة غير صالح للمعاينة.": "Organization logo is invalid for preview.",
  "تعذر عرض شعار الجهة؛ لم تُغيّر الهوية المحفوظة.": "Could not display organization logo. Saved identity was unchanged.",
  "جارٍ توليد معاينة غير محفوظة…": "Generating an unsaved preview…",
  "تعذر توليد المعاينة.": "Could not generate preview.",
  "استجابة المعاينة غير صالحة.": "Invalid preview response.",
  "معاينة فقط باستخدام مولّد PDF الفعلي؛ لم يُنشأ مستند أو اعتماد أو توقيع. أي تعديل لاحق يلغي هذه المعاينة.": "Preview using the actual PDF renderer only. No document, approval or signature was created. Any subsequent change invalidates this preview.",
  "انتهت مهلة توليد المعاينة.": "Preview generation timed out.",
  "تعذر التحقق من تحديثات المكتبة.": "Could not check library updates.",
  "توجد إصدارات أحدث في المكتبة. تعديلاتك باقية دون مسح؛ راجعها ثم أعد تحميل القالب قبل النشر.": "Newer versions exist in the library. Your changes are retained. Review them and reload the template before publishing.",
  "تم تحديث المكتبة بالإصدارات الجديدة. المستندات السابقة ومدخلات شاشة المستندات لم تتغير.": "Library refreshed with new versions. Existing documents and document-view entries were unchanged.",
  "انتهت مهلة التحقق من تحديثات المكتبة؛ لم تتغير مدخلاتك.": "Library update check timed out. Your entries were unchanged.",
  "نقل الحقل {0} لأعلى": "Move field {0} up",
  "نقل الحقل {0} لأسفل": "Move field {0} down",
  "{0} · الإصدار النشط {1} · {2} حقل": "{0} · Active version {1} · {2} fields",
  "{0} قالب نشط محفوظ. {1}": "{0} saved active templates. {1}",
  "حُفظ ونُشر الإصدار {0}. {1} المستندات السابقة لم تتغير.": "Saved and published version {0}. {1} Existing documents were unchanged.",
  "{0}{1}": "{0}{1}",
  "تم الحفظ، لكن تحديث العرض لم يكتمل: ": "Saved, but the view did not finish updating: ",
  "معاينة الإصدار {0}": "Preview version {0}",
  "{0} إصدار معروض. {1}": "{0} versions shown. {1}",
  "{0} · الإصدار النشط {1} · محتوى الإصدار {2} للمراجعة": "{0} · Active version {1} · Content from version {2} for review",
  "حُمّل محتوى الإصدار {0} للمراجعة فقط. لم يُحفظ أو يُنشر بعد؛ راجعه ثم أكّد نشر إصدار جديد.": "Loaded content from version {0} for review only. It has not been saved or published. Review it, then confirm publishing a new version."
}) || {t:value=>value,message(text,values=[]){return this.format(text,values)},messageHTML(value){return String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},setMessage:(node,value)=>(node.textContent=value??''),attribute(name,text,values=[]){return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'},label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Local error identity retains authored text; server/provider messages stay opaque.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? error?.message;


  if (window.HydrolandFormLibrary) return;
  const departments = {
    HR: 'الموارد البشرية', MARINE_OPERATIONS: 'شؤون العمليات البحرية', TRAINING: 'التدريب',
    INVENTORY_LOGISTICS: 'المخزون والمشتريات', FINANCE: 'المالية',
    SAFETY_COMPLIANCE_RISK: 'السلامة والامتثال والمخاطر', CUSTOMER_EXPERIENCE: 'خدمة العملاء',
    MARKETING_GROWTH: 'التسويق والنمو', TECHNOLOGY_CYBERSECURITY: 'التقنية والأمن السيبراني',
    FACILITIES_ASSETS_MAINTENANCE: 'المرافق والأصول والصيانة', ADMIN_AFFAIRS_RECORDS: 'الشؤون الإدارية والوثائق',
    EXECUTIVE_GOVERNANCE: 'الإدارة التنفيذية والحوكمة', RND_MARKET_INTELLIGENCE: 'البحث والتطوير',
    LEGAL_CONTRACTS_INSURANCE: 'الشؤون القانونية والعقود والتأمين'
  };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone = value => JSON.parse(JSON.stringify(value));
  const isCustom = template => /^CUSTOM-FORM-[A-F0-9]{32}$/.test(template?.code||'');
  const fieldTypes = {TEXT:'نص قصير',TEXTAREA:'نص طويل',NUMBER:'رقم',DATE:'تاريخ',BOOLEAN:'نعم أو لا',SELECT:'اختيار',SIGNATURE:'اسم الموقّع في الحقل',TABLE:'جدول',SECTION:'عنوان قسم',STATEMENT:'نص إقرار محفوظ'};
  const auth = () => window.HydrolandAuth;
  const session = () => auth()?.getSessionVersion?.();
  const selectedOrg = () => document.querySelector('#hl-documents [data-doc-org]')?.value || '';
  const dialog = document.createElement('dialog');
  dialog.id = 'hl-form-library';
  dialog.setAttribute('aria-labelledby', 'hl-form-library-title');
  uiLocale.setHTML(dialog, uiLocale.html`<header class="hfl-heading"><div><h2 id="hl-form-library-title">مكتبة النماذج الإدارية</h2><p>مصدر واحد للقالب، وإصدار محفوظ لكل تعديل منشور.</p></div><button type="button" data-hfl-close aria-label="إغلاق مكتبة النماذج">إغلاق</button></header>
    <p data-hfl-note role="status" aria-live="polite"></p>
    <div class="hfl-toolbar"><label>الإدارة<select data-hfl-department><option value="">كل الإدارات</option>${Object.entries(departments).map(([code,name])=>uiLocale.html`<option value="${code}">${uiLocale.messageHTML(uiLocale.message(name))}</option>`).join('')}</select></label><label>النموذج<select data-hfl-template></select></label><button type="button" data-hfl-reload>إعادة التحميل</button></div>
    <button type="button" data-hfl-new disabled>إنشاء نموذج مخصص</button>
    <section class="hfl-history" aria-label="سجل إصدارات القالب">
      <h3>سجل الإصدارات والاستعادة</h3><p>معاينة النسخ السابقة أو تحميل نسخة متوافقة للمراجعة والنشر كإصدار جديد؛ لا تتغير المستندات السابقة.</p>
      <button type="button" data-hfl-history-load disabled>عرض سجل الإصدارات</button><p data-hfl-history-status role="status" aria-live="polite"></p>
      <ol data-hfl-history-list></ol><button type="button" data-hfl-history-more hidden>إصدارات أقدم</button><article data-hfl-history-detail hidden></article>
    </section>
    <div class="hfl-layout"><form data-hfl-editor><fieldset data-hfl-controls disabled><legend>تحرير القالب المركزي</legend>
      <p data-hfl-meta></p><label>عنوان النموذج بالعربية<input name="titleAr" required maxlength="200"></label><label>عنوان النموذج بالإنجليزية<input name="titleEn" required maxlength="200" dir="ltr"></label>
      <label data-hfl-new-department hidden>إدارة النموذج الجديد<select data-hfl-create-department>${Object.entries(departments).map(([code,name])=>uiLocale.html`<option value="${code}">${uiLocale.messageHTML(uiLocale.message(name))}</option>`).join('')}</select></label>
      <label class="hfl-check"><input name="printable" type="checkbox"> إتاحة الطباعة وفق صلاحيات المستند</label>
      <h3>الحقول وترتيبها</h3><p data-hfl-structure-note></p><div data-hfl-fields></div>
      <div data-hfl-structure-actions hidden><button type="button" data-hfl-add-field>إضافة حقل</button> <button type="button" data-hfl-add-section>إضافة قسم</button></div>
      <label class="hfl-check"><input data-hfl-confirm type="checkbox" required> أوافق على نشر إصدار جديد للنماذج الجديدة فقط، وتحديث شاشة المستندات. المستندات السابقة تبقى على إصدارها.</label>
      <button type="submit" data-hfl-publish>حفظ ونشر إصدار جديد</button>
    </fieldset></form><section aria-label="معاينة الهوية الرسمية"><p class="hfl-preview-note">معاينة بصرية للقالب فقط — ليست مستندًا معتمدًا أو موقّعًا، وليست محاكاة نهائية لملف PDF.</p><article data-hfl-preview class="hfl-paper" dir="rtl"></article><button type="button" data-hfl-pdf-preview disabled>معاينة PDF بالهوية الرسمية</button><p data-hfl-pdf-status role="status" aria-live="polite"></p><div data-hfl-pdf-result hidden><a data-hfl-pdf-open target="_blank" rel="noopener noreferrer">فتح المعاينة في نافذة مستقلة</a><iframe data-hfl-pdf-frame title="معاينة PDF غير معتمدة" referrerpolicy="no-referrer" style="width:100%;height:650px;border:1px solid #b8cbd5"></iframe></div></section></div>`);
  document.body.appendChild(dialog);
  const style = document.createElement('style');
  uiLocale.setMessage(style, `#hl-form-library{width:min(1200px,94vw);max-height:92vh;box-sizing:border-box;border:1px solid #28647f;border-radius:14px;padding:22px;background:#f3f6f8;color:#152c3d;font:15px/1.7 Arial,sans-serif}#hl-form-library::backdrop{background:#071e30bb}#hl-form-library *{box-sizing:border-box}#hl-form-library button{padding:9px 15px;border:1px solid #b8cbd5;border-radius:6px;background:white;color:#132c42;cursor:pointer}#hl-form-library button:disabled{opacity:.5;cursor:not-allowed}#hl-form-library [data-hfl-publish]{background:#12354d;color:white;width:100%;margin-top:12px}#hl-form-library label{display:grid;gap:5px;margin:10px 0}#hl-form-library input:not([type=checkbox]),#hl-form-library select{width:100%;min-width:0;padding:9px;background:white;color:#132c42;border:1px solid #b8cbd5;border-radius:5px}#hl-form-library .hfl-check{display:flex;align-items:flex-start;gap:9px}#hl-form-library [type=checkbox]{width:18px;height:18px;flex-shrink:0;margin-top:5px}#hl-form-library fieldset{border:1px solid #b8cbd5;padding:14px;min-width:0}#hl-form-library .hfl-heading{display:flex;justify-content:space-between;gap:20px;align-items:center;border-bottom:2px solid #2298bd}#hl-form-library h2,#hl-form-library h3{margin:6px 0}#hl-form-library .hfl-toolbar{display:grid;grid-template-columns:1fr 1.5fr auto;gap:12px;align-items:end;margin-bottom:18px}#hl-form-library .hfl-toolbar button{margin-bottom:10px}#hl-form-library .hfl-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:22px}#hl-form-library [data-hfl-note]{min-height:1.7em;color:#154c67}#hl-form-library .hfl-field{border:1px solid #d7e2e8;border-radius:7px;background:white;padding:12px;margin-bottom:12px}#hl-form-library .hfl-field small{direction:ltr;display:block;color:#536779;overflow-wrap:anywhere}#hl-form-library .hfl-field-actions{display:flex;gap:8px}#hl-form-library .hfl-paper{background:white;min-height:700px;box-shadow:0 5px 20px #152c3d15;padding:28px;border:1px solid #2298bd;overflow-wrap:anywhere;color:#152c3d}#hl-form-library .hfl-letterhead{display:flex;align-items:center;gap:14px;background:#092033;color:white;padding:16px;border-bottom:3px solid #00a7e8}#hl-form-library .hfl-letterhead img{width:55px;height:55px;object-fit:contain}#hl-form-library .hfl-letterhead b{letter-spacing:1px}#hl-form-library .hfl-letterhead span{display:block}#hl-form-library .hfl-paper h3{text-align:center;font-size:21px;margin:24px 0 5px}#hl-form-library .hfl-paper h4{text-align:center;margin:0 0 20px;color:#536779;font-size:13px}#hl-form-library .hfl-identity{background:#edf6fa;border-inline-start:3px solid #2298bd;padding:10px;margin:15px 0;font-size:13px}#hl-form-library .hfl-paper dl{margin:0}#hl-form-library .hfl-paper dt{background:#f4f7f9;padding:8px;font-weight:700}#hl-form-library .hfl-paper dd{border:1px solid #e1e8ed;padding:9px;margin:0 0 12px;min-height:39px;color:#778693}#hl-form-library .hfl-paper footer{border-top:1px solid #b8cbd5;margin-top:26px;padding-top:12px;font-size:11px;color:#536779;text-align:center}#hl-form-library .hfl-preview-note{font-size:12px;color:#536779}#hl-form-library .hfl-paper [dir=ltr]{unicode-bidi:isolate}@media(max-width:850px){#hl-form-library .hfl-layout{grid-template-columns:1fr}#hl-form-library .hfl-toolbar{grid-template-columns:1fr}#hl-form-library{padding:14px}#hl-form-library .hfl-paper{padding:16px;min-height:500px}}`);
  style.textContent += `#hl-form-library .hfl-history{border:1px solid #b8cbd5;border-radius:8px;padding:16px;margin-bottom:20px;overflow-wrap:anywhere}#hl-form-library [data-hfl-history-list]{list-style:none;padding:0;margin:12px 0;max-height:310px;overflow:auto}#hl-form-library [data-hfl-history-list] li{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px;border-bottom:1px solid #d7e2e8}#hl-form-library [data-hfl-history-list] li span{min-width:0}#hl-form-library [data-hfl-history-list] button{flex-shrink:0}#hl-form-library [data-hfl-history-detail]{background:white;border:1px solid #d7e2e8;padding:16px;margin-top:14px}#hl-form-library [data-hfl-history-detail] dd{margin:0 0 10px;padding:6px}#hl-form-library [data-hfl-history-detail] dt{font-weight:bold}`;
  style.textContent += `#hl-form-library [hidden]{display:none!important}#hl-form-library textarea{width:100%;max-width:100%;padding:9px;border:1px solid #b8cbd5;border-radius:5px;font:inherit}#hl-form-library .hfl-paper .hfl-section{background:#12354d;color:white;margin:16px 0 8px}#hl-form-library [data-hfl-new]{margin-bottom:14px}`;
  document.head.appendChild(style);
  const $ = selector => dialog.querySelector(selector);
  const state = { generation:0, orgId:'', member:null, brand:null, templates:[], active:null, fields:[], busy:false, dirty:false, creating:false };
  let previewGeneration=0,previewObjectUrl=null,logoObjectUrl=null,previewController=null,pdfBusy=false;
  const synchronization = { pending:null, fingerprint:'' };
  const templateFingerprint = rows => JSON.stringify(rows.map(t=>[t.id,t.code,t.version]).sort((a,b)=>a[0].localeCompare(b[0])));
  const note = text => { uiLocale.setMessage($('[data-hfl-note]'), text); };
  const context = () => ({ generation:state.generation, orgId:state.orgId, session:session() });
  const current = c => dialog.open && c.generation===state.generation && c.orgId===state.orgId && c.orgId===selectedOrg() && c.session===session() && Boolean(auth()?.isAuthenticated?.());
  const canEdit = () => ['OWNER','ADMIN'].includes(state.member?.role);
  const canDesign = () => state.creating||isCustom(state.active);
  function busy(value) {
    state.busy=value;
    for(const key of ['template','department','reload']) $(`[data-hfl-${key}]`).disabled=value;
    $('[data-hfl-controls]').disabled=value||!state.active||!canEdit();
    $('[data-hfl-new]').disabled=value||!canEdit();
    historyControls();
    $('[data-hfl-pdf-preview]').disabled=value||!state.active||state.creating||pdfBusy;
  }
  function hasDocumentInput() {
    const form=document.querySelector('#hl-documents [data-doc-form]');
    return Boolean(form&&([...form.querySelectorAll('[data-doc-fields] input,[data-doc-fields] textarea,[data-doc-fields] select')].some(input=>input.type==='checkbox'?input.checked:Boolean(input.value))||form.querySelector('[data-doc-template]')?.disabled));
  }
  async function request(path, options={}, valid=()=>true) {
    if (!auth()?.isAuthenticated?.()) throw localError(uiLocale.message('سجّل الدخول للمتابعة.'));
    const call = context();
    const response = await auth().authorizedFetch(path, {cache:'no-store', ...options});
    const body = await response.json().catch(()=>null);
    if (!response.ok) {
      // A late denial from an older session must not erase the newer editor.
      if ([401,403].includes(response.status) && current(call) && valid()) clear();
      throw localError((Array.isArray(body?.message) ? body.message.join('، ') : (body?.message || uiLocale.message('تعذر إكمال إجراء مكتبة النماذج.'))));
    }
    return body;
  }
  function clear() {
    invalidatePdf();if(logoObjectUrl)URL.revokeObjectURL(logoObjectUrl);logoObjectUrl=null;
    synchronization.pending?.abort();synchronization.pending=null;synchronization.fingerprint='';
    state.generation++; state.orgId=''; state.member=null; state.brand=null; state.templates=[];
    state.active=null; state.fields=[]; state.dirty=false;state.creating=false; resetHistory();busy(false);
    $('[data-hfl-editor]').reset(); $('[data-hfl-controls]').disabled=true;
    for (const key of ['template','fields','preview']) $(`[data-hfl-${key}]`).replaceChildren();
    uiLocale.setMessage($('[data-hfl-meta]'), ''); note(''); if(dialog.open)dialog.close();
  }
  function preview() {
    const t=state.active;
    if(!t){uiLocale.setHTML($('[data-hfl-preview]'), uiLocale.html`<p class="hfl-empty">اختر نموذجًا لعرض المعاينة.</p>`);return;}
    const form=$('[data-hfl-editor]'),titleAr=form.elements.titleAr.value,titleEn=form.elements.titleEn.value;
    const org=state.member?.organization||{},brand=state.brand||{};
    // Logo URLs from editable data are deliberately not fetched here.
    uiLocale.setHTML($('[data-hfl-preview]'), uiLocale.html`<header class="hfl-letterhead"><img src="./assets/hydroland-mark-reference.webp" alt="شعار هيدرولاند"><div><b dir="ltr">HYDROLAND</b><span>هيدرولاند · النماذج الإدارية</span></div></header>
      <div class="hfl-identity">${logoObjectUrl?uiLocale.html`<img src="${esc(logoObjectUrl)}" alt="شعار الجهة" style="max-width:100px;max-height:65px;object-fit:contain;float:left">`:""}الجهة: ${esc(brand.brandNameAr||org.displayName||'—')}<br>الإدارة: ${uiLocale.messageHTML(((value=>value===undefined?value:uiLocale.message(value))(departments[t.department]) || t.department))}</div>
      <h3>${esc(titleAr)}</h3><h4 dir="ltr">${esc(titleEn)}</h4>
      <p dir="ltr">${esc(t.code)} · v${esc(t.version)} · PREVIEW</p>
      <dl>${state.fields.map(f=>f.type==='SECTION'?uiLocale.html`<dt class="hfl-section">${esc(f.labelAr)}</dt>`:uiLocale.html`<dt>${esc(f.labelAr)}${f.required?' *':''}</dt><dd style="white-space:pre-wrap">${f.type==='STATEMENT'?esc(f.contentAr||f.contentEn||''):Array.isArray(f.options)&&f.options.length?f.options.map(esc).join(' / '):'................................................'}</dd>`).join('')}</dl>
      <footer>${uiLocale.messageHTML((brand.footerAr || uiLocale.message('HYDROLAND · هيدرولاند')))}<br>معاينة قالب — بيانات الاعتماد والتوقيع تُنشأ فقط في مسار المستند الفعلي.<br>الحقول ذات العلامة * إلزامية.</footer>`);
  }
  function fields() {
    const design=canDesign(),answerCount=state.fields.filter(f=>!['SECTION','STATEMENT'].includes(f.type)).length;
    uiLocale.setMessage($('[data-hfl-structure-note]'), (design ? uiLocale.message('يمكن إضافة الحقول والأقسام وحذفها وتغيير نوعها وخياراتها. ينشر التعديل إصدارًا جديدًا؛ المستندات السابقة تحتفظ بتعريفها. حقل التوقيع يسجل بيانات فقط؛ توقيع المستند يتبع مساره المستقل.') : uiLocale.message('مفاتيح الحقول وأنواعها ثابتة لحماية الربط التشغيلي. يمكن تعديل العناوين والإلزامية والترتيب؛ تغيير البنية يحتاج مراجعة الربط.')));
    $('[data-hfl-structure-actions]').hidden=!design;
    $('[data-hfl-new-department]').hidden=!state.creating;
    $('[data-hfl-add-field]').disabled=state.fields.length>=100;
    $('[data-hfl-add-section]').disabled=state.fields.length>=100;
    uiLocale.setHTML($('[data-hfl-fields]'), state.fields.map((f,i)=>uiLocale.html`<section class="hfl-field" data-hfl-row="${i}">${design?uiLocale.html`<label>مفتاح الحقل<input data-hfl-key value="${esc(f.key)}" pattern="[A-Za-z](?:[A-Za-z0-9_.]|-){0,127}" maxlength="128" required dir="ltr"></label><label>نوع الحقل<select data-hfl-type>${Object.entries({...fieldTypes,...(f.type==='LONG_TEXT'?{LONG_TEXT:'نص طويل'}:{})}).map(([type,label])=>uiLocale.html`<option value="${type}"${f.type===type?' selected':''}>${uiLocale.label(label)}</option>`).join('')}</select></label>`:uiLocale.html`<small>${esc(f.key)} · ${esc(f.type)}</small>`}<label>عنوان الحقل بالعربية<input data-hfl-label="labelAr" value="${esc(f.labelAr)}" maxlength="200" required></label><label>عنوان الحقل بالإنجليزية<input data-hfl-label="labelEn" value="${esc(f.labelEn)}" maxlength="200" required dir="ltr"></label>${['SECTION','STATEMENT'].includes(f.type)?'':uiLocale.html`<label class="hfl-check"><input data-hfl-required type="checkbox"${f.required?' checked':''}> حقل إلزامي</label>`}${design&&['SELECT','TABLE'].includes(f.type)?uiLocale.html`<label>${uiLocale.messageHTML((f.type==='TABLE' ? uiLocale.message('عناوين أعمدة الجدول، عنوان في كل سطر') : uiLocale.message('الخيارات، خيار في كل سطر')))}<textarea data-hfl-options rows="4" maxlength="20100"${f.type==='SELECT'?' required':''}>${esc((f.options||[]).join('\n'))}</textarea></label>`:''}${design&&f.type==='STATEMENT'?uiLocale.html`<label>نص الإقرار بالعربية<textarea data-hfl-content="contentAr" rows="5" maxlength="8000" required>${esc(f.contentAr||'')}</textarea></label><label>نص الإقرار بالإنجليزية<textarea data-hfl-content="contentEn" rows="5" maxlength="8000" required dir="ltr">${esc(f.contentEn||'')}</textarea></label><p>يُحفظ النص ضمن إصدار القالب ويظهر كما هو في المستند؛ إجابات المشارك تُضاف في حقول منفصلة.</p>`:''}<div class="hfl-field-actions"><button type="button" data-hfl-move="-1"${i===0?' disabled':''} ${uiLocale.attribute("aria-label", "نقل الحقل {0} لأعلى", [i+1])}>أعلى</button><button type="button" data-hfl-move="1"${i===state.fields.length-1?' disabled':''} ${uiLocale.attribute("aria-label", "نقل الحقل {0} لأسفل", [i+1])}>أسفل</button>${design?uiLocale.html`<button type="button" data-hfl-remove${!['SECTION','STATEMENT'].includes(f.type)&&answerCount===1?' disabled':''}>حذف</button>`:''}</div></section>`).join(''));
  }
  function selectTemplate() {
    invalidatePdf();resetHistory();
    const t=state.templates.find(x=>x.id===$('[data-hfl-template]').value)||null;
    state.active=t; state.fields=t?clone(t.fields):[]; state.dirty=false;state.creating=false;
    const form=$('[data-hfl-editor]');form.reset();form.elements.titleAr.value=t?.titleAr||'';form.elements.titleEn.value=t?.titleEn||'';form.elements.printable.checked=t?.printable!==false;
    $('[data-hfl-controls]').disabled=!t||!canEdit()||state.busy;
    uiLocale.setMessage($('[data-hfl-meta]'), (t ? uiLocale.message("{0} · الإصدار النشط {1} · {2} حقل", [t.code, t.version, state.fields.length]) : ''));
    fields(); preview();historyControls();$('[data-hfl-pdf-preview]').disabled=!t||state.busy||pdfBusy;
  }
  function renderChoices(preferredId) {
    const dept=$('[data-hfl-department]').value,rows=state.templates.filter(t=>!dept||t.department===dept);
    uiLocale.setHTML($('[data-hfl-template]'), rows.map(t=>uiLocale.html`<option value="${esc(t.id)}">${esc(t.titleAr)} · v${esc(t.version)}</option>`).join(''));
    if(rows.some(t=>t.id===preferredId))$('[data-hfl-template]').value=preferredId;
    selectTemplate();
  }
  async function load(preferredId) {
    invalidatePdf();if(logoObjectUrl)URL.revokeObjectURL(logoObjectUrl);logoObjectUrl=null;
    resetHistory();
    state.generation++;state.orgId=selectedOrg();busy(true);state.dirty=false;
    state.active=null;state.templates=[];state.fields=[];state.member=null;state.brand=null;state.creating=false;
    $('[data-hfl-controls]').disabled=true;$('[data-hfl-template]').replaceChildren();$('[data-hfl-fields]').replaceChildren();preview();
    const c=context();note(uiLocale.message('جارٍ قراءة القوالب المحفوظة والصلاحيات...'));
    try {
      if(!c.orgId)throw localError(uiLocale.message('اختر الجهة في شاشة المستندات أولًا.'));
      const memberships=await request('/documents/workspace');if(!current(c))return;
      const member=(Array.isArray(memberships)?memberships:[]).find(m=>m.status==='ACTIVE'&&m.organization?.id===c.orgId);
      if(!member)throw localError(uiLocale.message('لا توجد صلاحية نشطة لهذه الجهة.'));
      const base=`/documents/organizations/${encodeURIComponent(c.orgId)}`;
      const [templates,brand]=await Promise.all([request(base+'/templates'),request(base+'/branding')]);if(!current(c))return;
      if(!Array.isArray(templates)||brand?.organizationId!==c.orgId)throw localError(uiLocale.message('تعذر التحقق من نطاق مكتبة النماذج.'));
      state.member=member;state.brand=brand;
      state.templates=templates.filter(t=>t.organizationId===c.orgId&&t.status==='ACTIVE'&&!String(t.code).startsWith('CLIB-')&&Array.isArray(t.fields));
      synchronization.fingerprint=templateFingerprint(state.templates);
      busy(false);renderChoices(preferredId);void loadLogo(c);
      note(uiLocale.message("{0} قالب نشط محفوظ. {1}", [state.templates.length, (canEdit() ? uiLocale.message('التعديل ينشر إصدارًا جديدًا ولا يعيد كتابة المستندات السابقة.') : uiLocale.message('صلاحيتك للعرض فقط.'))]));
    } catch(error) { if(current(c))note((localErrorMessage(error) || uiLocale.message('تعذر قراءة المكتبة.'))); }
    finally { if(current(c))busy(false); }
  }
  function open() {
    if(!auth()?.isAuthenticated?.()||!selectedOrg())return;
    if(dialog.open&&(state.busy||!discardAllowed()))return;
    if(!dialog.open)dialog.showModal();
    $('[data-hfl-department]').value=document.querySelector('#hl-documents [data-doc-department]')?.value||'';
    lastDepartment=$('[data-hfl-department]').value;
    void load();
  }
  function discardAllowed(){return !state.dirty||window.confirm(uiLocale.t('توجد تعديلات غير منشورة. هل تريد تركها؟'));}
  function changed(){invalidatePdf();state.dirty=true;$('[data-hfl-confirm]').checked=false;preview();}
  function addField(section=false){
    if(state.busy||!canEdit()||!canDesign()||state.fields.length>=100)return;
    const prefix=section?'section':'field';let n=1;while(state.fields.some(f=>f.key===prefix+n))n++;
    state.fields.push({key:prefix+n,labelAr:section?'قسم جديد':'حقل جديد',labelEn:section?'New section':'New field',type:section?'SECTION':'TEXT',required:false});
    fields();changed();$(`[data-hfl-row="${state.fields.length-1}"] [data-hfl-label]`)?.focus();
  }
  $('[data-hfl-add-field]').addEventListener('click',()=>addField());
  $('[data-hfl-add-section]').addEventListener('click',()=>addField(true));
  $('[data-hfl-new]').addEventListener('click',()=>{
    if(state.busy||!canEdit()||!discardAllowed())return;
    invalidatePdf();resetHistory();state.creating=true;
    const department=$('[data-hfl-department]').value||'HR';
    state.active={id:null,organizationId:state.orgId,code:'رمز جديد عند النشر',department,version:0,fields:[]};state.fields=[];
    const form=$('[data-hfl-editor]');form.reset();form.elements.printable.checked=true;$('[data-hfl-create-department]').value=department;
    uiLocale.setMessage($('[data-hfl-meta]'), uiLocale.message('نموذج مخصص جديد؛ لم يُحفظ بعد.'));
    addField();busy(false);note(uiLocale.message('أكمل عنوان النموذج وحقوله، ثم أكّد نشر الإصدار الأول.'));form.elements.titleAr.focus();
  });
  $('[data-hfl-create-department]').addEventListener('change',event=>{if(state.creating){state.active.department=event.target.value;changed();}});
  $('[data-hfl-editor]').addEventListener('input',event=>{
    const row=event.target.closest('[data-hfl-row]'),i=Number(row?.dataset.hflRow);
    if(row&&state.fields[i]){
      if(event.target.dataset.hflLabel)state.fields[i][event.target.dataset.hflLabel]=event.target.value;
      if(event.target.matches('[data-hfl-required]'))state.fields[i].required=event.target.checked;
      if(canDesign()&&event.target.matches('[data-hfl-key]'))state.fields[i].key=event.target.value;
      if(canDesign()&&event.target.matches('[data-hfl-options]'))state.fields[i].options=event.target.value.split('\n').map(v=>v.trim()).filter(Boolean);
      if(canDesign()&&event.target.dataset.hflContent)state.fields[i][event.target.dataset.hflContent]=event.target.value;
      if(canDesign()&&event.target.matches('[data-hfl-type]')){
        state.fields[i].type=event.target.value;delete state.fields[i].options;delete state.fields[i].contentAr;delete state.fields[i].contentEn;
        if(['SECTION','STATEMENT'].includes(event.target.value))state.fields[i].required=false;
        fields();
      }
    }
    if(!event.target.matches('[data-hfl-confirm]'))changed();
  });
  $('[data-hfl-fields]').addEventListener('click',event=>{
    const remove=event.target.closest('[data-hfl-remove]');
    if(remove&&!state.busy&&canEdit()&&canDesign()){
      const i=Number(remove.closest('[data-hfl-row]').dataset.hflRow);
      if(!['SECTION','STATEMENT'].includes(state.fields[i]?.type)&&state.fields.filter(f=>!['SECTION','STATEMENT'].includes(f.type)).length===1)return;
      state.fields.splice(i,1);fields();changed();return;
    }
    const button=event.target.closest('[data-hfl-move]');if(!button||state.busy||!canEdit())return;
    const i=Number(button.closest('[data-hfl-row]').dataset.hflRow),j=i+Number(button.dataset.hflMove);
    if(j<0||j>=state.fields.length)return;
    [state.fields[i],state.fields[j]]=[state.fields[j],state.fields[i]];fields();changed();
  });
  $('[data-hfl-template]').addEventListener('change',()=>{if(discardAllowed())selectTemplate();else $('[data-hfl-template]').value=state.active?.id||'';});
  let lastDepartment='';
  $('[data-hfl-department]').addEventListener('change',()=>{if(discardAllowed()){lastDepartment=$('[data-hfl-department]').value;renderChoices();}else $('[data-hfl-department]').value=lastDepartment;});
  $('[data-hfl-reload]').addEventListener('click',()=>{if(!state.busy&&discardAllowed())void load(state.active?.id);});
  $('[data-hfl-close]').addEventListener('click',()=>{if(discardAllowed())clear();});
  dialog.addEventListener('cancel',event=>{event.preventDefault();if(discardAllowed())clear();});
  $('[data-hfl-editor]').addEventListener('submit',async event=>{
    event.preventDefault();if(state.busy||!state.active||!canEdit()||!$('[data-hfl-confirm]').checked)return;
    const c=context(),t=state.active,form=event.currentTarget,creating=state.creating;
    const payload={titleAr:form.elements.titleAr.value.trim(),titleEn:form.elements.titleEn.value.trim(),printable:form.elements.printable.checked,fields:clone(state.fields)};
    if(!payload.titleAr||!payload.titleEn||payload.fields.some(f=>!f.labelAr?.trim()||!f.labelEn?.trim())){note(uiLocale.message('أكمل عناوين النموذج والحقول باللغتين.'));return;}
    busy(true);note(uiLocale.message('جارٍ التحقق من الإصدار ثم حفظ التعديل...'));
    let published=false;
    try {
      if(!creating){
        const latest=await request(`/documents/organizations/${encodeURIComponent(c.orgId)}/templates`);if(!current(c))return;
        if(!Array.isArray(latest)||!latest.some(x=>x.id===t.id&&x.version===t.version&&x.organizationId===c.orgId&&x.status==='ACTIVE'))throw localError(uiLocale.message('نُشر إصدار أحدث. تعديلاتك باقية هنا؛ راجعها ثم أعد تحميل القالب قبل النشر.'));
      }
      const saved=await request(creating?'/documents/templates/custom':`/documents/templates/${encodeURIComponent(t.id)}`,{method:creating?'POST':'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(creating?{...payload,organizationId:c.orgId,department:t.department}:payload)});
      if(!current(c))return;
      if(!saved?.id||saved.organizationId!==c.orgId||(creating?!isCustom(saved)||saved.department!==t.department:saved.code!==t.code)||saved.version!==t.version+1)throw localError(uiLocale.message('استجاب الخادم للحفظ دون تأكيد الإصدار المتوقع. أعد قراءة المكتبة قبل المحاولة مجددًا.'));
      published=true;state.dirty=false;
      // The existing workspace reload resolves the new active template by code.
      // No revise/approve/sign request is issued for any existing document.
      const keptInput=hasDocumentInput();
      if(!keptInput)await window.HydrolandDocuments?.refresh?.();
      if(!current(c))return;
      document.dispatchEvent(new CustomEvent('hydroland:form-template-published',{detail:{organizationId:c.orgId,code:saved.code,version:saved.version}}));
      await load(saved.id);
      if(c.session===session()&&c.orgId===selectedOrg()&&dialog.open)note(uiLocale.message("حُفظ ونُشر الإصدار {0}. {1} المستندات السابقة لم تتغير.", [saved.version, (keptInput ? uiLocale.message('حُفظت مدخلات شاشة المستندات دون مسحها؛ حدّث الشاشة بعد إكمالها لتحميل القالب الجديد.') : uiLocale.message('تم تحديث شاشة المستندات.'))]));
    } catch(error) { if(current(c))note(uiLocale.message("{0}{1}", [(published ? uiLocale.message('تم الحفظ، لكن تحديث العرض لم يكتمل: ') : ''), (localErrorMessage(error) || uiLocale.message('تعذر حفظ التعديل.'))])); }
    finally { if(current(c))busy(false); }
  });
  // History is kept in memory only and fenced independently of editor requests.
  const history = { generation:0, rows:[], cursor:null, selected:null, busy:false };
  const historyNote = text => { uiLocale.setMessage($('[data-hfl-history-status]'), text); };
  const historyContext = () => ({...context(), historyGeneration:history.generation, templateId:state.active?.id});
  const historyCurrent = c => current(c)&&c.historyGeneration===history.generation&&c.templateId===state.active?.id;
  function historyControls() {
    const blocked=state.busy||history.busy||!state.active||state.creating;
    $('[data-hfl-history-load]').disabled=blocked;
    $('[data-hfl-history-more]').disabled=blocked;
    $('[data-hfl-history-more]').hidden=history.cursor===null;
    for(const button of dialog.querySelectorAll('[data-hfl-history-view]'))button.disabled=blocked;
    const restore=$('[data-hfl-history-restore]');
    if(restore)restore.disabled=blocked||!canRestore(history.selected);
  }
  function resetHistory() {
    history.generation++;history.rows=[];history.cursor=null;history.selected=null;history.busy=false;
    $('[data-hfl-history-list]').replaceChildren();$('[data-hfl-history-detail]').replaceChildren();
    $('[data-hfl-history-detail]').hidden=true;historyNote('');historyControls();
  }
  function compatible(row) {
    const active=state.active;
    if(isCustom(active)&&row?.code===active.code)return true;
    if(!active||!row||row.fields.length!==active.fields.length)return false;
    const map=new Map(active.fields.map(f=>[f.key,f]));
    return map.size===active.fields.length&&new Set(row.fields.map(f=>f.key)).size===row.fields.length&&row.fields.every(f=>{
      const live=map.get(f.key);
      return live&&live.type===f.type&&JSON.stringify(live.options||[])===JSON.stringify(f.options||[]);
    });
  }
  function canRestore(row) {
    return Boolean(canEdit()&&row&&state.active&&row.version<state.active.version&&compatible(row)&&!history.rows.some(r=>r.version>state.active.version));
  }
  function validateHistoryPage(body,before) {
    const t=state.active;
    if(!body||body.organizationId!==state.orgId||body.code!==t.code||body.department!==t.department||!Array.isArray(body.items)||body.items.length>25)throw localError(uiLocale.message('تعذر التحقق من نطاق سجل الإصدارات.'));
    let upper=before??Infinity;
    const ids=new Set(before===null?[]:history.rows.map(r=>r.id));
    for(const row of body.items){
      if(!row||typeof row.id!=='string'||!row.id||ids.has(row.id)||row.organizationId!==state.orgId||row.code!==t.code||row.department!==t.department||!Number.isSafeInteger(row.version)||row.version<1||row.version>=upper||typeof row.titleAr!=='string'||typeof row.titleEn!=='string'||typeof row.status!=='string'||typeof row.printable!=='boolean'||!Array.isArray(row.fields)||row.fields.length>100)throw localError(uiLocale.message('استجابة سجل الإصدارات غير متسقة؛ لم تُحمّل أي نسخة.'));
      for(const f of row.fields)if(!f||typeof f.key!=='string'||!f.key||typeof f.type!=='string'||typeof f.labelAr!=='string'||typeof f.labelEn!=='string'||typeof f.required!=='boolean'||(f.options!==undefined&&(!Array.isArray(f.options)||f.options.some(x=>typeof x!=='string'))))throw localError(uiLocale.message('تعريف حقول الإصدار غير صالح.'));
      ids.add(row.id);upper=row.version;
    }
    const next=body.nextBeforeVersion;
    if(next!==null&&(!Number.isSafeInteger(next)||next<1||!body.items.length||next!==body.items.at(-1).version||(before!==null&&next>=before)))throw localError(uiLocale.message('مؤشر صفحة الإصدارات غير صالح.'));
  }
  function renderHistoryDetail(row) {
    history.selected=row;
    const target=$('[data-hfl-history-detail]');target.hidden=false;
    const allowed=canRestore(row);
    const reason=!canEdit()?'صلاحيتك للعرض فقط.':history.rows.some(r=>r.version>state.active.version)?'يوجد إصدار أحدث؛ أعد تحميل القالب قبل الاستعادة.':row.version>=state.active.version?'هذا ليس إصدارًا أقدم من القالب النشط.':!compatible(row)?'تختلف مفاتيح الحقول أو أنواعها أو خياراتها؛ يلزم فحص الربط قبل الاستعادة.':'الاستعادة تحمل المحتوى للمراجعة فقط. النشر يتطلب تأكيدًا مستقلًا وينشئ إصدارًا جديدًا.';
    uiLocale.setHTML(target, uiLocale.html`<h3 tabindex="-1" data-hfl-history-heading>معاينة الإصدار ${esc(row.version)}</h3><p>${esc(row.titleAr)}<br><span dir="ltr">${esc(row.titleEn)}</span></p><p>الطباعة: ${uiLocale.messageHTML((row.printable ? uiLocale.message('متاحة وفق الصلاحيات') : uiLocale.message('غير متاحة')))}</p><dl>${row.fields.map(f=>uiLocale.html`<dt>${esc(f.labelAr)}${f.required?' *':''}</dt><dd><span dir="ltr">${esc(f.key)} · ${esc(f.type)} · ${esc(f.labelEn)}</span>${f.options?.length?uiLocale.html`<br>${f.options.map(esc).join(' / ')}`:''}${f.type==='STATEMENT'?uiLocale.html`<p style="white-space:pre-wrap">${esc(f.contentAr)}</p><p dir="ltr" style="white-space:pre-wrap">${esc(f.contentEn)}</p>`:''}</dd>`).join('')}</dl><p data-hfl-history-reason>${uiLocale.messageHTML(uiLocale.message(reason))}</p><button type="button" data-hfl-history-restore${allowed?'':' disabled'}>تحميل هذا الإصدار للمراجعة</button><p>عرض تعريف القالب فقط؛ لا يتضمن مستندًا أو توقيعًا أو اعتمادًا.</p>`);
    historyControls();
  }
  function renderHistory() {
    uiLocale.setHTML($('[data-hfl-history-list]'), history.rows.map(row=>uiLocale.html`<li><span>الإصدار ${esc(row.version)} · ${uiLocale.messageHTML((row.status==='ACTIVE' ? uiLocale.message('نشط') : (row.status==='INACTIVE' ? uiLocale.message('سابق') : row.status)))} — ${esc(row.titleAr)}</span><button type="button" data-hfl-history-view="${esc(row.id)}" ${uiLocale.attribute("aria-label", "معاينة الإصدار {0}", [row.version])}>معاينة</button></li>`).join(''));
    historyControls();
  }
  async function loadHistory(more=false) {
    if(state.busy||history.busy||!state.active||state.creating||(more&&history.cursor===null))return;
    if(!more)resetHistory();
    const c=historyContext(),t=state.active,before=more?history.cursor:null;
    history.busy=true;historyControls();historyNote(uiLocale.message('جارٍ قراءة سجل الإصدارات…'));
    try {
      const path=`/documents/organizations/${encodeURIComponent(c.orgId)}/templates/${encodeURIComponent(t.code)}/history`+(before===null?'':`?beforeVersion=${before}`);
      const body=await request(path,{},()=>historyCurrent(c));if(!historyCurrent(c))return;
      validateHistoryPage(body,before);
      history.rows=more?history.rows.concat(body.items):body.items;history.cursor=body.nextBeforeVersion;
      renderHistory();
      if(history.selected)renderHistoryDetail(history.selected);
      historyNote((history.rows.some(r=>r.version>t.version) ? uiLocale.message('يوجد إصدار أحدث؛ أعد تحميل القالب قبل النشر أو الاستعادة.') : uiLocale.message("{0} إصدار معروض. {1}", [history.rows.length, (history.cursor===null ? uiLocale.message('نهاية السجل.') : uiLocale.message('توجد إصدارات أقدم.'))])));
    }catch(error){if(historyCurrent(c))historyNote((localErrorMessage(error) || uiLocale.message('تعذر قراءة سجل الإصدارات.')));}
    finally{if(historyCurrent(c)){history.busy=false;historyControls();}}
  }
  $('[data-hfl-history-load]').addEventListener('click',()=>void loadHistory());
  $('[data-hfl-history-more]').addEventListener('click',()=>void loadHistory(true));
  $('[data-hfl-history-list]').addEventListener('click',event=>{
    const button=event.target.closest('[data-hfl-history-view]');
    if(!button||state.busy||history.busy||!historyCurrent(historyContext()))return;
    const row=history.rows.find(r=>r.id===button.dataset.hflHistoryView);
    if(row){renderHistoryDetail(row);$('[data-hfl-history-heading]').focus();}
  });
  $('[data-hfl-history-detail]').addEventListener('click',event=>{
    if(!event.target.closest('[data-hfl-history-restore]')||state.busy||history.busy||!historyCurrent(historyContext()))return;
    const row=history.selected;
    if(!canRestore(row)||!discardAllowed())return;
    const form=$('[data-hfl-editor]'),map=new Map(state.active.fields.map(f=>[f.key,f]));
    // Keep the current template ID/version. Only the permitted editable values
    // are copied; the existing authorized PUT creates the next immutable version.
    state.fields=isCustom(state.active)?clone(row.fields):row.fields.map(f=>({...clone(map.get(f.key)),labelAr:f.labelAr,labelEn:f.labelEn,required:f.required}));
    form.elements.titleAr.value=row.titleAr;form.elements.titleEn.value=row.titleEn;form.elements.printable.checked=row.printable;
    fields();changed();
    uiLocale.setMessage($('[data-hfl-meta]'), uiLocale.message("{0} · الإصدار النشط {1} · محتوى الإصدار {2} للمراجعة", [state.active.code, state.active.version, row.version]));
    note(uiLocale.message("حُمّل محتوى الإصدار {0} للمراجعة فقط. لم يُحفظ أو يُنشر بعد؛ راجعه ثم أكّد نشر إصدار جديد.", [row.version]));
    form.elements.titleAr.focus();
  });
  function connect() {
    const host=document.getElementById('hl-documents'),head=host?.querySelector('.hl-doc-head');
    if(!head||head.querySelector('[data-hfl-open]'))return;
    const button=document.createElement('button');button.type='button';button.dataset.hflOpen='';uiLocale.setMessage(button, uiLocale.message('مكتبة النماذج'));button.addEventListener('click',open);head.appendChild(button);
    host.querySelector('[data-doc-org]')?.addEventListener('change',clear);
  }
  const observer=new MutationObserver(connect);observer.observe(document.body,{childList:true,subtree:true});connect();
  for(const name of ['hydroland:session-cleared','hydroland:portal-cleared','hydroland:auth-changed','hydroland:role-changed'])document.addEventListener(name,clear);
  function invalidatePdf(){
    previewGeneration++;previewController?.abort();previewController=null;pdfBusy=false;
    if(previewObjectUrl)URL.revokeObjectURL(previewObjectUrl);previewObjectUrl=null;
    $('[data-hfl-pdf-frame]').removeAttribute('src');$('[data-hfl-pdf-open]').removeAttribute('href');
    $('[data-hfl-pdf-result]').hidden=true;uiLocale.setMessage($('[data-hfl-pdf-status]'), '');
    $('[data-hfl-pdf-preview]').disabled=state.busy||!state.active||state.creating;
  }
  async function loadLogo(c){
    const id=state.brand?.logoAssetId;if(!id)return;
    try{
      const response=await auth().authorizedFetch(`/documents/organizations/${encodeURIComponent(c.orgId)}/branding/logo/${encodeURIComponent(id)}`,{cache:'no-store'});
      if(!current(c))return;
      if([401,403].includes(response.status)){clear();return;}
      if(!response.ok)throw localError(uiLocale.message('تعذر قراءة شعار الجهة.'));
      const blob=await response.blob();if(!current(c))return;
      if(!['image/png','image/jpeg'].includes(blob.type)||blob.size>2_000_000)throw localError(uiLocale.message('شعار الجهة غير صالح للمعاينة.'));
      if(logoObjectUrl)URL.revokeObjectURL(logoObjectUrl);logoObjectUrl=URL.createObjectURL(blob);preview();
    }catch(error){if(current(c))note((localErrorMessage(error) || uiLocale.message('تعذر عرض شعار الجهة؛ لم تُغيّر الهوية المحفوظة.')));}
  }
  $('[data-hfl-pdf-preview]').addEventListener('click',async()=>{
    if(state.busy||pdfBusy||!state.active||state.creating||!dialog.open)return;
    invalidatePdf();pdfBusy=true;const generation=previewGeneration,c=context(),controller=new AbortController();previewController=controller;
    const form=$('[data-hfl-editor]'),t=state.active;
    const payload=canEdit()?{titleAr:form.elements.titleAr.value.trim(),titleEn:form.elements.titleEn.value.trim(),fields:clone(state.fields)}:{};
    $('[data-hfl-pdf-preview]').disabled=true;uiLocale.setMessage($('[data-hfl-pdf-status]'), uiLocale.message('جارٍ توليد معاينة غير محفوظة…'));
    const timeout=setTimeout(()=>controller.abort(),30000);
    try{
      const response=await auth().authorizedFetch(`/documents/organizations/${encodeURIComponent(c.orgId)}/templates/${encodeURIComponent(t.id)}/preview-pdf`,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
      if(!current(c)||generation!==previewGeneration)return;
      if([401,403].includes(response.status)){clear();return;}
      if(!response.ok){const b=await response.json().catch(()=>null);throw localError((b?.message || uiLocale.message('تعذر توليد المعاينة.')));}
      const blob=await response.blob();if(!current(c)||generation!==previewGeneration)return;
      if(blob.type!=='application/pdf'||blob.size>10_000_000)throw localError(uiLocale.message('استجابة المعاينة غير صالحة.'));
      previewObjectUrl=URL.createObjectURL(blob);$('[data-hfl-pdf-frame]').src=previewObjectUrl;$('[data-hfl-pdf-open]').href=previewObjectUrl;
      $('[data-hfl-pdf-result]').hidden=false;uiLocale.setMessage($('[data-hfl-pdf-status]'), uiLocale.message('معاينة فقط باستخدام مولّد PDF الفعلي؛ لم يُنشأ مستند أو اعتماد أو توقيع. أي تعديل لاحق يلغي هذه المعاينة.'));
    }catch(error){if(current(c)&&generation===previewGeneration)uiLocale.setMessage($('[data-hfl-pdf-status]'), (error.name==='AbortError' ? uiLocale.message('انتهت مهلة توليد المعاينة.') : (localErrorMessage(error) || uiLocale.message('تعذر توليد المعاينة.'))));}
    finally{clearTimeout(timeout);if(generation===previewGeneration){pdfBusy=false;previewController=null;$('[data-hfl-pdf-preview]').disabled=state.busy||!state.active||state.creating;}}
  });
  // Other tabs send only an invalidation hint, never identity or form content.
  // Other devices are detected by private polling while this editor is visible.
  let invalidationChannel;
  async function checkForUpdates() {
    if(!dialog.open||document.hidden||state.busy||synchronization.pending||!state.orgId||!auth()?.isAuthenticated?.())return;
    const c=context(),controller=new AbortController();synchronization.pending=controller;
    const timeout=setTimeout(()=>controller.abort(),15000);
    try{
      const rows=await request(`/documents/organizations/${encodeURIComponent(c.orgId)}/templates`,{signal:controller.signal});
      if(!current(c))return;
      if(!Array.isArray(rows)||rows.some(t=>!t||typeof t.id!=='string'||typeof t.code!=='string'||t.organizationId!==c.orgId||t.status!=='ACTIVE'||!Number.isSafeInteger(t.version)||t.version<1||!Array.isArray(t.fields)))throw localError(uiLocale.message('تعذر التحقق من تحديثات المكتبة.'));
      const templates=rows.filter(t=>!t.code.startsWith('CLIB-'));
      const fingerprint=templateFingerprint(templates);
      if(fingerprint===synchronization.fingerprint)return;
      // Do not consume an invalidation until it has been applied. A busy/dirty
      // editor will be rechecked; typed values and historical documents stay put.
      if(state.dirty||state.busy){
        $('[data-hfl-confirm]').checked=false;
        note(uiLocale.message('توجد إصدارات أحدث في المكتبة. تعديلاتك باقية دون مسح؛ راجعها ثم أعد تحميل القالب قبل النشر.'));
        return;
      }
      const selected=templates.find(t=>t.code===state.active?.code)?.id;
      await load(selected);
      if(c.session===session()&&c.orgId===selectedOrg()&&dialog.open&&!state.dirty)note(uiLocale.message('تم تحديث المكتبة بالإصدارات الجديدة. المستندات السابقة ومدخلات شاشة المستندات لم تتغير.'));
    }catch(error){if(current(c))note((error.name==='AbortError' ? uiLocale.message('انتهت مهلة التحقق من تحديثات المكتبة؛ لم تتغير مدخلاتك.') : (localErrorMessage(error) || uiLocale.message('تعذر التحقق من تحديثات المكتبة.'))));}
    finally{clearTimeout(timeout);if(synchronization.pending===controller)synchronization.pending=null;}
  }
  try{
    invalidationChannel=new BroadcastChannel('hydroland-form-invalidation-v1');
    invalidationChannel.addEventListener('message',event=>{if(event.data?.type==='invalidate')void checkForUpdates();});
  }catch{/* Focus and periodic authorized checks remain available. */}
  document.addEventListener('hydroland:form-template-published',()=>{
    try{invalidationChannel?.postMessage({type:'invalidate'});}catch{}
  });
  window.addEventListener('focus',()=>void checkForUpdates());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void checkForUpdates();});
  setInterval(()=>void checkForUpdates(),60000);
  window.HydrolandFormLibrary={open,clear,checkForUpdates};
})();
