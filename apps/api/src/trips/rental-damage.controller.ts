import { Body, Controller, Get, Header, Param, Post, Req, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { RentalDamageService } from './rental-damage.service';

type Request = {auth:{accountId:string}};

@UseGuards(AccessTokenGuard)
@Controller('trips/rental-damage')
export class RentalDamageController {
  constructor(private readonly damage:RentalDamageService) {}
  @Get('center')
  center(@Req() req:Request){return this.damage.centerItems(req.auth.accountId);}

  @Get('center/missing-items')
  missingItems(@Req() req:Request){return this.damage.missingItems(req.auth.accountId);}

  @Post('items/:id/missing')
  missing(@Req() req:Request,@Param('id') id:string,@Body() body:{reason?:string;circumstance?:string;proposal?:string;valuation?:string;recovery?:string}){
    return this.damage.missing(req.auth.accountId,id,body);
  }

  @Post('items/:id')
  @UseInterceptors(FileInterceptor('document',{limits:{fileSize:10_000_000,files:1,fields:2,parts:4}}))
  submit(@Req() req:Request,@Param('id') id:string,@Body() body:{amountMinor?:string;kind?:string},@UploadedFile() file?:{buffer:Buffer;mimetype:string}){
    return this.damage.submit(req.auth.accountId,id,body,file);
  }
  @Get('items/:id/mine')
  mine(@Req() req:Request,@Param('id') id:string){return this.damage.mine(req.auth.accountId,id);}

  @Get(':id/document')
  @Header('Cache-Control','private, no-store')
  @Header('X-Content-Type-Options','nosniff')
  async document(@Req() req:Request,@Param('id') id:string){
    return new StreamableFile(await this.damage.evidence(req.auth.accountId,id),{type:'application/pdf',disposition:'attachment; filename="repair.pdf"'});
  }
  @Post(':id/respond')
  respond(@Req() req:Request,@Param('id') id:string,@Body() body:{decision?:string;reason?:string}){
    return this.damage.decide(req.auth.accountId,id,'renter',body);
  }
  @Post(':id/review')
  review(@Req() req:Request,@Param('id') id:string,@Body() body:{decision?:string;reason?:string}){
    return this.damage.decide(req.auth.accountId,id,'review',body);
  }
}
