import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class DiveLogReviewGuard implements CanActivate {
  constructor(private readonly db: DatabaseService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ auth?: { accountId: string } }>();
    if (!request.auth?.accountId) throw new ForbiddenException();

    const role = await this.db.roleAssignment.findFirst({
      where: {
        accountId: request.auth.accountId,
        status: 'ACTIVE',
        role: { in: ['ADMIN', 'REVIEWER', 'INSTRUCTOR'] },
      },
      select: { role: true },
    });

    if (!role) throw new ForbiddenException('Dive log review scope required.');
    return true;
  }
}
