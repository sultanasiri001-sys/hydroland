import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ReviewGuard } from '../admin/review.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CertificationVerificationEvidenceService } from './certification-verification-evidence.service';
import { CredentialsService } from './credentials.service';

@UseGuards(AccessTokenGuard)
@Controller('credentials')
export class CredentialsController {
  constructor(private readonly service:CredentialsService,private readonly verificationEvidence:CertificationVerificationEvidenceService){}

  @Get('verification-organizations')
  verificationOrganizations(){return this.verificationEvidence.list()}

  @Get()
  list(@Req() r:{auth:{accountId:string}}){return this.service.list(r.auth.accountId)}

  @Post()
  create(@Req() r:{auth:{accountId:string}},@Body() b:{issuer:string;title:string;credentialNumber?:string;issuedAt?:string;expiresAt?:string}){return this.service.create(r.auth.accountId,b)}

  @Post(':id/documents')
  attach(@Req() r:{auth:{accountId:string}},@Param('id') id:string,@Body() b:{originalName:string;mimeType:string;base64:string}){return this.service.attachDocument(r.auth.accountId,id,b)}

  @Get(':id/documents/:documentId/access')
  documentAccess(@Req() r:{auth:{accountId:string}},@Param('id') id:string,@Param('documentId') documentId:string){return this.service.documentAccess(r.auth.accountId,id,documentId)}

  @Post(':id/submit')
  submit(@Req() r:{auth:{accountId:string}},@Param('id') id:string){return this.service.submit(r.auth.accountId,id)}

  @UseGuards(ReviewGuard)
  @Get('admin/pending')
  async pendingForAdmin(@Req() r:{auth:{accountId:string}}){
    const rows=await this.service.pendingForAdmin();
    const statuses=await this.verificationEvidence.statuses(r.auth.accountId,rows.map(row=>row.id));
    return rows.map(row=>({...row,externalVerificationEvidenceRecordedAt:statuses[row.id]||null}));
  }

  @UseGuards(ReviewGuard)
  @Get('admin/:id/documents/:documentId/access')
  reviewerDocumentAccess(@Req() r:{auth:{accountId:string}},@Param('id') id:string,@Param('documentId') documentId:string){return this.service.reviewerDocumentAccess(r.auth.accountId,id,documentId)}

  @UseGuards(ReviewGuard)
  @Get('admin/:id/external-verification-evidence-status')
  externalVerificationStatus(@Req() r:{auth:{accountId:string}},@Param('id') id:string){return this.verificationEvidence.status(r.auth.accountId,id)}

  @UseGuards(ReviewGuard)
  @Post('admin/:id/external-verification-evidence')
  recordExternalVerification(
    @Req() r:{auth:{accountId:string}},
    @Param('id') id:string,
    @Body() b:{source:'SWSDF'|'PADI'|'SSI'|'NAUI'|'RAID'|'SDI'|'TDI'|'IANTD'|'GUE'|'CMAS'|'BSAC';method:'PRO_LICENSE_VALIDATION'|'ECARD'|'QR'|'ONLINE_DIVER_VERIFY'|'DIVER_LOOKUP'|'CERTIFICATION_SEARCH'|'DIGITAL_CERT'|'VERIFY_CARD'|'CMAS_CERT_SEARCH'|'DIGITAL_QCARD';reference:string;verificationUrl?:string;checkedAt?:string},
  ){return this.verificationEvidence.record(r.auth.accountId,id,b)}

  @UseGuards(ReviewGuard)
  @Post('admin/:id/decision')
  async decide(
    @Req() r:{auth:{accountId:string}},
    @Param('id') id:string,
    @Body() b:{
      outcome:'VERIFIED'|'REJECTED';
      reason?:string;
      externalVerification?:{
        source:'PADI'|'SSI';
        method:'ECARD'|'QR';
        reference:string;
        verificationUrl?:string;
        checkedAt?:string;
      };
    },
  ){
    if(b.outcome==='VERIFIED'&&!b.externalVerification)await this.verificationEvidence.assertRecorded(r.auth.accountId,id);
    return this.service.decide(r.auth.accountId,id,b);
  }
}
