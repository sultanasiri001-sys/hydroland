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
  isAllowed(permission: ScopedPermission, context: PermissionContext): boolean {
    if (permission.role !== context.role) return false;
    if (permission.action !== context.action) return false;
    if (permission.resource !== context.resource) return false;

    if (permission.centerId && permission.centerId !== context.centerId) return false;
    if (permission.departmentId && permission.departmentId !== context.departmentId) return false;

    const now = context.now ?? new Date();
    if (permission.effectiveFrom && now < new Date(permission.effectiveFrom)) return false;
    if (permission.effectiveUntil && now > new Date(permission.effectiveUntil)) return false;

    return true;
  }

  can(permissions: ScopedPermission[], context: PermissionContext): boolean {
    return permissions.some((permission) => this.isAllowed(permission, context));
  }
}
