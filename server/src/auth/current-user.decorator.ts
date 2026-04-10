import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type AuthedUser = { id: string; email: string };

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthedUser => {
    const req = ctx.switchToHttp().getRequest<{ user?: AuthedUser }>();
    if (!req.user) {
      return { id: '', email: '' };
    }
    return req.user;
  },
);
