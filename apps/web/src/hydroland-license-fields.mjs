// Extract only explicitly labelled, unambiguous Gregorian values. User confirmation is required.
const digits=value=>value.replace(/[٠-٩۰-۹]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.includes(c)?'٠١٢٣٤٥٦٧٨٩'.indexOf(c):'۰۱۲۳۴۵۶۷۸۹'.indexOf(c)));
function date(value){
  if(/[هـ]|هجري|hijri/i.test(value))return '';
  let m=value.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if(!m){const d=value.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/);if(d&&+d[1]>12&&+d[2]<=12)m=[d[0],d[3],d[2],d[1]]}
  if(!m||+m[1]<1900||+m[1]>2200)return '';
  const iso=`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`,parsed=new Date(iso+'T00:00:00Z');
  return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===iso?iso:'';
}
export function extractFields(text){
  const lines=digits(String(text)).split(/[\r\n]+/).map(x=>x.trim()).filter(Boolean),result={};
  const pick=(key,regex,transform)=>{
    const values=lines.flatMap(line=>{const match=line.match(regex);if(!match)return [];const value=transform(match[1]);return value?[value]:[]});
    if(new Set(values).size===1)result[key]=values[0];
  };
  pick('issuedAt',/(?:تاريخ\s*(?:الإصدار|الاصدار)|issue\s*date|issued\s*(?:on|at)?)\s*[:：-]?\s*(.+)$/i,date);
  pick('expiresAt',/(?:تاريخ\s*(?:الانتهاء|إنتهاء|انتهاء)|expiry\s*date|expiration\s*date|valid\s*until|expires\s*(?:on|at)?)\s*[:：-]?\s*(.+)$/i,date);
  pick('referenceNumber',/(?:رقم\s*(?:الرخصة|الترخيص|التصريح|الشهادة)|licen[cs]e\s*(?:number|no\.?|#))\s*[:：-]?\s*(.+)$/i,value=>/^[\p{L}\p{N}/_-]{1,120}$/u.test(value.trim())?value.trim():'');
  pick('subject',/(?:اسم\s*(?:الرخصة|الترخيص)|license\s*title)\s*[:：-]?\s*(.+)$/i,value=>value.trim().slice(0,240));
  return result;
}
