import { OrganizationMembershipService } from './organization-membership.service';
import { CenterEquipmentManagementService } from './center-equipment-management.service';
import { CenterTripManagementService } from './center-trip-management.service';
import {CenterLicensePlatformReviewService} from './center-license-platform-review.service';
import {CenterLicensePlatformReviewController} from './center-license-platform-review.controller';
import { AdministrativeAffairsModule } from '../administrative-affairs/administrative-affairs.module';
import { CenterLicenseService } from './center-license.service';
import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TripsModule } from '../trips/trips.module';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { DiveCenterPortalController } from './dive-center-portal.controller';
import { DiveCenterPortalService } from './dive-center-portal.service';

@Module({
  imports: [AdministrativeAffairsModule, AuthModule, AdminModule, AuditModule, NotificationsModule, TripsModule],
  controllers: [CenterLicensePlatformReviewController, OrganizationsController, DiveCenterPortalController],
  providers: [OrganizationMembershipService, CenterEquipmentManagementService, CenterTripManagementService, CenterLicensePlatformReviewService, OrganizationsService, DiveCenterPortalService, CenterLicenseService],
})
export class OrganizationsModule {}
