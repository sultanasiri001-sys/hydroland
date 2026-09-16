import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const sql=readFileSync(resolve(process.cwd(),'prisma/migrations/20260917013000_finance_receivables/migration.sql'),'utf8');
for(const token of [
  'CREATE TABLE "Receivable"',
  'CREATE TABLE "ReceivableInstallment"',
  'CREATE TABLE "ReceivablePayment"',
  'Receivable_invoice_key',
  'ReceivablePayment_payment_key',
  'ReceivablePayment_receipt_key',
  'paidMinor" + "outstandingMinor" = "totalMinor',
  'FOREIGN KEY ("invoiceId") REFERENCES "Invoice"',
  'FOREIGN KEY ("paymentId") REFERENCES "Payment"',
]){
  if(!sql.includes(token))throw new Error(`FINANCE_RECEIVABLE_PERSISTENCE_DRIFT:${token}`);
}
console.log('Finance receivables persistence contract OK');
