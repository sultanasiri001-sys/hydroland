import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CredentialsService } from './credentials.service';
@UseGuards(AccessTokenGuard) @Controller('credentials') export class CredentialsController {
 constructor(private readonly service:CredentialsService){}
 @Get() list(@Req() r:{auth:{accountId:string}}){return this.service.list(r.auth.accountId)}
 @Post() create(@Req() r:{auth:{accountId:string}},@Body() b:{issuer:string;title:string;credentialNumber?:string;issuedAt?:string;expiresAt?:string}){return this.service.create(r.auth.accountId,b)}
 @Post(':id/documents') attach(@Req() r:{auth:{accountId:string}},@Param('id') id:string,@Body() b:{storageKey:string;originalName:string;mimeType:string;byteSize:number;sha256:string}){return this.service.attachDocument(r.auth.accountId,id,b)}
}