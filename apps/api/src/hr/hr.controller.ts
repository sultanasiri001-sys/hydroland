import { Body, Controller, Param, Patch } from '@nestjs/common';
import { HrService } from './hr.service';
import { HrAction, HrActor, HrRequestContext } from './hr-policy';

@Controller('hr/employments')
export class HrController {
  constructor(private readonly hr: HrService) {}

  @Patch(':employmentId/status')
  changeStatus(
    @Param('employmentId') employmentId: string,
    @Body() body: {
      nextStatus: string;
      actor: HrActor;
      action: HrAction;
      context: HrRequestContext;
    },
  ) {
    return this.hr.applyEmploymentStatus({
      employmentId,
      nextStatus: body.nextStatus,
      actor: body.actor,
      action: body.action,
      context: body.context,
    });
  }
}
