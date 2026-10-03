import {Body,Controller,Get,Param,Post,Req,Res,UseGuards} from '@nestjs/common';
import {AccessTokenGuard} from '../auth/access-token.guard';
import {ReviewGuard} from '../admin/review.guard';
import {CenterLicensePlatformReviewService} from './center-license-platform-review.service';
@UseGuards(AccessTokenGuard,ReviewGuard)
@Controller('admin/center-licenses')
export class CenterLicensePlatformReviewController {
 constructor(private readonly review:CenterLicensePlatformReviewService){}
 @Get() list(){return this.review.list();}
 @Post(':id/decision') decide(@Req() req:{auth:{accountId:string}},@Param('id') id:string,@Body() body:{outcome?:unknown;reason?:unknown;expectedUpdatedAt?:unknown}){return this.review.decide(req.auth.accountId,id,body);}
 @Get(':id/attachment') async download(@Param('id') id:string,@Res() res:any){const file=await this.review.download(id);res.setHeader('Content-Type',file.mimeType);res.setHeader('Content-Disposition',`attachment; filename="${file.filename}"`);res.setHeader('Cache-Control','no-store');res.send(file.bytes);}
}
