(()=>{
const STORAGE_KEY='hydroland-theme';
const SCHEDULE_KEY='hydroland-theme-schedule';
const THEMES=[
 {id:'ocean-horizon',nameAr:'هيدرولاند الأساسي',nameEn:'Ocean Horizon',category:'core',symbol:'H',description:'الهوية البحرية الأساسية الفاخرة لهيدرولاند'},
 {id:'ramadan-nights',nameAr:'ليالي رمضان',nameEn:'Ramadan Nights',category:'seasonal',symbol:'☾',description:'ليل بحري هادئ بلمسات زمردية وذهبية'},
 {id:'eid-al-fitr',nameAr:'عيد الفطر',nameEn:'Eid Al-Fitr',category:'seasonal',symbol:'✦',description:'ثيم احتفالي راقٍ بلؤلؤ وذهب وتركواز'},
 {id:'hajj-season',nameAr:'موسم الحج',nameEn:'Hajj Season',category:'seasonal',symbol:'◆',description:'هوية هادئة ومحترمة مستوحاة من الكسوة والذهب'},
 {id:'founding-day',nameAr:'يوم التأسيس',nameEn:'Founding Day',category:'national',symbol:'1727',description:'درجات ترابية ونخيلية مستوحاة من الهوية السعودية'},
 {id:'national-day',nameAr:'اليوم الوطني',nameEn:'Saudi National Day',category:'national',symbol:'🇸🇦',description:'أخضر سعودي فاخر مع تفاصيل لؤلؤية'}
];
const root=document.documentElement;
const getTheme=id=>THEMES.find(theme=>theme.id===id);
const apply=id=>{const theme=getTheme(id)||THEMES[0];root.dataset.theme=theme.id;localStorage.setItem(STORAGE_KEY,theme.id);document.dispatchEvent(new CustomEvent('hydroland:theme-changed',{detail:{...theme}}));return theme.id};
const localSchedules=()=>{try{const data=JSON.parse(localStorage.getItem(SCHEDULE_KEY)||'[]');return Array.isArray(data)?data:[]}catch{return []}};
const localActive=()=>localSchedules().find(item=>String(item.status).toUpperCase()==='PUBLISHED'&&new Date(item.startsAt)<=new Date()&&new Date(item.endsAt)>=new Date())?.themeId;
const apiBase=()=>window.HydrolandAuth?.apiBase||window.HYDROLAND_API_BASE||'https://hydroland.onrender.com/api/v1';
const syncActive=async()=>{try{const response=await fetch(`${apiBase()}/themes/active`,{headers:{Accept:'application/json'}});if(!response.ok)throw new Error('THEME_API_UNAVAILABLE');const data=await response.json();return apply(data?.themeId||THEMES[0].id)}catch{return apply(localActive()||localStorage.getItem(STORAGE_KEY)||THEMES[0].id)}};
window.HydrolandThemes={
 list:()=>THEMES.map(theme=>({...theme})),
 get:id=>({...getTheme(id)}),
 apply,
 reset:()=>apply(THEMES[0].id),
 scheduleEvent:event=>{if(!getTheme(event?.themeId)||!event?.startsAt||!event?.endsAt)throw new Error('Valid theme and dates required');const items=localSchedules();items.push({...event,status:event.status||'DRAFT'});localStorage.setItem(SCHEDULE_KEY,JSON.stringify(items));return items},
 scheduled:localSchedules,
 auto:()=>localActive()||THEMES[0].id,
 syncActive
};
apply(localStorage.getItem(STORAGE_KEY)||THEMES[0].id);void syncActive();
})();