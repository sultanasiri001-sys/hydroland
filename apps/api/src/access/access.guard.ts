import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SessionService } from '../auth/session.service';
import { AccessService } from './access.service';
import { AccessContext } from './access.types';
import { PERMISSION_KEY, SCOPE_PARAM_KEY } from './access.decorators';
import { requireOpaqueId } from '../security/resource-id';

export interface AccessRequest { headers?: { authorization?: string }; params?: Record<string,string>; accessContext?: AccessContext; }

@Injectable()
export class AccessGuard implements CanActivate {
 constructor(private readonly sessions:SessionService,private readonly access:AccessService,private readonly reflector:Reflector){}
 async canActivate(ctx:ExecutionContext):Promise<boolean>{
  const permission=this.reflector.getAllAndOverride<string>(PERMISSION_KEY,[ctx.getHandler(),ctx.getClass()]);
  if(!permission)return true;
  const req=ctx.switchToHttp().getRequest<AccessRequest>();
  const header=req.headers?.authorization;
  if(!header?.startsWith('Bearer '))throw new UnauthorizedException('Bearer token required');
  const token=header.slice(7).trim();
  if(!token)throw new UnauthorizedException('Bearer token required');
  const session=await this.sessions.validate(token);
  const accessContext=await this.access.resolve(session.accountId); req.accessContext=accessContext;
  if(!accessContext.active)throw new ForbiddenException('Account inactive');
  const scopeParam=this.reflector.getAllAndOverride<string>(SCOPE_PARAM_KEY,[ctx.getHandler(),ctx.getClass()]);
  const resourceScopeId=scopeParam?req.params?.[scopeParam]:undefined;
  if(resourceScopeId) requireOpaqueId(resourceScopeId);
  this.access.require(accessContext,permission,resourceScopeId);
  return true;
 }
}
