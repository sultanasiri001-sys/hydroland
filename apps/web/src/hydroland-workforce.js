(()=>{
  const state={data:null,loading:false};
  const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
  const button=(text,handler,className='')=>{const node=el('button',className,text);node.type='button';node.addEventListener('click',handler);return node;};
  const nameOf=account=>account?.person?[account.person.firstName,account.person.lastName].filter(Boolean).join(' ')||account.email:account?.email||'غير مسند';
  const api=async(path,options={})=>{const client=window.HydrolandAuth?.authorizedFetch;if(!client)throw new Error('يلزم تسجيل الدخول');const response=await client(`/workforce${path}`,options);const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(Array.isArray(body.message)?body.message.join('، '):body.message||`HTTP ${response.status}`);return body;};
  const message=(text,error=false)=>{const node=document.querySelector('[data-workforce-message]');if(node){node.textContent=text;node.dataset.error=String(error);}};
  const request=async action=>{try{await action();await load();}catch(error){message(error.message,true);}};

  function ensurePanel(){
    const admin=document.querySelector('.hl-admin');if(!admin)return null;
    let panel=document.querySelector('.hl-workforce');if(panel)return panel;
    panel=el('section','hl-workforce');panel.hidden=true;
    panel.innerHTML='<header class="hl-workforce__header"><div><span class="eyebrow">HYDROLAND / القوى العاملة الهجينة</span><h2>الأقسام والوكلاء والموظفون</h2><p>صلاحية الذكاء الاصطناعي مستقلة عن الموظف، وكل مقعد بشري مقفل حتى يتم إسناد حساب وتشغيله.</p></div><button type="button" class="btn btn-primary" data-workforce-refresh>تحديث الهيكلة</button></header><div class="hl-workforce__metrics" data-workforce-metrics></div><p class="hl-workforce__message" data-workforce-message>بانتظار تحميل الهيكلة.</p><div class="hl-workforce__departments" data-workforce-departments></div><section class="hl-workforce__centers"><div class="hl-workforce__section-title"><div><h3>المراكز والمقرات الخارجية</h3><p>ارتباط إداري بمدير المركز وارتباط فني بالقسم الرئيسي.</p></div></div><div data-workforce-centers></div></section>';
    admin.insertAdjacentElement('afterend',panel);panel.querySelector('[data-workforce-refresh]').addEventListener('click',load);return panel;
  }
  function renderMetrics(){
    const root=document.querySelector('[data-workforce-metrics]');root.textContent='';const totals=state.data.totals;
    [['الأقسام',totals.departments],['مديرو الأقسام',totals.managers],['المساعدون الأذكياء',totals.assistants],['المقاعد البشرية',totals.humanSeatTemplates],['المقاعد النشطة',totals.enabledHumanSeats]].forEach(([label,value])=>{const card=el('article');card.append(el('strong','',String(value)),el('span','',label));root.append(card);});
  }
  const modeFor=(ai,human)=>ai&&human?'HYBRID':human?'HUMAN_ONLY':ai?'AI_ONLY':'DISABLED';
  function renderSeat(seat){
    const row=el('div','hl-workforce__seat');row.append(el('span','',seat.scope==='EXTERNAL_CENTER'?'مقعد مركز خارجي':'المقعد البشري الرئيسي'));
    const account=el('select');account.setAttribute('aria-label','الحساب المسند');account.append(new Option('بدون مستخدم',''));state.data.accounts.forEach(item=>account.append(new Option(`${nameOf(item)} · ${item.status}`,item.id)));account.value=seat.accountId||'';
    const status=el('select');status.setAttribute('aria-label','حالة المقعد');[['LOCKED','مقفل'],['ENABLED','نشط'],['SUSPENDED','معلق']].forEach(([value,label])=>status.append(new Option(label,value)));status.value=seat.accessStatus;
    row.append(account,status,button('حفظ',()=>request(()=>api(`/seats/${seat.id}`,{method:'PATCH',body:JSON.stringify({accountId:account.value||null,accessStatus:status.value})})),'hl-workforce__small'));return row;
  }
  function renderPosition(position){
    const item=el('article','hl-workforce__position');const top=el('div','hl-workforce__position-top');const title=el('div');title.append(el('strong','',position.titleAr),el('small','',`${position.tier==='MANAGER'?'مدير':'مساعد'} · ${position.titleEn}`));top.append(title);
    const controls=el('div','hl-workforce__switches');controls.append(button(`AI ${position.aiEnabled?'مفعّل':'مقفل'}`,()=>request(()=>api(`/positions/${position.id}/mode`,{method:'PATCH',body:JSON.stringify({aiEnabled:!position.aiEnabled,humanEnabled:position.humanEnabled,mode:modeFor(!position.aiEnabled,position.humanEnabled)})})),position.aiEnabled?'is-on':''),button(`موظف ${position.humanEnabled?'مفعّل':'مقفل'}`,()=>request(()=>api(`/positions/${position.id}/mode`,{method:'PATCH',body:JSON.stringify({aiEnabled:position.aiEnabled,humanEnabled:!position.humanEnabled,mode:modeFor(position.aiEnabled,!position.humanEnabled)})})),position.humanEnabled?'is-on':''));top.append(controls);
    item.append(top,el('p','hl-workforce__permissions',position.permissions.join(' · ')));const seat=position.seats.find(candidate=>candidate.scope==='HEADQUARTERS');if(seat)item.append(renderSeat(seat));return item;
  }
  function renderDepartments(){
    const root=document.querySelector('[data-workforce-departments]');root.textContent='';state.data.departments.forEach(department=>{const card=el('details','hl-workforce__department');if(department.isHumanResources)card.classList.add('is-hr');const summary=el('summary');const heading=el('div');heading.append(el('h3','',department.nameAr),el('small','',`${department.nameEn} · ${department.positions.filter(p=>p.tier==='ASSISTANT').length} مساعدين`));const toggle=button(department.status==='ENABLED'?'القسم مفعّل':'القسم مقفل',event=>{event.preventDefault();request(()=>api(`/departments/${department.id}/status`,{method:'PATCH',body:JSON.stringify({status:department.status==='ENABLED'?'DISABLED':'ENABLED'})}));},department.status==='ENABLED'?'is-on':'');summary.append(heading,toggle);card.append(summary);const positions=el('div','hl-workforce__positions');department.positions.forEach(position=>positions.append(renderPosition(position)));card.append(positions);root.append(card);});
  }
  function renderCenters(){
    const root=document.querySelector('[data-workforce-centers]');root.textContent='';if(!state.data.organizations.length){root.append(el('p','hl-workforce__empty','لا توجد مراكز أو جهات مسجلة بعد.'));return;}
    const seats=state.data.departments.flatMap(department=>department.positions.flatMap(position=>position.seats.map(seat=>({...seat,position,department}))));state.data.organizations.forEach(org=>{const card=el('article','hl-workforce__center');const external=seats.filter(seat=>seat.scope==='EXTERNAL_CENTER'&&seat.organizationId===org.id);const head=el('div','hl-workforce__center-head');const label=el('div');label.append(el('strong','',org.displayName),el('small','',`${org.kind} · ${org.status}`));head.append(label,button(external.length?'استكمال/مراجعة الربط':'تهيئة 13 مقعدًا مقفلاً',()=>request(()=>api(`/centers/${org.id}/initialize`,{method:'POST'})),'hl-workforce__small'));card.append(head);if(external.length){const list=el('div','hl-workforce__external-list');external.forEach(seat=>{const row=el('div','hl-workforce__external-seat');const info=el('div','hl-workforce__external-info');info.append(el('strong','',seat.position.titleAr),el('small','',`إداريًا: مدير المركز · فنيًا: ${seat.technicalDepartment?.nameAr||seat.department.nameAr}`));row.append(info,renderSeat(seat));list.append(row);});card.append(list);}root.append(card);});
  }
  function render(){renderMetrics();renderDepartments();renderCenters();message('الهيكلة متصلة بالخادم. الموارد البشرية والمقاعد البشرية مقفلة افتراضيًا.');}
  async function load(){const panel=ensurePanel();if(!panel||state.loading)return;state.loading=true;message('جارٍ تحميل الهيكلة...');try{state.data=await api('/structure');render();}catch(error){message(error.message,true);}finally{state.loading=false;}}
  const show=()=>{const panel=ensurePanel();if(panel){panel.hidden=false;load();}};const hide=()=>{const panel=document.querySelector('.hl-workforce');if(panel)panel.hidden=true;};
  document.addEventListener('hydroland:role-changed',event=>event.detail?.role==='admin'?show():hide());document.addEventListener('hydroland:auth-changed',()=>{const panel=document.querySelector('.hl-workforce');if(panel&&!panel.hidden)load();});window.HydrolandWorkforce={reload:load};
})();
