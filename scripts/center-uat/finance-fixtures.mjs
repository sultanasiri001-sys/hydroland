// Synthetic invoices and captured-payment records, created locally in the UAT
// database only. No payment provider is invoked or represented as verified.
export async function seedFinanceFixtures(db) {
  await db.$transaction(async tx => {
    const state=await tx.$queryRaw`SELECT seeded FROM "HydrolandUatState" WHERE id=1 FOR UPDATE`;
    if(!state[0]?.seeded) throw new Error('UAT_IDENTITIES_REQUIRED');
    const marker={action:'CENTER_UAT_FINANCE_FIXTURES_V1',resource:'HydrolandUatState',resourceId:'finance-fixtures-v1'};
    if(await tx.auditEvent.findFirst({where:marker})) return;
    const centers={};
    const customers={};
    for(const suffix of ['A','B']) {
      const units=await tx.orgUnit.findMany({where:{code:'UAT-'+suffix}});
      if(units.length!==1) throw new Error('UAT_FIXTURE_CENTER_AMBIGUOUS');
      const unit=units[0];
      const organization=await tx.organization.findUniqueOrThrow({where:{id:unit.organizationId}});
      if(unit.type!=='CENTER'||!unit.active||organization.kind!=='DIVE_CENTER'||!organization.displayName.includes('بيانات وهمية')) throw new Error('UAT_FIXTURE_CENTER_MISMATCH');
      centers[suffix]=unit;
      // No password or external identity: these active customer records cannot log in.
      customers[suffix]=await tx.account.create({data:{email:'customer-'+suffix.toLowerCase()+'@fixtures.hydroland.test',status:'ACTIVE',passwordHash:'UAT_CUSTOMER_LOGIN_DISABLED',person:{create:{firstName:'عميل وهمي',lastName:'للمركز '+suffix}}}});
    }
    const scenarios=[
      {key:'A-001',center:'A',total:100000,parts:[40000,60000]},
      {key:'A-002',center:'A',total:70000,parts:[40000]},
      {key:'B-001',center:'B',total:90000,parts:[40000]},
    ];
    for(const scenario of scenarios) {
      const accountId=customers[scenario.center].id;
      const trip=await tx.trip.create({data:{organizationId:centers[scenario.center].organizationId,title:'اختبار مالي وهمي '+scenario.key,type:'UAT_SYNTHETIC',status:'DRAFT',startsAt:new Date('2030-01-01T06:00:00Z'),endsAt:new Date('2030-01-01T08:00:00Z'),capacity:1}});
      const booking=await tx.booking.create({data:{tripId:trip.id,accountId,status:'PENDING'}});
      await tx.payment.create({data:{bookingId:booking.id,accountId,amountMinor:scenario.total,currency:'SAR',status:'CREATED',idempotencyKey:'center-uat-v1:'+scenario.key+':invoice',invoice:{create:{number:'UAT-'+scenario.key,status:'ISSUED',issuedAt:new Date()}}}});
      for(const [i,amountMinor] of scenario.parts.entries()) {
        await tx.payment.create({data:{bookingId:booking.id,accountId,amountMinor,currency:'SAR',status:'CAPTURED',idempotencyKey:'center-uat-v1:'+scenario.key+':collection-'+(i+1)}});
      }
    }
    await tx.auditEvent.create({data:{...marker,metadata:{synthetic:true,customerRecords:2,invoices:3,capturedPaymentFixtures:4,externalProviderCalls:0,productionDataCopied:false}}});
  },{timeout:30000});
}
