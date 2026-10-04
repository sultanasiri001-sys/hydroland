import { Prisma } from '@prisma/client';

// Center suspension revokes operational access without deleting training history.
// Independent training (no center) keeps its existing instructor authorization.
export async function instructorCenterScope(db:Prisma.TransactionClient,accountId:string):Promise<Prisma.TrainingEnrollmentWhereInput>{
 const memberships=await db.organizationMember.findMany({
  where:{accountId,role:'INSTRUCTOR',status:'ACTIVE',organization:{kind:'DIVE_CENTER',status:'ACTIVE'}},
  select:{organizationId:true},
 });
 return {OR:[{centerOrganizationId:null},{centerOrganizationId:{in:memberships.map(row=>row.organizationId)}}]};
}

export async function hasInstructorCenterAccess(db:Prisma.TransactionClient,accountId:string,centerOrganizationId:string|null){
 if(centerOrganizationId===null)return true;
 return Boolean(await db.organizationMember.findFirst({where:{accountId,organizationId:centerOrganizationId,role:'INSTRUCTOR',status:'ACTIVE',organization:{kind:'DIVE_CENTER',status:'ACTIVE'}},select:{id:true}}));
}
