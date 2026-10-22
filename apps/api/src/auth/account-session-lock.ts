import { UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// Suspension and all session issuance paths acquire this identity lock first.
// A login/refresh racing with suspension cannot leave a session behind to revive later.
export async function lockActiveSessionAccount(tx:Prisma.TransactionClient,accountId:string){
  await tx.$queryRaw`SELECT "id" FROM "Account" WHERE "id"::text=${accountId} FOR UPDATE`;
  const account=await tx.account.findUnique({where:{id:accountId},select:{status:true,emailVerifiedAt:true}});
  if(!account||account.status!=='ACTIVE'||!account.emailVerifiedAt)throw new UnauthorizedException('Active verified account required.');
}
