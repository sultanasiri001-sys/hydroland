import { Module } from '@nestjs/common';
import { LegalGovernanceFoundationService } from './legal-governance-foundation.service';
@Module({ providers:[LegalGovernanceFoundationService], exports:[LegalGovernanceFoundationService] })
export class LegalGovernanceModule {}
