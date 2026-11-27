import { PrivacyModule } from '../privacy/privacy.module';
import { AuditModule } from '../audit/audit.module';
import { CommunityModule } from '../community/community.module';
import { PrivateMessageReviewController } from './private-message-review.controller';
import { PrivateMessageReviewService } from './private-message-review.service';
import { PrivateAudioService } from './private-audio.service';
import { PrivateAudioController } from './private-audio.controller';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';

@Module({imports:[PrivacyModule,AuthModule,NotificationsModule,AuditModule,CommunityModule],controllers:[MessagingController,PrivateMessageReviewController,PrivateAudioController],providers:[MessagingService,PrivateMessageReviewService,PrivateAudioService],exports:[MessagingService]})
export class MessagingModule {}
