import { Module } from '@nestjs/common';
import { AccessGuard } from './access.guard';
import { AccessService } from './access.service';

@Module({ providers:[AccessService,AccessGuard], exports:[AccessService,AccessGuard] })
export class AccessModule {}
