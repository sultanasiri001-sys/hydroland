import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, AccessTokenPrincipal } from '../auth/access-token.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { DocumentsService } from './documents.service';
import { RequestUploadDto } from './dto/request-upload.dto';

@Controller('me/documents')
@UseGuards(AccessTokenGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  listMine(@CurrentUser() user: AccessTokenPrincipal) {
    return this.documents.listMine(user.sub);
  }

  @Post('upload-intent')
  requestUpload(@CurrentUser() user: AccessTokenPrincipal, @Body() input: RequestUploadDto) {
    return this.documents.requestUpload(user.sub, input);
  }

  @Post('upload-intent/:intentPublicId/complete')
  completeUpload(@CurrentUser() user: AccessTokenPrincipal, @Param('intentPublicId') intentPublicId: string) {
    return this.documents.completeUpload(user.sub, intentPublicId);
  }

  @Get(':publicId/read-url')
  createReadUrl(@CurrentUser() user: AccessTokenPrincipal, @Param('publicId') publicId: string) {
    return this.documents.createReadUrl(user.sub, publicId);
  }
}
