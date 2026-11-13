import type { Prisma } from '@prisma/client';
import { ConflictException } from '@nestjs/common';
import { mandatoryBindingStatus } from '../trips/mandatory-policy.domain';
export type TrainingOperationalPolicy={capacityLimit:boolean;scheduleConflict:boolean;sessionTimeWindow:boolean;attendanceRequired:boolean};
export const DEFAULT_TRAINING_POLICY:TrainingOperationalPolicy={capacityLimit:true,scheduleConflict:true,sessionTimeWindow:true,attendanceRequired:true};
export async function trainingOperationalPolicy(tx:Prisma.TransactionClient):Promise<TrainingOperationalPolicy>{
 const rows=await tx.$queryRaw<Array<{ruleKey:string;state:string;metadata?:unknown}>>`SELECT "ruleKey","state","metadata" FROM "PolicyControl" WHERE "category"='TRAINING'`;
 const enabled=(key:string)=>{const row=rows.find(row=>row.ruleKey===key),binding=mandatoryBindingStatus('TRAINING',key,row?.metadata);if(binding==='REVIEW_REQUIRED')throw new ConflictException({code:'MANDATORY_SOURCE_REVIEW_REQUIRED',message:'يتطلب مصدر ضابط التدريب وانطباقه مراجعة موثقة.'});return binding==='MANDATORY'||row?.state!=='DISABLED'&&row?.state!=='REVIEW';};
 return {capacityLimit:enabled('CAPACITY_LIMIT'),scheduleConflict:enabled('SCHEDULE_CONFLICT'),sessionTimeWindow:enabled('SESSION_TIME_WINDOW'),attendanceRequired:enabled('ATTENDANCE_REQUIRED')};
}
