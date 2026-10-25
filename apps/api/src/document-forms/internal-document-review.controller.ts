import { Body, ConflictException, Controller, Get, Header, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { InternalDocumentReviewService } from './internal-document-review.service';
import { DocumentPdfService } from './document-pdf.service';
type Request = {auth:{accountId:string}};
@UseGuards(AccessTokenGuard)
@Controller('document-reviews')
export class InternalDocumentReviewController {
  constructor(private readonly review:InternalDocumentReviewService,private readonly pdf:DocumentPdfService){}
  @Get('inbox') @Header('Cache-Control','private, no-store')
  inbox(@Req() r:Request,@Query('cursor') cursor?:string){return this.review.inbox(r.auth.accountId,cursor);}
  @Get('organizations/:org/documents/:id/assignment') @Header('Cache-Control','private, no-store')
  inspect(@Req() r:Request,@Param('org') org:string,@Param('id') id:string){return this.review.inspect(r.auth.accountId,org,id);}
  @Post('organizations/:org/documents/:id/plan') @Header('Cache-Control','private, no-store')
  plan(@Req() r:Request,@Param('org') org:string,@Param('id') id:string,@Body() body:unknown){return this.review.plan(r.auth.accountId,org,id,body);}
  @Post('organizations/:org/documents/:id/assignment') @Header('Cache-Control','private, no-store')
  assign(@Req() r:Request,@Param('org') org:string,@Param('id') id:string,@Body() body:unknown){return this.review.assign(r.auth.accountId,org,id,body);}
  @Post('organizations/:org/documents/:id/revoke') @Header('Cache-Control','private, no-store')
  revoke(@Req() r:Request,@Param('org') org:string,@Param('id') id:string,@Body() body:unknown){return this.review.revoke(r.auth.accountId,org,id,body);}
  @Get('organizations/:org/documents/:id/view') @Header('Cache-Control','private, no-store')
  detail(@Req() r:Request,@Param('org') org:string,@Param('id') id:string){return this.review.detail(r.auth.accountId,org,id);}
  @Post('organizations/:org/documents/:id/decisions') @Header('Cache-Control','private, no-store')
  decide(@Req() r:Request,@Param('org') org:string,@Param('id') id:string,@Body() body:unknown){return this.review.decide(r.auth.accountId,org,id,body);}
  @Get('organizations/:org/documents/:id/pdf')
  async print(@Req() r:Request,@Param('org') org:string,@Param('id') id:string,@Res() res:any){
    const before=await this.review.detail(r.auth.accountId,org,id);
    const result=await this.pdf.render(r.auth.accountId,id);
    const after=await this.review.detail(r.auth.accountId,org,id);
    // Revocation, replacement or a changed record invalidates a pending export.
    if(before.reviewHash!==after.reviewHash)throw new ConflictException('تغيرت النسخة أو الصلاحية أثناء تجهيز PDF؛ أعد المراجعة.');
    res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',`inline; filename="${result.filename.replace(/[^A-Za-z0-9._-]/g,'_')}"`);
    return res.send(result.bytes);
  }
}
