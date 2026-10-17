import {randomBytes, scryptSync, createHmac} from 'node:crypto';

export const actors = ['manager', 'accountant1', 'accountant2', 'finance1', 'finance2', 'admin', 'outsider'];
export const passwordFor = (actor, secret) => createHmac('sha256', secret).update('hydroland-center-uat:' + actor).digest('base64url');

export async function seedUat(db, secret) {
  await db.$transaction(async tx => {
    const marker = await tx.$queryRaw`SELECT seeded FROM "HydrolandUatState" WHERE id=1 FOR UPDATE`;
    if (marker[0]?.seeded) return;
    if (await tx.account.count() || await tx.organization.count()) throw new Error('UAT_NONEMPTY_SEED_DENIED');
    const accounts = {};
    for (const actor of actors) {
      const salt = randomBytes(16).toString('hex');
      const passwordHash = salt + ':' + scryptSync(passwordFor(actor, secret), salt, 64).toString('hex');
      accounts[actor] = await tx.account.create({data:{email:actor+'@center-uat.hydroland.test',passwordHash,status:'ACTIVE',emailVerifiedAt:new Date(),person:{create:{firstName:'تجريبي',lastName:actor}},roleAssignments:{create:{role:actor==='admin'?'ADMIN':'DIVE_CENTER',status:'ACTIVE',activeAt:new Date(),scope:{purpose:'CENTER_UAT_SYNTHETIC'}}}}});
    }
    for (const [suffix, owner] of [['A', 'manager'], ['B', 'outsider']]) {
      const org = await tx.organization.create({data:{displayName:'مركز اختبار '+suffix+' — بيانات وهمية',kind:'DIVE_CENTER',regionCode:'ASIR',status:'ACTIVE',ownerId:accounts[owner].id}});
      const center = await tx.orgUnit.create({data:{organizationId:org.id,type:'CENTER',code:'UAT-'+suffix,nameAr:'فرع الاختبار '+suffix,active:true}});
      const hq = await tx.orgUnit.create({data:{organizationId:org.id,type:'HQ',code:'UAT-HQ-'+suffix,nameAr:'إدارة اختبار '+suffix,active:true}});
      const jobs = suffix==='A' ? [['manager','CENTER_MANAGER',center],['accountant1','CENTER_ACCOUNTANT',center],['accountant2','BRANCH_ACCOUNTANT',center],['finance1','CENTRAL_FINANCE',hq],['finance2','FINANCE_MANAGER',hq]] : [['outsider','CENTER_MANAGER',center]];
      for (const [actor, code, unit] of jobs) {
        await tx.organizationMember.create({data:{organizationId:org.id,accountId:accounts[actor].id,role:actor===owner?'OWNER':'ADMIN',status:'ACTIVE'}});
        const position = await tx.position.create({data:{orgUnitId:unit.id,code,titleAr:'وظيفة اختبار '+code,active:true}});
        await tx.employment.create({data:{accountId:accounts[actor].id,organizationId:org.id,orgUnitId:unit.id,positionId:position.id,workerClass:'EMPLOYEE',status:'ACTIVE',startsAt:new Date()}});
      }
    }
    await tx.auditEvent.create({data:{action:'CENTER_UAT_INITIALIZED',resource:'HydrolandUatState',resourceId:'1',metadata:{synthetic:true,accounts:actors.length,productionDataCopied:false}}});
    await tx.$executeRaw`UPDATE "HydrolandUatState" SET seeded=true WHERE id=1`;
  }, {timeout:30000});
}
