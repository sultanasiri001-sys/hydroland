import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, AccessTokenPrincipal } from '../auth/access-token.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { DocumentsService } from './documents.service';
import { RegisterDocumentDto } from './dto/register-document.dto';

@Controller('me/documents')
@UseGuards(AccessTokenGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  listMine(@CurrentUser() user: AccessTokenPrincipal) {
    return this.documents.listMine(user.sub);
  }

  @Post()
  register(@CurrentUser() user: AccessTokenPrincipal, @Body() input: RegisterDocumentDto) {
    return this.documents.register(user.sub, input);
  }
}
