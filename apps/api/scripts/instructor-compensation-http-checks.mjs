import assert from 'node:assert/strict';

export async function checkInstructorCompensation(db,{owner,foreignOwner,instructor,centerId,request,ok}) {
  await db.organizationMember.create({data:{organizationId:centerId,accountId:instructor.id,role:'INSTRUCTOR',status:'ACTIVE'}});
  await db.roleAssignment.upsert({where:{accountId_role:{accountId:instructor.id,role:'INSTRUCTOR'}},create:{accountId:instructor.id,role:'INSTRUCTOR',status:'ACTIVE'},update:{status:'ACTIVE'}});
  const path='/center/me/professionals/'+instructor.id+'/compensation';
  const payload=(mode,rateBps,fixedMinor,expectedRevision)=>({mode,rateBps,fixedMinor,expectedRevision});
  const save=(body,actor=owner)=>request(actor,path,'PATCH',body);
  const salary=payload('SALARY_ONLY',0,0,3);
  const oldEarnings=await db.instructorEarning.count({where:{instructorAccountId:instructor.id}});
  const oldFinance=await db.financeEntry.count();
  try{
    assert.equal((await request(null,path)).status,401);
    assert.equal((await request(foreignOwner,path)).status,404);
    assert.equal((await save(salary,instructor)).status,403);
    assert.equal(ok(await request(owner,path)).terms,null);
    for(const body of [payload('PERCENTAGE',0,0,0),payload('FIXED',5,100,0),payload('FIXED_PLUS_PERCENTAGE',10001,100,0),payload('SALARY_ONLY',0,100,0),{...salary,organizationId:centerId}]){
      assert.equal((await save(body)).status,400);
    }
    for(const [input,projection] of [[payload('PERCENTAGE',1250,0,0),1251],[payload('FIXED',0,8000,1),8000],[payload('FIXED_PLUS_PERCENTAGE',1250,8000,2),9251]]){
      const saved=ok(await save(input)).terms;
      assert.equal(saved.revision,input.expectedRevision+1);
      assert.equal(ok(await request(owner,path+'?basisMinor=10004')).previewMinor,projection);
    }
    assert.equal((await save(payload('FIXED',0,8100,1))).status,409);
    const versions=await Promise.all([save(salary),save(salary),save(salary)]);
    for(const v of versions){assert.equal(ok(v).terms.revision,4);assert.equal(v.body.terms.mode,'SALARY_ONLY');}
    assert.equal(ok(await request(owner,path+'?basisMinor=999999')).previewMinor,0);
    const terms=ok(await request(instructor,'/training/professional/me/earnings')).agreements;
    assert.equal(terms.length,1);assert.equal(terms[0].mode,'SALARY_ONLY');assert.equal(terms[0].fixedMinor,0);
    const snapshots=await db.instructorCompensationAgreement.findMany({where:{organizationId:centerId,instructorAccountId:instructor.id},orderBy:{revision:'asc'}});
    assert.deepEqual(snapshots.map(r=>r.mode),['PERCENTAGE','FIXED','FIXED_PLUS_PERCENTAGE','SALARY_ONLY']);
    assert.equal(await db.auditEvent.count({where:{resource:'InstructorCompensationAgreement',resourceId:{in:snapshots.map(r=>r.id)}}}),4);
    const input={...payload('FIXED',0,8000,4),earningTiming:'عند اعتماد الحضور',reversalTerms:'مراجعة المركز عند رد الدفعة'};
    for(const invalid of [{...input,earningTiming:' '},{...input,reversalTerms:undefined},{...input,reversalTerms:'x'.repeat(1001)}]){
      assert.equal((await save(invalid)).status,400);
    }
    assert.equal(ok(await save(input)).terms.revision,5);
    assert.equal(ok(await save(input)).terms.revision,5);
    assert.equal((await save({...input,reversalTerms:'سياسة أخرى'})).status,409);
    const changed={...input,expectedRevision:5,reversalTerms:'مراجعة جزئية حسب اتفاق المركز'};
    assert.equal(ok(await save(changed)).terms.revision,6);
    const visible=ok(await request(instructor,'/training/professional/me/earnings')).agreements[0];
    assert.equal(visible.earningTiming,input.earningTiming);
    assert.equal(visible.reversalTerms,changed.reversalTerms);
    assert.equal(ok(await save(payload('FIXED',0,9000,6))).terms.reversalTerms,changed.reversalTerms);
    assert.equal(await db.instructorEarning.count({where:{instructorAccountId:instructor.id}}),oldEarnings);
    assert.equal(await db.financeEntry.count(),oldFinance);
    console.log('PASS all four instructor compensation methods, salary-only zero, exact halala rounding, role/center isolation, stale writes, concurrent replay and preserved agreement history; zero financial entries.');
  } finally {
    await db.instructorCompensationAgreement.deleteMany({where:{organizationId:centerId,instructorAccountId:instructor.id}});
    await db.organizationMember.deleteMany({where:{organizationId:centerId,accountId:instructor.id}});
  }
}
