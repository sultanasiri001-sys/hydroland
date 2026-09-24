import { Injectable } from '@nestjs/common';
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import { DocumentPrintService } from './document-print.service';
import { DocumentAssetService } from './document-asset.service';
import { assertArabicPdfSourceText, containsArabic } from './document-pdf-arabic.contract';

@Injectable()
export class DocumentPdfService {
  constructor(private readonly print:DocumentPrintService,private readonly assets:DocumentAssetService){}

  async render(accountId:string,id:string){
    const c=await this.print.contract(accountId,id);
    const pdf=await PDFDocument.create();
    let page=pdf.addPage([595.28,841.89]);
    const font=await pdf.embedFont(StandardFonts.Helvetica);
    const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
    const {width,height}=page.getSize();
    const decoratePage=()=>{
      if(!['SIGNED','ARCHIVED'].includes(c.status)) page.drawText(c.status,{x:width/2-95,y:height/2,size:44,font:bold,color:rgb(0.82,0.82,0.82),rotate:degrees(35),opacity:0.45});
    };
    decoratePage();
    let y=height-56;
    const nextPage=()=>{page=pdf.addPage([595.28,841.89]);y=height-56;decoratePage();};
    const text=(value:unknown,x:number,size=10,isBold=false)=>{

      const raw=assertArabicPdfSourceText(value);
      if(containsArabic(raw)) throw new Error('Arabic PDF rendering requires an embedded Unicode Arabic font and BiDi shaping; refusing lossy output.');
      page.drawText(raw,{x,y,size,font:isBold?bold:font,color:rgb(0,0,0)});
      y-=size+8;
    };
    if(c.branding.logoAssetId){
      const {asset,bytes}=await this.assets.bytesForLogo(c.organizationId,c.branding.logoAssetId);
      const image=asset.mimeType==='image/png'?await pdf.embedPng(bytes):await pdf.embedJpg(bytes);
      const scaled=image.scale(Math.min(1,110/image.width,55/image.height));
      page.drawImage(image,{x:width-48-scaled.width,y:height-48-scaled.height,width:scaled.width,height:scaled.height});
    }
    text(c.branding.brandNameEn||'Organization',48,16,true);
    text(c.template.titleEn,48,14,true);
    text(c.referenceNumber,48,10);
    text(`Status: ${c.status}`,48,10);
    text(`Document version: ${c.documentVersion} | Brand version: ${c.branding.brandVersion}`,48,9);
    y-=10;
    for(const field of c.fields){
      if(y<80) nextPage();
      text(`${field.labelEn||field.key}: ${field.value??''}`,48,10);
    }
    y-=10;
    if(y<100) nextPage();
    text(`Created by: ${c.approvals.createdByAccountId}`,48,8);
    if(c.approvals.approvedByAccountId) text(`Approved by: ${c.approvals.approvedByAccountId}`,48,8);
    if(c.approvals.signedByAccountId) text(`Signed by: ${c.approvals.signedByAccountId}`,48,8);
    if(c.branding.footerEn) text(c.branding.footerEn,48,8);
    // Logo bytes are intentionally not fetched from arbitrary URLs here.
    // Rendering a logo requires a trusted platform-managed asset source; this avoids SSRF/redirect bypasses.
    return {bytes:Buffer.from(await pdf.save()),filename:`${c.referenceNumber}.pdf`,status:c.status};
  }
}
