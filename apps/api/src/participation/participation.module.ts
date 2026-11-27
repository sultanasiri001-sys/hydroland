import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ParticipationController } from './participation.controller';
import { ParticipationService } from './participation.service';
import { ParticipationSourcesService } from './participation-sources.service';
@Module({ imports: [AuthModule], controllers: [ParticipationController], providers: [ParticipationService, ParticipationSourcesService], exports: [ParticipationService] })
export class ParticipationModule {}
