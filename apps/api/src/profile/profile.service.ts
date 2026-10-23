import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ProfileService {
  constructor(private readonly db: DatabaseService) {}
  async get(accountId: string) {
    return this.db.account.findUniqueOrThrow({
      where: { id: accountId },
      select: {
        id: true,
        email: true,
        status: true,
        roleAssignments: {
          select: { id: true, role: true, status: true, activeAt: true, updatedAt: true },
          orderBy: { createdAt: 'asc' },
        },
        person: { select: { firstName: true, lastName: true, phone: true, professional: true } },
      },
    });
  }
  async update(accountId: string, input: { firstName?: string; lastName?: string; phone?: string; headline?: string; bio?: string; regionCode?: string; nationalLicenseCredentialId?: string | null; qualificationCredentialId?: string | null; eligibilityEvidenceReference?: string | null }) {
    const sourceKeys=['nationalLicenseCredentialId','qualificationCredentialId','eligibilityEvidenceReference'] as const;
    for(const key of sourceKeys){const value=input[key];if(value!==undefined&&value!==null&&(typeof value!=='string'||value.length>(key==='eligibilityEvidenceReference'?500:80)||/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(value)))throw new BadRequestException('بيانات مراجع العضوية غير صالحة.');}
    const account=await this.db.account.findUniqueOrThrow({where:{id:accountId},select:{personId:true}});
    for(const key of ['nationalLicenseCredentialId','qualificationCredentialId'] as const){
      const value=input[key]?.trim();if(value&&!await this.db.credential.findFirst({where:{id:value,personId:account.personId},select:{id:true}}))throw new BadRequestException('اختر شهادة مسجلة في حسابك.');
    }
    const sourcePatch=Object.fromEntries(sourceKeys.filter(k=>input[k]!==undefined).map(k=>[k,input[k]?.trim()||null]));
    if (input.firstName !== undefined && !input.firstName.trim()) throw new BadRequestException('First name cannot be empty.');
    return this.db.account.update({
      where: { id: accountId },
      data: {
        person: {
          update: {
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone,
            professional: {
              upsert: {
                create: { ...sourcePatch, headline: input.headline, bio: input.bio, regionCode: input.regionCode },
                update: { ...sourcePatch, headline: input.headline, bio: input.bio, regionCode: input.regionCode }
              }
            }
          }
        }
      },
      select: { id: true, person: { include: { professional: true } } }
    });
  }
}
