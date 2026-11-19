(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = (typeof window==='undefined'?globalThis:window).HydrolandI18n?.createScope("themes", {
  "الأفق البحري": "Ocean horizon",
  "تيار الشتاء": "Winter current",
  "شعاب الربيع": "Spring reef",
  "ساحل الصيف": "Summer coast",
  "عمق الخريف": "Autumn depth",
  "يوم التأسيس": "Founding Day",
  "اليوم الوطني": "National Day",
  "عيد الفطر": "Eid al-Fitr",
  "عيد الأضحى": "Eid al-Adha",
  "فعالية بحرية": "Marine event",
  "أساسي": "Core",
  "موسمي": "Seasonal",
  "وطني": "National",
  "أعياد": "Holidays",
  "فعاليات": "Events"
}) || {t:value=>value,message(text,values=[]){return this.format(text,values)},messageHTML(value){return String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},setMessage:(node,value)=>(node.textContent=value??''),attribute(name,text,values=[]){return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'},label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

const k='hydroland-theme',s='hydroland-theme-schedule',T=[['ocean-horizon','الأفق البحري','core'],['winter-current','تيار الشتاء','seasonal'],['spring-reef','شعاب الربيع','seasonal'],['summer-coast','ساحل الصيف','seasonal'],['autumn-depth','عمق الخريف','seasonal'],['founding-day','يوم التأسيس','national'],['national-day','اليوم الوطني','national'],['eid-al-fitr','عيد الفطر','holiday'],['eid-al-adha','عيد الأضحى','holiday'],['marine-event','فعالية بحرية','event']];const builtInNames=new Map(T.map(([id,name])=>[id,name])),categoryLabels={core:'أساسي',seasonal:'موسمي',national:'وطني',holiday:'أعياد',event:'فعاليات'};const r=document.documentElement,has=id=>T.some(x=>x[0]===id),apply=id=>{id=has(id)?id:'ocean-horizon';r.dataset.theme=id;localStorage.setItem(k,id);document.dispatchEvent(new CustomEvent('hydroland:theme-changed',{detail:{id}}));return id},localSchedules=()=>JSON.parse(localStorage.getItem(s)||'[]'),localActive=()=>localSchedules().find(x=>x.status==='published'&&new Date(x.startsAt)<=new Date()&&new Date(x.endsAt)>=new Date())?.themeId,defaultApiBase=/^(localhost|127\\.0\\.0\\.1)$/.test(window.location.hostname)?'http://localhost:3001/api/v1':'https://hydroland.onrender.com/api/v1',apiBase=(window.HYDROLAND_API_BASE||defaultApiBase).replace(/\/$/,''),syncActive=async()=>{try{const response=await fetch(apiBase+'/themes/active',{headers:{Accept:'application/json'}});if(!response.ok)throw Error('theme api unavailable');const data=await response.json();return apply(data.themeId||'ocean-horizon')}catch{return apply(localActive()||localStorage.getItem(k)||'ocean-horizon')}};window.HydrolandThemes={displayName:theme=>builtInNames.get(theme?.id)===theme?.nameAr?uiLocale.message(theme.nameAr):String(theme?.nameAr||theme?.id||''),displayCategory:value=>Object.hasOwn(categoryLabels,value)?uiLocale.message(categoryLabels[value]):String(value||''),list:()=>T.map(([id,nameAr,category])=>({id,nameAr,category})),apply,register:t=>{if(t?.id&&t?.nameAr&&!has(t.id))T.push([t.id,t.nameAr,t.category||'event'])},scheduleEvent:e=>{if(!has(e?.themeId)||!e.startsAt||!e.endsAt)throw Error('Valid theme and dates required');const a=localSchedules();a.push({...e,status:e.status||'draft'});localStorage.setItem(s,JSON.stringify(a));return a},scheduled:localSchedules,auto:()=>localActive()||'ocean-horizon',syncActive};apply(localStorage.getItem(k)||'ocean-horizon');void syncActive();})();
