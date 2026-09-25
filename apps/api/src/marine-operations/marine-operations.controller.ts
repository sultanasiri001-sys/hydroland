import {Body,Controller,Get,Param,Patch,Post,Req,UseGuards} from '@nestjs/common';
import {AdminGuard} from '../admin/admin.guard';
import {AccessTokenGuard} from '../auth/access-token.guard';
import {MarineAssetType} from './marine-operations.domain';
import {MarineOperationsService} from './marine-operations.service';

@UseGuards(AccessTokenGuard)
@Controller('marine-operations')
export class MarineOperationsController{
 constructor(private readonly marine:MarineOperationsService){}
 @Get('assets/mine') mine(@Req()req:{auth:{accountId:string}}){return this.marine.listMine(req.auth.accountId)}
 @Post('assets') create(@Req()req:{auth:{accountId:string}},@Body()body:{organizationId:string;name:string;assetType:MarineAssetType;registrationNumber?:string;passengerCapacity?:number}){return this.marine.createOwnedAsset(req.auth.accountId,body)}
 @Post('assets/:assetId/documents') addDocument(@Req()req:{auth:{accountId:string}},@Param('assetId')assetId:string,@Body()body:{documentType:string;referenceNumber?:string;expiresAt?:string}){return this.marine.addDocument(req.auth.accountId,assetId,body)}
 @Patch('assets/:assetId/documents/:documentId') updateDocument(@Req()req:{auth:{accountId:string}},@Param('assetId')assetId:string,@Param('documentId')documentId:string,@Body()body:{referenceNumber?:string;expiresAt?:string}){return this.marine.updateDocument(req.auth.accountId,assetId,documentId,body)}
 @UseGuards(AdminGuard)
 @Get('admin/documents/pending') pending(){return this.marine.pendingDocuments()}
 @UseGuards(AdminGuard)
 @Post('admin/documents/:documentId/decision') decide(@Param('documentId')documentId:string,@Body()body:{outcome:'VERIFIED'|'REJECTED'}){return this.marine.decideDocument(documentId,body.outcome)}
}
