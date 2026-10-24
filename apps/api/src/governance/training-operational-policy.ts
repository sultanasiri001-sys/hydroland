import { Prisma } from '@prisma/client';
export type TrainingOperationalPolicy={capacityLimit:boolean;scheduleConflict:boolean;sessionTimeWindow:boolean;attendanceRequired:boolean};
export const DEFAULT_TRAINING_POLICY:TrainingOperationalPolicy={capacityLimit:true,scheduleConflict:true,sessionTimeWindow:true,attendanceRequired:true};
export async function trainingOperationalPolicy(tx:Prisma.TransactionClient):Promise<TrainingOperationalPolicy>{
 const rows=await tx.$queryRaw<Array<{ruleKey:string;state:string}>>`SELECT "ruleKey","state" FROM "PolicyControl" WHERE "category"='TRAINING'`;
 const enabled=(key:string)=>{const state=rows.find(row=>row.ruleKey===key)?.state;return state!=='DISABLED'&&state!=='REVIEW';};
 return {capacityLimit:enabled('CAPACITY_LIMIT'),scheduleConflict:enabled('SCHEDULE_CONFLICT'),sessionTimeWindow:enabled('SESSION_TIME_WINDOW'),attendanceRequired:enabled('ATTENDANCE_REQUIRED')};
}
