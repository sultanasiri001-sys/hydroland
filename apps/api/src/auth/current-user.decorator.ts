import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AccessTokenPrincipal } from './access-token.guard';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AccessTokenPrincipal => {
    const request = context.switchToHttp().getRequest<{ user: AccessTokenPrincipal }>();
    return request.user;
  },
);
