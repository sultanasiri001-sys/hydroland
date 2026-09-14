import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { DiverMasterProfileService } from './diver-master-profile.service';

@UseGuards(AccessTokenGuard)
@Controller('me/diver-profile')
export class DiverMasterProfileController {
  constructor(private readonly divers: DiverMasterProfileService) {}

  @Get()
  get(@Req() req: { auth: { accountId: string } }) {
    return this.divers.get(req.auth.accountId);
  }

  @Patch()
  update(
    @Req() req: { auth: { accountId: string } },
    @Body() body: {
      dateOfBirth?: string | null;
      nationality?: string | null;
      identityType?: string | null;
      identityLast4?: string | null;
      primaryPhone?: string | null;
      secondaryPhone?: string | null;
      preferredContact?: string | null;
      emergencyName?: string | null;
      emergencyRelation?: string | null;
      emergencyPhone?: string | null;
      emergencyAltPhone?: string | null;
      bloodType?: string | null;
      medicalFitnessStatus?: string | null;
      medicalClearanceExpiresAt?: string | null;
      preferredLanguage?: string | null;
      notes?: string | null;
    },
  ) {
    return this.divers.upsert(req.auth.accountId, body);
  }

  @Post('equipment')
  addEquipment(
    @Req() req: { auth: { accountId: string } },
    @Body() body: { category?: string; ownership?: string; brand?: string; model?: string; serialNumber?: string; size?: string; serviceDueAt?: string | null },
  ) {
    return this.divers.addEquipment(req.auth.accountId, body);
  }
}
