(() => {
  const ui = window.HydrolandI18n.createScope('commerce-finance', {
    'مالية بنود الطلب الموحد':'Unified order source finance', 'مستحقات الطلبات الموحدة للمراكز':'Center entitlements for unified orders',
    'تحديث البيانات':'Refresh details', 'المركز':'Center', 'البند':'Source', 'اختر البند':'Choose a source',
    'سلع المتجر':'Store goods', 'حجز رحلة':'Trip booking', 'دورة تدريبية':'Training course', 'تأجير معدات':'Equipment rental',
    'جارٍ تحميل البيانات…':'Loading details…', 'تعذر تحميل المالية. تحقق من الصلاحية ثم حدّث البيانات.':'Could not load finance details. Check your access and refresh.',
    'لا توجد بنود طلبات موحدة لهذا المركز.':'This center has no unified order sources.', 'لا توجد مراكز متاحة.':'No centers are available.',
    'مبلغ البند':'Source amount', 'المبلغ المسترد':'Refunded amount', 'المستحق قبل الاستقطاعات':'Entitlement before deductions',
    'العمولة':'Commission', 'الاستقطاعات الأخرى':'Other deductions', 'صافي مستحق المركز':'Net center entitlement',
    'يتطلب مراجعة':'Review required', 'التحصيل مطابق':'Collection reconciled', 'التحصيل بانتظار المطابقة':'Collection awaits reconciliation',
    'متطلبات الإتمام':'Requirements', 'تحتاج بيانات البند إلى مراجعة قبل تجهيز المستحق.':'The source details require review before its entitlement can be prepared.',
    'يلزم إثبات تنفيذ الخدمة أو استلام السلعة.':'Service completion or goods receipt evidence is required.',
    'يلزم إثبات التحصيل ومطابقته في الدفتر.':'Collection evidence and ledger reconciliation are required.',
    'يوجد رد مبلغ بانتظار المطابقة.':'A refund awaits reconciliation.',
    'يلزم اعتماد توزيع المستحق من مالك المنصة.':'The platform owner must approve the entitlement allocation.',
    'يلزم اعتماد أصل فاتورة المركز.':'The original center invoice must be finalized.',
    'يلزم إرفاق أصل فاتورة المركز.':'The original center invoice document is required.',
    'يلزم استكمال بيانات البائع المالية.':'The seller’s financial details must be completed.',
    'تحتاج القيود المتعارضة إلى المطابقة.':'Conflicting ledger entries require reconciliation.',
    'أصل فاتورة المركز':'Original center invoice', 'فاتورة المركز الأصلية':'Original center invoice',
    'رقم الفاتورة':'Invoice number', 'إجمالي الضريبة':'Total tax', 'تاريخ إصدار الأصل':'Original issue date',
    'البائع خاضع للضريبة حسب ملفه المالي.':'The seller is taxable according to its financial profile.',
    'البائع معفى من الضريبة حسب ملفه المالي.':'The seller is tax-exempt according to its financial profile.',
    'صافي مستحق المركز: {0}':'Net center entitlement: {0}', '{0} · {1} · {2}':'{0} · {1} · {2}',
    'أصل الفاتورة معتمد':'Invoice original finalized', 'أصل الفاتورة بانتظار الاعتماد':'Invoice original awaits finalization',
    'تاريخ ووقت إصدار الأصل (بتوقيت السعودية)':'Original issue date and time (Saudi time)',
    'ضريبة البند كما في الأصل (ر.س)':'Source tax as stated in the original (SAR)',
    'افتح أصل الفاتورة وراجع بياناته قبل الاعتماد.':'Open the invoice original and review its details before finalizing.',
    'راجعت أصل الفاتورة وتطابق مبلغه وتاريخه وضريبة كل بند.':'I reviewed the original invoice and matched its amount, date and each source’s tax.',
    'اعتماد أصل الفاتورة':'Finalize invoice original', 'تم اعتماد أصل الفاتورة.':'Invoice original finalized.',
    'توزيع المستحق':'Entitlement allocation', 'الحساب المالي':'Finance account', 'اختر الحساب':'Choose an account',
    'العمولة (ر.س)':'Commission (SAR)', 'الاستقطاعات الأخرى (ر.س)':'Other deductions (SAR)',
    'أدخل كل مبلغ صراحةً، بما فيه الصفر عند عدم وجود عمولة أو استقطاع.':'Enter each amount explicitly, including zero where no commission or deduction applies.',
    'اعتماد توزيع المستحق':'Approve entitlement allocation', 'تم اعتماد توزيع المستحق.':'Entitlement allocation approved.',
    'إلغاء اعتماد التوزيع':'Revoke allocation approval', 'سبب إلغاء الاعتماد':'Reason for revocation', 'تم إلغاء اعتماد التوزيع.':'Allocation approval revoked.',
    'تجهيز قيد المستحق':'Prepare entitlement entry', 'تم تجهيز قيد المستحق بانتظار اعتماده في القيود المالية.':'Entitlement entry prepared for approval in the finance ledger.',
    'حالة قيد المستحق':'Entitlement entry status', 'بانتظار اعتماد القيد':'Entry awaits approval', 'القيد معتمد':'Entry approved', 'المستحق مرحّل':'Entitlement posted',
    'لا ينفذ تجهيز القيد تحويلًا بنكيًا. يُسجل التحويل الخارجي ثم يراجعه محاسب مستقل.':'Preparing the entry does not make a bank transfer. Record the external transfer and have an independent accountant review it.',
    'جارٍ حفظ القرار…':'Saving decision…', 'تعذر تأكيد العملية. حدّث البيانات قبل تكرارها.':'Could not confirm the operation. Refresh the details before repeating it.',
    'أدخل مبالغ صحيحة بالريال لا تتجاوز مبلغ البند.':'Enter valid amounts in riyals that do not exceed the source amount.',
    'تحقق من تاريخ إصدار الفاتورة.':'Check the invoice issue date.', 'أكد مراجعة أصل الفاتورة أولًا.':'Confirm your review of the original invoice first.'
  });
  const auth = () => window.HydrolandAuth;
  const types = {STORE_ORDER:'سلع المتجر',TRIP_BOOKING:'حجز رحلة',TRAINING_ENROLLMENT:'دورة تدريبية',EQUIPMENT_RENTAL:'تأجير معدات'};
  const key = row => row.sourceType + ':' + row.sourceId;
  const money = value => Number.isSafeInteger(value) && value >= 0 ? new Intl.NumberFormat('ar-SA',{style:'currency',currency:'SAR'}).format(value / 100) : ui.t('يتطلب مراجعة');
  const node = (tag,parent,label) => {const el=document.createElement(tag);if(label)ui.setText(el,label);parent.append(el);return el;};
  const button = (parent,label,click) => {const el=node('button',parent,label);el.type='button';if(click)el.addEventListener('click',click);return el;};
  const field = (parent,label,value) => {const el=node('p',parent);node('span',el,label);el.append(': ');node('bdi',el).textContent=String(value ?? '—');};
  const input = (parent,label,name,type='text') => {const wrapper=node('label',parent,label),el=node(type==='textarea'?'textarea':type==='select'?'select':'input',wrapper);el.name=name;el.required=true;if(el.tagName==='INPUT')el.type=type;return el;};
  const amountInput = (parent,label,name) => {const el=input(parent,label,name);el.inputMode='decimal';el.pattern='[0-9]+([.][0-9]{1,2})?';el.maxLength=12;return el;};
  const amount = el => {if(!/^\d+(\.\d{1,2})?$/.test(el.value))throw new Error(ui.t('أدخل مبالغ صحيحة بالريال لا تتجاوز مبلغ البند.'));const [whole,frac='']=el.value.split('.'),value=Number(whole)*100+Number(frac.padEnd(2,'0'));if(!Number.isSafeInteger(value)||value>2147483647)throw new Error(ui.t('أدخل مبالغ صحيحة بالريال لا تتجاوز مبلغ البند.'));return value;};
  const request = async (path,options) => {const response=await auth().authorizedFetch(path,options),body=await response.json().catch(()=>null);if(!response.ok)throw new Error(typeof body?.message==='string'?body.message:'');return body;};
  const reason = code => {
    if(/COMPLETION|NOT_COMPLETED|NO_PERFORMED|ATTENDANCE|ROSTER/.test(code))return 'يلزم إثبات تنفيذ الخدمة أو استلام السلعة.';
    if(/DUPLICATE|EXISTING_SETTLEMENT/.test(code))return 'تحتاج القيود المتعارضة إلى المطابقة.';
    if(/PENDING_REFUND/.test(code))return 'يوجد رد مبلغ بانتظار المطابقة.';
    if(/COLLECTION|COLLECTED/.test(code))return 'يلزم إثبات التحصيل ومطابقته في الدفتر.';
    if(/OWNER.*ALLOCATION/.test(code))return 'يلزم اعتماد توزيع المستحق من مالك المنصة.';
    if(code==='FINALIZED_ORIGINAL_INVOICE_REQUIRED')return 'يلزم اعتماد أصل فاتورة المركز.';
    if(code==='ORIGINAL_SELLER_INVOICE_DOCUMENT_REQUIRED')return 'يلزم إرفاق أصل فاتورة المركز.';
    if(code==='DECLARED_SELLER_FISCAL_PROFILE_REQUIRED')return 'يلزم استكمال بيانات البائع المالية.';
    return 'تحتاج بيانات البند إلى مراجعة قبل تجهيز المستحق.';
  };
  const style=node('style',document.head);style.textContent='.hl-commerce-finance{margin:1rem 0;padding:1rem;border:1px solid #30556b;border-radius:14px;overflow-wrap:anywhere;min-width:0}.hl-commerce-finance article{margin:.8rem 0;padding:.8rem;border:1px solid #30556b;border-radius:10px}.hl-commerce-finance form,.hl-commerce-finance label{display:grid;gap:.5rem}.hl-commerce-finance form{gap:.8rem}.hl-commerce-finance input,.hl-commerce-finance select,.hl-commerce-finance textarea,.hl-commerce-finance button{box-sizing:border-box;width:100%;min-width:0;max-width:100%;padding:.6rem;border:1px solid #527288;border-radius:8px;background:#12354a;color:inherit;font:inherit}.hl-commerce-finance input[type=checkbox]{width:auto}.hl-commerce-finance button{cursor:pointer}.hl-commerce-finance button:disabled{opacity:.55;cursor:default}.hl-commerce-finance bdi{overflow-wrap:anywhere}.hl-commerce-finance [role=status]{line-height:1.8}';

  function mount(parent,centerId,isCurrent) {
    const session=auth()?.getSessionVersion?.(),panel=node('details',parent);panel.className='hl-commerce-finance';panel.dataset.commerceFinance='';node('summary',panel,'مالية بنود الطلب الموحد');
    const refresh=button(panel,'تحديث البيانات');refresh.dataset.commerceRefresh='';const status=node('p',panel);status.setAttribute('role','status');status.dataset.commerceStatus='';
    const choices=node('div',panel),details=node('div',panel);details.dataset.commerceReadiness='';
    const sourceLabels={},base='/finance/centers/'+encodeURIComponent(centerId)+'/commerce-sources';
    let generation=0,sourceGeneration=0,pending=false,catalog=null,selected=null,select=null;
    const current=()=>panel.isConnected&&panel.open&&isCurrent()&&auth()?.isAuthenticated?.()&&session===auth()?.getSessionVersion?.();
    const transfers=window.HydrolandCenterFinance?.serviceTransfers(panel,centerId,current,{kind:'commerce',sourceLabels});
    const reset=()=>{generation++;sourceGeneration++;pending=false;catalog=null;selected=null;choices.replaceChildren();details.replaceChildren();status.textContent='';refresh.disabled=false;if(transfers)transfers.open=false;};
    const fail=(error,label='تعذر تحميل المالية. تحقق من الصلاحية ثم حدّث البيانات.')=>{details.replaceChildren();status.textContent=error?.message||ui.t(label);};
    async function write(form,source,action,payload,success,accept,live) {
      if(!live()||pending||!form.reportValidity())return;
      let data;try{data=payload();}catch(error){status.textContent=error.message;return;}
      pending=true;refresh.disabled=true;if(select)select.disabled=true;details.querySelectorAll('input,select,textarea,button').forEach(el=>el.disabled=true);ui.setText(status,'جارٍ حفظ القرار…');
      try{const saved=await request(base+'/'+encodeURIComponent(source.sourceType)+'/'+encodeURIComponent(source.sourceId)+'/'+action,{method:'POST',body:JSON.stringify(data)});if(!live())return;if(!accept(saved))throw new Error('');pending=false;await readSource(source,success);}
      catch(error){if(live())fail(error,'تعذر تأكيد العملية. حدّث البيانات قبل تكرارها.');}
      finally{if(live()){pending=false;refresh.disabled=false;if(select)select.disabled=false;}}
    }
    function render(source,data,live) {
      if(data?.sourceType!==source.sourceType||data.sourceId!==source.sourceId||typeof data.canAllocate!=='boolean'||typeof data.canPrepare!=='boolean'||!Number.isSafeInteger(data.amountMinor)||!data.invoice||!Array.isArray(data.invoice.lines))throw new Error('');
      details.replaceChildren();const summary=node('article',details);node('h3',summary).textContent=source.title;
      for(const [label,value]of [['مبلغ البند',data.amountMinor],['المبلغ المسترد',data.refundedMinor],['المستحق قبل الاستقطاعات',data.eligibleGrossAmountMinor],['العمولة',data.commissionAmountMinor],['الاستقطاعات الأخرى',data.otherDeductionsMinor],['صافي مستحق المركز',data.netPayoutAmountMinor]])field(summary,label,money(value));
      node('p',summary,data.collectionVerified?'التحصيل مطابق':'التحصيل بانتظار المطابقة');
      const blockers=[...new Set([...(data.blockers||[]),...(data.reviewReasons||[]),...(data.invoice.blockers||[])].map(reason))];
      if(blockers.length){node('h4',summary,'متطلبات الإتمام');const ul=node('ul',summary);for(const label of blockers)node('li',ul,label);}
      const invoice=node('article',details);node('h4',invoice,'أصل فاتورة المركز');node('p',invoice,data.invoice.status==='FINALIZED'?'أصل الفاتورة معتمد':'أصل الفاتورة بانتظار الاعتماد');
      field(invoice,'رقم الفاتورة',data.invoice.number);field(invoice,'إجمالي الضريبة',money(data.invoice.taxMinor));
      const fiscal=data.invoice.sellerFinancialProfile?.taxStatus;if(['TAXABLE','EXEMPT'].includes(fiscal))node('p',invoice,fiscal==='TAXABLE'?'البائع خاضع للضريبة حسب ملفه المالي.':'البائع معفى من الضريبة حسب ملفه المالي.');
      if(data.invoice.issuedAt)field(invoice,'تاريخ إصدار الأصل',new Date(data.invoice.issuedAt).toLocaleString('ar-SA',{timeZone:'Asia/Riyadh'}));
      const document=data.invoice.documentKey;
      if(document&&['STORE_ORDER','TRAINING_ENROLLMENT','EQUIPMENT_RENTAL','TRIP_PAYMENT'].includes(document.sourceType)&&document.sourceId){const link=button(invoice,'فاتورة المركز الأصلية');link.dataset.accountInvoices='';link.dataset.invoiceType=document.sourceType;link.dataset.invoiceSource=document.sourceId;}
      if(catalog.canPrepare&&data.canPrepare&&data.invoice.canFinalize===true) {
        const form=node('form',invoice);form.dataset.commerceFinalize='';node('p',form,'افتح أصل الفاتورة وراجع بياناته قبل الاعتماد.');
        const issued=input(form,'تاريخ ووقت إصدار الأصل (بتوقيت السعودية)','issuedAt','datetime-local');issued.step='1';
        const taxes=data.invoice.lines.map((line,index)=>{if(typeof line.lineId!=='string'||!Number.isSafeInteger(line.amountMinor)||line.amountMinor<0)throw new Error('');const label=node('p',form);label.textContent=(line.title||source.title)+' · '+money(line.amountMinor);return {line,input:amountInput(form,'ضريبة البند كما في الأصل (ر.س)','tax-'+index)};});
        if(!taxes.length)throw new Error('');
        const accepted=input(form,'راجعت أصل الفاتورة وتطابق مبلغه وتاريخه وضريبة كل بند.','accepted','checkbox');
        const submit=button(form,'اعتماد أصل الفاتورة');submit.type='submit';
        form.addEventListener('submit',event=>{event.preventDefault();event.stopPropagation();void write(form,source,'invoice-finalization',()=>{
          if(!accepted.checked)throw new Error(ui.t('أكد مراجعة أصل الفاتورة أولًا.'));
          const when=new Date(issued.value+'+03:00');if(!Number.isFinite(when.getTime())||when>new Date())throw new Error(ui.t('تحقق من تاريخ إصدار الفاتورة.'));
          const taxLines=taxes.map(({line,input})=>({lineId:line.lineId,taxMinor:amount(input)}));if(taxLines.some((row,index)=>row.taxMinor>taxes[index].line.amountMinor))throw new Error(ui.t('أدخل مبالغ صحيحة بالريال لا تتجاوز مبلغ البند.'));
          return {issuedAt:when.toISOString(),expectedEvidenceHash:data.invoice.expectedEvidenceHash,taxLines};
        },'تم اعتماد أصل الفاتورة.',saved=>saved?.status==='FINALIZED',live);});
      }
      if(catalog.canAllocate&&data.canAllocate&&!data.settlementFinanceEntryId) {
        const allocation=node('article',details);node('h4',allocation,'توزيع المستحق');
        if(data.grossReadiness==='ELIGIBLE'&&Number.isSafeInteger(data.eligibleGrossAmountMinor)&&data.eligibleGrossAmountMinor>0&&!data.allocationApprovalEventId) {
          const form=node('form',allocation);form.dataset.commerceAllocate='';const account=input(form,'الحساب المالي','financeAccountId','select');node('option',account,'اختر الحساب').value='';
          for(const item of catalog.accounts){const option=node('option',account);option.value=item.id;option.textContent=item.name;}
          node('p',form,'أدخل كل مبلغ صراحةً، بما فيه الصفر عند عدم وجود عمولة أو استقطاع.');
          const commission=amountInput(form,'العمولة (ر.س)','commission'),deductions=amountInput(form,'الاستقطاعات الأخرى (ر.س)','deductions'),net=node('p',form);net.dataset.commerceAllocationNet='';
          const preview=()=>{let value=null;try{const total=amount(commission)+amount(deductions);if(total<=data.eligibleGrossAmountMinor)value=data.eligibleGrossAmountMinor-total;}catch{}ui.setText(net,'صافي مستحق المركز: {0}',[Number.isSafeInteger(value)?money(value):ui.message('يتطلب مراجعة')]);};commission.addEventListener('input',preview);deductions.addEventListener('input',preview);preview();const submit=button(form,'اعتماد توزيع المستحق');submit.type='submit';
          form.addEventListener('submit',event=>{event.preventDefault();event.stopPropagation();void write(form,source,'allocation',()=>{
            if(!catalog.accounts.some(row=>row.id===account.value))throw new Error('');const commissionAmountMinor=amount(commission),otherDeductionsMinor=amount(deductions);
            if(commissionAmountMinor+otherDeductionsMinor>data.eligibleGrossAmountMinor)throw new Error(ui.t('أدخل مبالغ صحيحة بالريال لا تتجاوز مبلغ البند.'));
            return {financeAccountId:account.value,commissionAmountMinor,otherDeductionsMinor,expectedEvidenceHash:data.allocationEvidenceHash};
          },'تم اعتماد توزيع المستحق.',saved=>typeof saved?.allocationApprovalEventId==='string',live);});
        }
        if(data.allocationApprovalEventId){const form=node('form',allocation);form.dataset.commerceRevoke='';const note=input(form,'سبب إلغاء الاعتماد','reason','textarea');note.minLength=5;note.maxLength=1000;const submit=button(form,'إلغاء اعتماد التوزيع');submit.type='submit';form.addEventListener('submit',event=>{event.preventDefault();event.stopPropagation();void write(form,source,'allocation/revoke',()=>({allocationApprovalEventId:data.allocationApprovalEventId,reason:note.value.trim()}),'تم إلغاء اعتماد التوزيع.',saved=>saved?.revoked===true,live);});}
      }
      if(data.settlementFinanceEntryId){const label=({PENDING:'بانتظار اعتماد القيد',PENDING_APPROVAL:'بانتظار اعتماد القيد',APPROVED:'القيد معتمد',POSTED:'المستحق مرحّل'})[data.settlementLedgerStatus];field(summary,'حالة قيد المستحق',label?ui.t(label):ui.t('يتطلب مراجعة'));}
      const approvedAccount=catalog.accounts.find(row=>row.id===data.allocationFinanceAccountId);
      if(catalog.canPrepare&&data.canPrepare&&data.canPrepareSettlement&&data.invoice.status==='FINALIZED'&&data.allocationApprovalEventId&&approvedAccount&&!data.settlementFinanceEntryId) {
        const form=node('form',details);form.dataset.commercePrepare='';field(form,'الحساب المالي',approvedAccount.name);node('p',form,'لا ينفذ تجهيز القيد تحويلًا بنكيًا. يُسجل التحويل الخارجي ثم يراجعه محاسب مستقل.');const submit=button(form,'تجهيز قيد المستحق');submit.type='submit';
        form.addEventListener('submit',event=>{event.preventDefault();event.stopPropagation();void write(form,source,'prepare',()=>({financeAccountId:approvedAccount.id,allocationApprovalEventId:data.allocationApprovalEventId}),'تم تجهيز قيد المستحق بانتظار اعتماده في القيود المالية.',saved=>typeof saved?.settlementFinanceEntryId==='string',live);});
      }
    }
    async function readSource(source,message='') {
      if(!current()||pending||!catalog?.items.some(row=>key(row)===key(source)))return;selected=key(source);const view=++sourceGeneration,loaded=generation;
      const live=()=>current()&&view===sourceGeneration&&loaded===generation&&selected===key(source);
      pending=true;refresh.disabled=true;if(select)select.disabled=true;details.replaceChildren();ui.setText(status,'جارٍ تحميل البيانات…');
      try{const data=await request(base+'/'+encodeURIComponent(source.sourceType)+'/'+encodeURIComponent(source.sourceId));if(!live())return;render(source,data,live);if(message)ui.setText(status,message);else status.textContent='';}
      catch(error){if(live())fail(error);}
      finally{if(live()){pending=false;refresh.disabled=false;if(select)select.disabled=false;}}
    }
    async function read() {
      if(!current()||pending)return;const attempt=++generation;sourceGeneration++;selected=null;pending=true;refresh.disabled=true;choices.replaceChildren();details.replaceChildren();ui.setText(status,'جارٍ تحميل البيانات…');
      try{
        const data=await request(base);if(!current()||attempt!==generation)return;
        if(typeof data?.canAllocate!=='boolean'||typeof data?.canPrepare!=='boolean'||!Array.isArray(data.accounts)||!Array.isArray(data.items)||data.accounts.some(row=>!row?.id||typeof row.name!=='string')||data.items.some(row=>!types[row.sourceType]||!row.sourceId||!Number.isSafeInteger(row.amountMinor)||row.currency!=='SAR'))throw new Error('');
        catalog=data;for(const row of data.items)sourceLabels[key(row)]=row.title;
        if(!data.items.length){ui.setText(status,'لا توجد بنود طلبات موحدة لهذا المركز.');return;}
        select=input(choices,'البند','commerceSource','select');select.dataset.commerceSourcePicker='';node('option',select,'اختر البند').value='';
        for(const row of data.items){const option=node('option',select);option.value=key(row);ui.setText(option,'{0} · {1} · {2}',[row.title,ui.message(types[row.sourceType]),money(row.amountMinor)]);}
        select.addEventListener('change',()=>{const row=catalog?.items.find(item=>key(item)===select.value);if(row)void readSource(row);else{sourceGeneration++;selected=null;details.replaceChildren();}});status.textContent='';
      }catch(error){if(current()&&attempt===generation){catalog=null;choices.replaceChildren();fail(error);}}
      finally{if(current()&&attempt===generation){pending=false;refresh.disabled=false;}}
    }
    refresh.addEventListener('click',()=>void read());panel.addEventListener('toggle',()=>{if(panel.open)void read();else reset();});return panel;
  }

  function owner(parent,isCurrent) {
    const panel=node('details',parent);panel.className='hl-admin__panel hl-commerce-finance';panel.dataset.adminCommerceFinance='';node('summary',panel,'مستحقات الطلبات الموحدة للمراكز');
    const refresh=button(panel,'تحديث البيانات'),status=node('p',panel),choices=node('div',panel),workspace=node('div',panel);status.setAttribute('role','status');status.dataset.commerceOwnerStatus='';
    let generation=0,selection=0;
    const clear=(close=true)=>{generation++;selection++;choices.replaceChildren();workspace.replaceChildren();status.textContent='';refresh.disabled=false;if(close)panel.open=false;};
    async function read() {
      if(!panel.open||!isCurrent()||!auth()?.isAuthenticated?.())return;clear(false);const view=generation,session=auth().getSessionVersion?.();
      const current=()=>panel.isConnected&&panel.open&&isCurrent()&&auth()?.isAuthenticated?.()&&view===generation&&session===auth()?.getSessionVersion?.();
      refresh.disabled=true;ui.setText(status,'جارٍ تحميل البيانات…');
      try{const data=await request('/finance/owner/commerce-centers');if(!current())return;if(!Array.isArray(data?.centers))throw new Error('');if(!data.centers.length){ui.setText(status,'لا توجد مراكز متاحة.');return;}
        const select=input(choices,'المركز','commerceCenter','select');for(const row of data.centers){if(!row?.id)throw new Error('');const option=node('option',select);option.value=row.id;option.textContent=[row.organizationName,row.nameAr].filter(Boolean).join(' — ');}
        const show=()=>{workspace.replaceChildren();const choice=++selection,id=select.value;if(!current()||!data.centers.some(row=>row.id===id))return;mount(workspace,id,()=>current()&&choice===selection&&select.value===id).open=true;};select.addEventListener('change',show);show();status.textContent='';
      }catch(error){if(current()){choices.replaceChildren();workspace.replaceChildren();status.textContent=error?.message||ui.t('تعذر تحميل المالية. تحقق من الصلاحية ثم حدّث البيانات.');}}
      finally{if(current())refresh.disabled=false;}
    }
    refresh.addEventListener('click',()=>void read());panel.addEventListener('toggle',()=>{if(panel.open)void read();else clear(false);});
    for(const event of ['hydroland:session-cleared','hydroland:auth-changed','hydroland:role-changed','hydroland:portal-access-cleared'])document.addEventListener(event,()=>clear());
    return panel;
  }
  window.HydrolandCommerceFinance={mount,owner};
})();
