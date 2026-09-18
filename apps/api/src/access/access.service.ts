import { ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AccessContext, ScopeType, canAccess } from './access.types';

interface AccessRow {
  role_key: string;
  permission_key: string;
  scope_type: ScopeType;
  scope_id: string | null;
}

@Injectable()
export class AccessService {
  constructor(private readonly db: DatabaseService) {}

  require(context: AccessContext, permission: string, resourceScopeId?: string): void {
    if (!canAccess(context, permission, resourceScopeId)) {
      throw new ForbiddenException('Permission or scope denied');
    }
  }

  async resolve(accountId: string): Promise<AccessContext> {
    const account = await this.db.query<{ status: string }>(
      'SELECT status FROM accounts WHERE id = $1 LIMIT 1',
      [accountId],
    );
    const active = account.rows[0]?.status === 'ACTIVE';
    if (!active) {
      return { accountId, roleKeys: [], permissions: [], scopeType: 'SELF', scopeIds: [accountId], active: false };
    }

    const grants = await this.db.query<AccessRow>(
      `SELECT r.role_key, p.permission_key, g.scope_type, g.scope_id
       FROM account_role_grants g
       JOIN roles r ON r.id = g.role_id AND r.active = TRUE
       JOIN role_permissions rp ON rp.role_id = r.id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE g.account_id = $1
         AND g.status = 'ACTIVE'
         AND (g.revoked_at IS NULL OR g.revoked_at > now())`,
      [accountId],
    );

    const roleKeys = [...new Set(grants.rows.map((row) => row.role_key))];
    const permissions = [...new Set(grants.rows.map((row) => row.permission_key))];
    const global = grants.rows.some((row) => row.scope_type === 'GLOBAL');
    const scopeIds = [...new Set(grants.rows.map((row) => row.scope_id).filter((id): id is string => Boolean(id)))];

    return {
      accountId,
      roleKeys,
      permissions,
      scopeType: global ? 'GLOBAL' : this.narrowestScope(grants.rows.map((row) => row.scope_type)),
      scopeIds,
      active: true,
    };
  }

  private narrowestScope(scopes: ScopeType[]): ScopeType {
    const order: ScopeType[] = ['REGION', 'CENTER', 'DEPARTMENT', 'SELF'];
    return order.find((scope) => scopes.includes(scope)) ?? 'SELF';
  }
}
