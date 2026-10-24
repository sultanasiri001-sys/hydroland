import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export async function requireVerifiedAdmin(tx:Prisma.TransactionClient,accountId:string){
  const actor=await tx.account.findFirst({where:{id:accountId,status:'ACTIVE',emailVerifiedAt:{not:null},roleAssignments:{some:{role:'ADMIN',status:'ACTIVE'}}},select:{id:true,personId:true}});
  if(!actor)throw new ForbiddenException('Active verified ADMIN account required.');
  return actor;
}

// All admin identity writes use the same deterministic order as session issuance.
export async function lockAdminIdentities(tx:Prisma.TransactionClient,actorId:string,targetId=actorId,additionalAccountIds:string[]=[]){
  await lockAccountIdentities(tx,[actorId,targetId,...additionalAccountIds]);
  return requireVerifiedAdmin(tx,actorId);
}

export async function lockAccountIdentities(tx:Prisma.TransactionClient,accountIds:string[]){
  const ids=[...new Set(accountIds)].sort();
  await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Account" WHERE "id"::text IN (${Prisma.join(ids)}) ORDER BY "id" FOR UPDATE`);
  await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "RoleAssignment" WHERE "accountId"::text IN (${Prisma.join(ids)}) AND "role"='ADMIN' ORDER BY "id" FOR UPDATE`);
}
