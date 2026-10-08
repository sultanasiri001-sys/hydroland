import { Prisma } from '@prisma/client';
const columns={Account:['id'],OrgUnit:['id'],Organization:['id'],Payment:['id'],FinanceAccountantShift:['id','centerOrgUnitId','accountantAccountId'],FinanceShiftEntry:['id','shiftId','paymentId','referenceId','recordedByAccountId'],FinanceShiftHandover:['id','fromShiftId','toShiftId','fromAccountantId','toAccountantId']} as const;
// Identifiers are internal allowlisted constants; values remain bound parameters.
export function financeKey(table:keyof typeof columns,column:string,value:string|null){
 if(!(columns[table] as readonly string[]).includes(column))throw new Error('FINANCE_KEY_COLUMN_INVALID');
 const record=Prisma.raw('NULL::"'+table+'"'),field=Prisma.raw('"'+column+'"');
 return Prisma.sql`(jsonb_populate_record(${record},jsonb_build_object(${column}::text,${value}::text))).${field}`;
}
