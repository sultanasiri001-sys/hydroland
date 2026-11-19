(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = window.HydrolandI18n?.createScope("center-receivables", {
  "ملغى": "Cancelled",
  "DIVE CENTER · مركز الغوص": "DIVE CENTER",
  "السابق": "Previous",
  "التالي": "Next",
  "ر.س.": "SAR",
  "غير متاح": "Unavailable",
  "٫": "٫",
  "تعذر إتمام الطلب. حدّث البيانات قبل تكرار أي عملية مالية.": "Could not complete the request. Refresh the details before repeating any financial transaction.",
  "المركز": "Center",
  "تحديث البيانات": "Refresh details",
  "مفتوحة": "Open",
  "المبلغ": "Amount",
  "استجابة المراكز غير مكتملة.": "The center response is incomplete.",
  "تعذر تأكيد العملية. حدّث البيانات قبل تكرارها.": "Could not confirm the transaction. Refresh the details before repeating it.",
  "وحدة نقدية صغرى (": "minor currency units (",
  "مسددة جزئيًا": "Partially paid",
  "مسددة": "Paid",
  "متأخرة": "Overdue",
  "بانتظار السداد": "Awaiting payment",
  "حالة دفعة الفاتورة غير مؤهلة. حدّث البيانات.": "The invoice payment status is not eligible. Refresh the details.",
  "دفعة الفاتورة مستخدمة في تحصيل سابق.": "This invoice payment was used in an earlier collection.",
  "هذه الدفعة مرتبطة بذمة أخرى. حدّث قائمة الدفعات.": "This payment is linked to another receivable. Refresh the payment list.",
  "سبق تسجيل الدفعة في وردية محاسب. حدّث قائمة الدفعات.": "This payment was already recorded in a cashier shift. Refresh the payment list.",
  "افتح وردية محاسب قبل تسجيل التحصيل.": "Open a cashier shift before recording a collection.",
  "صلاحية المحاسب غير متاحة لهذا المركز.": "Cashier authority is unavailable for this center.",
  "يلزم تصحيح ربط المركز بالجهة قبل إنشاء الذمة.": "Correct the center's organization link before creating the receivable.",
  "الذمة غير متاحة في هذا المركز.": "This receivable is unavailable in this center.",
  "سبق تسجيل ذمة لهذه الفاتورة. حدّث القائمة.": "A receivable already exists for this invoice. Refresh the list.",
  "لم تعد الفاتورة مؤهلة لهذا المركز. حدّث البيانات.": "The invoice is no longer eligible for this center. Refresh the details.",
  "حالة سداد الفاتورة تغيرت. حدّث البيانات.": "The invoice payment status has changed. Refresh the details.",
  "سبق تسجيل هذه الدفعة أو رقم الإيصال. حدّث بيانات الذمة.": "This payment or receipt number was already recorded. Refresh the receivable details.",
  "اختر القسط الذي يخص هذه الدفعة.": "Choose the installment for this payment.",
  "هذا القسط ملغى. حدّث بيانات الذمة.": "This installment is cancelled. Refresh the receivable details.",
  "مبلغ الدفعة أكبر من المتبقي على القسط.": "The payment exceeds the installment's remaining balance.",
  "مبلغ الدفعة لا يطابق الرصيد المتبقي. حدّث البيانات.": "The payment does not match the remaining balance. Refresh the details.",
  "الدفعة لم تعد مؤهلة للتحصيل على هذه الذمة.": "This payment is no longer eligible for collection against this receivable.",
  "يجب أن يساوي مجموع الأقساط قيمة الذمة.": "The installment total must equal the receivable amount.",
  "أدخل رقم إيصال صالحًا لا يتجاوز 100 حرف.": "Enter a valid receipt number of no more than 100 characters.",
  "صفحات السجلات": "Record pages",
  "الصفحة": "Page",
  "سجلًا": "records",
  "الذمم والتحصيل": "Receivables and collections",
  "متابعة المبالغ المستحقة وتسجيل التحصيل باستخدام دفعة محصّلة مرتبطة بالحجز نفسه.": "Track amounts due and record collections using a captured payment linked to the same booking.",
  "الذمم المعروضة": "Displayed receivables",
  "غير المسددة": "Unpaid",
  "جميع الذمم": "All receivables",
  "قائمة الذمم": "Receivables list",
  "إنشاء ذمة من فاتورة": "Create a receivable from an invoice",
  "قيمة الذمة:": "Receivable amount:",
  "اختر الفاتورة لعرض قيمتها.": "Choose an invoice to view its amount.",
  "مبلغ القسط (ريال)": "Installment amount (SAR)",
  "استحقاق القسط": "Installment due date",
  "حذف القسط": "Remove installment",
  "ذمم المركز": "Center receivables",
  "لا توجد ذمم مطابقة في هذه الصفحة.": "No matching receivables on this page.",
  "الفاتورة": "Invoice",
  "العميل": "Customer",
  "الإجمالي": "Total",
  "المسدد": "Paid",
  "المتبقي": "Remaining",
  "الاستحقاق": "Due date",
  "الحالة": "Status",
  "التفاصيل": "Details",
  "عرض وتحصيل": "View and collect",
  "إنشاء ذمة من فاتورة صادرة": "Create a receivable from an issued invoice",
  "الفواتير المؤهلة مرتبطة بحجوزات المركز وبالريال، ودفعاتها منشأة أو معلّقة أو مفوّضة ولم تُحصّل بعد. جميع تواريخ الاستحقاق بتوقيت الرياض.": "Eligible invoices are linked to center bookings in SAR. Their payments are created, pending or authorized and have not been captured. All due dates use Riyadh time.",
  "اختر الفاتورة": "Choose an invoice",
  "تاريخ استحقاق الذمة": "Receivable due date",
  "أقساط اختيارية — يجب أن يساوي مجموعها قيمة الذمة": "Optional installments — their total must equal the receivable amount",
  "إضافة قسط": "Add installment",
  "تسجيل الذمة": "Record receivable",
  "لا توجد فواتير مؤهلة في هذه الصفحة. يلزم وجود فاتورة صادرة مرتبطة بحجز ودفعة غير محصلة.": "No eligible invoices on this page. An issued invoice linked to a booking with an uncaptured payment is required.",
  "· الاستحقاق": "· Due",
  "بتوقيت الرياض": "Riyadh time",
  "جدول الأقساط": "Installment schedule",
  "القسط": "Installment",
  "تسجيل التحصيل": "Record collection",
  "افتح وردية محاسب نشطة في هذا المركز قبل تسجيل التحصيل، لربط الإيصال والدفعة بسجل الوردية.": "Open an active cashier shift at this center before recording a collection so the receipt and payment can be linked to the shift record.",
  "لا توجد إمكانية لتحصيل إضافي على هذه الذمة: قد تكون مسددة أو تحتاج مراجعة ربط الفاتورة أو العملة.": "No additional collection is available for this receivable. It may be paid, or its invoice link or currency may need review.",
  "لا توجد دفعات محصّلة مؤهلة في هذه الصفحة. يجب أن تخص الدفعة العميل والحجز والعملة نفسها وألا تكون مستخدمة في تحصيل سابق.": "No eligible captured payments on this page. A payment must belong to the same customer, booking and currency and must not have been used in a previous collection.",
  "الدفعة المحصلة": "Captured payment",
  "اختر الدفعة": "Choose a payment",
  "رقم إيصال التحصيل": "Collection receipt number",
  "اختر القسط": "Choose an installment",
  "— المتبقي": "— Remaining",
  "أحدث 50 عملية تحصيل": "Latest 50 collections",
  "الإيصال": "Receipt",
  "وردية المحاسب": "Cashier shift",
  "التاريخ": "Date",
  "سجل سابق": "Historical record",
  "لا توجد عمليات تحصيل مسجلة.": "No collections recorded.",
  "جارٍ تحميل البيانات المالية…": "Loading financial details…",
  "لا يوجد تعيين محاسب نشط لك في مراكز الغوص.": "You have no active cashier assignment at a dive center.",
  "الاستجابة المالية غير مكتملة.": "The financial response is incomplete.",
  "تعذر تحميل البيانات.": "Could not load the details.",
  "أدخل مبالغ أقساط صحيحة مجموعها يساوي قيمة الذمة.": "Enter valid installment amounts totaling the receivable amount.",
  "اختر قسطًا يغطي رصيده المتبقي مبلغ الدفعة كاملًا.": "Choose an installment whose remaining balance covers the entire payment.",
  "أدخل رقم إيصال التحصيل.": "Enter the collection receipt number.",
  "تم تسجيل الذمة.": "Receivable recorded.",
  "تم تسجيل التحصيل بالإيصال": "Collection recorded with receipt",
  " ر.س.": " SAR",
  " وحدة نقدية صغرى (": " minor currency units (",
  "قيمة الذمة: ": "Receivable amount: ",
  "تم تسجيل التحصيل بالإيصال {0}.": "Collection recorded with receipt {0}."
}) || {t:value=>value,message(source,values=[]){return this.format(source,values)},messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),setMessage:(node,value)=>(node.textContent=value??''),label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))},attribute(name,text,values=[]){if(!['aria-label','aria-description','placeholder','title','alt'].includes(name))throw new TypeError('Invalid display attribute');return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'}};

  // Preserve provenance of local errors; provider and user messages remain opaque.
  const localErrors=new WeakMap();
  const localError=(source,values=[])=>{const error=new Error(uiLocale.format(source,values));localErrors.set(error,{source,values});return error;};
  const localErrorMessage=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.message(known.source,known.values):error?.message||uiLocale.message(fallback);};
  const localErrorHTML=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.label(known.source,known.values):error?.message?String(error.message).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])):uiLocale.label(fallback);};
  const setLocalErrorText=(node,error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.setText(node,known.source,known.values):error?.message?(node.textContent=error.message):uiLocale.setText(node,fallback);};

  // Local labels retain identity; unknown API values remain plain text.
  const authoredStateLabel=(value)=>((value=>value?uiLocale.message(value):value)({OPEN:'مفتوحة',PARTIALLY_PAID:'مسددة جزئيًا',PAID:'مسددة',OVERDUE:'متأخرة',PENDING:'بانتظار السداد',CANCELLED:'ملغى'}[value]) || value);

 const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
 let section=null,version=0,centerId='',mode='list',recordId='',page=1,status='open',data=null,busy=false;
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('center')&&access()?.getCurrentRole?.()==='center');
 const clear=()=>{version++;section?.remove();section=null;centerId='';mode='list';recordId='';page=1;status='open';data=null;busy=false};
 const current=(host,v,session)=>host===section&&host.isConnected&&v===version&&eligible()&&session===auth()?.getSessionVersion?.();
 const money=(value,currency='SAR')=>Number.isSafeInteger(value)?currency==='SAR'?(value/100).toFixed(2)+uiLocale.t(' ر.س.'):value+uiLocale.t(' وحدة نقدية صغرى (')+currency+')':uiLocale.t('غير متاح');
 const date=value=>value?new Date(value).toLocaleDateString('ar-SA',{timeZone:'Asia/Riyadh',calendar:'gregory'}):'—';
 const minor=value=>{const text=String(value).trim().replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace('٫','.');if(!/^\d+(\.\d{1,2})?$/.test(text))return null;const [w,f='']=text.split('.'),n=Number(w)*100+Number(f.padEnd(2,'0'));return Number.isSafeInteger(n)&&n>0&&n<=2147483647?n:null};
 const stateLabel=value=>({OPEN:'مفتوحة',PARTIALLY_PAID:'مسددة جزئيًا',PAID:'مسددة',OVERDUE:'متأخرة',PENDING:'بانتظار السداد',CANCELLED:'ملغى'}[value]||value);
 const errorMessages={FINANCE_INVOICE_PAYMENT_STATE_INVALID:'حالة دفعة الفاتورة غير مؤهلة. حدّث البيانات.',FINANCE_INVOICE_PAYMENT_ALREADY_ALLOCATED:'دفعة الفاتورة مستخدمة في تحصيل سابق.',FINANCE_PAYMENT_ALLOCATED_TO_OTHER_RECEIVABLE:'هذه الدفعة مرتبطة بذمة أخرى. حدّث قائمة الدفعات.',FINANCE_PAYMENT_ALREADY_LEDGERED:'سبق تسجيل الدفعة في وردية محاسب. حدّث قائمة الدفعات.',FINANCE_OPEN_SHIFT_REQUIRED:'افتح وردية محاسب قبل تسجيل التحصيل.',FINANCE_BRANCH_ACCOUNTANT_ACCESS_DENIED:'صلاحية المحاسب غير متاحة لهذا المركز.',FINANCE_CENTER_MAPPING_AMBIGUOUS:'يلزم تصحيح ربط المركز بالجهة قبل إنشاء الذمة.',FINANCE_RECEIVABLE_NOT_FOUND:'الذمة غير متاحة في هذا المركز.',FINANCE_RECEIVABLE_ALREADY_EXISTS:'سبق تسجيل ذمة لهذه الفاتورة. حدّث القائمة.',FINANCE_INVOICE_SCOPE_UNVERIFIED:'لم تعد الفاتورة مؤهلة لهذا المركز. حدّث البيانات.',FINANCE_INVOICE_PAID_UNVERIFIED:'حالة سداد الفاتورة تغيرت. حدّث البيانات.',FINANCE_COLLECTION_ALREADY_RECORDED:'سبق تسجيل هذه الدفعة أو رقم الإيصال. حدّث بيانات الذمة.',FINANCE_INSTALLMENT_REQUIRED:'اختر القسط الذي يخص هذه الدفعة.',FINANCE_INSTALLMENT_CANCELLED:'هذا القسط ملغى. حدّث بيانات الذمة.',FINANCE_INSTALLMENT_OVERPAYMENT:'مبلغ الدفعة أكبر من المتبقي على القسط.',FINANCE_RECEIVABLE_PAYMENT_INVALID:'مبلغ الدفعة لا يطابق الرصيد المتبقي. حدّث البيانات.',FINANCE_PAYMENT_NOT_SETTLED:'الدفعة لم تعد مؤهلة للتحصيل على هذه الذمة.',FINANCE_INSTALLMENT_TOTAL_MISMATCH:'يجب أن يساوي مجموع الأقساط قيمة الذمة.',FINANCE_RECEIPT_REQUIRED:'أدخل رقم إيصال صالحًا لا يتجاوز 100 حرف.'};
 async function request(path,options){const response=await auth().authorizedFetch(path,options),body=await response.json().catch(()=>null);if(!response.ok)throw localError(errorMessages[body?.code||body?.message]||'تعذر إتمام الطلب. حدّث البيانات قبل تكرار أي عملية مالية.');return body}
 async function authorize(host,v,session){const valid=await access()?.authorizeRole?.('center',{sessionVersion:session,isCurrent:()=>host===section&&host.isConnected&&v===version});if(!valid||!current(host,v,session)){if(host===section)clear();return false}return true}
 function setBusy(host,value){busy=value;host.querySelectorAll('[data-ar-controls] button,[data-ar-controls] select').forEach(el=>el.disabled=value);host.querySelector('[data-ar-result]').setAttribute('aria-busy',String(value))}
 const pager=(value)=>uiLocale.html`<nav aria-label="صفحات السجلات"><button type="button" data-ar-page="${value.page-1}" ${value.page<=1?'disabled':''}>السابق</button><span> الصفحة ${esc(value.page)} · ${esc(value.total)} سجلًا </span><button type="button" data-ar-page="${value.page+1}" ${value.page*value.pageSize>=value.total?'disabled':''}>التالي</button></nav>`;
 const table=(headers,rows)=>uiLocale.html`<div class="hl-finance-table"><table><thead><tr>${headers.map(h=>uiLocale.html`<th scope="col">${uiLocale.label(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
 function ensure(){
  if(section?.isConnected)return section;const host=document.createElement('section');host.id='hl-center-receivables';host.className='hl-center-finance hl-center-receivables';
  uiLocale.setHTML(host, uiLocale.html`<header><small>DIVE CENTER · مركز الغوص</small><h2>الذمم والتحصيل</h2><p>متابعة المبالغ المستحقة وتسجيل التحصيل باستخدام دفعة محصّلة مرتبطة بالحجز نفسه.</p></header><div data-ar-controls><label>المركز<select name="center" aria-label="المركز"></select></label><label>الذمم المعروضة<select name="status"><option value="open">غير المسددة</option><option value="all">جميع الذمم</option></select></label><button type="button" data-ar-mode="list">قائمة الذمم</button><button type="button" data-ar-mode="create">إنشاء ذمة من فاتورة</button><button type="button" data-ar-refresh>تحديث البيانات</button></div><p role="status" data-ar-status></p><div data-ar-result aria-live="polite"></div>`);
  host.addEventListener('change',event=>{if(busy)return;if(event.target.name==='center'){centerId=event.target.value;mode='list';recordId='';page=1;void load()}else if(event.target.name==='status'){status=event.target.value;mode='list';page=1;void load()}else if(event.target.name==='invoice'){const invoice=data?.items?.find(x=>x.id===event.target.value);host.querySelector('[data-ar-invoice-total]').textContent=invoice?uiLocale.t('قيمة الذمة: ')+money(invoice.totalMinor)+' — '+invoice.customerName:uiLocale.t('اختر الفاتورة لعرض قيمتها.')}});
  host.addEventListener('click',event=>{if(busy)return;const button=event.target.closest('button');if(!button||button.disabled)return;if(button.hasAttribute('data-ar-refresh'))void load();else if(button.dataset.arMode){mode=button.dataset.arMode;page=1;recordId='';void load()}else if(button.dataset.arRecord){mode='detail';recordId=button.dataset.arRecord;page=1;void load()}else if(button.dataset.arPage){page=Number(button.dataset.arPage);void load()}else if(button.hasAttribute('data-ar-add-installment'))addInstallment(host.querySelector('[data-ar-installments]'));else if(button.hasAttribute('data-ar-remove-installment'))button.closest('[data-ar-installment]').remove()});
  host.addEventListener('submit',event=>{if(event.target.matches('[data-ar-operation]')){event.preventDefault();if(!busy)void submit(event.target)}});
  section=host;document.getElementById('main')?.append(host);return host;
 }
 function addInstallment(host){const row=document.createElement('div');row.dataset.arInstallment='1';row.className='hl-ar-installment';uiLocale.setHTML(row, uiLocale.html`<label>مبلغ القسط (ريال)<input name="installmentAmount" inputmode="decimal" required></label><label>استحقاق القسط<input name="installmentDue" type="date" required></label><button type="button" data-ar-remove-installment>حذف القسط</button>`);host.append(row)}
 function render(host,value){
  const result=host.querySelector('[data-ar-result]');
  if(mode==='list'){
   uiLocale.setHTML(result, uiLocale.html`<h3>ذمم المركز</h3>${(!value.items.length?uiLocale.html`<p>لا توجد ذمم مطابقة في هذه الصفحة.</p>`:table(['الفاتورة','العميل','الإجمالي','المسدد','المتبقي','الاستحقاق','الحالة','التفاصيل'],value.items.map(x=>uiLocale.html`<tr><td>${esc(x.invoiceNumber)}</td><td>${esc(x.customerName)}</td><td>${esc(money(x.totalMinor,x.currency))}</td><td>${esc(money(x.paidMinor,x.currency))}</td><td>${esc(money(x.outstandingMinor,x.currency))}</td><td>${esc(date(x.dueAt))}</td><td>${uiLocale.messageHTML(authoredStateLabel(x.status))}</td><td><button type="button" data-ar-record="${esc(x.id)}">عرض وتحصيل</button></td></tr>`)))}${pager(value)}`);return;
  }
  if(mode==='create'){
   uiLocale.setHTML(result, uiLocale.html`<h3>إنشاء ذمة من فاتورة صادرة</h3><p>الفواتير المؤهلة مرتبطة بحجوزات المركز وبالريال، ودفعاتها منشأة أو معلّقة أو مفوّضة ولم تُحصّل بعد. جميع تواريخ الاستحقاق بتوقيت الرياض.</p>${(value.items.length?uiLocale.html`<form data-ar-operation="create"><label>الفاتورة<select name="invoice" required><option value="">اختر الفاتورة</option>${value.items.map(x=>uiLocale.html`<option value="${esc(x.id)}">${esc(x.number)} — ${esc(x.customerName)} — ${esc(money(x.totalMinor))}</option>`).join('')}</select></label><p data-ar-invoice-total>اختر الفاتورة لعرض قيمتها.</p><label>تاريخ استحقاق الذمة<input type="date" name="dueAt" required></label><fieldset><legend>أقساط اختيارية — يجب أن يساوي مجموعها قيمة الذمة</legend><div data-ar-installments></div><button type="button" data-ar-add-installment>إضافة قسط</button></fieldset><p role="alert" data-ar-form-error></p><button type="submit">تسجيل الذمة</button></form>`:uiLocale.html`<p>لا توجد فواتير مؤهلة في هذه الصفحة. يلزم وجود فاتورة صادرة مرتبطة بحجز ودفعة غير محصلة.</p>`)}${pager(value)}`);return;
  }
  const r=value.receivable,unpaid=value.installments.filter(x=>x.status!=='CANCELLED'&&x.amountMinor>x.paidMinor),scheduled=value.installments.some(x=>x.status!=='CANCELLED');
  uiLocale.setHTML(result, uiLocale.html`<article><h3>الفاتورة ${esc(r.invoiceNumber)} — ${esc(r.customerName)}</h3><dl>${[['الإجمالي',r.totalMinor],['المسدد',r.paidMinor],['المتبقي',r.outstandingMinor]].map(([title,n])=>uiLocale.html`<div><dt>${uiLocale.messageHTML(uiLocale.message(title))}</dt><dd>${esc(money(n,r.currency))}</dd></div>`).join('')}</dl><p>${uiLocale.messageHTML(authoredStateLabel(r.status))} · الاستحقاق ${esc(date(r.dueAt))} بتوقيت الرياض</p></article>${(value.installments.length?uiLocale.html`<article><h3>جدول الأقساط</h3>${table(['القسط','المبلغ','المسدد','الاستحقاق','الحالة'],value.installments.map(x=>uiLocale.html`<tr><td>${esc(x.sequence)}</td><td>${esc(money(x.amountMinor,r.currency))}</td><td>${esc(money(x.paidMinor,r.currency))}</td><td>${esc(date(x.dueAt))}</td><td>${uiLocale.messageHTML(authoredStateLabel(x.status))}</td></tr>`))}</article>`:'')}<article><h3>تسجيل التحصيل</h3>${(!value.collectionShiftId&&r.outstandingMinor>0?uiLocale.html`<p>افتح وردية محاسب نشطة في هذا المركز قبل تسجيل التحصيل، لربط الإيصال والدفعة بسجل الوردية.</p>`:(!value.collectable?uiLocale.html`<p>لا توجد إمكانية لتحصيل إضافي على هذه الذمة: قد تكون مسددة أو تحتاج مراجعة ربط الفاتورة أو العملة.</p>`:(!value.payments.items.length?uiLocale.html`<p>لا توجد دفعات محصّلة مؤهلة في هذه الصفحة. يجب أن تخص الدفعة العميل والحجز والعملة نفسها وألا تكون مستخدمة في تحصيل سابق.</p>`:uiLocale.html`<form data-ar-operation="collect"><label>الدفعة المحصلة<select name="payment" required><option value="">اختر الدفعة</option>${value.payments.items.map(x=>uiLocale.html`<option value="${esc(x.id)}">${esc(money(x.amountMinor,r.currency))} — ${esc(date(x.createdAt))} — ${esc(x.providerReference||x.id.slice(-8))}</option>`).join('')}</select></label>${(scheduled?uiLocale.html`<label>القسط<select name="installment" required><option value="">اختر القسط</option>${unpaid.map(x=>uiLocale.html`<option value="${esc(x.id)}">القسط ${esc(x.sequence)} — المتبقي ${esc(money(x.amountMinor-x.paidMinor,r.currency))}</option>`).join('')}</select></label>`:'')}<label>رقم إيصال التحصيل<input name="receiptNumber" required maxlength="100"></label><p role="alert" data-ar-form-error></p><button type="submit">تسجيل التحصيل</button></form>`)))}${pager(value.payments)}</article><article><h3>أحدث 50 عملية تحصيل</h3>${(value.collections.length?table(['الإيصال','المبلغ','القسط','وردية المحاسب','التاريخ'],value.collections.map(x=>uiLocale.html`<tr><td>${esc(x.receiptNumber)}</td><td>${esc(money(x.amountMinor,r.currency))}</td><td>${esc(x.installmentSequence||'—')}</td><td>${esc(x.shiftId?x.shiftId.slice(-8):uiLocale.t('سجل سابق'))}</td><td>${esc(date(x.collectedAt))}</td></tr>`)):uiLocale.html`<p>لا توجد عمليات تحصيل مسجلة.</p>`)}</article>`);
 }
 async function load(message=''){
  if(!eligible()){clear();return}const host=ensure(),v=++version,session=auth().getSessionVersion?.(),result=host.querySelector('[data-ar-result]'),selector=host.querySelector('[name=center]');
  data=null;setBusy(host,true);uiLocale.setHTML(result, uiLocale.html`<p>جارٍ تحميل البيانات المالية…</p>`);uiLocale.setMessage(host.querySelector('[data-ar-status]'), message);host.querySelector('[name=status]').value=status;
  try{
   if(!(await authorize(host,v,session)))return;const centers=await request('/finance/mine/centers');if(!current(host,v,session))return;if(!Array.isArray(centers))throw localError('استجابة المراكز غير مكتملة.');
   if(!centers.some(x=>x.id===centerId)){centerId=centers[0]?.id||'';mode='list';page=1;recordId=''}uiLocale.setHTML(selector, centers.map(x=>uiLocale.html`<option value="${esc(x.id)}">${esc(x.organizationName)} — ${esc(x.name)}</option>`).join(''));selector.value=centerId;
   if(!centerId){uiLocale.setHTML(result, uiLocale.html`<p>لا يوجد تعيين محاسب نشط لك في مراكز الغوص.</p>`);return}
   const root='/finance/centers/'+encodeURIComponent(centerId),path=mode==='create'?root+'/receivable-invoices?page='+page:mode==='detail'?root+'/receivables/'+encodeURIComponent(recordId)+'?page='+page:root+'/receivables/workspace?page='+page+'&status='+status;
   const value=await request(path);if(!current(host,v,session))return;if(value?.centerOrgUnitId!==centerId||(mode==='detail'?(!value.receivable||!Array.isArray(value.installments)||!Array.isArray(value.payments?.items)||!Array.isArray(value.collections)):!Array.isArray(value.items)))throw localError('الاستجابة المالية غير مكتملة.');data=value;render(host,value);
  }catch(error){if(current(host,v,session)){data=null;uiLocale.setHTML(result, uiLocale.html`<p role="alert">${localErrorHTML(error, 'تعذر تحميل البيانات.')}</p>`)}}
  finally{if(current(host,v,session))setBusy(host,false)}
 }
 async function submit(form){
  if(!data||!eligible())return;let path,body;const operation=form.dataset.arOperation,error=form.querySelector('[data-ar-form-error]');error.textContent='';
  if(operation==='create'){
   const invoice=data.items.find(x=>x.id===form.elements.invoice.value);if(!invoice)return;
   const installments=[...form.querySelectorAll('[data-ar-installment]')].map((row,index)=>({sequence:index+1,amountMinor:minor(row.querySelector('[name=installmentAmount]').value),dueAt:row.querySelector('[name=installmentDue]').value+'T23:59:59+03:00'}));
   if(installments.some(x=>x.amountMinor===null)||installments.length&&installments.reduce((n,x)=>n+x.amountMinor,0)!==invoice.totalMinor){uiLocale.setMessage(error, uiLocale.message('أدخل مبالغ أقساط صحيحة مجموعها يساوي قيمة الذمة.'));return}
   path='/finance/receivables';body={centerOrgUnitId:centerId,invoiceId:invoice.id,customerAccountId:invoice.customerAccountId,totalMinor:invoice.totalMinor,paidMinor:0,dueAt:form.elements.dueAt.value+'T23:59:59+03:00',...(installments.length?{installments}:{})};
  }else if(operation==='collect'){
   const payment=data.payments.items.find(x=>x.id===form.elements.payment.value);if(!payment)return;const installmentId=form.elements.installment?.value,installment=data.installments.find(x=>x.id===installmentId);
   if(form.elements.installment&&(!installment||payment.amountMinor>installment.amountMinor-installment.paidMinor)){uiLocale.setMessage(error, uiLocale.message('اختر قسطًا يغطي رصيده المتبقي مبلغ الدفعة كاملًا.'));return}
   const receiptNumber=form.elements.receiptNumber.value.trim();if(!receiptNumber){uiLocale.setMessage(error, uiLocale.message('أدخل رقم إيصال التحصيل.'));return}
   path='/finance/receivables/'+encodeURIComponent(data.receivable.id)+'/collections';body={paymentId:payment.id,amountMinor:payment.amountMinor,receiptNumber,...(installmentId?{installmentId}:{})};
  }else return;
  const host=section,v=++version,session=auth().getSessionVersion?.();setBusy(host,true);form.querySelectorAll('button,input,select').forEach(el=>el.disabled=true);
  try{if(!(await authorize(host,v,session)))return;const saved=await request(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!current(host,v,session))return;if(operation==='create'){mode='detail';recordId=saved.receivableId;page=1}await load((operation==='create'?uiLocale.message('تم تسجيل الذمة.'):uiLocale.message("تم تسجيل التحصيل بالإيصال {0}.", [body.receiptNumber])))}
  catch(err){if(current(host,v,session)){data=null;uiLocale.setHTML(host.querySelector('[data-ar-result]'), uiLocale.html`<p role="alert">${localErrorHTML(err, 'تعذر تأكيد العملية. حدّث البيانات قبل تكرارها.')}</p>`)}}
  finally{if(current(host,v,session))setBusy(host,false)}
 }
 async function open(){if(!eligible()){clear();return}mode='list';page=1;recordId='';const host=ensure();window.HydrolandWorkspaceUI?.show?.(host);await load()}
 for(const event of ['hydroland:session-cleared','hydroland:portal-access-cleared'])document.addEventListener(event,clear);
 for(const event of ['hydroland:auth-changed','hydroland:role-changed','hydroland:profile-data-ready'])document.addEventListener(event,()=>{if(!eligible())clear()});
 window.HydrolandCenterReceivables={open,clear};
})();
