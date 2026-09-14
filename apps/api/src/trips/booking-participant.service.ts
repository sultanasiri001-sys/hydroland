import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { PolicyControlService } from './policy-control.service';

type ParticipantInput = { fullName?:string; certificationTitle?:string|null; certificationNumber?:string|null; certificationIssuer?:string|null };
type ParticipantRow = { id:string; bookingId:string; accountId:string|null; fullName:string; certificationTitle:string|null; certificationNumber:string|null; certificationIssuer:string|null; eligibilityStatus:string; createdAt:Date; updatedAt:Date };
type DbClient = DatabaseService | Prisma.TransactionClient;

@Injectable()
export class BookingParticipantService {
  constructor(private readonly db:DatabaseService,private readonly policies:PolicyControlService) {}

  async ensureForBooking(bookingId:string,accountId:string,seats:number,client?:Prisma.TransactionClient){
    const db:DbClient=client??this.db;
    const current=await db.$queryRaw<ParticipantRow[]>`SELECT * FROM "BookingParticipant" WHERE "bookingId"=${bookingId} ORDER BY "createdAt" ASC`;if(current.length>=seats)return current;
    const account=await db.account.findUnique({where:{id:accountId},select:{person:{select:{firstName:true,lastName:true,credentials:{where:{verificationStatus:{in:['VERIFIED','DOCUMENT_VERIFIED']}},orderBy:{issuedAt:'desc'},take:1,select:{title:true,credentialNumber:true,issuer:true,verificationStatus:true}}}}}});if(!account)throw new NotFoundException('Booking account not found.');
    const profileRows=await db.$queryRaw<Array<{medicalFitnessStatus:string|null;medicalClearanceExpiresAt:Date|null}>>`SELECT "medicalFitnessStatus","medicalClearanceExpiresAt" FROM "DiverProfile" WHERE "accountId"=${accountId} LIMIT 1`;
    const profile=profileRows[0]??null,credential=account.person.credentials[0]??null,medicalValid=profile?.medicalFitnessStatus==='FIT'&&(!profile.medicalClearanceExpiresAt||profile.medicalClearanceExpiresAt>new Date()),primaryEligible=Boolean(credential&&medicalValid);
    for(let index=current.length;index<seats;index++){
      if(index===0)await db.$executeRaw`INSERT INTO "BookingParticipant"("id","bookingId","accountId","fullName","certificationTitle","certificationNumber","certificationIssuer","eligibilityStatus","createdAt","updatedAt") VALUES(gen_random_uuid()::text,${bookingId},${accountId},${`${account.person.firstName} ${account.person.lastName}`.trim()},${credential?.title??null},${credential?.credentialNumber??null},${credential?.issuer??null},${primaryEligible?'ELIGIBLE':'PENDING'},NOW(),NOW())`;
      else await db.$executeRaw`INSERT INTO "BookingParticipant"("id","bookingId","accountId","fullName","eligibilityStatus","createdAt","updatedAt") VALUES(gen_random_uuid()::text,${bookingId},NULL,${`مشارك ${index+1} - البيانات غير مكتملة`},'PENDING',NOW(),NOW())`;
    }
    return db.$queryRaw<ParticipantRow[]>`SELECT * FROM "BookingParticipant" WHERE "bookingId"=${bookingId} ORDER BY "createdAt" ASC`;
  }

  async listForOwner(accountId:string,bookingId:string){const booking=await this.db.booking.findUnique({where:{id:bookingId},select:{accountId:true}});if(!booking||booking.accountId!==accountId)throw new NotFoundException('Booking not found.');return this.db.$queryRaw<ParticipantRow[]>`SELECT * FROM "BookingParticipant" WHERE "bookingId"=${bookingId} ORDER BY "createdAt" ASC`;}

  async updateForOwner(accountId:string,bookingId:string,participantId:string,input:ParticipantInput){const booking=await this.db.booking.findUnique({where:{id:bookingId},select:{accountId:true,status:true}});if(!booking||booking.accountId!==accountId)throw new NotFoundException('Booking not found.');if(booking.status==='CANCELLED')throw new ConflictException('Cancelled booking cannot be updated.');const fullName=input.fullName?.trim();if(!fullName||fullName.length<3)throw new BadRequestException('Participant full name is required.');const rows=await this.db.$queryRaw<ParticipantRow[]>`SELECT * FROM "BookingParticipant" WHERE "id"=${participantId} AND "bookingId"=${bookingId} LIMIT 1`;if(!rows.length)throw new NotFoundException('Participant not found.');await this.db.$executeRaw`UPDATE "BookingParticipant" SET "fullName"=${fullName},"certificationTitle"=${input.certificationTitle?.trim()||null},"certificationNumber"=${input.certificationNumber?.trim()||null},"certificationIssuer"=${input.certificationIssuer?.trim()||null},"eligibilityStatus"='PENDING',"updatedAt"=NOW() WHERE "id"=${participantId}`;return this.listForOwner(accountId,bookingId);}

  async setEligibility(bookingId:string,participantId:string,status:'ELIGIBLE'|'REJECTED'){if(status!=='ELIGIBLE'&&status!=='REJECTED')throw new BadRequestException('Invalid eligibility status.');const updated=await this.db.$executeRaw`UPDATE "BookingParticipant" SET "eligibilityStatus"=${status},"updatedAt"=NOW() WHERE "id"=${participantId} AND "bookingId"=${bookingId}`;if(!updated)throw new NotFoundException('Participant not found.');return this.db.$queryRaw<ParticipantRow[]>`SELECT * FROM "BookingParticipant" WHERE "bookingId"=${bookingId} ORDER BY "createdAt" ASC`;}

  async assertConfirmable(bookingId:string,seats:number){
    const policy=await this.policies.decision('BOOKING','PARTICIPANT_ELIGIBILITY');
    const rows=await this.db.$queryRaw<ParticipantRow[]>`SELECT * FROM "BookingParticipant" WHERE "bookingId"=${bookingId}`;
    const issues:string[]=[];
    if(rows.length!==seats)issues.push('PARTICIPANT_COUNT_MISMATCH');
    const incomplete=rows.filter((row:ParticipantRow)=>row.eligibilityStatus!=='ELIGIBLE');if(incomplete.length)issues.push('PARTICIPANT_ELIGIBILITY_PENDING');
    if(policy.enforce&&issues.length)throw new ConflictException(`${issues.length} participant eligibility requirement(s) are not satisfied.`);
    return {policyState:policy.state,reviewRequired:policy.review&&issues.length>0,bypassed:policy.bypass,issues,incompleteParticipants:incomplete.length};
  }
}
