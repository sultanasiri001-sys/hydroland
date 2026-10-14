import { Prisma } from '@prisma/client';
const columns={Account:['id'],OrgUnit:['id'],Organization:['id'],Payment:['id'],Invoice:['id'],Receivable:['id','invoiceId','customerAccountId','centerOrgUnitId'],ReceivableInstallment:['id','receivableId'],ReceivablePayment:['id','receivableId','installmentId','paymentId','shiftId','collectedByAccountId'],FinanceAccountantShift:['id','centerOrgUnitId','accountantAccountId','reviewedByAccountId'],FinanceShiftEntry:['id','shiftId','paymentId','referenceId','recordedByAccountId'],FinanceEntry:['organizationId'],FinanceShiftCloseSubmission:['id','shiftId','centerOrgUnitId','submittedByAccountId','reviewedByAccountId'],FinancePeriodCloseSubmission:['id','centerOrgUnitId','submittedByAccountId'],FinancePeriodCloseApproval:['id','submissionId','reviewerAccountId'],FinanceSettlementImport:['id','centerOrgUnitId','importedByAccountId'],FinanceSettlementReview:['id','importId','reviewerAccountId'],FinanceShiftHandover:['id','fromShiftId','toShiftId','fromAccountantId','toAccountantId']} as const;
// Identifiers are internal allowlisted constants; values remain bound parameters.
export function financeKey(table:keyof typeof columns,column:string,value:string|null){
 if(!(columns[table] as readonly string[]).includes(column))throw new Error('FINANCE_KEY_COLUMN_INVALID');
 const record=Prisma.raw('NULL::"'+table+'"'),field=Prisma.raw('"'+column+'"');
 return Prisma.sql`(jsonb_populate_record(${record},jsonb_build_object(${column}::text,${value}::text))).${field}`;
}
