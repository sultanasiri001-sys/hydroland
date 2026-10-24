import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { contractValues } from './cooperation-contract.domain';

export interface ContractSourceSnapshot {
  version:1;
  capturedAt:string;
  fingerprint:string;
  professionalCredentialIds:string[];
  centerLicenseId:string|null;
}
// Only these contract-relevant fields are copied. Identity numbers, medical
// information, emergency contacts, documents and private files stay in profile.
export async function cooperationSources(tx:Prisma.TransactionClient,organizationId:string,centerAccountId:string,professionalAccountId:string){
  const [center,member,representative,professional]=await Promise.all([
    tx.organization.findUniqueOrThrow({where:{id:organizationId}}),
    tx.organizationMember.findUniqueOrThrow({where:{organizationId_accountId:{organizationId,accountId:centerAccountId}},select:{role:true}}),
    tx.account.findUniqueOrThrow({where:{id:centerAccountId},select:{person:{select:{firstName:true,lastName:true}}}}),
    tx.account.findUniqueOrThrow({where:{id:professionalAccountId},select:{email:true,person:{select:{id:true,firstName:true,lastName:true,phone:true,professional:true}},diverProfile:{select:{primaryPhone:true}}}}),
  ]);
  const profile=professional.person.professional,now=new Date();
  const ids=[profile?.nationalLicenseCredentialId,profile?.qualificationCredentialId].filter((id):id is string=>Boolean(id));
  const credentials=await tx.credential.findMany({where:{id:{in:ids},personId:professional.person.id}});
  const usable=(id:string|null|undefined)=>credentials.find(c=>c.id===id&&['VERIFIED','DOCUMENT_VERIFIED'].includes(c.verificationStatus)&&c.credentialNumber&&c.expiresAt&&c.expiresAt>now&&(!c.issuedAt||c.issuedAt<=now));
  const national=usable(profile?.nationalLicenseCredentialId),qualification=usable(profile?.qualificationCredentialId);
  const license=await tx.administrativeRecord.findFirst({where:{organizationId,type:{in:['LICENSE','REGULATORY_APPROVAL']},status:'REGISTERED',licenseReviewStatus:'APPROVED',licenseExpiresAt:{gt:now},licenseIssuedAt:{lte:now}},orderBy:[{updatedAt:'desc'},{id:'asc'}],select:{id:true,referenceNumber:true,subject:true,licenseExpiresAt:true}});
  const describe=(credential:NonNullable<typeof national>)=>`${credential.issuer} | ${credential.title} | ${credential.credentialNumber} | ينتهي ${credential.expiresAt!.toISOString().slice(0,10)}`;
  const values=contractValues({center:{
    legalName:center.legalName||center.displayName,
    registrationNumber:center.registrationNumber||'',address:center.address||'',
    license:license?`${license.referenceNumber} | ${license.subject} | ينتهي ${license.licenseExpiresAt!.toISOString().slice(0,10)}`:'',
    representativeCapacity:`${representative.person.firstName} ${representative.person.lastName} | ${member.role==='OWNER'?'المالك المسجل للمركز':'مدير المركز المسجل'} في المنصة`,
    trainingOrganization:center.trainingMembershipReference||'',
  },professional:{
    fullName:[professional.person.firstName,professional.person.lastName].filter(Boolean).join(' '),
    license:national?describe(national):'',qualification:qualification?describe(qualification):'',
    eligibility:profile?.eligibilityEvidenceReference||'',
    contact:[professional.email,professional.diverProfile?.primaryPhone||professional.person.phone].filter(Boolean).join(' | '),
  },terms:{}});
  const evidence={professionalCredentialIds:[...new Set([national?.id,qualification?.id].filter((id):id is string=>Boolean(id)))],centerLicenseId:license?.id??null};
  const fingerprint=createHash('sha256').update(JSON.stringify({center:values.center,professional:values.professional,brandVersion:center.documentBrandVersion,...evidence})).digest('hex');
  const snapshot:ContractSourceSnapshot={version:1,capturedAt:now.toISOString(),fingerprint,...evidence};
  return {values,snapshot,brandVersion:center.documentBrandVersion};
}
