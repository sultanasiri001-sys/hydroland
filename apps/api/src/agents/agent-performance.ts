import { Prisma } from '@prisma/client';

// Historical metrics are database observations, independent of worker health.
// No prompt/result/identity is selected or transmitted to a model.
export async function agentPerformance(tx: Prisma.TransactionClient) {
  return tx.$queryRaw<Array<{
    agentKey:string; completed:number; failed:number; interrupted:number;
    reviewed:number; cancelled:number; durationSamples:number;
    averageExecutionMs:number|null; reservedMicroUsd:string;
    knownEstimatedMicroUsd:string; unknownEstimates:number;
  }>>`SELECT "agentKey",
    count(*) FILTER(WHERE state='COMPLETED')::int AS completed,
    count(*) FILTER(WHERE state='FAILED')::int AS failed,
    count(*) FILTER(WHERE state='INTERRUPTED')::int AS interrupted,
    count(*) FILTER(WHERE state='REVIEWED')::int AS reviewed,
    count(*) FILTER(WHERE state='CANCELLED')::int AS cancelled,
    count(*) FILTER(WHERE state='COMPLETED' AND "finishedAt">="startedAt")::int AS "durationSamples",
    avg(EXTRACT(EPOCH FROM ("finishedAt"-"startedAt"))*1000)
      FILTER(WHERE state='COMPLETED' AND "finishedAt">="startedAt")::double precision AS "averageExecutionMs",
    COALESCE(sum("reservedCostMicroUsd"),0)::text AS "reservedMicroUsd",
    COALESCE(sum("estimatedCostMicroUsd"),0)::text AS "knownEstimatedMicroUsd",
    sum(CASE WHEN "attemptCount">0 THEN "unknownCostAttempts" WHEN "dispatchedAt" IS NOT NULL AND "estimatedCostMicroUsd" IS NULL THEN 1 ELSE 0 END)::int AS "unknownEstimates"
    FROM "AiAgentTask" GROUP BY "agentKey"`;
}

export function performanceView(row:Awaited<ReturnType<typeof agentPerformance>>[number]|undefined) {
  const amount=(value:string|undefined)=>{const n=Number(value??'0');return Number.isSafeInteger(n)&&n>=0?n:null;};
  return {period:'ALL_RECORDED_TASKS',completed:row?.completed??0,failed:row?.failed??0,
    interrupted:row?.interrupted??0,reviewed:row?.reviewed??0,cancelled:row?.cancelled??0,
    durationSamples:row?.durationSamples??0,averageExecutionMs:row?.averageExecutionMs??null,
    reservedMicroUsd:amount(row?.reservedMicroUsd),knownEstimatedMicroUsd:amount(row?.knownEstimatedMicroUsd),
    unknownEstimates:row?.unknownEstimates??0,
    acceptanceRate:null,acceptanceStatus:'REQUIRES_LINKED_FINAL_REVIEW',
    costKind:'ESTIMATE_AND_RESERVATION_NOT_INVOICE'};
}
