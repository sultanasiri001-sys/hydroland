import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { TrainingService } from './training.service';

@Controller('training')
export class TrainingController {
  constructor(private readonly service:TrainingService) {}
  @Get('courses') courses(){ return this.service.courses(); }
  @UseGuards(AccessTokenGuard) @Get('enrollments/mine') mine(@Req() req:{auth:{accountId:string}}){ return this.service.mine(req.auth.accountId); }
  @UseGuards(AccessTokenGuard) @Post('courses/:courseId/enroll') enroll(@Req() req:{auth:{accountId:string}},@Param('courseId') courseId:string){ return this.service.enroll(req.auth.accountId,courseId); }
  @UseGuards(AccessTokenGuard) @Post('instructor/courses') create(@Req() req:{auth:{accountId:string}},@Body() body:{title:string;description?:string;level?:string;capacity?:number}){ return this.service.createCourse(req.auth.accountId,body); }
}
