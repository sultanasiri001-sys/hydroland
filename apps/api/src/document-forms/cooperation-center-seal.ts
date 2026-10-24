import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { contractKeys } from './cooperation-contract.domain';

// Uploaded by the authorized center signer; never drawn by the platform.
export async function decodeCenterSeal(value:unknown) {
  const x=contractKeys(value,['mimeType','base64']);
  if(!['image/png','image/jpeg'].includes(String(x.mimeType))||typeof x.base64!=='string'||x.base64.length>2_666_668||!x.base64.length||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(x.base64))throw new BadRequestException('ارفع صورة ختم المركز بصيغة PNG أو JPEG حتى 2 ميجابايت.');
  const bytes=Buffer.from(x.base64,'base64');
  if(!bytes.length||bytes.length>2_000_000||bytes.toString('base64')!==x.base64)throw new BadRequestException('بيانات صورة الختم غير صالحة.');
  const png=bytes.length>=24&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpg=bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if(x.mimeType==='image/png'&&!png||x.mimeType==='image/jpeg'&&!jpg)throw new BadRequestException('نوع صورة الختم لا يطابق محتواها.');
  if(png&&(bytes.readUInt32BE(16)>4096||bytes.readUInt32BE(20)>4096))throw new BadRequestException('أبعاد صورة الختم تتجاوز 4096 بكسل.');
  try{const pdf=await PDFDocument.create();const img=png?await pdf.embedPng(bytes):await pdf.embedJpg(bytes);if(img.width<1||img.height<1||img.width>4096||img.height>4096)throw new Error('dimensions');}
  catch{throw new BadRequestException('تعذر قراءة صورة ختم المركز أو تجاوزت الأبعاد المسموحة.');}
  return {mimeType:x.mimeType as string,bytes,sha256:createHash('sha256').update(bytes).digest('hex')};
}
