import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { InstructorDocumentsService } from './instructor-documents.service';

type ActorRequest = { auth: { accountId: string } };
type View = 'instructor' | 'center' | 'platform';

@UseGuards(AccessTokenGuard)
@Controller('instructor-documents')
export class InstructorDocumentsController {
  constructor(private readonly documents: InstructorDocumentsService) {}

  @Get(':view')
  list(@Req() req: ActorRequest, @Param('view') view: View) {
    return this.documents.list(req.auth.accountId, view);
  }

  @Post('instructor/:kind/upload')
  upload(
    @Req() req: ActorRequest,
    @Param('kind') kind: string,
    @Body() body: Parameters<InstructorDocumentsService['upload']>[2],
  ) {
    return this.documents.upload(req.auth.accountId, kind, body);
  }

  @Get(':view/:id/access')
  access(@Req() req: ActorRequest, @Param('view') view: View, @Param('id') id: string) {
    return this.documents.access(req.auth.accountId, view, id);
  }

  @Post(':view/:id/decision')
  decide(
    @Req() req: ActorRequest,
    @Param('view') view: View,
    @Param('id') id: string,
    @Body() body: Parameters<InstructorDocumentsService['decide']>[3],
  ) {
    return this.documents.decide(req.auth.accountId, view, id, body);
  }
}
