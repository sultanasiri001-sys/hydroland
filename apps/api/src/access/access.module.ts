import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AccessGuard } from './access.guard';
import { AccessService } from './access.service';
@Module({providers:[AccessService,AccessGuard,{provide:APP_GUARD,useExisting:AccessGuard}],exports:[AccessService,AccessGuard]})
export class AccessModule{}
