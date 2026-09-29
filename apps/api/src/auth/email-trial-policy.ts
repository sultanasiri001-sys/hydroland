import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';

// Resend's shared sender delivers only to the email on its owner's account.
// Read the same policy before creating a challenge and immediately before sending it.
export function emailTrialRecipient():string|null{
  const recipient=process.env.HYDROLAND_EMAIL_TEST_RECIPIENT?.trim().toLowerCase()||'';
  const sharedSender=/@resend\.dev(?:\s*>|\s*$)/i.test(process.env.HYDROLAND_EMAIL_FROM?.trim()||'');
  if(!sharedSender&&!recipient)return null;
  if(!recipient||recipient.length>254||!/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(recipient)){
    throw new ServiceUnavailableException('خدمة البريد التجريبية غير جاهزة. يمكنك الاستكشاف كزائر.');
  }
  return recipient;
}

export function assertAuthEmailRecipient(email:string):void{
  const recipient=emailTrialRecipient();
  if(recipient&&email.trim().toLowerCase()!==recipient){
    throw new ForbiddenException('إرسال البريد متاح حاليًا لحساب الاختبار المعتمد فقط. يمكنك الاستكشاف كزائر.');
  }
}
