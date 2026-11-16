import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { verifyA06GitHubActionsToken } from './a06-github-actions-oidc';

@Injectable()
export class A06GitHubActionsOidcGuard implements CanActivate {
  async canActivate(context:ExecutionContext):Promise<boolean> {
    const request=context.switchToHttp().getRequest<{method?:string;headers?:Record<string,string|string[]|undefined>}>();
    const authorization=request.headers?.authorization;
    const token=typeof authorization==='string'&&authorization.startsWith('Bearer ')?authorization.slice(7):'';
    if(request.method!=='GET'||!token)throw new UnauthorizedException('Monitoring identity is not valid.');
    try{await verifyA06GitHubActionsToken(token);return true;}catch{throw new UnauthorizedException('Monitoring identity is not valid.');}
  }
}
