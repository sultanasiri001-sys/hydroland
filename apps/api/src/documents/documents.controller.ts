import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, AccessTokenPrincipal } from '../auth/access-token.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { DocumentsService } from './documents.service';
import { RegisterDocumentDto } from './dto/register-document.dto';
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

  @Get(':publicId/read-url')
  createReadUrl(@CurrentUser() user: AccessTokenPrincipal, @Param('publicId') publicId: string) {
    return this.documents.createReadUrl(user.sub, publicId);
  }

  @Post()
  register(@CurrentUser() user: AccessTokenPrincipal, @Body() input: RegisterDocumentDto) {
    return this.documents.register(user.sub, input);
  }
}
