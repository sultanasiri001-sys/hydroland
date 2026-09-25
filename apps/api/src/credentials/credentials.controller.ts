import { BadRequestException, Body, Controller, Get, Param, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
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
  attach(@Req() r:{auth:{accountId:string}},@Param('id') id:string,@Body() b:{storageKey:string;originalName:string;mimeType:string;byteSize:number;sha256:string}){return this.service.attachDocument(r.auth.accountId,id,b)}

  @Post(':id/documents/upload')
  @UseInterceptors(FileInterceptor('file',{limits:{fileSize:10_000_000,files:1}}))
  upload(@Req() r:{auth:{accountId:string}},@Param('id') id:string,@UploadedFile() file?:Express.Multer.File){
    if(!file)throw new BadRequestException('Document file is required.');
    return this.service.uploadDocument(r.auth.accountId,id,file);
  }

  @Get('documents/:documentId/content')
  async content(@Req() r:{auth:{accountId:string}},@Param('documentId') documentId:string,@Res() response:Response){
    const document=await this.service.getDocumentContent(r.auth.accountId,documentId);
    response.setHeader('Content-Type',document.mimeType);
    response.setHeader('Content-Length',String(document.content.length));
    response.setHeader('Content-Disposition',`inline; filename*=UTF-8''${encodeURIComponent(document.originalName)}`);
    response.setHeader('X-Content-Type-Options','nosniff');
    response.send(document.content);
  }

  @Post(':id/submit')
  submit(@Req() r:{auth:{accountId:string}},@Param('id') id:string){return this.service.submit(r.auth.accountId,id)}

  @UseGuards(ReviewGuard)
  @Get('admin/pending')
  pendingForAdmin(){return this.service.pendingForAdmin()}

  @UseGuards(ReviewGuard)
  @Post('admin/:id/decision')
  decide(@Req() r:{auth:{accountId:string}},@Param('id') id:string,@Body() b:{outcome:'VERIFIED'|'REJECTED';reason?:string}){return this.service.decide(r.auth.accountId,id,b)}
}
