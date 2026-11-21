(() => {
  const ui=window.HydrolandI18n?.createScope('merchant-storefronts',{
    'صفحة متجر المركز':'Center storefront','صفحات المراكز':'Center storefronts','كل عروض هيدرولاند':'All HYDROLAND offers',
    'نبذة عن متجر المركز':'About the center store','ساعات العمل':'Opening hours','الأسئلة الشائعة':'Frequently asked questions',
    'السؤال':'Question','الإجابة':'Answer','إضافة سؤال':'Add a question','حذف السؤال':'Remove question','حفظ الصفحة':'Save page',
    'نشر صفحة المركز':'Publish center storefront','فتح صفحة المتجر':'Open storefront','تعذر تحميل الصفحة':'Could not load this page',
    'تم حفظ صفحة المتجر':'Storefront saved','عرض مراكز أخرى':'Show more centers','بحث عن متجر مركز':'Search center stores',
    'الرابط المباشر للمتجر':'Storefront link','تحميل الصفحة':'Load page','بحث':'Search',
  });
  const t=key=>ui?.t(key)??key;
  function el(tag,text){
    const node=document.createElement(tag);
    if(text!==undefined)node.textContent=text;
    return node;
  }
  const button=text=>{const node=el('button',t(text));node.type='button';return node};
  const href=id=>'#store/center/'+encodeURIComponent(id);
  const route=()=>{const match=/^#store\/center\/([^/]+)$/.exec(location.hash);
    if(!match)return '';try{return decodeURIComponent(match[1])}catch{return ''}};
  async function publicRead(path){
    const base=window.HydrolandAuth?.apiBase||'https://hydroland.onrender.com/api/v1';
    const response=await fetch(base+path);if(!response.ok)throw Error(t('تعذر تحميل الصفحة'));return response.json();
  }
  let selected='',published=false,onRoute=()=>{};
  const allows=id=>!selected||(published&&id===selected);
  function catalog(store,redraw){
    const host=el('div');store.querySelector('.section-heading')?.after(host);
    let sequence=0,last=null;
    async function render(force=false){
      const id=route();if(last===id && !force)return;
      last=id;selected=id;published=false;const current=++sequence;host.replaceChildren();redraw();
      if(id){
        const back=el('a',t('كل عروض هيدرولاند'));back.href='#store';host.append(back);
        try{
          const data=await publicRead('/store/storefronts/'+encodeURIComponent(id));
          if(current!==sequence)return;
          const name=el('h2',data.displayName);host.append(name);
          if(data.description)host.append(el('p',data.description));
          if(data.hours)host.append(el('h3',t('ساعات العمل')),el('p',data.hours));
          if(data.faqs?.length){
            host.append(el('h3',t('الأسئلة الشائعة')));
            for(const faq of data.faqs){const item=el('details');item.append(el('summary',faq.question),el('p',faq.answer));host.append(item)}
          }
          published=true;redraw();document.title=data.displayName+' | HYDROLAND';
        }catch{if(current===sequence)host.append(el('p',t('تعذر تحميل الصفحة')))}
        return;
      }
      const directory=el('details');directory.append(el('summary',t('صفحات المراكز')));
      const form=el('form'),label=el('label',t('بحث عن متجر مركز')),input=el('input');input.type='search';label.append(input);
      const search=button('بحث');search.type='submit';form.append(label,search);
      const results=el('ul'),more=button('عرض مراكز أخرى'),message=el('p');message.setAttribute('role','status');
      more.hidden=true;directory.append(form,results,more,message);host.append(directory);
      let queryVersion=0,after='',loaded=false;
      async function load(next=false){
        const version=++queryVersion;
        if(!next){results.replaceChildren();after=''}more.disabled=true;message.textContent='';
        try{
          const params=new URLSearchParams({q:input.value.trim(),after});
          const rows=await publicRead('/store/storefronts?'+params);
          if(current!==sequence||version!==queryVersion)return;
          for(const row of rows){const link=el('a',row.displayName),li=el('li');link.href=href(row.id);li.append(link);results.append(li)}
          after=rows.at(-1)?.id||'';more.hidden=rows.length<50;loaded=true;
        }catch{if(current===sequence&&version===queryVersion)message.textContent=t('تعذر تحميل الصفحة')}
        finally{if(version===queryVersion)more.disabled=false}
      }
      directory.ontoggle=()=>{if(directory.open&&!loaded)void load()};
      form.onsubmit=e=>{e.preventDefault();void load()};more.onclick=()=>load(true);
    }
    window.addEventListener('hashchange',()=>render());
    onRoute=()=>render();
    void render();
  }
  function editor(panel,request,active){
    const host=el('details'),summary=el('summary',t('صفحة متجر المركز')),body=el('div');
    host.dataset.centerStorefront='';host.append(summary,body);panel.append(host);let loaded=false,busy=false;
    function field(parent,label,value,multi,max){
      const wrap=el('label',t(label)),input=el(multi?'textarea':'input');input.value=value||'';input.maxLength=max;
      wrap.append(input);parent.append(wrap);return input;
    }
    async function load(){
      if(busy)return;busy=true;
      try{
        const data=await request('/store/provider/storefront');if(!active()||!host.isConnected)return;
        if(!data?.profile||!data?.organization)throw Error(t('تعذر تحميل الصفحة'));
        const form=el('form'),profile=data.profile;
        const description=field(form,'نبذة عن متجر المركز',profile.description,true,1800);
        const hours=field(form,'ساعات العمل',profile.hours,false,300);
        const faqs=el('fieldset');faqs.append(el('legend',t('الأسئلة الشائعة')));form.append(faqs);
        const add=button('إضافة سؤال');
        const count=()=>faqs.querySelectorAll('[data-question]').length;
        function question(item={}){
          if(count()>=10)return;
          const row=el('div');row.dataset.question='';
          field(row,'السؤال',item.question,false,180).required=true;
          field(row,'الإجابة',item.answer,true,900).required=true;
          const remove=button('حذف السؤال');remove.onclick=()=>{row.remove();add.disabled=false};row.append(remove);faqs.append(row);add.disabled=count()>=10;
        }
        for(const item of profile.faqs)question(item);add.onclick=()=>question();form.append(add);
        const visible=el('label',t('نشر صفحة المركز')),choice=el('input');choice.type='checkbox';choice.checked=profile.published;visible.prepend(choice);
        const save=button('حفظ الصفحة');save.type='submit';
        const link=el('a',t('فتح صفحة المتجر'));link.href=href(data.organization.id);link.hidden=!profile.published;
        const status=el('p');status.setAttribute('role','status');form.append(visible,save,link,status);
        let revision=data.revision;
        form.onsubmit=async event=>{
          event.preventDefault();if(save.disabled||!active())return;save.disabled=true;
          const next={revision,description:description.value,hours:hours.value,published:choice.checked,
            faqs:[...faqs.querySelectorAll('[data-question]')].map(row=>({question:row.querySelector('input').value,answer:row.querySelector('textarea').value}))};
          try{
            const saved=await request('/store/provider/storefront',{method:'PUT',body:JSON.stringify(next)});
            if(active()&&host.isConnected){revision=saved.revision;link.hidden=!saved.profile.published;status.textContent=t('تم حفظ صفحة المتجر')}
          }catch(error){if(active())status.textContent=error.message}
          finally{save.disabled=false}
        };
        body.replaceChildren(form);loaded=true;
      }catch(error){
        if(!active())return;const retry=button('تحميل الصفحة');retry.onclick=load;body.replaceChildren(el('p',error.message),retry);
      }finally{busy=false}
    }
    host.ontoggle=()=>{if(host.open&&!loaded)void load()};
  }
  window.HydrolandStorefronts=Object.freeze({catalog,editor,allows,syncRoute:()=>onRoute()});
})();
