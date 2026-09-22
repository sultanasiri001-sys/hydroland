import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { AgentModule } from './agents/agent.module';
import { ActivationModule } from './activation/activation.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CredentialsModule } from './credentials/credentials.module';
import { DatabaseModule } from './database/database.module';
import { DiveLogsModule } from './dive-logs/dive-logs.module';
import { GovernanceModule } from './governance/governance.module';
import { HealthController } from './health/health.controller';
import { IntegrationModule } from './integrations/integration.module';
import { InventoryModule } from './inventory/inventory.module';
import { FinanceModule } from './finance/finance.module';
import { CustomerServiceModule } from './customer-service/customer-service.module';
import { MarketingModule } from './marketing/marketing.module';
import { TechnologySecurityModule } from './technology-security/technology-security.module';
import { FacilitiesMaintenanceModule } from './facilities-maintenance/facilities-maintenance.module';
import { AdministrativeAffairsModule } from './administrative-affairs/administrative-affairs.module';
import { ExecutiveGovernanceModule } from './executive-governance/executive-governance.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SafetyModule } from './safety/safety.module';
import { TripsModule } from './trips/trips.module';
import { PaymentsModule } from './payments/payments.module';
import { StoreModule } from './store/store.module';
import { WalletModule } from './wallet/wallet.module';
import { RewardsModule } from './rewards/rewards.module';
import { ProfileModule } from './profile/profile.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ResearchMarketModule } from './research-market/research-market.module';
import { LegalGovernanceModule } from './legal-governance/legal-governance.module';
import { TripIntelligenceModule } from './trip-intelligence/trip-intelligence.module';
import { TranslationModule } from './translation/translation.module';
import { MarineOperationsModule } from './marine-operations/marine-operations.module';
import { HrModule } from './hr/hr.module';

@Module({
  imports: [DatabaseModule, AuthModule, ProfileModule, CredentialsModule, ActivationModule, AuditModule, NotificationsModule, GovernanceModule, TripsModule, SafetyModule, PaymentsModule, AdminModule, DiveLogsModule, OrganizationsModule, IntegrationModule, InventoryModule, FinanceModule, CustomerServiceModule,
    MarketingModule,
    TechnologySecurityModule,
    FacilitiesMaintenanceModule,
    AdministrativeAffairsModule,
    ExecutiveGovernanceModule, HrModule, AgentModule, ResearchMarketModule, LegalGovernanceModule, TripIntelligenceModule, TranslationModule, MarineOperationsModule, StoreModule, WalletModule, RewardsModule],
  controllers: [HealthController],
})
export class AppModule {}
