import { Body, Controller, Get, Param, Post, Put, Query, Req, Res, UseGuards, NotFoundException } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CooperationContractService } from './cooperation-contract.service';
import { DocumentAssetService } from './document-asset.service';
type Request = { auth: { accountId: string } };
@UseGuards(AccessTokenGuard)
@Controller('contracts/cooperation')
export class CooperationContractController {
  constructor(private readonly contracts: CooperationContractService, private readonly assets: DocumentAssetService) {}
  @Get('workspace') workspace(@Req() r: Request) { return this.contracts.workspace(r.auth.accountId); }
  @Get() list(@Req() r: Request, @Query('cursor') cursor?: string) { return this.contracts.list(r.auth.accountId, cursor); }
  @Post() create(@Req() r: Request, @Body() b: unknown) { return this.contracts.create(r.auth.accountId, b); }
  @Get(':id') get(@Req() r: Request, @Param('id') id: string) { return this.contracts.get(r.auth.accountId, id); }
  @Get(':id/logo') async logo(@Req() r: Request, @Param('id') id: string, @Res() res: any) {
    const contract=await this.contracts.get(r.auth.accountId,id);
    if(!contract.branding.logoAssetId)throw new NotFoundException('لا يوجد شعار مركز لهذا الإصدار.');
    const {asset,bytes}=await this.assets.bytesForLogo(contract.organizationId,contract.branding.logoAssetId);
    res.setHeader('Content-Type',asset.mimeType);res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
    return res.send(bytes);
  }
  @Get(':id/center-seal') async centerSeal(@Req() r:Request,@Param('id') id:string,@Res() res:any){
    const contract=await this.contracts.get(r.auth.accountId,id);
    if(!contract.centerSeal)throw new NotFoundException('لا يوجد ختم مركز مثبت لهذا الإصدار.');
    const {asset,bytes}=await this.assets.bytesForCenterSeal(contract.organizationId,contract.centerSeal.assetId);
    res.setHeader('Content-Type',asset.mimeType);res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
    return res.send(bytes);
  }
  @Post(':id/sync') sync(@Req() r:Request,@Param('id') id:string,@Body() b:unknown){return this.contracts.sync(r.auth.accountId,id,b);}
  @Put(':id/fields') save(@Req() r: Request, @Param('id') id: string, @Body() b: unknown) { return this.contracts.save(r.auth.accountId, id, b); }
  @Post(':id/issue') issue(@Req() r: Request, @Param('id') id: string, @Body() b: unknown) { return this.contracts.issue(r.auth.accountId, id, b); }
  @Post(':id/sign') sign(@Req() r: Request, @Param('id') id: string, @Body() b: unknown) { return this.contracts.sign(r.auth.accountId, id, b); }
  @Post(':id/decision') decide(@Req() r: Request, @Param('id') id: string, @Body() b: unknown) { return this.contracts.decide(r.auth.accountId, id, b); }
}
