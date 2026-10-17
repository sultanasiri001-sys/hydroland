import {PDFDocument, StandardFonts, rgb} from 'pdf-lib';

// Plain synthetic upload sample. No official logos, signatures or certification.
export async function licenseFixture() {
  const pdf=await PDFDocument.create();
  pdf.setTitle('HYDROLAND - synthetic attachment test only');
  pdf.setCreationDate(new Date('2026-10-17T00:00:00Z'));
  pdf.setModificationDate(new Date('2026-10-17T00:00:00Z'));
  const font=await pdf.embedFont(StandardFonts.Helvetica);
  const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const page=pdf.addPage([595,842]);
  page.drawRectangle({x:40,y:694,width:515,height:106,color:rgb(0.47,0.21,0.06)});
  page.drawText('SYNTHETIC TEST FILE',{x:60,y:756,size:24,font:bold,color:rgb(1,1,1)});
  page.drawText('NOT A LICENSE - NO OFFICIAL VALIDITY',{x:60,y:720,size:17,font:bold,color:rgb(1,1,1)});
  const lines=[
    'HYDROLAND center acceptance sandbox',
    'Purpose: upload, download and center access checks.',
    'Sample issue date: 2026-01-01',
    'Sample expiry date: 2030-01-01',
    'Use a unique UAT reference when uploading this sample.',
    'No person, customer or government authority is represented.',
    'A successful upload is not external license verification.',
  ];
  lines.forEach((line,i)=>page.drawText(line,{x:60,y:640-i*36,size:13,font,color:rgb(0.12,0.17,0.2)}));
  page.drawText('TEST DATA ONLY',{x:60,y:80,size:18,font:bold,color:rgb(0.47,0.21,0.06)});
  return Buffer.from(await pdf.save());
}
