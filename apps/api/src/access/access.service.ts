import { ForbiddenException, Injectable } from '@nestjs/common';
import { AccessContext, canAccess } from './access.types';

@Injectable()
export class AccessService {
  require(context: AccessContext, permission: string, resourceScopeId?: string): void {
    if (!canAccess(context, permission, resourceScopeId)) {
      throw new ForbiddenException('Permission or scope denied');
    }
  }
}
