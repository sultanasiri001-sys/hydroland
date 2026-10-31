// Explicit brief limits only; never derive a format rule from quoted evidence.
export function requestedWordLimit(prompt:string):number|null {
  const normalized=prompt.replace(/[٠-٩]/g,char=>String(char.charCodeAt(0)-0x660));
  const match=normalized.match(/(?:لا تتجاوز|بحد أقصى|at most|no more than)\s*(\d{1,3})\s*(?:كلمة|كلمات|words?)/i);
  const limit=match?Number(match[1]):0;
  return limit>=20&&limit<=500?limit:null;
}
export function responseWordCount(text:string):number {
  const body=text.replace(/^[ \t]*(?:[0-9٠-٩]+[.)]|[-•])\s*/gm,'').trim();
  return body?body.split(/\s+/).length:0;
}

export function reportScopeNotice(prompt:string):string|null {
  const scope=prompt.slice(0,300);
  return /عينة\s+(?:بيانات\s+)?اختبار(?:ية)?|بيانات\s+اختبار(?:ية)?|synthetic (?:data|fixture)/i.test(scope)
    ?'عينة اختبار، لا تمثل واقع المنصة.':null;
}
