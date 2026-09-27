import { Injectable } from '@nestjs/common';
import { PDFDocument, StandardFonts, degrees, rgb, PDFFont, PDFPage } from 'pdf-lib';
import * as fontkitNamespace from '@pdf-lib/fontkit';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DocumentPrintService } from './document-print.service';
import { DocumentAssetService } from './document-asset.service';
import { assertArabicPdfSourceText, containsArabic, pdfTextX, pdfVisualText, preferredLocalizedText } from './document-pdf-arabic.contract';

const fontkit = (fontkitNamespace as unknown as { default?: unknown }).default ?? fontkitNamespace;
const arabicFontPath = resolve(__dirname,'..','..','src','document-forms','fonts','NotoSansArabic-Regular.woff');
const arabicBoldFontPath = resolve(__dirname,'..','..','src','document-forms','fonts','NotoSansArabic-Bold.woff');
const PAPER = { width:595.28, height:841.89, margin:48, header:92, footer:44 };
const COLOR = {
  navy:rgb(.035,.12,.20), cyan:rgb(.02,.62,.72), gold:rgb(.74,.55,.20), ink:rgb(.055,.10,.15),
  muted:rgb(.34,.40,.45), line:rgb(.82,.88,.89), card:rgb(.965,.985,.985), white:rgb(1,1,1),
};
const statusLabel=(status:string)=>({DRAFT:'مسودة',PENDING_APPROVAL:'بانتظار الاعتماد',APPROVED:'معتمد',SIGNED:'موقّع',ARCHIVED:'مؤرشف'}[status]??status);
const valueText=(value:unknown)=>{
  if(value===null||value===undefined||value==='') return '—';
  if(value instanceof Date) return value.toISOString();
  if(typeof value==='boolean') return value?'نعم':'لا';
  if(typeof value==='object') return JSON.stringify(value);
  return String(value);
};

@Injectable()
export class DocumentPdfService {
  constructor(private readonly print:DocumentPrintService,private readonly assets:DocumentAssetService){}

