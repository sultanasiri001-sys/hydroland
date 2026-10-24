import { PDFDocument, PDFPage, PDFFont, rgb } from 'pdf-lib';
import * as fontkitNamespace from '@pdf-lib/fontkit';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { DocumentPrintContract } from './document-print.service';
import type { DocumentAssetService } from './document-asset.service';
import { assertArabicPdfSourceText, pdfVisualText, preferredLocalizedText } from './document-pdf-arabic.contract';

export interface AdministrativePdfLayoutItem {
  kind:'text'|'field'|'image'; page:number; x:number; y:number; width:number; height:number; text?:string;
}

// Versioned composition: only documents whose server-side CREATE event pins
// ADMINISTRATIVE_FORM_V1 use this renderer. Legacy documents and contracts keep
// their original renderers. A future identity redesign must use a new profile.
export async function renderAdministrativeDocumentPdf(
  c:DocumentPrintContract,
  assets:DocumentAssetService,
  observe?:(item:AdministrativePdfLayoutItem)=>void,
){
  if(c.renderProfile!=='ADMINISTRATIVE_FORM_V1'||c.cooperation)throw new Error('Administrative PDF profile mismatch.');
  const pdf=await PDFDocument.create();
  const kit=(fontkitNamespace as any).default??fontkitNamespace;
  // Match the existing contract renderer: pdfVisualText has already resolved
  // visual ordering, so fontkit must not apply a second RTL ordering pass.
  pdf.registerFontkit({create:(bytes:Uint8Array)=>{
    const face=kit.create(bytes),layout=face.layout.bind(face);
    face.layout=(text:string,features:unknown,script:unknown,language:unknown)=>layout(text,features,script,language,'ltr');
    return face;
  }});
  const root=resolve(__dirname,'../../src/document-forms');
  const [regular,bold]=await Promise.all(['Regular','Bold'].map(async weight=>
    pdf.embedFont(await readFile(resolve(root,'fonts',`Amiri-Contract-${weight}.ttf`)),{subset:false})
  ));
  const primary=await pdf.embedPng(await readFile(resolve(root,'identity/hydroland-mark-v1.png')));
  let secondary:Awaited<ReturnType<PDFDocument['embedPng']>>|undefined;
  if(c.branding.logoAssetId){
    // Resolve only the authorized, pinned organization asset. Never fetch logoUrl.
    const {asset,bytes}=await assets.bytesForLogo(c.organizationId,c.branding.logoAssetId);
    if(!['image/png','image/jpeg'].includes(asset.mimeType))throw new Error('Unsupported pinned logo format.');
    secondary=asset.mimeType==='image/png'?await pdf.embedPng(bytes):await pdf.embedJpg(bytes);
  }
  pdf.setTitle(preferredLocalizedText(c.template.titleAr,c.template.titleEn,'مستند إداري'));
  pdf.setAuthor('HYDROLAND');
  pdf.setSubject('Versioned administrative document; status and evidence come from the authorized snapshot.');
  pdf.setCreationDate(new Date(c.createdAt));pdf.setModificationDate(new Date(c.updatedAt));
  const W=595.28,H=841.89,M=42,CW=W-2*M,BOTTOM=82;
  const color={navy:rgb(.035,.12,.20),cyan:rgb(.015,.65,.91),ink:rgb(.12,.16,.20),muted:rgb(.39,.44,.48),line:rgb(.71,.86,.94),pale:rgb(.96,.98,.99),white:rgb(1,1,1)};
  const status=({DRAFT:'مسودة — غير معتمدة',PENDING_APPROVAL:'بانتظار الاعتماد',APPROVED:'معتمد — لم يوقّع بعد',SIGNED:'موقّع',ARCHIVED:'مؤرشف'} as Record<string,string>)[c.status]||c.status;
  let page!:PDFPage,y=0,pageNo=0;
  const visual=(raw:unknown)=>pdfVisualText(assertArabicPdfSourceText(raw));
  const width=(raw:string,size:number,font:PDFFont)=>font.widthOfTextAtSize(visual(raw),size);
  const text=(raw:string,right:number,baseline:number,size=11,isBold=false,tone=color.ink)=>{
    const font=isBold?bold:regular,value=visual(raw),w=font.widthOfTextAtSize(value,size),x=right-w;
    page.drawText(value,{x,y:baseline,size,font,color:tone});
    observe?.({kind:'text',page:pageNo,x,y:baseline,width:w,height:size,text:raw});
  };
  const wrap=(raw:unknown,size:number,isBold:boolean,maxWidth:number):string[]=>{
    const source=assertArabicPdfSourceText(raw),font=isBold?bold:regular,result:string[]=[];
    for(const paragraph of source.replace(/\r\n?/g,'\n').split('\n')){
      if(!paragraph.trim()){result.push('');continue;}
      let line='';
      for(const word of paragraph.split(/\s+/u).filter(Boolean)){
        const chunks:string[]=[];let chunk='';
        for(const char of word){
          if(chunk&&width(chunk+char,size,font)>maxWidth){chunks.push(chunk);chunk=char;}else chunk+=char;
        }
        if(chunk)chunks.push(chunk);
        for(const part of chunks){
          const next=line?line+' '+part:part;
          if(line&&width(next,size,font)>maxWidth){result.push(line);line=part;}else line=next;
        }
      }
      if(line)result.push(line);
    }
    return result.length?result:['—'];
  };
  const valueText=(value:unknown):string=>{
    if(value===null||value===undefined||value==='')return '—';
    if(value instanceof Date)return value.toISOString();
    if(typeof value==='boolean')return value?'نعم':'لا';
    if(typeof value==='object')return JSON.stringify(value,null,2);
    return String(value);
  };
  function nextPage(){
    page=pdf.addPage([W,H]);pageNo++;
    page.drawRectangle({x:24,y:24,width:W-48,height:H-48,borderWidth:.65,borderColor:color.cyan});
    page.drawRectangle({x:24,y:H-108,width:W-48,height:84,color:color.navy});
    const p=primary.scale(Math.min(53/primary.width,53/primary.height));
    page.drawImage(primary,{x:W-236,y:H-89,width:p.width,height:p.height});
    observe?.({kind:'image',page:pageNo,x:W-236,y:H-89,width:p.width,height:p.height});
    text('HYDROLAND',W-40,H-55,22,true,color.white);
    text('هيدرولاند',W-40,H-80,16,true,color.cyan);
    text('النماذج الإدارية',M+190,H-61,18,true,color.white);
    text('ADMINISTRATIVE FORMS',M+190,H-82,8,false,color.white);
    if(secondary){
      const s=secondary.scale(Math.min(56/secondary.width,42/secondary.height));
      page.drawImage(secondary,{x:M,y:H-159,width:s.width,height:s.height});
      observe?.({kind:'image',page:pageNo,x:M,y:H-159,width:s.width,height:s.height});
    }
    text(status,W-M,H-133,11,true,color.muted);
    text('الحالة من سجل المستند — الهوية لا تعني الاعتماد',W-M,H-152,8,false,color.muted);
    page.drawLine({start:{x:M,y:H-164},end:{x:W-M,y:H-164},thickness:.6,color:color.line});
    y=H-181;
  }
  function ensure(height:number){if(y-height<BOTTOM)nextPage();}
  function section(label:string){
    ensure(70);
    page.drawRectangle({x:M,y:y-23,width:CW,height:23,color:color.navy});
    text(label,W-M-11,y-16,11,true,color.white);y-=34;
  }
  function field(label:string,value:unknown){
    const rows=[...wrap(label,10,true,CW-26).map(t=>({t,bold:true,size:10})),...wrap(valueText(value),11,false,CW-26).map(t=>({t,bold:false,size:11}))];
    let offset=0;
    while(offset<rows.length){
      ensure(62);
      const continuation=offset>0,capacity=Math.floor((y-BOTTOM-20)/16)-(continuation?1:0);
      if(capacity<1)throw new Error('Administrative PDF page capacity invariant failed.');
      const chunk=rows.slice(offset,offset+capacity),height=20+(chunk.length+(continuation?1:0))*16;
      page.drawRectangle({x:M,y:y-height,width:CW,height,color:color.pale,borderColor:color.line,borderWidth:.6});
      observe?.({kind:'field',page:pageNo,x:M,y:y-height,width:CW,height});
      let baseline=y-17;
      if(continuation){text('متابعة الحقل',W-M-13,baseline,9,true,color.muted);baseline-=16;}
      for(const row of chunk){if(row.t)text(row.t,W-M-13,baseline,row.size,row.bold,row.bold?color.muted:color.ink);baseline-=16;}
      offset+=chunk.length;y-=height+10;
      if(offset<rows.length)nextPage();
    }
  }
  nextPage();
  section('تعريف المستند');
  field('عنوان النموذج',preferredLocalizedText(c.template.titleAr,c.template.titleEn,'مستند إداري'));
  field('الجهة',preferredLocalizedText(c.branding.brandNameAr,c.branding.brandNameEn,'HYDROLAND'));
  field('المرجع',c.referenceNumber);
  field('رمز النموذج وإصداره',`${c.template.code} / v${c.template.version}`);
  section('بيانات النموذج');
  for(const item of c.fields)field(preferredLocalizedText(item.labelAr,item.labelEn,item.key),item.value);
  section('التحكم والتوثيق');
  field('الإصدارات المثبتة',`المستند: ${c.documentVersion} / القالب: ${c.template.version} / الهوية: ${c.branding.brandVersion}`);
  field('بصمة المحتوى المسجلة',c.contentHash);
  field('أعد بواسطة',c.approvals.createdByAccountId);
  if(c.approvals.approvedByAccountId){field('اعتمد بواسطة',c.approvals.approvedByAccountId);if(c.approvals.approvedAt)field('وقت الاعتماد',c.approvals.approvedAt);}
  if(c.approvals.signedByAccountId){field('سجل التوقيع بواسطة',c.approvals.signedByAccountId);if(c.approvals.signedAt)field('وقت التوقيع',c.approvals.signedAt);}
  if(c.approvals.archivedByAccountId){field('أرشف بواسطة',c.approvals.archivedByAccountId);if(c.approvals.archivedAt)field('وقت الأرشفة',c.approvals.archivedAt);}
  const footer=preferredLocalizedText(c.branding.footerAr,c.branding.footerEn);
  // Preserve the entire pinned footer, even when it is too long for a page footer.
  if(footer){section('بيانات الجهة الإضافية');field('التذييل المحفوظ',footer);}
  const pages=pdf.getPages();
  pages.forEach((p,i)=>{
    page=p;pageNo=i+1;
    page.drawLine({start:{x:M,y:64},end:{x:W-M,y:64},thickness:.6,color:color.line});
    text(`صفحة ${i+1} من ${pages.length}`,W-M,44,8,false,color.muted);
    text('HYDROLAND / ADMINISTRATIVE_FORM_V1',M+200,44,7,false,color.muted);
  });
  return {bytes:Buffer.from(await pdf.save()),filename:`${c.referenceNumber}.pdf`,status:c.status};
}
