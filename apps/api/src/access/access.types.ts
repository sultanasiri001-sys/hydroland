export type ScopeType = 'GLOBAL' | 'REGION' | 'CENTER' | 'DEPARTMENT' | 'SELF';

export interface AccessContext {
  accountId: string;
  roleKeys: string[];
  permissions: string[];
  scopeType: ScopeType;
  scopeIds: string[];
  active: boolean;
}

export function canAccess(
  context: AccessContext,
  permission: string,
  resourceScopeId?: string,
): boolean {
  if (!context.active || !context.permissions.includes(permission)) return false;
  if (context.scopeType === 'GLOBAL') return true;
  return resourceScopeId ? context.scopeIds.includes(resourceScopeId) : false;
}
