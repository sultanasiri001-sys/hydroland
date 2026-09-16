import { Injectable } from '@nestjs/common';
import { GovernanceAction, ScopedPermission } from './domain';

export interface PermissionContext {
  role: string;
  action: GovernanceAction;
  resource: string;
  centerId?: string;
  departmentId?: string;
  now?: Date;
}

@Injectable()
export class PolicyEngineService {
  evaluate(permissions: ScopedPermission[], context: PermissionContext): { allowed: boolean; matched: ScopedPermission[] } {
    const now = context.now ?? new Date();
    const matched = permissions.filter((permission) => {
      if (permission.role !== context.role || permission.action !== context.action || permission.resource !== context.resource) return false;
      if (permission.centerId && permission.centerId !== context.centerId) return false;
      if (permission.departmentId && permission.departmentId !== context.departmentId) return false;
      if (permission.effectiveFrom && now < new Date(permission.effectiveFrom)) return false;
      if (permission.effectiveUntil && now > new Date(permission.effectiveUntil)) return false;
      return true;
    });
    if (matched.some((permission) => permission.effect === 'DENY')) return { allowed: false, matched };
    return { allowed: matched.some((permission) => permission.effect === 'ALLOW'), matched };
  }

  can(permissions: ScopedPermission[], context: PermissionContext): boolean {
    return this.evaluate(permissions, context).allowed;
  }
}
