(()=>{
  const text={'أسئلة وتقييمات المنتج':'Product questions and reviews','عرض الأسئلة والتقييمات':'View questions and reviews','التقييم':'Rating','السؤال':'Question','سؤال عن المنتج':'Product question','تقييم بعد الاستلام':'Review after delivery','أرسل للمراجعة':'Submit for review','تعذر تحميل المشاركات.':'Could not load feedback.','قيد المراجعة':'Under review','منشور':'Published','مشاركاتي':'My submissions','تعديل':'Edit','أرسل':'Submit','الرد':'Reply','إدارة الأسئلة والتقييمات':'Manage product questions and reviews','مراجعة المشاركات':'Review submissions','نشر':'Publish','إخفاء':'Hide','حُفظ التعديل.':'Changes saved.','لا توجد مشاركات.':'No submissions.','سجّل الدخول للمشاركة.':'Sign in to contribute.','تعذر حفظ المشاركة.':'Could not save submission.','نص المشاركة':'Your message','حفظ الرد':'Save reply'};
  const loc=window.HydrolandI18n?.createScope('product-feedback',text),t=s=>loc?.t(s)??s;
  const node=(tag,value)=>{const el=document.createElement(tag);if(value!==undefined)el.textContent=value;return el};
  const btn=(label,action)=>{const b=node('button',t(label));b.type='button';b.onclick=action;return b};
  const field=(caption,control)=>{const l=node('label',t(caption));l.append(control);return l};
  const auth=()=>window.HydrolandAuth;
  async function get(path,options,publicly=false){
    const res=publicly?await fetch((auth()?.apiBase || 'https://hydroland.onrender.com/api/v1')+path):await auth().authorizedFetch(path,options);
    const body=await res.json();if(!res.ok)throw Error(Array.isArray(body?.message)?body.message.join('، '):body?.message || t('تعذر حفظ المشاركة.'));return body;
  }
  function entry(row){
    const a=node('article');a.append(node('b',row.kind==='QUESTION'?t('السؤال'):t('التقييم')+' '+row.rating+'/5'),node('p',row.body));
    if(row.reply)a.append(node('p',t('الرد')+' · '+row.reply));return a;
  }
  function section(target,title){
    const d=node('details');d.className='hl-product-feedback';d.append(node('summary',t(title)));const area=node('div');d.append(area);target.append(d);return {d,area};
  }
  function publicView(target,id){
    const {d,area}=section(target,'أسئلة وتقييمات المنتج');const path='/store/products/'+encodeURIComponent(id)+'/feedback';
    let generation=0;
    async function show(){
      const gen=++generation,token=auth()?.getSessionVersion?.(),signed=Boolean(auth()?.isAuthenticated?.());
      const current=()=>gen===generation&&target.isConnected&&d.open&&token===auth()?.getSessionVersion?.();
      area.replaceChildren();
      try{
        const [rows,mine]=await Promise.all([get(path,{},true),signed?get(path+'/mine'):Promise.resolve([])]);
        if(!current())return;
        if(!rows.length)area.append(node('p',t('لا توجد مشاركات.')));rows.forEach(r=>area.append(entry(r)));
        if(!signed){area.append(btn('سجّل الدخول للمشاركة.',()=>document.getElementById('visitor-auth-cta')?.click()));return}
        const draft=node('form'),kind=node('select'),rating=node('select'),body=node('textarea'),status=node('p');
        kind.add(new Option(t('سؤال عن المنتج'),'QUESTION'));kind.add(new Option(t('تقييم بعد الاستلام'),'REVIEW'));
        for(let i=1;i<=5;i++)rating.add(new Option(String(i),String(i)));rating.value='5';
        const ratingLabel=field('التقييم',rating);ratingLabel.hidden=true;kind.onchange=()=>ratingLabel.hidden=kind.value!=='REVIEW';
        body.maxLength=1800;body.required=true;status.setAttribute('role','status');const save=node('button',t('أرسل للمراجعة'));save.type='submit';
        let requestId=crypto.randomUUID(),revision;
        if(mine.length){
          area.append(node('h4',t('مشاركاتي')));
          mine.forEach(row=>{const card=entry(row);card.append(node('small',t(row.published?'منشور':'قيد المراجعة')),btn('تعديل',()=>{
            requestId=row.id;revision=row.revision;kind.value=row.kind;kind.disabled=true;kind.onchange();rating.value=String(row.rating??5);body.value=row.body;body.focus();
          }));area.append(card)});
        }
        draft.append(kind,ratingLabel,field('نص المشاركة',body),save,status);area.append(draft);
        draft.onsubmit=async e=>{e.preventDefault();if(!current()||save.disabled)return;save.disabled=true;try{
          await get(path,{method:'POST',body:JSON.stringify({id:requestId,kind:kind.value,body:body.value,rating:kind.value==='REVIEW'?Number(rating.value):null,revision})});
          if(current())await show();
        }catch(err){if(current())status.textContent=err.message}finally{save.disabled=false}};
      }catch{if(current())area.replaceChildren(node('p',t('تعذر تحميل المشاركات.')),btn('عرض الأسئلة والتقييمات',show))}
    }
    d.ontoggle=()=>{if(d.open)void show();else{generation++;area.replaceChildren()}};
  }
  function moderation(target,scope){
    if(target.querySelector('[data-store-feedback-queue]'))return;
    const {d,area}=section(target,'إدارة الأسئلة والتقييمات');d.dataset.storeFeedbackQueue='';
    let seq=0;
    async function load(){
      const gen=++seq,token=auth()?.getSessionVersion?.();const live=()=>gen===seq && d.isConnected && d.open && token===auth()?.getSessionVersion?.()&&!d.closest('[hidden]');
      area.replaceChildren();const path='/store/'+scope+'/feedback';
      try{
        const rows=await get(path);if(!live())return;
        if(!rows.length)area.append(node('p',t('لا توجد مشاركات.')));
        for(const row of rows){
          const card=entry(row),reply=node('textarea'),status=node('p');reply.maxLength=1800;reply.value=row.reply??'';
          card.prepend(node('h4',row.product.nameAr+' · '+row.product.sku));card.append(field('الرد',reply));
          const change=async published=>{
            if(!live())return;const buttons=[...card.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
            try{await get(path+'/'+encodeURIComponent(row.id),{method:'PATCH',body:JSON.stringify({revision:row.revision,published,reply:reply.value})});if(live())await load()}
            catch(err){if(live())status.textContent=err.message}finally{buttons.forEach(b=>b.disabled=false)}
          };
          status.setAttribute('role','status');card.append(btn(row.published?'حفظ الرد':'نشر',()=>change(true)));
          if(row.published)card.append(btn('إخفاء',()=>change(false)));card.append(status);area.append(card);
        }
      }catch{if(live())area.replaceChildren(node('p',t('تعذر تحميل المشاركات.')),btn('مراجعة المشاركات',load))}
    }
    d.ontoggle=()=>{if(d.open)void load();else{seq++;area.replaceChildren()}};
  }
  document.addEventListener('hydroland:session-cleared',()=>document.querySelectorAll('.hl-product-feedback').forEach(panel=>{panel.open=false;panel.querySelector('div')?.replaceChildren()}));
  window.HydrolandProductFeedback={publicView,moderation};
})();
