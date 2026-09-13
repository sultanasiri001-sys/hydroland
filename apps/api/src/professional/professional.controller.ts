import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AccessTokenPrincipal } from '../auth/access-token.guard';
import { CreateRoleRequestDto } from './dto/create-role-request.dto';
import { ProfessionalService } from './professional.service';

@Controller('me/professional')
@UseGuards(AccessTokenGuard)
export class ProfessionalController {
  constructor(private readonly professionalService: ProfessionalService) {}

  @Get('role-requests')
  listMyRequests(@CurrentUser() user: AccessTokenPrincipal) {
    return this.professionalService.listMyRequests(user.sub);
  }

  @Post('role-requests')
  createRoleRequest(
    @CurrentUser() user: AccessTokenPrincipal,
    @Body() input: CreateRoleRequestDto,
  ) {
    return this.professionalService.createRoleRequest(user.sub, input);
  }

  @Post('role-requests/:publicId/submit')
  submit(
    @CurrentUser() user: AccessTokenPrincipal,
    @Param('publicId') publicId: string,
  ) {
    return this.professionalService.submit(user.sub, publicId);
  }
}
