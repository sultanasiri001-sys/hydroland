import { PDFDocument, StandardFonts, rgb, PDFPage } from 'pdf-lib';
import * as fontkitNamespace from '@pdf-lib/fontkit';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DocumentPrintContract } from './document-print.service';
import { DocumentAssetService } from './document-asset.service';
import { pdfVisualText, preferredLocalizedText } from './document-pdf-arabic.contract';

// A print composition, independent of the operational-form card layout.
// All text, pinned branding, signatures and seal still come from the authorized
// print snapshot. The renderer never creates or changes approval evidence.
export async function renderCooperationContractPdf(c:DocumentPrintContract, assets:DocumentAssetService){
  const contract=c.cooperation!;
  const pdf=await PDFDocument.create();
  const kit=(fontkitNamespace as any).default??fontkitNamespace;
  pdf.registerFontkit({create:(bytes:Uint8Array)=>{
    const face=kit.create(bytes),layout=face.layout.bind(face);
    face.layout=(text:string,features:unknown,script:unknown,language:unknown)=>layout(text,features,script,language,'ltr');
    return face;
  }});
  const fontPath=(weight:string)=>resolve(__dirname,'../../src/document-forms/fonts',`Amiri-Contract-${weight}.ttf`);
  const [regular,bold]=await Promise.all(['Regular','Bold'].map(async w=>pdf.embedFont(await readFile(fontPath(w)),{subset:false})));
  const latin=await pdf.embedFont(StandardFonts.Helvetica);
  const latinBold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const primary=await pdf.embedPng(await readFile(resolve(__dirname,'../../src/document-forms/identity/hydroland-mark-v1.png')));
  let secondary:Awaited<ReturnType<typeof pdf.embedPng>>|undefined;
  if(c.branding.logoAssetId){const {asset,bytes}=await assets.bytesForLogo(c.organizationId,c.branding.logoAssetId);secondary=asset.mimeType==='image/png'?await pdf.embedPng(bytes):await pdf.embedJpg(bytes);}
  const W=595.28,H=841.89,M=52,R=W-M,CW=W-2*M;
  const color={navy:rgb(.035,.12,.20),cyan:rgb(.015,.65,.91),gold:rgb(.86,.63,.16),ink:rgb(.12,.16,.20),muted:rgb(.39,.44,.48),line:rgb(.71,.86,.94),pale:rgb(.94,.975,.995),white:rgb(1,1,1)};
  const brand=preferredLocalizedText(c.branding.brandNameAr,c.branding.brandNameEn,contract.values.center.legalName);
  const status={DRAFT:'مسودة للمراجعة',AWAITING_SIGNATURES:'بانتظار توقيع الطرفين',AWAITING_PLATFORM_APPROVAL:'بانتظار اعتماد هيدرولاند',APPROVED:'معتمد من هيدرولاند',REJECTED:'مرفوض من هيدرولاند'}[contract.status]??contract.status;
  let page!:PDFPage,y=0;
  const text=(raw:string,right:number,baseline:number,size=12,isBold=false,tone=color.ink)=>{
    const value=pdfVisualText(raw),font=isBold?bold:regular;
    page.drawText(value,{x:right-font.widthOfTextAtSize(value,size),y:baseline,size,font,color:tone});
  };
  const ltr=(raw:string,x:number,baseline:number,size=8,isBold=false,tone=color.muted)=>page.drawText(raw,{x,y:baseline,size,font:isBold?latinBold:latin,color:tone});
  const lines=(raw:unknown,width:number,size=12,isBold=false)=>{
    const font=isBold?bold:regular,result:string[]=[];
    for(const paragraph of String(raw||'لم يستكمل').split('\n')){
      let line='';
      for(const word of paragraph.split(/\s+/u)){
        // Bound arbitrary long references as well as ordinary Arabic paragraphs.
        let part='';const chunks:string[]=[];
        for(const ch of word){if(part&&font.widthOfTextAtSize(pdfVisualText(part+ch),size)>width){chunks.push(part);part=ch;}else part+=ch;}
        if(part)chunks.push(part);
        for(const chunk of chunks){const next=line?line+' '+chunk:chunk;if(line&&font.widthOfTextAtSize(pdfVisualText(next),size)>width){result.push(line);line=chunk;}else line=next;}
      }
      if(line)result.push(line);
    }
    return result;
  };
  const rule=(at:number,tone=color.line)=>page.drawLine({start:{x:M,y:at},end:{x:R,y:at},thickness:.6,color:tone});
  const pageStart=(label:string)=>{
    page=pdf.addPage([W,H]);
    // Marine-incident identity: one fixed platform letterhead, cyan outlines,
    // navy section bars and a subordinate pinned center identity strip.
    page.drawRectangle({x:24,y:24,width:W-48,height:H-48,borderWidth:.65,borderColor:color.cyan});
    page.drawRectangle({x:24,y:H-104,width:W-48,height:80,color:color.navy});
    const emblem=primary.scale(Math.min(58/primary.width,54/primary.height));
    page.drawImage(primary,{x:W-229,y:H-85,width:emblem.width,height:emblem.height});
    ltr('HYDROLAND',W-163,H-51,16,true,color.white);
    text('هيدرولاند',W-32,H-72,15,true,color.cyan);
    ltr('DIVE · EXPLORE · PROTECT · BELONG',W-171,H-89,5.4,false,color.white);
    text('عقد تعاون محترف غوص',M+246,H-65,23,true,color.white);
    text('العقود والتوقيع الإلكتروني',M+246,H-87,10,false,color.white);
    page.drawRectangle({x:M-4,y:H-159,width:CW+8,height:43,color:color.pale,borderWidth:.6,borderColor:color.cyan});
    if(secondary){const d=secondary.scale(Math.min(32/secondary.width,32/secondary.height));page.drawImage(secondary,{x:R-36,y:H-151,width:d.width,height:d.height});}
    const centerRight=R-(secondary?48:8);
    const brandLines=lines(brand,225,11,true);
    brandLines.slice(0,2).forEach((line,i)=>text(line,centerRight,H-131-i*16,11,true,color.navy));
    ltr(c.referenceNumber,M+5,H-135,7.5,true);
    text(label,R,H-179,11,false,color.muted);
    y=H-190;
  };
  const ensure=(height:number,label='تابع بنود العقد')=>{if(y-height<84)pageStart(label);};
  const heading=(title:string)=>{
    ensure(63);
    page.drawRectangle({x:M,y:y-24,width:CW,height:27,color:color.navy});
    page.drawRectangle({x:R-3,y:y-24,width:3,height:27,color:color.cyan});
    text(title,R-13,y-16,13,true,color.white);y-=42;
  };
  const row=(label:string,value:unknown)=>{
    const content=lines(value,CW-174,12),labelLines=lines(label,145,10.5,true);
    const height=Math.max(content.length*17,labelLines.length*16)+17;
    ensure(Math.min(height,120));
    labelLines.forEach((line,i)=>text(line,R-8,y-3-i*16,10.5,true,color.muted));
    // Pale value cells echo the reference without changing the formal text.
    let chunkRemaining=0;
    // Very long values continue over pages without clipping or losing content.
    for(let i=0;i<content.length;i++){
      if(y-20<84){chunkRemaining=0;pageStart('تابع بيانات العقد');lines(label+' (تابع)',145,10.5,true).forEach((line,j)=>text(line,R-8,y-3-j*16,10.5,true,color.muted));}
      if(chunkRemaining===0){chunkRemaining=Math.min(content.length-i,Math.max(1,Math.floor((y-104)/17)+1));page.drawRectangle({x:M-1,y:y-chunkRemaining*17+6,width:CW-171,height:chunkRemaining*17+2,color:color.pale});}
      text(content[i],R-174,y-3,12);y-=17;chunkRemaining--;
    }
    y-=Math.max(0,labelLines.length*16-content.length*17)+9;rule(y+2);y-=6;
  };
  pageStart('أولًا | بيانات طرفي العقد');
  heading('الطرف الأول | مركز الغوص');
  c.fields.filter(f=>f.key.startsWith('center.')).forEach(f=>row(f.labelAr,f.value));
  heading('الطرف الثاني | محترف الغوص');
  c.fields.filter(f=>f.key.startsWith('professional.')).forEach(f=>row(f.labelAr,f.value));
  pageStart('ثانيًا | نطاق التعاون وشروطه');
  heading('نطاق الخدمات والمدة والشروط المالية');
  c.fields.filter(f=>f.key.startsWith('terms.')).forEach(f=>row(f.labelAr,f.value));
  pageStart('ثالثًا | الأحكام العامة');
  heading('بنود التعاون');
  contract.clauses.forEach((clause,index)=>{
    const body=lines(clause,CW-32,12),height=body.length*19+8;
    ensure(Math.min(height,126));
    text(String(index+1).padStart(2,'0'),R,y-1,12,true,color.gold);
    for(const line of body){ensure(21);text(line,R-32,y-1,12);y-=19;}
    y-=8;
  });
  pageStart('رابعًا | التوقيع والاعتماد');
  heading('إقرار الطرفين والتوقيع الإلكتروني');
  for(const line of lines('يرتبط توقيع كل طرف بهذا الإصدار ومحتواه. لا يضاف ختم هيدرولاند إلا بعد توقيع الطرفين وصدور قرار الاعتماد داخل المنصة.',CW,12)){text(line,R,y,12);y-=21;}y-=22;
  const gap=18,cardW=(CW-gap)/2,cardH=144;
  for(const [index,role] of ['CENTER','PROFESSIONAL'].entries()){
    const left=index===0?M+cardW+gap:M,right=left+cardW;
    page.drawRectangle({x:left,y:y-cardH,width:cardW,height:cardH,borderWidth:.7,borderColor:color.line,color:color.white});
    const signature=contract.signatures.find(s=>s.role===role);
    text(role==='CENTER'?'ممثل مركز الغوص':'محترف الغوص',right-16,y-25,13,true,color.navy);
    const values=lines(signature?.name||'بانتظار التوقيع الإلكتروني',cardW-32,12);
    values.forEach((line,i)=>text(line,right-16,y-56-i*20,12));
    if(signature){ltr(signature.at.toISOString(),left+16,y-100,7);text('توقيع بحساب متحقق منه',right-16,y-124,10,false,color.muted);}
    else {page.drawLine({start:{x:left+16,y:y-105},end:{x:right-16,y:y-105},thickness:.6,color:color.line});text('لا يوجد توقيع مسجل لهذا الإصدار',right-16,y-124,9,false,color.muted);}
  }
  y-=cardH+32;
  heading('ختم مركز الغوص');
  if(contract.centerSeal){
    const {asset,bytes}=await assets.bytesForCenterSeal(c.organizationId,contract.centerSeal.assetId);
    const stamp=asset.mimeType==='image/png'?await pdf.embedPng(bytes):await pdf.embedJpg(bytes);
    const size=stamp.scale(Math.min(120/stamp.width,65/stamp.height));
    page.drawImage(stamp,{x:M,y:y-65,width:size.width,height:size.height});
    text('ختم أرفقه ممثل المركز مع توقيعه',R,y-16,11,true,color.navy);
    ltr(contract.centerSeal.at.toISOString(),R-185,y-39,8);
    ltr(contract.centerSeal.sealId,R-185,y-60,7);y-=90;
  }else{
    text(contract.centerSealRequired?'بانتظار ختم المركز عند توقيع ممثله':'لا يوجد ختم مركز مثبت في سجل هذا الإصدار السابق',R,y-16,11,false,color.muted);y-=46;
  }
  heading('اعتماد منصة هيدرولاند');
  if(contract.seal){
    const cx=M+48,cy=y-40;
    page.drawCircle({x:cx,y:cy,size:38,borderWidth:1.3,borderColor:color.cyan});
    page.drawCircle({x:cx,y:cy,size:33,borderWidth:.5,borderColor:color.cyan});
    page.drawImage(primary,{x:cx-14,y:cy+3,width:28,height:22});
    ltr('HYDROLAND',cx-28,cy-6,8,true,color.navy);
    text('معتمد',cx+17,cy-26,14,true,color.navy);
    text('اعتماد إداري داخل المنصة',R,y-16,12,true,color.navy);
    ltr(contract.seal.at.toISOString(),R-185,y-43,8);
    ltr(contract.seal.decisionId,R-185,y-63,7);
    y-=107;
  }else{
    page.drawRectangle({x:M,y:y-86,width:98,height:86,borderWidth:.6,borderColor:color.line});
    text('موضع ختم',M+78,y-33,11,true,color.muted);
    text('هيدرولاند',M+76,y-54,12,true,color.navy);
    text(contract.status==='REJECTED'?'رفض العقد | لا يوجد ختم اعتماد':'بانتظار اعتماد هيدرولاند',R,y-16,12,true,color.muted);
    text('يضاف الختم الإلكتروني بعد صدور قرار الاعتماد.',R,y-43,11,false,color.muted);y-=107;
  }
  heading('مرجع الإصدار والتحقق');
  text(`إصدار العقد: ${c.documentVersion}   |   إصدار هوية المركز: ${c.branding.brandVersion}`,R,y,11);y-=28;
  text('بصمة محتوى الإصدار',R,y,10,true,color.muted);y-=22;
  // A hash is an exact left-to-right identifier, never reversed or truncated.
  ltr(c.contentHash,M,y,8);y-=30;
  for(const line of lines('ختم هيدرولاند اعتماد إداري داخلي، ولا يحل محل التوثيق الرسمي الواجب. هذه المعاينة مسودة للمراجعة ما لم يظهر اعتماد هذا الإصدار.',CW,10.5)){text(line,R,y,10.5,false,color.muted);y-=18;}
  const pages=pdf.getPages();
  pages.forEach((p,index)=>{
    page=p;
    // Three closely spaced wave contours echo the approved marine form footer.
    const wave=(offset:number,tone:ReturnType<typeof rgb>)=>page.drawSvgPath(`M 0 ${offset} C 80 ${offset-12}, 115 ${offset+14}, 190 ${offset+4} S 315 ${offset-7}, 390 ${offset+3} S 480 ${offset-6}, 547.28 ${offset+1} L 547.28 44 L 0 44 Z`,{x:24,y:68,color:tone});
    wave(8,color.gold);wave(11,color.cyan);wave(15,color.navy);
    text(status,R,35,8.5,true,color.white);
    text(`صفحة ${index+1} من ${pages.length}`,W/2+24,35,8.5,false,color.white);
    ltr(c.referenceNumber,M,35,6.8,false,color.white);
  });
  pdf.setTitle('HYDROLAND - Diving Professional Cooperation Contract');
  pdf.setAuthor('HYDROLAND');
  return {bytes:Buffer.from(await pdf.save()),filename:`${c.referenceNumber}.pdf`,status:c.status};
}
