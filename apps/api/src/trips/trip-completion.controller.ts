import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { TripCompletionService } from './trip-completion.service';

@UseGuards(AccessTokenGuard, AdminGuard)
@Controller('trips/admin')
export class TripCompletionController {
  constructor(private readonly completion: TripCompletionService) {}

  @Post(':id/complete')
  complete(
    @Req() request: { auth: { accountId: string } },
    @Param('id') id: string,
    @Body()
    body: {
      siteName?: string;
      regionCode?: string;
      maxDepthM?: number;
      durationMin?: number;
      instructorName?: string;
      notes?: string;
    },
  ) {
    return this.completion.complete(request.auth.accountId, id, body);
  }
}
