import { PrismaClient } from '@prisma/client';
import { createHmac } from 'node:crypto';
const db=new PrismaClient(),base=process.env.ADMIN_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1',secret=process.env.JWT_SECRET;
if(!secret)throw new Error('JWT_SECRET required');
const suffix=Date.now().toString(),enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),now=Math.floor(Date.now()/1000);
const token=id=>{const payload=enc({alg:'HS256',typ:'JWT'})+'.'+enc({sub:id,iat:now,exp:now+900});return payload+'.'+createHmac('sha256',secret).update(payload).digest('base64url')};
const call=(path,method,id,body)=>fetch(base+path,{method,headers:{authorization:'Bearer '+token(id),'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
const expect=async(r,status,label)=>{if(r.status!==status)throw new Error(label+' expected '+status+', got '+r.status+' '+await r.text())};
const mk=async(last)=>{const p=await db.person.create({data:{firstName:'A09',lastName:last}});return db.account.create({data:{personId:p.id,email:'a09-'+last.toLowerCase()+'-'+suffix+'@example.invalid',passwordHash:'e2e',status:'ACTIVE',emailVerifiedAt:new Date()}})};
try{
 const manager=await mk('Manager'),reviewer=await mk('Reviewer'),outsider=await mk('Outsider'),creator=await mk('Creator'),signer=await mk('Signer');
 const org=await db.organization.create({data:{displayName:'A09 E2E '+suffix,kind:'DIVE_CENTER',ownerId:manager.id}});
 const other=await db.organization.create({data:{displayName:'A09 Other '+suffix,kind:'DIVE_CENTER',ownerId:outsider.id}});
 for(const [a,o,role] of [[manager,org,'ADMIN'],[reviewer,org,'STAFF'],[creator,org,'STAFF'],[signer,org,'ADMIN'],[outsider,other,'ADMIN']])await db.organizationMember.create({data:{organizationId:o.id,accountId:a.id,role,status:'ACTIVE'}});
 const sourceUnit=await db.orgUnit.create({data:{organizationId:org.id,type:'DEPARTMENT',code:'A09-SRC-'+suffix,nameAr:'الوارد والصادر'}});
 const targetUnit=await db.orgUnit.create({data:{organizationId:org.id,type:'DEPARTMENT',code:'A09-TGT-'+suffix,nameAr:'الإدارة المستلمة'}});
 const otherUnit=await db.orgUnit.create({data:{organizationId:other.id,type:'DEPARTMENT',code:'A09-OUT-'+suffix,nameAr:'إدارة خارجية'}});
 await db.roleAssignment.create({data:{accountId:reviewer.id,role:'REVIEWER',status:'ACTIVE',scope:{organizationIds:[org.id],unitIds:[targetUnit.id]}}});
 const template=await db.documentTemplate.create({data:{organizationId:org.id,code:'ADM-A09-'+suffix,titleAr:'معاملة واردة',titleEn:'Incoming correspondence',department:'ADMIN_AFFAIRS_RECORDS',fields:[{key:'subject',labelAr:'الموضوع',labelEn:'Subject',type:'TEXT',required:true}]}});
 const source=await db.managedDocument.create({data:{organizationId:org.id,templateId:template.id,referenceNumber:'HYD-ADMIN-A09-'+suffix,department:'ADMIN_AFFAIRS_RECORDS',status:'SIGNED',version:1,contentHash:'sha256:a09-'+suffix,payload:{subject:'معاملة واردة للاختبار',attachmentRefs:['attachment-ref-'+suffix]},createdByAccountId:creator.id,approvedByAccountId:manager.id,approvedAt:new Date(),signedByAccountId:signer.id,signedAt:new Date()}});
 await db.documentRevision.create({data:{documentId:source.id,version:1,contentHash:source.contentHash,payload:source.payload,createdByAccountId:creator.id}});

 let r=await call('/administrative-affairs/records','POST',manager.id,{organizationId:org.id,unitId:sourceUnit.id,managedDocumentId:source.id});await expect(r,201,'Create from signed document');
 const record=await r.json();
 if(record.managedDocumentId!==source.id||record.managedDocumentVersion!==1||record.managedDocumentContentHash!==source.contentHash||record.referenceNumber!==source.referenceNumber||record.subject!=='معاملة واردة للاختبار'||Object.hasOwn(record,'payload'))throw new Error('Registry must pin canonical document version without copying payload');
 r=await call('/administrative-affairs/records?organizationId='+encodeURIComponent(org.id)+'&q='+encodeURIComponent(suffix),'GET',manager.id);await expect(r,200,'Search registry');
 const rows=await r.json();if(rows.length!==1||rows[0].id!==record.id||rows[0].managedDocument?.revisions?.length!==1)throw new Error('Search omitted pinned document version');
 r=await call('/administrative-affairs/records?organizationId='+encodeURIComponent(org.id)+'&q='+encodeURIComponent(suffix),'GET',outsider.id);await expect(r,403,'Cross-organization search');
 r=await call('/administrative-affairs/records/'+record.id,'GET',manager.id);await expect(r,200,'Read record detail');
 const detail=await r.json();if(detail.managedDocument?.id!==source.id||detail.managedDocument?.revisions?.[0]?.contentHash!==source.contentHash)throw new Error('Record detail lost source revision');
 r=await call('/documents/'+source.id+'/archive','POST',manager.id);await expect(r,409,'Block parallel document archive');
 r=await call('/administrative-affairs/records/'+record.id+'/register','PATCH','invalid');await expect(r,401,'Invalid token');
 r=await call('/administrative-affairs/records/'+record.id+'/register','PATCH',outsider.id);await expect(r,403,'Cross-org register');
 if((await db.administrativeRecord.findUniqueOrThrow({where:{id:record.id}})).status!=='DRAFT')throw new Error('Denied register mutated state');
 r=await call('/administrative-affairs/records/'+record.id+'/register','PATCH',manager.id);await expect(r,200,'Register record');

 r=await call('/administrative-affairs/records/'+record.id+'/routings','POST',manager.id,{toUnitId:otherUnit.id});await expect(r,403,'Cross-org route');
 if(await db.administrativeRouting.count({where:{recordId:record.id}}))throw new Error('Denied route mutated state');
 r=await call('/administrative-affairs/records/'+record.id+'/routings','POST',manager.id,{toUnitId:targetUnit.id});await expect(r,201,'Route record');
 const route=await r.json();
 r=await call('/administrative-affairs/routings/'+route.id+'/assign','PATCH',manager.id,{assigneeAccountId:reviewer.id});await expect(r,200,'Assign reviewer');
 r=await call('/administrative-affairs/routings/'+route.id+'/decision','PATCH',reviewer.id,{decision:'APPROVE'});await expect(r,409,'Decision requires reply');
 r=await call('/administrative-affairs/routings/'+route.id+'/reply','POST',manager.id,{replyText:'رد غير مخول'});await expect(r,403,'Reject unauthorized reply');
 r=await call('/administrative-affairs/routings/'+route.id+'/reply','POST',reviewer.id,{replyText:'تمت مراجعة المعاملة والرد عليها'});await expect(r,201,'Record reply');
 const reply=await db.administrativeRouting.findUniqueOrThrow({where:{id:route.id}});
 if(reply.repliedByAccountId!==reviewer.id||!reply.repliedAt||reply.replyText!=='تمت مراجعة المعاملة والرد عليها')throw new Error('Reply provenance missing');
 if(!await db.auditEvent.findFirst({where:{resource:'AdministrativeRouting',resourceId:route.id,action:'ADMIN_ROUTING_REPLIED'}}))throw new Error('Reply audit missing');
 r=await call('/administrative-affairs/routings/'+route.id+'/decision','PATCH',manager.id,{decision:'APPROVE'});await expect(r,403,'Reject non-assignee decision');
 r=await call('/administrative-affairs/routings/'+route.id+'/decision','PATCH',reviewer.id,{decision:'APPROVE'});await expect(r,200,'Record independent decision');
 r=await call('/administrative-affairs/routings/'+route.id+'/deliver','PATCH',reviewer.id);await expect(r,403,'Only requester acknowledges delivery');
 r=await call('/administrative-affairs/routings/'+route.id+'/deliver','PATCH',manager.id);await expect(r,200,'Acknowledge delivery');
 const delivered=await db.administrativeRouting.findUniqueOrThrow({where:{id:route.id}});
 if(delivered.deliveredByAccountId!==manager.id||!delivered.deliveredAt)throw new Error('Delivery provenance missing');

 r=await call('/administrative-affairs/records/'+record.id+'/routings','POST',manager.id,{toUnitId:targetUnit.id});await expect(r,201,'Second route');
 const second=await r.json();
 r=await call('/administrative-affairs/routings/'+second.id+'/assign','PATCH',manager.id,{assigneeAccountId:reviewer.id});await expect(r,200,'Assign second route');
 r=await call('/administrative-affairs/records/'+record.id+'/archive','PATCH',manager.id);await expect(r,409,'Block archive with open route');
 if((await db.administrativeRecord.findUniqueOrThrow({where:{id:record.id}})).status!=='REGISTERED')throw new Error('Blocked archive mutated record');
 r=await call('/administrative-affairs/routings/'+second.id+'/reply','POST',reviewer.id,{replyText:'تم استكمال الإحالة الثانية'});await expect(r,201,'Second reply');
 r=await call('/administrative-affairs/routings/'+second.id+'/decision','PATCH',reviewer.id,{decision:'APPROVE'});await expect(r,200,'Second decision');
 r=await call('/administrative-affairs/routings/'+second.id+'/deliver','PATCH',manager.id);await expect(r,200,'Second delivery');
 r=await call('/administrative-affairs/records/'+record.id+'/archive','PATCH',outsider.id);await expect(r,403,'Cross-org archive');
 r=await call('/administrative-affairs/records/'+record.id+'/archive','PATCH',manager.id);await expect(r,200,'Archive complete correspondence');
 const archived=await db.administrativeRecord.findUniqueOrThrow({where:{id:record.id},include:{managedDocument:true}});
 if(archived.status!=='ARCHIVED'||archived.managedDocument?.status!=='ARCHIVED')throw new Error('Record and source must archive atomically');
 let retained=false;try{await db.managedDocument.delete({where:{id:source.id}});}catch{retained=true;}
 if(!retained)throw new Error('Archived linked source was deletable');
 const revision=await db.documentRevision.findUnique({where:{documentId_version:{documentId:source.id,version:1}}});
 if(!revision||revision.contentHash!==source.contentHash||revision.payload?.subject!=='معاملة واردة للاختبار')throw new Error('Archived version was not retained');
 r=await call('/administrative-affairs/records?organizationId='+encodeURIComponent(org.id)+'&q='+encodeURIComponent(suffix)+'&status=ARCHIVED','GET',manager.id);await expect(r,200,'Search archived record');
 const archivedRows=await r.json();if(archivedRows.length!==1||archivedRows[0].id!==record.id||archivedRows[0].managedDocument?.status!=='ARCHIVED')throw new Error('Archived search failed');
 const before=await db.auditEvent.count({where:{resourceId:{in:[record.id,route.id,second.id]}}});
 for(const item of [
  ['/administrative-affairs/records/'+record.id+'/routings','POST',manager.id,{toUnitId:targetUnit.id}],
  ['/administrative-affairs/routings/'+second.id+'/assign','PATCH',manager.id,{assigneeAccountId:reviewer.id}],
  ['/administrative-affairs/routings/'+second.id+'/reply','POST',reviewer.id,{replyText:'محاولة بعد الأرشفة'}],
  ['/administrative-affairs/routings/'+second.id+'/decision','PATCH',reviewer.id,{decision:'REJECT'}],
  ['/administrative-affairs/routings/'+second.id+'/deliver','PATCH',manager.id,undefined],
 ]){r=await call(item[0],item[1],item[2],item[3]);await expect(r,409,'Archived parent mutation');}
 const after=await db.auditEvent.count({where:{resourceId:{in:[record.id,route.id,second.id]}}});
 if(after!==before)throw new Error('Denied archived mutation wrote success audit');
 console.log('A09 correspondence lifecycle HTTP/DB E2E: PASS');
}finally{await db.$disconnect();}
