import { BadRequestException } from '@nestjs/common';

export interface AdministrativeTemplateField {key:string;labelAr:string;labelEn:string;type:string;required:boolean;options?:string[]}
const types=new Set(['TEXT','TEXTAREA','LONG_TEXT','NUMBER','DATE','BOOLEAN','SELECT','SIGNATURE','TABLE']);
const prohibited=new Set(['__proto__','prototype','constructor']);
export function templateText(value:unknown,label:string):string {
 if(typeof value!=='string'||!value.trim()||value.length>200||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value))throw new BadRequestException(`${label}: nonempty text up to 200 characters is required.`);
 return value.trim();
}
export function templateFields(value:unknown):AdministrativeTemplateField[] {
 if(!Array.isArray(value)||value.length<1||value.length>100)throw new BadRequestException('Between 1 and 100 template fields are required.');
 const keys=new Set<string>();
 return value.map(f=>{
  if(!f||typeof f!=='object'||Array.isArray(f)||typeof f.key!=='string'||!/^[A-Za-z][A-Za-z0-9_.-]{0,127}$/.test(f.key)||prohibited.has(f.key)||keys.has(f.key)||!types.has(f.type)||typeof f.required!=='boolean')throw new BadRequestException('Invalid or duplicate template field.');
  keys.add(f.key);
  let options:string[]|undefined;
  if(f.options!==undefined){
   if(!Array.isArray(f.options)||f.options.length>100)throw new BadRequestException('Invalid field options.');
   const validated:string[]=f.options.map((v:unknown)=>templateText(v,'Option'));
   options=validated;
   if(new Set(validated).size!==validated.length)throw new BadRequestException('Duplicate field options.');
  }
  if(f.type==='SELECT'&&!options?.length)throw new BadRequestException('SELECT fields require options.');
  return {key:f.key,labelAr:templateText(f.labelAr,'Arabic field title'),labelEn:templateText(f.labelEn,'English field title'),type:f.type,required:f.required,...(options===undefined?{}:{options})};
 });
}
// Operational bindings are not implicitly migrated by a template edit.
export function assertCompatibleTemplateFields(before:unknown,after:AdministrativeTemplateField[]):void {
 const old=templateFields(before),map=new Map(old.map(f=>[f.key,f]));
 if(old.length!==after.length||after.some(f=>{const p=map.get(f.key);return !p||p.type!==f.type||JSON.stringify(p.options||[])!==JSON.stringify(f.options||[]);}))throw new BadRequestException('Field keys, types and options require an explicit reviewed binding migration.');
}

export function templateObject(value:unknown,allowed:readonly string[]):Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!allowed.includes(key)))throw new BadRequestException('Unsupported template properties.');
 const result=value as Record<string,unknown>;
 if(result.printable!==undefined&&typeof result.printable!=='boolean')throw new BadRequestException('Printable must be a boolean.');
 return result;
}
