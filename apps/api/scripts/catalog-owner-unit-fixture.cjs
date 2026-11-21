// In-memory Prisma delegates used by policy unit fixtures. PostgreSQL and HTTP suites bind a real organization.
function catalogOwnerDelegates(ownerId) {
  const id = 'fixture-platform';
  return {
    operationalSetting: {findUnique: async ({where}) => where.key==='PLATFORM_STAFFING_ORGANIZATION:v1' ? {value:{organizationId:id}} : null},
    organization: {findUnique: async ({where}) => where.id===id ? {id,kind:'HYDROLAND_INTERNAL_PLATFORM',status:'ACTIVE',ownerId} : null},
    account: {findFirst: async ({where}) => where.id===ownerId && where.status==='ACTIVE' &&
      where.emailVerifiedAt?.not===null && where.roleAssignments?.some?.role==='ADMIN' &&
      where.roleAssignments.some.status==='ACTIVE' ? {id:ownerId} : null},
  };
}
module.exports={catalogOwnerDelegates};
