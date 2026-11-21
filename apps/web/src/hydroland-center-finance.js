(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = window.HydrolandI18n?.createScope("center-finance", {
  "مطابقة تحصيل ضرر المعدات": "Reconcile rental damage payments",
  "مرفوض": "Rejected",
  "بانتظار المراجعة": "Awaiting review",
  "إلغاء": "Cancel",
  "DIVE CENTER · مركز الغوص": "DIVE CENTER",
  "ر.س.": "SAR",
  "غير متاح": "Unavailable",
  "٫": "٫",
  "عملة الوردية غير مدعومة للتسليم.": "The shift currency is not supported for handover.",
  "لا توجد صلاحية محاسب نشطة لهذا المركز.": "There is no active cashier authority for this center.",
  "تعذر تحديد مركز واحد لهذه الجهة. يلزم تصحيح ربط المركز قبل تشغيل الورديات.": "A single center could not be identified for this organization. Correct the center link before operating shifts.",
  "لديك وردية نشطة بالفعل. حدّث البيانات لعرضها.": "You already have an active shift. Refresh to view it.",
  "لدى المحاسب المستلم تسليم بانتظار القبول. حدّث البيانات.": "The receiving cashier has a handover awaiting acceptance. Refresh the details.",
  "يجب على المحاسب المستلم فتح وردية برصيد صفري أولًا.": "The receiving cashier must first open a shift with a zero balance.",
  "وردية المستلم تحتوي رصيدًا أو قيودًا. حدّث قائمة المستلمين.": "The receiving shift has a balance or entries. Refresh the recipient list.",
  "اكتب سبب فرق الجرد في عشرة أحرف على الأقل.": "Enter a reason for the cash count difference with at least ten characters.",
  "سبق التعامل مع طلب التسليم. حدّث البيانات.": "This handover request has already been processed. Refresh the details.",
  "حالة الوردية تغيّرت. حدّث البيانات.": "The shift status has changed. Refresh the details.",
  "تم إرسال إقفال الوردية وتجميدها بانتظار المراجعة.": "Shift closure submitted and the shift frozen pending review.",
  "تعذر الإقفال لوجود تحصيلات أو قيود غير متطابقة.": "Closure is blocked by unmatched collections or entries.",
  "لا تملك صلاحية مراجعة إقفال هذا المركز.": "You do not have permission to review this center's closure.",
  "لا يمكن لمقدم الإقفال مراجعته بنفسه.": "The closure submitter cannot review their own request.",
  "اكتب سبب الرفض في عشرة أحرف على الأقل.": "Enter a rejection reason with at least ten characters.",
  "لا يمكن إقفال فترة لم تنتهِ بعد.": "A period cannot be closed before it ends.",
  "توجد موانع تمنع إرسال طلب الإقفال. راجع البنود المعروضة.": "Blocking issues prevent submission of this closure request. Review the displayed items.",
  "هذه الفترة مقفلة بالفعل.": "This period is already closed.",
  "يوجد طلب إقفال بانتظار الاعتماد.": "A closure request is awaiting approval.",
  "يجب أن يكون المراجع مستقلًا عن مقدم الطلب وعن المراجعين السابقين.": "The reviewer must be independent of the submitter and previous reviewers.",
  "اكتب سبب رفض من عشرة أحرف على الأقل.": "Enter a rejection reason with at least ten characters.",
  "لا تملك صلاحية اعتماد إقفال الفترات.": "You do not have permission to approve period closures.",
  "لا تملك صلاحية مراجعة هذا المركز.": "You do not have permission to review this center.",
  "أدخل مبلغًا صحيحًا بمنزلتين عشريتين كحد أقصى.": "Enter a valid amount with no more than two decimal places.",
  "تحقق من المبلغ وبيانات التسليم.": "Check the amount and handover details.",
  "أدخل معرّف تسوية صحيحًا.": "Enter a valid settlement identifier.",
  "لا تملك صلاحية مراجعة تسوية هذا المركز.": "You do not have permission to review this center's settlement.",
  "يجب أن يكون مراجع التسوية مستقلًا عن مقدمها والمراجعين السابقين.": "The settlement reviewer must be independent of its submitter and previous reviewers.",
  "لا يمكن اعتماد التسوية لوجود مبالغ غير متطابقة أو لعدم وجود عمليات مطابقة.": "The settlement cannot be approved because amounts do not match or no transactions were matched.",
  "تم التعامل مع هذه التسوية. حدّث البيانات.": "This settlement has already been processed. Refresh the details.",
  "صلاحية المحاسب غير متاحة.": "Cashier authority is unavailable.",
  "تعذر إتمام الطلب. حدّث البيانات قبل تكرار أي عملية مالية.": "Could not complete the request. Refresh the details before repeating any financial transaction.",
  "ورديات المحاسب": "Cashier shifts",
  "فتح الوردية ومراجعة الرصيد وتسليم العهدة بين محاسبي المركز.": "Open a shift, review its balance and hand over cash between center cashiers.",
  "المركز": "Center",
  "تحديث البيانات": "Refresh details",
  "مفتوحة": "Open",
  "بانتظار استلام العهدة": "Awaiting handover acceptance",
  "إيراد": "Revenue",
  "مصروف": "Expense",
  "استرداد": "Refund",
  "تسوية": "Adjustment",
  "مراجعة الإقفالات المالية": "Review financial closures",
  "تُعرض الإقفالات التي تنتظر مراجعتك فقط.": "Only closures awaiting your review are shown.",
  "ورديتي الحالية —": "My current shift —",
  "الرصيد المتوقع محسوب من قيود الوردية؛ أدخل الجرد الفعلي عند التسليم.": "The expected balance is calculated from shift entries. Enter the actual cash count at handover.",
  "الرصيد الافتتاحي": "Opening balance",
  "الإيرادات المسجلة": "Recorded revenue",
  "المصروفات": "Expenses",
  "الاستردادات": "Refunds",
  "التسويات": "Adjustments",
  "الرصيد المتوقع من القيود": "Expected balance from entries",
  "لا توجد وردية نشطة": "No active shift",
  "الرصيد الافتتاحي (ريال)": "Opening balance (SAR)",
  "لاستلام عهدة من محاسب آخر، افتح وردية برصيد صفري واتركها بلا قيود حتى قبول التسليم.": "To receive cash from another cashier, open a shift with a zero balance and leave it without entries until accepting the handover.",
  "فتح الوردية": "Open shift",
  "عملة هذه الوردية غير مدعومة في هذه الواجهة.": "This shift's currency is not supported in this interface.",
  "تسليم العهدة": "Cash handover",
  "المحاسب المستلم": "Receiving cashier",
  "اختر المحاسب": "Choose a cashier",
  "الجرد الفعلي (ريال)": "Actual cash count (SAR)",
  "أدخل الجرد الفعلي لحساب الفرق.": "Enter the actual cash count to calculate the difference.",
  "سبب فرق الجرد": "Reason for cash count difference",
  "إرسال طلب التسليم": "Send handover request",
  "محاسب المركز": "Center cashier",
  "لا يوجد محاسب مستلم لديه وردية مفتوحة برصيد صفري وبلا قيود أو تسليم معلّق.": "No receiving cashier has an open shift with zero balance, no entries and no pending handover.",
  "طلبات التسليم المعلّقة": "Pending handover requests",
  "المتوقع:": "Expected:",
  "· الفعلي:": "· Actual:",
  "· الفرق:": "· Difference:",
  "استلام من": "Receive from",
  "تسليم إلى": "Hand over to",
  "سبب الفرق:": "Reason for difference:",
  "تحققت من المبلغ الفعلي وأؤكد استلام العهدة": "I verified the actual amount and confirm receipt of the cash",
  "قبول استلام العهدة": "Accept cash handover",
  "بانتظار قبول المحاسب المستلم.": "Awaiting acceptance by the receiving cashier.",
  "لا توجد طلبات تسليم معلّقة.": "No pending handover requests.",
  "إقفال الوردية —": "Shift closure —",
  "المتوقع": "Expected",
  "· الفعلي": "· Actual",
  "· الفرق": "· Difference",
  "معتمد": "Approved",
  "ملاحظة المراجع:": "Reviewer note:",
  "تم تجميد الوردية حتى إتمام المراجعة.": "The shift is frozen until review is complete.",
  "إرسال إقفال الوردية للمراجعة": "Submit shift closure for review",
  "أدخل الجرد الفعلي لمقارنته بالرصيد المتوقع.": "Enter the actual cash count to compare it with the expected balance.",
  "إرسال الإقفال": "Submit closure",
  "إقفالات بانتظار المراجعة": "Closures awaiting review",
  "وردية": "Shift",
  "المحاسب:": "Cashier:",
  "· القيود غير المطابقة:": "· Unmatched entries:",
  "ملاحظة المراجع": "Reviewer note",
  "اعتماد الإقفال": "Approve closure",
  "رفض مع توضيح السبب": "Reject with a reason",
  "لا توجد إقفالات بانتظار المراجعة.": "No closures awaiting review.",
  "أحدث 50 قيدًا للوردية": "Latest 50 shift entries",
  "الإجماليات أعلاه تشمل جميع قيود الوردية.": "The totals above include all shift entries.",
  "النوع": "Type",
  "المبلغ": "Amount",
  "الوصف": "Description",
  "لا توجد قيود في الوردية.": "No shift entries.",
  "لا توجد إقفالات معتمدة في هذا اليوم": "No approved closures on this day",
  "مطابق": "Matched",
  "معتمد مع فروقات جرد": "Approved with cash count differences",
  "يحتاج إلى معالجة": "Needs attention",
  "تقرير الإقفال اليومي": "Daily closure report",
  "تاريخ العمل": "Business date",
  "عرض التقرير": "View report",
  "ورديات معتمدة ·": "approved shifts ·",
  "قيود غير مطابقة": "unmatched entries",
  "الرصيد المتوقع": "Expected balance",
  "الجرد الفعلي": "Actual cash count",
  "إجمالي الفرق": "Total difference",
  "· المراجع": "· Reviewer",
  "ورديات غير مقفلة أو تسليم معلّق": "Unclosed shifts or pending handover",
  "ورديات إقفال غير معتمدة": "Unapproved shift closures",
  "تحصيلات أو قيود غير مطابقة": "Unmatched collections or entries",
  "طلبات استرداد معلقة": "Pending refund requests",
  "ذمم مدينة غير مرحلة": "Unposted receivables",
  "إقفال فترة مالية": "Close a financial period",
  "اختر شهرًا أو ربع سنة أو سنة. لا يمكن إرسال طلب الفترة قبل انتهائها ومعالجة جميع الموانع.": "Choose a month, quarter or year. A period request can be submitted only after the period ends and all blocking issues are resolved.",
  "نوع الفترة": "Period type",
  "شهر": "Month",
  "ربع سنة": "Quarter",
  "سنة": "Year",
  "مفتاح الفترة": "Period key",
  "\" placeholder=\"2026-10 أو 2026-Q4 أو 2026\" required>": "\" placeholder=\"2026-10, 2026-Q4 or 2026\" required>",
  "فحص الجاهزية": "Check readiness",
  "ربع السنة": "Quarter",
  "السنة": "Year",
  "جاهزة للإقفال": "Ready for closure",
  "تحتاج معالجة": "Needs attention",
  "انتهت الفترة": "Period ended",
  "لم تنتهِ الفترة بعد": "Period has not ended yet",
  "ورديات مفتوحة": "Open shifts",
  "إقفالات ورديات غير معتمدة": "Unapproved shift closures",
  "استردادات معلقة": "Pending refunds",
  "ذمم غير مرحلة": "Unposted receivables",
  "إرسال طلب إقفال للفترة": "Submit period closure request",
  "طلبات إقفال الفترات بانتظار الاعتماد": "Period closure requests awaiting approval",
  "· إصدار": "· Revision",
  "مقدم الطلب:": "Submitted by:",
  "· الاعتمادات:": "· Approvals:",
  "اعتماد": "Approve",
  "مراجع": "Reviewer",
  "الاعتماد الثاني وإقفال الفترة": "Second approval and period closure",
  "الاعتماد الأول": "First approval",
  "لا توجد طلبات إقفال فترات بانتظار الاعتماد.": "No period closure requests awaiting approval.",
  "بانتظار اعتمادين": "Awaiting two approvals",
  "معتمدة": "Approved",
  "مرفوضة": "Rejected",
  "مطابقة تسويات الدفع": "Reconcile payment settlements",
  "استيراد قراءة فقط من Moyasar. تُعرض عمليات المركز المطابقة فقط؛ لا يُنشأ قيد محاسبي ولا يُنفّذ تحويل مالي. أدخل معرّف التسوية من كشف Moyasar.": "Read-only import from Moyasar. Only matched center transactions are shown. No accounting entry or funds transfer is created. Enter the settlement identifier from your Moyasar statement.",
  "مزامنة مراجع الدفعات السابقة (10 في كل مرة)": "Sync previous payment references (10 at a time)",
  "معرّف التسوية": "Settlement identifier",
  "استيراد ومطابقة": "Import and reconcile",
  "سطر مطابق · إجمالي العمليات": "matched rows · Gross transactions",
  "· الرسوم قبل الضريبة": "· Fees before tax",
  "· الضريبة": "· Tax",
  "الاعتمادات:": "Approvals:",
  "يوجد": "There are",
  "اختلاف مبلغ؛ يلزم تصحيحه قبل الاعتماد.": "amount mismatches. Correct them before approval.",
  "تحصيل": "Collection",
  "رسوم": "Fees",
  "اختلاف مبلغ": "Amount mismatch",
  "رفض مع السبب": "Reject with a reason",
  "الاعتماد الثاني": "Second approval",
  "اعتماد المطابقة": "Approve reconciliation",
  "لم تُستورد تسويات لهذا المركز.": "No settlements have been imported for this center.",
  "فرق الجرد:": "Cash count difference:",
  "— يلزم توضيح السبب.": "— A reason is required.",
  "— مطابق للرصيد المتوقع.": "— Matches the expected balance.",
  "جارٍ تحميل بيانات الوردية…": "Loading shift details…",
  "استجابة المراكز غير مكتملة.": "The center response is incomplete.",
  "استجابة مراكز المراجعة غير مكتملة.": "The review-center response is incomplete.",
  "استجابة مراكز اعتماد الفترات غير مكتملة.": "The period-approval center response is incomplete.",
  "· مراجعة": "· Review",
  "لا يوجد لديك تعيين محاسب نشط أو صلاحية مراجعة مالية صريحة لهذا المركز.": "You have no active cashier assignment or explicit financial review authority for this center.",
  "استجابة الوردية غير مكتملة.": "The shift response is incomplete.",
  "تعذر تحميل البيانات. استخدم تحديث البيانات للمحاولة مجددًا.": "Could not load the details. Select Refresh details to try again.",
  "تم تحميل تقرير الإقفال اليومي.": "Daily closure report loaded.",
  "تم فحص جاهزية الفترة.": "Period readiness checked.",
  "تم فتح الوردية.": "Shift opened.",
  "تم إرسال طلب التسليم.": "Handover request sent.",
  "تم إرسال الإقفال للمراجع وتجميد الوردية.": "Closure sent to the reviewer and the shift frozen.",
  "تم تسجيل قرار المراجعة.": "Review decision recorded.",
  "تم إرسال طلب إقفال الفترة.": "Period closure request submitted.",
  "تم تسجيل اعتماد الفترة.": "Period approval recorded.",
  "تمت مزامنة {0} مرجعًا؛ المتبقي {1}.": "Synced {0} references; {1} remaining.",
  "تم استيراد تسوية الدفع ومطابقتها.": "Payment settlement imported and reconciled.",
  "تم تسجيل اعتماد المطابقة.": "Reconciliation approval recorded.",
  "تم قبول العهدة وتحديث رصيد الوردية.": "Handover accepted and shift balance updated.",
  "تعذر تأكيد العملية. حدّث البيانات قبل تكرارها.": "Could not confirm the transaction. Refresh the details before repeating it.",
  "2026-10 أو 2026-Q4 أو 2026": "2026-10, 2026-Q4 or 2026",
  " ر.س.": " SAR",
  "فرق الجرد: ": "Cash count difference: ",
  " — يلزم توضيح السبب.": " — A reason is required.",
  " — مطابق للرصيد المتوقع.": " — Matches the expected balance.",
  " · مراجعة": " · Review"
}) || {t:value=>value,message(source,values=[]){return this.format(source,values)},messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),setMessage:(node,value)=>(node.textContent=value??''),label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))},attribute(name,text,values=[]){if(!['aria-label','aria-description','placeholder','title','alt'].includes(name))throw new TypeError('Invalid display attribute');return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'}};

  // Preserve provenance of local errors; provider and user messages remain opaque.
  const localErrors=new WeakMap();
  const localError=(source,values=[])=>{const error=new Error(uiLocale.format(source,values));localErrors.set(error,{source,values});return error;};
  const localErrorMessage=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.message(known.source,known.values):error?.message||uiLocale.message(fallback);};
  const localErrorHTML=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.label(known.source,known.values):error?.message?String(error.message).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])):uiLocale.label(fallback);};
  const setLocalErrorText=(node,error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.setText(node,known.source,known.values):error?.message?(node.textContent=error.message):uiLocale.setText(node,fallback);};

 const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
 let section=null,version=0,centerId='',snapshot=null,busy=false;
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const businessDateToday=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Riyadh'}).format(new Date());
 const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('center')&&access()?.getCurrentRole?.()==='center');
 const clear=()=>{version++;section?.remove();section=null;centerId='';snapshot=null;busy=false};
 const current=(host,v,session)=>host===section&&host.isConnected&&v===version&&eligible()&&session===auth()?.getSessionVersion?.();
 const money=value=>Number.isSafeInteger(value)?(value/100).toFixed(2)+uiLocale.t(' ر.س.'):uiLocale.t('غير متاح');
 function minor(value){
  const text=String(value).trim().replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace('٫','.');
  if(!/^\d+(\.\d{1,2})?$/.test(text))return null;
  const [whole,fraction='']=text.split('.'),n=Number(whole)*100+Number(fraction.padEnd(2,'0'));
  return Number.isSafeInteger(n)&&n<=2147483647?n:null;
 }
 const errors={FINANCE_CURRENCY_UNSUPPORTED:'عملة الوردية غير مدعومة للتسليم.',FINANCE_BRANCH_ACCOUNTANT_ACCESS_DENIED:'لا توجد صلاحية محاسب نشطة لهذا المركز.',FINANCE_CENTER_MAPPING_AMBIGUOUS:'تعذر تحديد مركز واحد لهذه الجهة. يلزم تصحيح ربط المركز قبل تشغيل الورديات.',FINANCE_ACTIVE_SHIFT_EXISTS:'لديك وردية نشطة بالفعل. حدّث البيانات لعرضها.',FINANCE_HANDOVER_RECEIVER_ALREADY_PENDING:'لدى المحاسب المستلم تسليم بانتظار القبول. حدّث البيانات.',FINANCE_HANDOVER_RECEIVER_SHIFT_REQUIRED:'يجب على المحاسب المستلم فتح وردية برصيد صفري أولًا.',FINANCE_HANDOVER_RECEIVER_SHIFT_NOT_EMPTY:'وردية المستلم تحتوي رصيدًا أو قيودًا. حدّث قائمة المستلمين.',FINANCE_VARIANCE_REASON_REQUIRED:'اكتب سبب فرق الجرد في عشرة أحرف على الأقل.',FINANCE_HANDOVER_NOT_PENDING:'سبق التعامل مع طلب التسليم. حدّث البيانات.',FINANCE_SHIFT_NOT_OPEN:'حالة الوردية تغيّرت. حدّث البيانات.',FINANCE_SHIFT_CLOSE_ALREADY_SUBMITTED:'تم إرسال إقفال الوردية وتجميدها بانتظار المراجعة.',FINANCE_SHIFT_CLOSE_VARIANCE_REASON_REQUIRED:'اكتب سبب فرق الجرد في عشرة أحرف على الأقل.',FINANCE_SHIFT_CLOSE_RECONCILIATION_BLOCKED:'تعذر الإقفال لوجود تحصيلات أو قيود غير متطابقة.',FINANCE_SHIFT_CLOSE_REVIEW_DENIED:'لا تملك صلاحية مراجعة إقفال هذا المركز.',FINANCE_SHIFT_CLOSE_REVIEW_SOD_VIOLATION:'لا يمكن لمقدم الإقفال مراجعته بنفسه.',FINANCE_SHIFT_CLOSE_REJECTION_REASON_REQUIRED:'اكتب سبب الرفض في عشرة أحرف على الأقل.',FINANCE_PERIOD_NOT_ENDED:'لا يمكن إقفال فترة لم تنتهِ بعد.',FINANCE_PERIOD_CLOSE_BLOCKED:'توجد موانع تمنع إرسال طلب الإقفال. راجع البنود المعروضة.',FINANCE_PERIOD_ALREADY_CLOSED:'هذه الفترة مقفلة بالفعل.',FINANCE_PERIOD_CLOSE_ALREADY_SUBMITTED:'يوجد طلب إقفال بانتظار الاعتماد.',FINANCE_PERIOD_REVIEW_SOD_VIOLATION:'يجب أن يكون المراجع مستقلًا عن مقدم الطلب وعن المراجعين السابقين.',FINANCE_PERIOD_REJECTION_REASON_REQUIRED:'اكتب سبب رفض من عشرة أحرف على الأقل.',FINANCE_PERIOD_APPROVER_ACCESS_DENIED:'لا تملك صلاحية اعتماد إقفال الفترات.',FINANCE_PERIOD_CLOSE_REVIEW_DENIED:'لا تملك صلاحية مراجعة هذا المركز.',FINANCE_AMOUNT_INVALID:'أدخل مبلغًا صحيحًا بمنزلتين عشريتين كحد أقصى.',FINANCE_INPUT_INVALID:'تحقق من المبلغ وبيانات التسليم.'};
 Object.assign(errors,{FINANCE_SETTLEMENT_REFERENCE_INVALID:'أدخل معرّف تسوية صحيحًا.',FINANCE_SETTLEMENT_REVIEW_DENIED:'لا تملك صلاحية مراجعة تسوية هذا المركز.',FINANCE_SETTLEMENT_REVIEW_SOD_VIOLATION:'يجب أن يكون مراجع التسوية مستقلًا عن مقدمها والمراجعين السابقين.',FINANCE_SETTLEMENT_REJECTION_REASON_REQUIRED:'اكتب سبب رفض من عشرة أحرف على الأقل.',FINANCE_SETTLEMENT_RECONCILIATION_BLOCKED:'لا يمكن اعتماد التسوية لوجود مبالغ غير متطابقة أو لعدم وجود عمليات مطابقة.',FINANCE_SETTLEMENT_ALREADY_REVIEWED:'تم التعامل مع هذه التسوية. حدّث البيانات.'});
 async function authorize(host,v,session){
  const valid=await access()?.authorizeRole?.('center',{sessionVersion:session,isCurrent:()=>host===section&&host.isConnected&&v===version});
  if(!valid||!current(host,v,session)){if(host===section)clear();return false}return true;
 }
 async function request(path,options){
  const response=await auth().authorizedFetch(path,options),data=await response.json().catch(()=>null);
  if(!response.ok)throw localError(errors[data?.code||data?.message]||(response.status===403?'صلاحية المحاسب غير متاحة.':'تعذر إتمام الطلب. حدّث البيانات قبل تكرار أي عملية مالية.'));
  return data;
 }
 function ensure(){
  if(section?.isConnected)return section;
  const host=document.createElement('section');host.id='hl-center-finance';host.className='hl-center-finance';
  uiLocale.setHTML(host, uiLocale.html`<header><small>DIVE CENTER · مركز الغوص</small><h2>ورديات المحاسب</h2><p>فتح الوردية ومراجعة الرصيد وتسليم العهدة بين محاسبي المركز.</p></header><div data-finance-controls><label>المركز<select name="center" aria-label="المركز"></select></label><button type="button" data-finance-refresh>تحديث البيانات</button></div><p role="status" data-finance-status></p><div data-finance-result aria-live="polite"></div>`);
  const damage=document.createElement('details'),title=document.createElement('summary'),damageBody=document.createElement('div');
  uiLocale.setText(title,'مطابقة تحصيل ضرر المعدات');damage.append(title,damageBody);host.append(damage);
  damage.addEventListener('toggle',async()=>{if(!damage.open||!eligible()){damageBody.replaceChildren();return;}const view=await import('./hydroland-rental-damage.mjs');if(damage.open&&eligible()&&damage.isConnected)view.accountant(damageBody);});
  host.addEventListener('change',event=>{if(event.target.name==='center'&&!busy){centerId=event.target.value;void load()}});
  host.addEventListener('click',event=>{if(event.target.closest('[data-finance-refresh]')&&!busy)void load()});
  host.addEventListener('submit',event=>{event.preventDefault();if(event.target.matches('[data-finance-operation]')&&!busy)void submit(event.target,event.submitter)});
  host.addEventListener('input',event=>{if(event.target.name==='actualCash')updateVariance(event.target.form)});
  section=host;document.getElementById('main')?.append(host);return host;
 }
 function setBusy(host,value){busy=value;host.querySelectorAll('[data-finance-controls] button,[data-finance-controls] select').forEach(el=>el.disabled=value);host.querySelector('[data-finance-result]').setAttribute('aria-busy',String(value))}
 function render(host,data){
  const result=host.querySelector('[data-finance-result]'),shift=data.shift;
  const label={OPEN:'مفتوحة',HANDOVER_PENDING:'بانتظار استلام العهدة'},entryLabel={REVENUE:'إيراد',EXPENSE:'مصروف',REFUND:'استرداد',ADJUSTMENT:'تسوية'};
  const incoming=(data.handovers||[]).some(h=>h.direction==='INCOMING');
  let html=!data.isOperator?uiLocale.html`<article><h3>مراجعة الإقفالات المالية</h3><p>تُعرض الإقفالات التي تنتظر مراجعتك فقط.</p></article>`:shift?uiLocale.html`<article><h3>ورديتي الحالية — ${uiLocale.messageHTML(((value=>value?uiLocale.message(value):value)(label[shift.status]) || shift.status))}</h3><dl>${[['الرصيد الافتتاحي',shift.openingBalanceMinor],['الإيرادات المسجلة',data.totals.revenueMinor],['المصروفات',data.totals.expenseMinor],['الاستردادات',data.totals.refundMinor],['التسويات',data.totals.adjustmentMinor],['الرصيد المتوقع من القيود',data.totals.expectedCashMinor]].map(([title,value])=>uiLocale.html`<div><dt>${uiLocale.messageHTML(uiLocale.message(title))}</dt><dd>${esc(money(value))}</dd></div>`).join('')}</dl><p>الرصيد المتوقع محسوب من قيود الوردية؛ أدخل الجرد الفعلي عند التسليم.</p></article>`:uiLocale.html`<article><h3>لا توجد وردية نشطة</h3><form data-finance-operation="open"><label>الرصيد الافتتاحي (ريال)<input name="openingBalance" inputmode="decimal" value="0" required></label><p>لاستلام عهدة من محاسب آخر، افتح وردية برصيد صفري واتركها بلا قيود حتى قبول التسليم.</p><button type="submit">فتح الوردية</button></form></article>`;
  if(shift?.currency!=='SAR'&&shift){uiLocale.setHTML(result, uiLocale.html`<p role="alert">عملة هذه الوردية غير مدعومة في هذه الواجهة.</p>`);return}
  if(data.isOperator&&shift?.status==='OPEN'&&!incoming&&data.closeSubmission?.status!=='SUBMITTED'){
   html+=uiLocale.html`<article><h3>تسليم العهدة</h3>${(data.receivers.length?uiLocale.html`<form data-finance-operation="handover"><label>المحاسب المستلم<select name="receiver" required><option value="">اختر المحاسب</option>${data.receivers.map(x=>uiLocale.html`<option value="${esc(x.accountId)}">${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('محاسب المركز')))(x.name)}</option>`).join('')}</select></label><label>الجرد الفعلي (ريال)<input name="actualCash" inputmode="decimal" required></label><p data-finance-variance>أدخل الجرد الفعلي لحساب الفرق.</p><label>سبب فرق الجرد<textarea name="varianceReason" maxlength="1000"></textarea></label><button type="submit">إرسال طلب التسليم</button></form>`:uiLocale.html`<p>لا يوجد محاسب مستلم لديه وردية مفتوحة برصيد صفري وبلا قيود أو تسليم معلّق.</p>`)}</article>`;
  }
  if(data.isOperator)html+=uiLocale.html`<article><h3>طلبات التسليم المعلّقة</h3>${(data.handovers.length?data.handovers.map(h=>uiLocale.html`<div class="hl-finance-handover"><h4>${uiLocale.messageHTML((h.direction==='INCOMING'?uiLocale.message('استلام من'):uiLocale.message('تسليم إلى')))} ${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('محاسب المركز')))(h.counterpartyName)}</h4><p>المتوقع: ${esc(money(h.expectedCashMinor))} · الفعلي: ${esc(money(h.actualCashMinor))} · الفرق: ${esc(money(h.varianceMinor))}</p>${(h.varianceReason?uiLocale.html`<p>سبب الفرق: ${esc(h.varianceReason)}</p>`:'')}${(h.direction==='INCOMING'?uiLocale.html`<form data-finance-operation="accept" data-handover-id="${esc(h.id)}"><label><input type="checkbox" required> تحققت من المبلغ الفعلي وأؤكد استلام العهدة</label><button type="submit" ${!Number.isSafeInteger(h.actualCashMinor)||h.actualCashMinor<0?'disabled':''}>قبول استلام العهدة</button></form>`:uiLocale.html`<p>بانتظار قبول المحاسب المستلم.</p>`)}</div>`).join(''):uiLocale.html`<p>لا توجد طلبات تسليم معلّقة.</p>`)}</article>`;
  if(data.closeSubmission){const c=data.closeSubmission;html+=uiLocale.html`<article><h3>إقفال الوردية — ${uiLocale.messageHTML((c.status==='SUBMITTED'?uiLocale.message('بانتظار المراجعة'):(c.status==='APPROVED'?uiLocale.message('معتمد'):uiLocale.message('مرفوض'))))}</h3><p>المتوقع ${esc(money(c.expectedCashMinor))} · الفعلي ${esc(money(c.actualCashMinor))} · الفرق ${esc(money(c.varianceMinor))}</p>${(c.varianceReason?uiLocale.html`<p>سبب الفرق: ${esc(c.varianceReason)}</p>`:'')}${(c.reviewNote?uiLocale.html`<p>ملاحظة المراجع: ${esc(c.reviewNote)}</p>`:'')}${(c.status==='SUBMITTED'?uiLocale.html`<p>تم تجميد الوردية حتى إتمام المراجعة.</p>`:'')}</article>`}
  if(data.isOperator&&shift?.status==='OPEN'&&data.closeSubmission?.status!=='SUBMITTED')html+=uiLocale.html`<article><h3>إرسال إقفال الوردية للمراجعة</h3><form data-finance-operation="close"><label>الجرد الفعلي (ريال)<input name="actualCash" inputmode="decimal" required></label><p data-finance-variance>أدخل الجرد الفعلي لمقارنته بالرصيد المتوقع.</p><label>سبب فرق الجرد<textarea name="varianceReason" maxlength="1000"></textarea></label><button type="submit">إرسال الإقفال</button></form></article>`;
  if(data.canReview)html+=uiLocale.html`<article><h3>إقفالات بانتظار المراجعة</h3>${(data.reviewItems.length?data.reviewItems.map(c=>uiLocale.html`<div class="hl-finance-handover"><h4>وردية ${esc(c.shiftId)}</h4><p>المتوقع: ${esc(money(c.expectedCashMinor))} · الفعلي: ${esc(money(c.actualCashMinor))} · الفرق: ${esc(money(c.varianceMinor))}</p><p>المحاسب: ${esc(c.submittedByName||'—')} · القيود غير المطابقة: ${esc(c.unresolvedPaymentCount)}</p>${(c.varianceReason?uiLocale.html`<p>سبب الفرق: ${esc(c.varianceReason)}</p>`:'')}<form data-finance-operation="review" data-submission-id="${esc(c.id)}"><label>ملاحظة المراجع<textarea name="reviewNote" maxlength="1000"></textarea></label><button name="decision" value="APPROVED" type="submit">اعتماد الإقفال</button><button name="decision" value="REJECTED" type="submit">رفض مع توضيح السبب</button></form></div>`).join(''):uiLocale.html`<p>لا توجد إقفالات بانتظار المراجعة.</p>`)}</article>`;
  if(data.isOperator&&shift)html+=uiLocale.html`<article><h3>أحدث 50 قيدًا للوردية</h3><p>الإجماليات أعلاه تشمل جميع قيود الوردية.</p>${(data.entries.length?uiLocale.html`<div class="hl-finance-table"><table><thead><tr><th scope="col">النوع</th><th scope="col">المبلغ</th><th scope="col">الوصف</th></tr></thead><tbody>${data.entries.map(row=>uiLocale.html`<tr><td>${uiLocale.messageHTML(((value=>value?uiLocale.message(value):value)(entryLabel[row.type]) || row.type))}</td><td>${esc(money(row.amountMinor))}</td><td>${esc(row.description||'—')}</td></tr>`).join('')}</tbody></table></div>`:uiLocale.html`<p>لا توجد قيود في الوردية.</p>`)}</article>`;
  if(data.canReview){const report=data.dailyReport,labels={NO_APPROVED_SHIFT_CLOSES:'لا توجد إقفالات معتمدة في هذا اليوم',READY_FOR_REVIEW:'مطابق',VARIANCE_REVIEW_REQUIRED:'معتمد مع فروقات جرد',BLOCKED:'يحتاج إلى معالجة'};html+=uiLocale.html`<article><h3>تقرير الإقفال اليومي</h3><form data-finance-operation="daily-report"><label>تاريخ العمل<input name="businessDate" type="date" value="${esc(report?.businessDate||businessDateToday())}" required></label><button type="submit">عرض التقرير</button></form>`;if(report){html+=uiLocale.html`<p>${uiLocale.messageHTML(((value=>value?uiLocale.message(value):value)(labels[report.decision]) || report.decision))} · ${esc(report.shiftCount)} ورديات معتمدة · ${esc(report.unresolvedPaymentCount)} قيود غير مطابقة</p><dl>${[['الرصيد المتوقع',report.expectedCashMinor],['الجرد الفعلي',report.actualCashMinor],['إجمالي الفرق',report.varianceMinor]].map(([title,value])=>uiLocale.html`<div><dt>${uiLocale.messageHTML(uiLocale.message(title))}</dt><dd>${esc(money(value))}</dd></div>`).join('')}</dl>`;if(report.shifts.length)html+=uiLocale.html`<ul>${report.shifts.map(x=>uiLocale.html`<li>وردية ${esc(x.shiftId)} · ${esc(x.submittedByName||'—')} · المراجع ${esc(x.reviewedByName||'—')} · الفرق ${esc(money(x.varianceMinor))}</li>`).join('')}</ul>`}html+=uiLocale.html`</article>`}
  if(data.isOperator){const p=data.periodReadiness,labels={OPEN_SHIFTS:'ورديات غير مقفلة أو تسليم معلّق',UNRESOLVED_VARIANCES:'ورديات إقفال غير معتمدة',UNRECONCILED_PAYMENTS:'تحصيلات أو قيود غير مطابقة',PENDING_REFUNDS:'طلبات استرداد معلقة',UNPOSTED_RECEIVABLES:'ذمم مدينة غير مرحلة'};html+=uiLocale.html`<article><h3>إقفال فترة مالية</h3><p>اختر شهرًا أو ربع سنة أو سنة. لا يمكن إرسال طلب الفترة قبل انتهائها ومعالجة جميع الموانع.</p><form data-finance-operation="period-preview"><label>نوع الفترة<select name="periodType"><option value="MONTH">شهر</option><option value="QUARTER">ربع سنة</option><option value="YEAR">سنة</option></select></label><label>مفتاح الفترة<input name="periodKey" value="${esc(businessDateToday().slice(0,7))}" placeholder="2026-10 أو 2026-Q4 أو 2026" required></label><button type="submit">فحص الجاهزية</button></form>`;if(p){html+=uiLocale.html`<p>${uiLocale.messageHTML((p.periodType==='MONTH'?uiLocale.message('شهر'):(p.periodType==='QUARTER'?uiLocale.message('ربع السنة'):uiLocale.message('السنة'))))} ${esc(p.periodKey)} · ${uiLocale.messageHTML((p.state==='READY'?uiLocale.message('جاهزة للإقفال'):uiLocale.message('تحتاج معالجة')))} · ${uiLocale.messageHTML((new Date(p.endsAt)<=new Date()?uiLocale.message('انتهت الفترة'):uiLocale.message('لم تنتهِ الفترة بعد')))}</p><dl>${Object.entries(p.counts||{}).map(([key,value])=>uiLocale.html`<div><dt>${uiLocale.messageHTML(((value=>value?uiLocale.message(value):value)(({openShiftCount:'ورديات مفتوحة',unresolvedVarianceCount:'إقفالات ورديات غير معتمدة',unreconciledPaymentCount:'قيود غير مطابقة',pendingRefundCount:'استردادات معلقة',unpostedReceivableCount:'ذمم غير مرحلة'})[key]) || key))}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;if(p.blockers?.length)html+=uiLocale.html`<ul>${p.blockers.map(x=>uiLocale.html`<li>${uiLocale.messageHTML(((value=>value?uiLocale.message(value):value)(labels[x.code]) || x.code))}: ${esc(x.count)}</li>`).join('')}</ul>`;if(p.state==='READY'&&new Date(p.endsAt)<=new Date())html+=uiLocale.html`<form data-finance-operation="period-submit"><button type="submit">إرسال طلب إقفال للفترة</button></form>`}html+=uiLocale.html`</article>`}
  if(data.canReviewPeriod)html+=uiLocale.html`<article><h3>طلبات إقفال الفترات بانتظار الاعتماد</h3>${(data.periodCloseReviews.length?data.periodCloseReviews.map(c=>uiLocale.html`<div class="hl-finance-handover"><h4>${uiLocale.messageHTML((c.periodType==='MONTH'?uiLocale.message('شهر'):(c.periodType==='QUARTER'?uiLocale.message('ربع سنة'):uiLocale.message('سنة'))))} ${esc(c.periodKey)} · إصدار ${esc(c.revision)}</h4><p>مقدم الطلب: ${esc(c.submittedByName||'—')} · الاعتمادات: ${esc(c.approvals.length)}/2</p>${c.approvals.map(a=>uiLocale.html`<p>اعتماد ${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('مراجع')))(a.reviewerName)} — ${esc(a.reviewerRole)}</p>`).join('')}<form data-finance-operation="period-review" data-submission-id="${esc(c.id)}"><label>ملاحظة المراجع<textarea name="reviewNote" maxlength="1000"></textarea></label><button name="decision" value="APPROVED" type="submit">${uiLocale.messageHTML((c.approvals.length?uiLocale.message('الاعتماد الثاني وإقفال الفترة'):uiLocale.message('الاعتماد الأول')))}</button><button name="decision" value="REJECTED" type="submit">رفض مع توضيح السبب</button></form></div>`).join(''):uiLocale.html`<p>لا توجد طلبات إقفال فترات بانتظار الاعتماد.</p>`)}</article>`;
  if(data.isOperator||data.canReview||data.canReviewPeriod){const items=data.settlementImports||[],status={SUBMITTED:'بانتظار اعتمادين',APPROVED:'معتمدة',REJECTED:'مرفوضة'};html+=uiLocale.html`<article><h3>مطابقة تسويات الدفع</h3><p>استيراد قراءة فقط من Moyasar. تُعرض عمليات المركز المطابقة فقط؛ لا يُنشأ قيد محاسبي ولا يُنفّذ تحويل مالي. أدخل معرّف التسوية من كشف Moyasar.</p>`;if(data.isOperator)html+=uiLocale.html`<form data-finance-operation="settlement-sync"><button type="submit">مزامنة مراجع الدفعات السابقة (10 في كل مرة)</button></form><form data-finance-operation="settlement-import"><label>معرّف التسوية<input name="settlementId" autocomplete="off" pattern="[0-9a-fA-F-]{36}" required></label><button type="submit">استيراد ومطابقة</button></form>`;html+=items.length?items.map(batch=>{const rows=Array.isArray(batch.lines)?batch.lines:[],reviews=Array.isArray(batch.reviews)?batch.reviews:[];return uiLocale.html`<div class="hl-finance-handover"><h4>تسوية ${esc(batch.providerSettlementId)} · ${uiLocale.messageHTML(((value=>value?uiLocale.message(value):value)(status[batch.status]) || batch.status))}</h4><p>${esc(batch.matchedLineCount)} سطر مطابق · إجمالي العمليات ${esc(money(batch.grossAmountMinor))} · الرسوم قبل الضريبة ${esc(money(batch.feeMinor))} · الضريبة ${esc(money(batch.taxMinor))}</p>${(batch.mismatchedLineCount?uiLocale.html`<p role="alert">يوجد ${esc(batch.mismatchedLineCount)} اختلاف مبلغ؛ يلزم تصحيحه قبل الاعتماد.</p>`:'')}<p>الاعتمادات: ${esc(reviews.filter(x=>x.decision==='APPROVED').length)}/2</p><ul>${rows.slice(0,20).map(line=>uiLocale.html`<li>${uiLocale.messageHTML(((value=>value?uiLocale.message(value):value)(({payment:'تحصيل',refund:'استرداد',fee:'رسوم',void:'إلغاء'})[line.type]) || line.type))} · ${esc(money(line.netAmountMinor))} · ${uiLocale.messageHTML((line.amountMatches?uiLocale.message('مطابق'):uiLocale.message('اختلاف مبلغ')))}</li>`).join('')}</ul>${((data.canReview||data.canReviewPeriod)&&batch.status==='SUBMITTED'?uiLocale.html`<form data-finance-operation="settlement-review" data-import-id="${esc(batch.id)}"><label>ملاحظة المراجع<textarea name="reviewNote" maxlength="1000"></textarea></label><button name="decision" value="APPROVED" type="submit">${uiLocale.messageHTML((reviews.filter(x=>x.decision==='APPROVED').length?uiLocale.message('الاعتماد الثاني'):uiLocale.message('اعتماد المطابقة')))}</button><button name="decision" value="REJECTED" type="submit">رفض مع السبب</button></form>`:'')}</div>`}).join(''):uiLocale.html`<p>لم تُستورد تسويات لهذا المركز.</p>`;html+=uiLocale.html`</article>`}
  uiLocale.setHTML(result, html);
 }
 function updateVariance(form){
  const amount=minor(form.elements.actualCash.value),expected=snapshot?.totals?.expectedCashMinor,reason=form.elements.varianceReason;
  const valid=amount!==null&&Number.isSafeInteger(expected);reason.required=valid&&amount!==expected;reason.minLength=reason.required?10:0;
  form.querySelector('[data-finance-variance]').textContent=valid?uiLocale.t('فرق الجرد: ')+money(amount-expected)+(amount!==expected?uiLocale.t(' — يلزم توضيح السبب.'):uiLocale.t(' — مطابق للرصيد المتوقع.')):uiLocale.t('أدخل مبلغًا صحيحًا بمنزلتين عشريتين كحد أقصى.');
 }
 async function load(message=''){
  if(!eligible()){clear();return}const host=ensure(),v=++version,session=auth().getSessionVersion?.(),result=host.querySelector('[data-finance-result]'),selector=host.querySelector('[name=center]');
  snapshot=null;setBusy(host,true);uiLocale.setHTML(result, uiLocale.html`<p>جارٍ تحميل بيانات الوردية…</p>`);uiLocale.setMessage(host.querySelector('[data-finance-status]'), message);
  try{
   if(!(await authorize(host,v,session)))return;
   const centers=await request('/finance/mine/centers');if(!current(host,v,session))return;
   if(!Array.isArray(centers))throw localError('استجابة المراكز غير مكتملة.');
   const reviewerCenters=await request('/finance/mine/shift-close-centers');if(!current(host,v,session))return;if(!Array.isArray(reviewerCenters))throw localError('استجابة مراكز المراجعة غير مكتملة.');
   const periodReviewerCenters=await request('/finance/mine/period-close-centers');if(!current(host,v,session))return;if(!Array.isArray(periodReviewerCenters))throw localError('استجابة مراكز اعتماد الفترات غير مكتملة.');
   const choices=new Map();for(const x of centers)choices.set(x.id,{...x,isOperator:true,canReview:false,canReviewPeriod:false});for(const x of reviewerCenters){const item=choices.get(x.id)||{...x,isOperator:false,canReview:false,canReviewPeriod:false};item.canReview=true;choices.set(x.id,item)}for(const x of periodReviewerCenters){const item=choices.get(x.id)||{...x,isOperator:false,canReview:false,canReviewPeriod:false};item.canReviewPeriod=true;choices.set(x.id,item)}
   const all=[...choices.values()];if(!all.some(x=>x.id===centerId))centerId=all[0]?.id||'';
   uiLocale.setHTML(selector, all.map(x=>uiLocale.html`<option value="${esc(x.id)}">${esc(x.organizationName)} — ${esc(x.name)}${uiLocale.messageHTML((x.canReview?uiLocale.message(' · مراجعة'):''))}</option>`).join(''));selector.value=centerId;
   if(!centerId){uiLocale.setHTML(result, uiLocale.html`<p>لا يوجد لديك تعيين محاسب نشط أو صلاحية مراجعة مالية صريحة لهذا المركز.</p>`);return}
   const selected=choices.get(centerId),empty={centerOrgUnitId:centerId,shift:null,totals:null,entries:[],receivers:[],handovers:[],closeSubmission:null};
   let data=selected.isOperator?await request('/finance/centers/'+encodeURIComponent(centerId)+'/workspace'):empty;if(!current(host,v,session))return;
   if(selected.canReview)data.reviewItems=await request('/finance/centers/'+encodeURIComponent(centerId)+'/shift-close-reviews');else data.reviewItems=[];if(!current(host,v,session))return;
   if(selected.canReviewPeriod)data.periodCloseReviews=await request('/finance/centers/'+encodeURIComponent(centerId)+'/period-close-reviews');else data.periodCloseReviews=[];if(!current(host,v,session))return;
   data.settlementImports=selected.isOperator||selected.canReview||selected.canReviewPeriod?await request('/finance/centers/'+encodeURIComponent(centerId)+'/settlement-imports'):[];if(!current(host,v,session))return;
   data.isOperator=selected.isOperator;data.canReview=selected.canReview;data.canReviewPeriod=selected.canReviewPeriod;
   if(data?.centerOrgUnitId!==centerId||!Array.isArray(data.entries)||!Array.isArray(data.receivers)||!Array.isArray(data.handovers)||(data.shift&&!data.totals))throw localError('استجابة الوردية غير مكتملة.');
   snapshot=data;render(host,data);
  }catch(error){if(current(host,v,session)){snapshot=null;uiLocale.setHTML(result, uiLocale.html`<p role="alert">${localErrorHTML(error, 'تعذر تحميل البيانات. استخدم تحديث البيانات للمحاولة مجددًا.')}</p>`)}}
  finally{if(current(host,v,session))setBusy(host,false)}
 }
 async function submit(form,submitter){
  if(!snapshot||!eligible())return;
  const operation=form.dataset.financeOperation;let path,body;
  if(operation==='open'){
   const amount=minor(form.elements.openingBalance.value);if(amount===null){form.elements.openingBalance.setCustomValidity(uiLocale.t('أدخل مبلغًا صحيحًا بمنزلتين عشريتين كحد أقصى.'));form.elements.openingBalance.reportValidity();form.elements.openingBalance.oninput=()=>form.elements.openingBalance.setCustomValidity('');return}
   path='/finance/shifts/open';body={centerOrgUnitId:centerId,openingBalanceMinor:amount};
  }else if(operation==='handover'){
   updateVariance(form);if(!form.reportValidity())return;const amount=minor(form.elements.actualCash.value);if(amount===null)return;
   if(!snapshot.receivers.some(x=>x.accountId===form.elements.receiver.value)||snapshot.shift?.status!=='OPEN')return;
   path='/finance/shifts/'+encodeURIComponent(snapshot.shift.id)+'/handover';body={toAccountantId:form.elements.receiver.value,actualCashMinor:amount,varianceReason:form.elements.varianceReason.value.trim()||undefined};
  }else if(operation==='close'){
   updateVariance(form);if(!form.reportValidity())return;const amount=minor(form.elements.actualCash.value);if(amount===null||!snapshot.isOperator||snapshot.shift?.status!=='OPEN')return;
   path='/finance/centers/'+encodeURIComponent(centerId)+'/shifts/'+encodeURIComponent(snapshot.shift.id)+'/close';body={actualCashMinor:amount,varianceReason:form.elements.varianceReason.value.trim()||undefined};
  }else if(operation==='review'){
   const decision=submitter?.value;const note=form.elements.reviewNote.value.trim();if(decision==='REJECTED'&&note.length<10){form.elements.reviewNote.setCustomValidity(uiLocale.t('اكتب سبب رفض من عشرة أحرف على الأقل.'));form.elements.reviewNote.reportValidity();form.elements.reviewNote.oninput=()=>form.elements.reviewNote.setCustomValidity('');return}
   if(!snapshot.canReview||!snapshot.reviewItems.some(x=>x.id===form.dataset.submissionId))return;path='/finance/shift-close-reviews/'+encodeURIComponent(form.dataset.submissionId)+'/decision';body={decision,note:note||undefined};
  }else if(operation==='daily-report'){
   const date=form.elements.businessDate.value;if(!snapshot.canReview||!form.reportValidity()||!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
   path='/finance/centers/'+encodeURIComponent(centerId)+'/daily-close-report?businessDate='+encodeURIComponent(date);body=null;
  }else if(operation==='period-preview'){
   const type=form.elements.periodType.value,key=form.elements.periodKey.value.trim();if(!form.reportValidity()||!['MONTH','QUARTER','YEAR'].includes(type))return;
   path='/finance/centers/'+encodeURIComponent(centerId)+'/period-close-preview?periodType='+encodeURIComponent(type)+'&periodKey='+encodeURIComponent(key);body=null;
  }else if(operation==='period-submit'){
   const p=snapshot.periodReadiness;if(!snapshot.isOperator||!p||p.state!=='READY'||new Date(p.endsAt)>new Date())return;
   path='/finance/centers/'+encodeURIComponent(centerId)+'/period-close-submissions';body={periodType:p.periodType,periodKey:p.periodKey};
  }else if(operation==='period-review'){
   const decision=submitter?.value,note=form.elements.reviewNote.value.trim();if(decision==='REJECTED'&&note.length<10){form.elements.reviewNote.setCustomValidity(uiLocale.t('اكتب سبب رفض من عشرة أحرف على الأقل.'));form.elements.reviewNote.reportValidity();form.elements.reviewNote.oninput=()=>form.elements.reviewNote.setCustomValidity('');return}
   if(!snapshot.canReviewPeriod||!snapshot.periodCloseReviews.some(x=>x.id===form.dataset.submissionId))return;path='/finance/period-close-submissions/'+encodeURIComponent(form.dataset.submissionId)+'/decision';body={decision,note:note||undefined};
  }else if(operation==='settlement-sync'){
   if(!snapshot.isOperator)return;path='/finance/centers/'+encodeURIComponent(centerId)+'/settlement-payment-sync';body={};
  }else if(operation==='settlement-import'){
   const settlementId=form.elements.settlementId.value.trim();if(!snapshot.isOperator||!form.reportValidity()||!/^[0-9a-f-]{36}$/i.test(settlementId))return;
   path='/finance/centers/'+encodeURIComponent(centerId)+'/settlement-imports';body={settlementId};
  }else if(operation==='settlement-review'){
   const decision=submitter?.value,note=form.elements.reviewNote.value.trim();if(decision==='REJECTED'&&note.length<10){form.elements.reviewNote.setCustomValidity(uiLocale.t('اكتب سبب رفض من عشرة أحرف على الأقل.'));form.elements.reviewNote.reportValidity();form.elements.reviewNote.oninput=()=>form.elements.reviewNote.setCustomValidity('');return}
   if(!(snapshot.canReview||snapshot.canReviewPeriod)||!snapshot.settlementImports.some(x=>x.id===form.dataset.importId))return;path='/finance/settlement-imports/'+encodeURIComponent(form.dataset.importId)+'/decision';body={decision,note:note||undefined};
  }else if(operation==='accept'){
   if(!form.reportValidity()||!snapshot.handovers.some(x=>x.id===form.dataset.handoverId&&x.direction==='INCOMING'))return;
   path='/finance/shifts/handovers/'+encodeURIComponent(form.dataset.handoverId)+'/accept';body={};
  }else return;
  const host=section,v=++version,session=auth().getSessionVersion?.();setBusy(host,true);form.querySelectorAll('button,input,textarea,select').forEach(el=>el.disabled=true);
  try{
   if(!(await authorize(host,v,session)))return;
   const response=['daily-report','period-preview'].includes(operation)?await request(path):await request(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   if(current(host,v,session)){if(operation==='daily-report'){snapshot.dailyReport=response;render(host,snapshot);uiLocale.setMessage(host.querySelector('[data-finance-status]'), uiLocale.message('تم تحميل تقرير الإقفال اليومي.'))}else if(operation==='period-preview'){snapshot.periodReadiness=response;render(host,snapshot);uiLocale.setMessage(host.querySelector('[data-finance-status]'), uiLocale.message('تم فحص جاهزية الفترة.'))}else await load((operation==='open'?uiLocale.message('تم فتح الوردية.'):(operation==='handover'?uiLocale.message('تم إرسال طلب التسليم.'):(operation==='close'?uiLocale.message('تم إرسال الإقفال للمراجع وتجميد الوردية.'):(operation==='review'?uiLocale.message('تم تسجيل قرار المراجعة.'):(operation==='period-submit'?uiLocale.message('تم إرسال طلب إقفال الفترة.'):(operation==='period-review'?uiLocale.message('تم تسجيل اعتماد الفترة.'):(operation==='settlement-sync'?uiLocale.message("تمت مزامنة {0} مرجعًا؛ المتبقي {1}.", [response.syncedCount, response.remainingCount]):(operation==='settlement-import'?uiLocale.message('تم استيراد تسوية الدفع ومطابقتها.'):(operation==='settlement-review'?uiLocale.message('تم تسجيل اعتماد المطابقة.'):uiLocale.message('تم قبول العهدة وتحديث رصيد الوردية.')))))))))))}
  }catch(error){if(current(host,v,session)){snapshot=null;uiLocale.setHTML(host.querySelector('[data-finance-result]'), uiLocale.html`<p role="alert">${localErrorHTML(error, 'تعذر تأكيد العملية. حدّث البيانات قبل تكرارها.')}</p>`)}}
  finally{if(current(host,v,session))setBusy(host,false)}
 }
 async function open(){if(!eligible()){clear();return}const host=ensure();window.HydrolandWorkspaceUI?.show?.(host);await load()}
 for(const event of ['hydroland:session-cleared','hydroland:portal-access-cleared'])document.addEventListener(event,clear);
 for(const event of ['hydroland:auth-changed','hydroland:role-changed','hydroland:profile-data-ready'])document.addEventListener(event,()=>{if(!eligible())clear()});
 window.HydrolandCenterFinance={open,clear};
})();
