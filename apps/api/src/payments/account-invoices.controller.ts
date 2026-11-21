import { BadRequestException, Body, Controller, Get, Header, Param, Post, Query, Req, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AccountInvoicesService } from './account-invoices.service';

type Request = {auth:{accountId:string}};
@Controller('account/invoices')
@UseGuards(AccessTokenGuard)
export class AccountInvoicesController {
  constructor(private readonly invoices:AccountInvoicesService) {}

  @Get()
  @Header('Cache-Control','private, no-store')
  list(@Req() req:Request,@Query('view') view='all',@Query('offset') offset='0',
    @Query('sourceType') sourceType?:string,@Query('sourceId') sourceId?:string) {
    if (Boolean(sourceType)!==Boolean(sourceId)) throw new BadRequestException();
    return this.invoices.list(req.auth.accountId,view,Number(offset),sourceType && sourceId ? {sourceType,sourceId} : undefined);
  }

  @Get(':sourceType/:sourceId/document')
  @Header('Cache-Control','private, no-store')
  async download(@Req() req:Request,@Param('sourceType') sourceType:string,@Param('sourceId') sourceId:string) {
    const bytes=await this.invoices.download(req.auth.accountId,{sourceType,sourceId});
    return new StreamableFile(bytes,{type:'application/pdf',disposition:'attachment; filename="invoice.pdf"'});
  }

  @Post(':sourceType/:sourceId/document')
  @UseInterceptors(FileInterceptor('document',{limits:{fileSize:5_000_000,files:1,fields:1,parts:3}}))
  attach(@Req() req:Request,@Param('sourceType') sourceType:string,@Param('sourceId') sourceId:string,
    @Body('number') number:unknown,@UploadedFile() file?:{buffer:Buffer;mimetype:string}) {
    return this.invoices.attach(req.auth.accountId,{sourceType,sourceId},number,file);
  }
}
