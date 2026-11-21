import { AuditModule } from '../audit/audit.module';
import { PrivateMessageReviewController } from './private-message-review.controller';
import { PrivateMessageReviewService } from './private-message-review.service';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';

@Module({imports:[AuthModule,NotificationsModule,AuditModule],controllers:[MessagingController,PrivateMessageReviewController],providers:[MessagingService,PrivateMessageReviewService],exports:[MessagingService]})
export class MessagingModule {}