  async render(accountId:string,id:string){
    const c=await this.print.contract(accountId,id);
    const pdf=await PDFDocument.create();
    const latin=await pdf.embedFont(StandardFonts.Helvetica);
    const latinBold=await pdf.embedFont(StandardFonts.HelveticaBold);
    pdf.registerFontkit(fontkit as Parameters<PDFDocument['registerFontkit']>[0]);
    const [arabicFontBytes,arabicBoldFontBytes]=await Promise.all([readFile(arabicFontPath),readFile(arabicBoldFontPath)]);
    const arabic=await pdf.embedFont(arabicFontBytes,{subset:true});
    const arabicBold=await pdf.embedFont(arabicBoldFontBytes,{subset:true});
    let logo:Awaited<ReturnType<PDFDocument['embedPng']>>|Awaited<ReturnType<PDFDocument['embedJpg']>>|null=null;
    if(c.branding.logoAssetId){
      const {asset,bytes}=await this.assets.bytesForLogo(c.organizationId,c.branding.logoAssetId);
      logo=asset.mimeType==='image/png'?await pdf.embedPng(bytes):await pdf.embedJpg(bytes);
    }
    const brand=preferredLocalizedText(c.branding.brandNameAr,c.branding.brandNameEn,'HYDROLAND');
    const title=preferredLocalizedText(c.template.titleAr,c.template.titleEn,'مستند تشغيلي');
    const marineIncident=c.template.code==='SAF-INCIDENT'||c.template.code==='SAF-INCIDENT-REPORT';
    const documentLabel=marineIncident?'بلاغ حادث بحري':title;
    let page:PDFPage;
    let y=0;
    let pageNumber=0;
    const selectedFont=(raw:string,bold=false):PDFFont=>containsArabic(raw)?(bold?arabicBold:arabic):(bold?latinBold:latin);
    const visual=(raw:unknown)=>pdfVisualText(assertArabicPdfSourceText(raw));
    const draw=(raw:unknown,x:number,atY:number,size=10,bold=false,color=COLOR.ink,rightAligned=false)=>{
      const source=assertArabicPdfSourceText(raw);
      const value=visual(source);
      const font=selectedFont(source,bold);
      const measured=font.widthOfTextAtSize(value,size);
      const drawX=rightAligned||containsArabic(source)?pdfTextX(source,PAPER.width,x,PAPER.margin,measured):x;
      page.drawText(value,{x:drawX,y:atY,size,font,color});
    };
    const wrap=(raw:unknown,size:number,bold:boolean,maxWidth:number)=>{
      const source=assertArabicPdfSourceText(raw).trim()||'—';
      const words=source.split(/\s+/u);
      const font=selectedFont(source,bold);
      const lines:string[]=[];
      let line='';
      for(const word of words){
        const candidate=line?`${line} ${word}`:word;
        if(line&&font.widthOfTextAtSize(visual(candidate),size)>maxWidth){lines.push(line);line=word;}else line=candidate;
      }
      if(line) lines.push(line);
      return lines;
    };
    const header=()=>{
      page.drawRectangle({x:0,y:PAPER.height-PAPER.header,width:PAPER.width,height:PAPER.header,color:COLOR.navy});
      page.drawRectangle({x:0,y:PAPER.height-PAPER.header,width:PAPER.width,height:4,color:COLOR.cyan});
      page.drawRectangle({x:0,y:PAPER.height-PAPER.header-4,width:PAPER.width,height:2,color:COLOR.gold});
      if(logo){
        const scaled=logo.scale(Math.min(1,62/logo.width,44/logo.height));
        page.drawImage(logo,{x:PAPER.margin,y:PAPER.height-68,width:scaled.width,height:scaled.height});
      }
      draw(brand,PAPER.margin+(logo?76:0),PAPER.height-38,13,true,COLOR.white);
      draw('وثيقة تشغيلية موثّقة',PAPER.margin+(logo?76:0),PAPER.height-58,8,false,rgb(.74,.88,.90));
      draw(documentLabel,PAPER.margin,PAPER.height-84,16,true,COLOR.white,true);
      page.drawRectangle({x:PAPER.margin,y:PAPER.height-PAPER.header-28,width:PAPER.width-PAPER.margin*2,height:21,color:COLOR.card,borderColor:COLOR.line,borderWidth:.6});
      draw(`المرجع: ${c.referenceNumber}`,PAPER.margin+8,PAPER.height-PAPER.header-20,8,true,COLOR.ink);
      draw(`الحالة: ${statusLabel(c.status)}`,PAPER.margin+8,PAPER.height-PAPER.header-20,8,true,COLOR.ink,true);
    };
    const footer=()=>{
      page.drawLine({start:{x:PAPER.margin,y:PAPER.footer},end:{x:PAPER.width-PAPER.margin,y:PAPER.footer},thickness:.65,color:COLOR.line});
      draw('منصة HYDROLAND · نسخة قابلة للتحقق من النظام',PAPER.margin,PAPER.footer-13,7,false,COLOR.muted);
      draw(`صفحة ${pageNumber} · ${c.referenceNumber}`,PAPER.margin,PAPER.footer-13,7,false,COLOR.muted,true);
      const footerText=preferredLocalizedText(c.branding.footerAr,c.branding.footerEn);
      if(footerText) draw(footerText,PAPER.margin,PAPER.footer-27,7,false,COLOR.muted,true);
    };
    const decorate=()=>{
      header();
      if(!['SIGNED','ARCHIVED'].includes(c.status)) page.drawText(statusLabel(c.status),{x:175,y:360,size:38,font:arabicBold,color:rgb(.86,.89,.90),rotate:degrees(34),opacity:.50});
      footer();
      y=PAPER.height-PAPER.header-44;
    };
    const nextPage=()=>{page=pdf.addPage([PAPER.width,PAPER.height]);pageNumber++;decorate();};
    const ensure=(needed:number)=>{if(y-needed<PAPER.footer+42) nextPage();};
    const section=(label:string)=>{
      ensure(30);
      page.drawRectangle({x:PAPER.margin,y:y-18,width:PAPER.width-PAPER.margin*2,height:18,color:COLOR.navy});
      page.drawRectangle({x:PAPER.margin,y:y-18,width:4,height:18,color:COLOR.gold});
      draw(label,PAPER.margin+12,y-13,9,true,COLOR.white,true);
      y-=30;
    };
    const field=(label:string,value:unknown,wide=false)=>{
      const lines=wrap(valueText(value),9,false,PAPER.width-PAPER.margin*2-28);
      const cardHeight=Math.max(wide?62:48,33+lines.length*13);
      ensure(cardHeight+8);
      page.drawRectangle({x:PAPER.margin,y:y-cardHeight,width:PAPER.width-PAPER.margin*2,height:cardHeight,color:COLOR.card,borderColor:COLOR.line,borderWidth:.65});
      page.drawRectangle({x:PAPER.width-PAPER.margin-4,y:y-cardHeight,width:4,height:cardHeight,color:COLOR.cyan});
      draw(label,PAPER.margin+12,y-15,8,true,COLOR.muted,true);
      lines.forEach((line,index)=>draw(line,PAPER.margin+12,y-30-index*13,9,false,COLOR.ink,true));
      y-=cardHeight+8;
    };
    nextPage();
    section(marineIncident?'بيانات البلاغ البحري':'بيانات المستند');
    for(const item of c.fields) field(preferredLocalizedText(item.labelAr,item.labelEn,item.key),item.value,item.key==='actions'||item.type==='TABLE');
    section('التحكم والتدقيق');
    field('إصدار المستند',`الإصدار ${c.documentVersion} · إصدار الهوية ${c.branding.brandVersion}`);
    field('معرّف التحقق',c.contentHash);
    field('أنشئ بواسطة',c.approvals.createdByAccountId);
    if(c.approvals.approvedByAccountId) field('اعتمد بواسطة',c.approvals.approvedByAccountId);
    if(c.approvals.signedByAccountId) field('وُقّع بواسطة',c.approvals.signedByAccountId);
    if(c.approvals.archivedByAccountId) field('أرشف بواسطة',c.approvals.archivedByAccountId);
    return {bytes:Buffer.from(await pdf.save()),filename:`${c.referenceNumber}.pdf`,status:c.status};
  }
}
