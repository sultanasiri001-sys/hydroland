import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ReviewGuard } from '../admin/review.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CredentialsService } from './credentials.service';

@UseGuards(AccessTokenGuard)
@Controller('credentials')
export class CredentialsController {
  constructor(private readonly service:CredentialsService){}

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
  pendingForAdmin(){return this.service.pendingForAdmin()}

  @UseGuards(ReviewGuard)
  @Get('admin/:id/documents/:documentId/access')
  reviewerDocumentAccess(@Req() r:{auth:{accountId:string}},@Param('id') id:string,@Param('documentId') documentId:string){return this.service.reviewerDocumentAccess(r.auth.accountId,id,documentId)}

  @UseGuards(ReviewGuard)
  @Post('admin/:id/decision')
  decide(
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
  ){return this.service.decide(r.auth.accountId,id,b)}
}
