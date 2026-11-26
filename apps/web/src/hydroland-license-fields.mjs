// Extract only explicitly labelled, unambiguous Gregorian values. User confirmation is required.
const digits=value=>value.replace(/[٠-٩۰-۹]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.includes(c)?'٠١٢٣٤٥٦٧٨٩'.indexOf(c):'۰۱۲۳۴۵۶۷۸۹'.indexOf(c)));
function date(value){
  if(/[هـ]|هجري|hijri/i.test(value))return '';
  const candidates=value.match(/\b(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})\b/g)||[];
  const dates=candidates.map(candidate=>{
    let m=candidate.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if(!m){const d=candidate.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);if(d&&+d[1]>12&&+d[2]<=12)m=[d[0],d[3],d[2],d[1]]}
    if(!m||+m[1]<1900||+m[1]>2200)return '';
    const iso=`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`,parsed=new Date(iso+'T00:00:00Z');
    return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===iso?iso:'';
  });
  // A valid first candidate must not hide a conflicting or unreadable alternative.
  return dates.length&&dates.every(Boolean)&&new Set(dates).size===1?dates[0]:'';
}
// This threshold controls suggestions. Every field remains available for manual entry.
const minimumWordConfidence = 80;
export function uncertainOcrLines(data) {
  const confident = new Set();
  const uncertain = new Set();
  for (const block of data.blocks || []) {
    for (const paragraph of block.paragraphs || []) {
      for (const line of paragraph.lines || []) {
        const text = String(line.text || '').trim();
        const words = line.words || [];
        const reliable = words.length > 0 && words.every(word =>
          Number.isFinite(word.confidence) && word.confidence >= minimumWordConfidence);
        (reliable ? confident : uncertain).add(text);
      }
    }
  }
  return String(data.text || '').split(/[\r\n]+/).map(line => line.trim())
    .filter(line => line && (!confident.has(line) || uncertain.has(line)));
}
export function extractFields(text, uncertainLines = []){
  const lines=digits(String(text)).split(/[\r\n]+/).map(x=>x.trim()).filter(Boolean),result={};
  const pick=(key,regex,transform)=>{
    if (uncertainLines.some(line => regex.test(line))) return;
    const values=lines.flatMap(line=>{const match=line.match(regex);return match?[transform(match[1])]:[]});
    if(values.length&&values.every(Boolean)&&new Set(values).size===1)result[key]=values[0];
  };
  pick('issuedAt',/(?:تاريخ\s*(?:الإصدار|الاصدار)|issue\s*date|issued\s*(?:on|at)?)\s*[:：-]?\s*(.+)$/i,date);
  pick('expiresAt',/(?:تاريخ\s*(?:الانتهاء|إنتهاء|انتهاء)|expiry\s*date|expiration\s*date|valid\s*until|expires\s*(?:on|at)?)\s*[:：-]?\s*(.+)$/i,date);
  pick('referenceNumber',/(?:رقم\s*(?:الرخصة|الترخيص|التصريح|الشهادة)|licen[cs]e\s*(?:number|no\.?|#))\s*[:：-]?\s*(.+)$/i,value=>/^[\p{L}\p{N}/_-]{1,120}$/u.test(value.trim())?value.trim():'');
  pick('subject',/(?:اسم\s*(?:الرخصة|الترخيص)|license\s*title)\s*[:：-]?\s*(.+)$/i,value=>value.trim().slice(0,240));
  return result;
}
