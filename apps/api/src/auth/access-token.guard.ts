import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface AccessTokenPrincipal {
  sub: string;
  accountId: string;
  type: 'access';
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: AccessTokenPrincipal;
    }>();

    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('رمز الدخول مطلوب');
    }

    const token = authorization.slice(7).trim();
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error('JWT_ACCESS_SECRET is required');

    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPrincipal>(token, { secret });
      if (payload.type !== 'access' || !payload.sub || !payload.accountId) {
        throw new UnauthorizedException('رمز الدخول غير صالح');
      }
      request.user = payload;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('رمز الدخول غير صالح أو منتهي');
    }
  }
}
