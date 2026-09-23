export type InvoiceSettlementMode='PAID_NOW'|'PARTIAL'|'CREDIT';
export type ReceivableStatus='OPEN'|'PARTIALLY_PAID'|'PAID'|'OVERDUE';

export interface CreditInvoiceInput{
  totalMinor:number;
  paidMinor:number;
  dueAt?:Date;
  creditLimitMinor?:number;
}

export function assertCreditInvoice(input:CreditInvoiceInput){
  if(!Number.isSafeInteger(input.totalMinor)||input.totalMinor<=0)throw new Error('FINANCE_INVOICE_TOTAL_INVALID');
  if(!Number.isSafeInteger(input.paidMinor)||input.paidMinor<0||input.paidMinor>input.totalMinor)throw new Error('FINANCE_INVOICE_PAID_INVALID');
  const outstandingMinor=input.totalMinor-input.paidMinor;
  if(outstandingMinor>0){
    if(!input.dueAt||Number.isNaN(input.dueAt.getTime()))throw new Error('FINANCE_DUE_DATE_REQUIRED');
    if(input.creditLimitMinor!==undefined){
      if(!Number.isSafeInteger(input.creditLimitMinor)||input.creditLimitMinor<0)throw new Error('FINANCE_CREDIT_LIMIT_INVALID');
      if(outstandingMinor>input.creditLimitMinor)throw new Error('FINANCE_CREDIT_LIMIT_EXCEEDED');
    }
  }
  const mode:InvoiceSettlementMode=outstandingMinor===0?'PAID_NOW':input.paidMinor===0?'CREDIT':'PARTIAL';
  return {mode,outstandingMinor};
}

export function applyReceivablePayment(outstandingMinor:number,paymentMinor:number){
  if(!Number.isSafeInteger(outstandingMinor)||outstandingMinor<=0)throw new Error('FINANCE_RECEIVABLE_BALANCE_INVALID');
  if(!Number.isSafeInteger(paymentMinor)||paymentMinor<=0||paymentMinor>outstandingMinor)throw new Error('FINANCE_RECEIVABLE_PAYMENT_INVALID');
  const remainingMinor=outstandingMinor-paymentMinor;
  return {remainingMinor,status:remainingMinor===0?'PAID' as const:'PARTIALLY_PAID' as const};
}

export function receivableStatus(outstandingMinor:number,dueAt:Date,now=new Date()):ReceivableStatus{
  if(outstandingMinor===0)return 'PAID';
  return dueAt.getTime()<now.getTime()?'OVERDUE':'OPEN';
}
