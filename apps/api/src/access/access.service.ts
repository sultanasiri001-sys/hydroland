import { ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AccessContext, AccessGrant, ScopeType, canAccess } from './access.types';
interface AccessRow { role_key:string; permission_key:string; scope_type:ScopeType; scope_id:string|null; }
@Injectable()
export class AccessService {
 constructor(private readonly db:DatabaseService){}
 require(context:AccessContext,permission:string,resourceScopeId?:string):void {
  if(!canAccess(context,permission,resourceScopeId)) throw new ForbiddenException('Permission or scope denied');
 }
 async resolve(accountId:string):Promise<AccessContext>{
  const account=await this.db.query<{status:string}>('SELECT status FROM accounts WHERE id=$1 LIMIT 1',[accountId]);
  if(account.rows[0]?.status!=='ACTIVE') return {accountId,grants:[],active:false};
  const result=await this.db.query<AccessRow>(`SELECT r.role_key,p.permission_key,g.scope_type,g.scope_id
   FROM account_role_grants g JOIN roles r ON r.id=g.role_id AND r.active=TRUE
   JOIN role_permissions rp ON rp.role_id=r.id JOIN permissions p ON p.id=rp.permission_id
   WHERE g.account_id=$1 AND g.status='ACTIVE' AND g.revoked_at IS NULL`,[accountId]);
  const grants:AccessGrant[]=result.rows.map(r=>({roleKey:r.role_key,permission:r.permission_key,scopeType:r.scope_type,scopeId:r.scope_id}));
  return {accountId,grants,active:true};
 }
}
