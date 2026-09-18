import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AccessContext, canAccess } from './access.types';

export interface AccessRequest { accessContext?: AccessContext; requiredPermission?: string; resourceScopeId?: string; }

@Injectable()
export class AccessGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req=ctx.switchToHttp().getRequest<AccessRequest>();
    if(!req.requiredPermission) return true;
    if(!req.accessContext || !canAccess(req.accessContext, req.requiredPermission, req.resourceScopeId)) {
      throw new ForbiddenException('Permission or scope denied');
    }
    return true;
  }
}
