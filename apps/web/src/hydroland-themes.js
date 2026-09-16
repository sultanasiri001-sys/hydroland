(()=>{
const STORAGE_KEY='hydroland-theme';
const SCHEDULE_KEY='hydroland-theme-schedule';
const BUILT_INS=[
 {id:'ocean-horizon',nameAr:'هيدرولاند الأساسي',nameEn:'Ocean Horizon',category:'core',symbol:'H',description:'الهوية البحرية الأساسية الفاخرة لهيدرولاند'},
 {id:'ramadan-nights',nameAr:'ليالي رمضان',nameEn:'Ramadan Nights',category:'seasonal',symbol:'☾',description:'ليل بحري هادئ بلمسات زمردية وذهبية'},
 {id:'eid-al-fitr',nameAr:'عيد الفطر',nameEn:'Eid Al-Fitr',category:'seasonal',symbol:'✦',description:'ثيم احتفالي راقٍ بلؤلؤ وذهب وتركواز'},
 {id:'hajj-season',nameAr:'موسم الحج',nameEn:'Hajj Season',category:'seasonal',symbol:'◆',description:'هوية هادئة ومحترمة مستوحاة من الكسوة والذهب'},
 {id:'founding-day',nameAr:'يوم التأسيس',nameEn:'Founding Day',category:'national',symbol:'1727',description:'درجات ترابية ونخيلية مستوحاة من الهوية السعودية'},
 {id:'national-day',nameAr:'اليوم الوطني',nameEn:'Saudi National Day',category:'national',symbol:'🇸🇦',description:'أخضر سعودي فاخر مع تفاصيل لؤلؤية'}
];
let themes=BUILT_INS.map(x=>({...x}));
const root=document.documentElement;
const apiBase=()=>window.HydrolandAuth?.apiBase||window.HYDROLAND_API_BASE||'https://hydroland.onrender.com/api/v1';
const getTheme=id=>themes.find(theme=>theme.id===id);
const safeColor=value=>/^#[0-9a-f]{6}$/i.test(String(value||''))?String(value):null;
const clearTokens=()=>['primary','secondary','accent','gold','bg','surface','text','muted'].forEach(k=>root.style.removeProperty(`--theme-${k}`));
const applyTokens=theme=>{clearTokens();const tokens=theme?.tokens||{};Object.entries(tokens).forEach(([key,value])=>{if(['primary','secondary','accent','gold','bg','surface','text','muted'].includes(key)&&safeColor(value))root.style.setProperty(`--theme-${key}`,value)})};
const apply=id=>{const theme=getTheme(id)||themes[0]||BUILT_INS[0];root.dataset.theme=theme.id;applyTokens(theme);localStorage.setItem(STORAGE_KEY,theme.id);document.dispatchEvent(new CustomEvent('hydroland:theme-changed',{detail:{...theme}}));return theme.id};
const localSchedules=()=>{try{const data=JSON.parse(localStorage.getItem(SCHEDULE_KEY)||'[]');return Array.isArray(data)?data:[]}catch{return []}};
const localActive=()=>localSchedules().find(item=>String(item.status).toUpperCase()==='PUBLISHED'&&new Date(item.startsAt)<=new Date()&&new Date(item.endsAt)>=new Date())?.themeId;
const syncCatalog=async()=>{try{const response=await fetch(`${apiBase()}/themes/catalog`,{headers:{Accept:'application/json'}});if(!response.ok)throw new Error('THEME_CATALOG_UNAVAILABLE');const data=await response.json();if(Array.isArray(data)&&data.length){const byId=new Map(BUILT_INS.map(x=>[x.id,{...x}]));data.forEach(x=>{if(x?.id)byId.set(String(x.id),{...byId.get(String(x.id)),...x})});themes=[...byId.values()];document.dispatchEvent(new CustomEvent('hydroland:theme-catalog-changed',{detail:{count:themes.length}}))}return themes}catch{return themes}};
const syncActive=async()=>{await syncCatalog();try{const response=await fetch(`${apiBase()}/themes/active`,{headers:{Accept:'application/json'}});if(!response.ok)throw new Error('THEME_API_UNAVAILABLE');const data=await response.json();return apply(data?.themeId||themes[0].id)}catch{return apply(localActive()||localStorage.getItem(STORAGE_KEY)||themes[0].id)}};
window.HydrolandThemes={list:()=>themes.map(theme=>({...theme,tokens:theme.tokens?{...theme.tokens}:undefined})),get:id=>{const theme=getTheme(id);return theme?{...theme,tokens:theme.tokens?{...theme.tokens}:undefined}:null},apply,reset:()=>apply(BUILT_INS[0].id),syncCatalog,scheduleEvent:event=>{if(!getTheme(event?.themeId)||!event?.startsAt||!event?.endsAt)throw new Error('Valid theme and dates required');const items=localSchedules();items.push({...event,status:event.status||'DRAFT'});localStorage.setItem(SCHEDULE_KEY,JSON.stringify(items));return items},scheduled:localSchedules,auto:()=>localActive()||BUILT_INS[0].id,syncActive};
apply(localStorage.getItem(STORAGE_KEY)||BUILT_INS[0].id);void syncActive();
})();