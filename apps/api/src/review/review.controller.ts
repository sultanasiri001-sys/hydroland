import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PermissionGuard } from '../access/permission.guard';
import { RequirePermissions } from '../access/require-permissions.decorator';
import { AccessTokenGuard, AccessTokenPrincipal } from '../auth/access-token.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ReviewRoleRequestDto } from './dto/review-role-request.dto';
import { ReviewService } from './review.service';

@Controller('review/professional-role-requests')
@UseGuards(AccessTokenGuard, PermissionGuard)
@RequirePermissions('professional.role_requests.review')
export class ReviewController {
  constructor(private readonly reviews: ReviewService) {}

  @Get()
  listPending() {
    return this.reviews.listPending();
  }

  @Post(':publicId/claim')
  claim(@CurrentUser() user: AccessTokenPrincipal, @Param('publicId') publicId: string) {
    return this.reviews.claim(user.sub, publicId);
  }

  @Post(':publicId/decision')
  decide(
    @CurrentUser() user: AccessTokenPrincipal,
    @Param('publicId') publicId: string,
    @Body() input: ReviewRoleRequestDto,
  ) {
    return this.reviews.decide(user.sub, publicId, input);
  }
}
