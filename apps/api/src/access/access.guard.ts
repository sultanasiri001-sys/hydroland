import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { SessionService } from '../auth/session.service';
import { AccessService } from './access.service';
import { AccessContext } from './access.types';

export interface AccessRequest {
  headers?: { authorization?: string };
  accessContext?: AccessContext;
  requiredPermission?: string;
  resourceScopeId?: string;
}

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionService,
    private readonly access: AccessService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AccessRequest>();
    if (!req.requiredPermission) return true;

    const header = req.headers?.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Bearer token required');

    const token = header.slice(7).trim();
    if (!token) throw new UnauthorizedException('Bearer token required');

    const session = await this.sessions.validate(token);
    const accessContext = await this.access.resolve(session.accountId);
    req.accessContext = accessContext;

    if (!accessContext.active) throw new ForbiddenException('Account inactive');
    this.access.require(accessContext, req.requiredPermission, req.resourceScopeId);
    return true;
  }
}
