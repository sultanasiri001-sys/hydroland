import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessTokenPrincipal } from '../auth/access-token.guard';
import { AccessService } from './access.service';
import { REQUIRED_PERMISSIONS_KEY } from './require-permissions.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessService: AccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<{ user?: AccessTokenPrincipal }>();
    if (!request.user?.sub) throw new ForbiddenException('لا توجد هوية مستخدم موثقة');

    const access = await this.accessService.getEffectiveAccess(request.user.sub);
    const allowed = required.every((permission) => access.permissions.includes(permission));
    if (!allowed) throw new ForbiddenException('لا تملك الصلاحية المطلوبة لتنفيذ هذا الإجراء');
    return true;
  }
}
