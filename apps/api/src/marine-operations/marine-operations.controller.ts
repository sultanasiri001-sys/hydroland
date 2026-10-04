import {BadRequestException,Body,Controller,Get,Param,Patch,Post,Query,Req,UseGuards} from '@nestjs/common';
import {AdminGuard} from '../admin/admin.guard';
import {AccessTokenGuard} from '../auth/access-token.guard';
import {MarineAssetType} from './marine-operations.domain';
import {MarineOperationsService} from './marine-operations.service';

@UseGuards(AccessTokenGuard)
@Controller('marine-operations')
export class MarineOperationsController{
 constructor(private readonly marine:MarineOperationsService){}
 @Get('overview/mine') overview(@Req()req:{auth:{accountId:string}},@Query()query:Record<string,unknown>){if(Object.keys(query).length)throw new BadRequestException('Marine overview only returns your active organizations.');return this.marine.overviewMine(req.auth.accountId)}
 @Get('assets/mine') mine(@Req()req:{auth:{accountId:string}}){return this.marine.listMine(req.auth.accountId)}
 @Post('assets') create(@Req()req:{auth:{accountId:string}},@Body()body:{organizationId:string;name:string;assetType:MarineAssetType;registrationNumber?:string;passengerCapacity?:number}){return this.marine.createOwnedAsset(req.auth.accountId,body)}
 @Post('assets/:assetId/documents') addDocument(@Req()req:{auth:{accountId:string}},@Param('assetId')assetId:string,@Body()body:{documentType:string;referenceNumber?:string;expiresAt?:string;originalName?:string;mimeType?:string;base64?:string}){return this.marine.addDocument(req.auth.accountId,assetId,body)}
 @Get('assets/:assetId/documents/:documentId/access') documentAccess(@Req()req:{auth:{accountId:string}},@Param('assetId')assetId:string,@Param('documentId')documentId:string){return this.marine.documentAccess(req.auth.accountId,assetId,documentId)}
 @Patch('assets/:assetId/documents/:documentId') updateDocument(@Req()req:{auth:{accountId:string}},@Param('assetId')assetId:string,@Param('documentId')documentId:string,@Body()body:{referenceNumber?:string;expiresAt?:string}){return this.marine.updateDocument(req.auth.accountId,assetId,documentId,body)}
 @Post('assets/:assetId/maintenance') addMaintenance(@Req()req:{auth:{accountId:string}},@Param('assetId')assetId:string,@Body()body:{maintenanceType:string;dueAt?:string;notes?:string}){return this.marine.addOwnedMaintenance(req.auth.accountId,assetId,body)}
 @Post('assets/:assetId/maintenance/:recordId/complete') completeMaintenance(@Req()req:{auth:{accountId:string}},@Param('assetId')assetId:string,@Param('recordId')recordId:string){return this.marine.completeOwnedMaintenance(req.auth.accountId,assetId,recordId)}
 @Post('assets/:assetId/readiness') readiness(@Req()req:{auth:{accountId:string}},@Param('assetId')assetId:string){return this.marine.evaluateOwnedReadiness(req.auth.accountId,assetId)}
 @UseGuards(AdminGuard)
 @Get('admin/documents/:documentId/access') reviewerDocumentAccess(@Param('documentId')documentId:string){return this.marine.reviewerDocumentAccess(documentId)}
 @UseGuards(AdminGuard)
 @Get('admin/documents/pending') pending(){return this.marine.pendingDocuments()}
 @UseGuards(AdminGuard)
 @Post('admin/documents/:documentId/decision') decide(@Param('documentId')documentId:string,@Body()body:{outcome:'VERIFIED'|'REJECTED'}){return this.marine.decideDocument(documentId,body.outcome)}
 @UseGuards(AdminGuard)
 @Get('admin/assets/review') reviewAssets(){return this.marine.reviewAssets()}
 @UseGuards(AdminGuard)
 @Post('admin/assets/:assetId/status') decideAsset(@Param('assetId')assetId:string,@Body()body:{status:'ACTIVE'|'SUSPENDED'|'OUT_OF_SERVICE'}){return this.marine.decideAssetStatus(assetId,body.status)}
}
