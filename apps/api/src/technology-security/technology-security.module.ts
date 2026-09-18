import { Module } from '@nestjs/common';
import { TechnologySecurityFoundationService } from './technology-security-foundation.service';

@Module({
  providers: [TechnologySecurityFoundationService],
  exports: [TechnologySecurityFoundationService],
})
export class TechnologySecurityModule {}
