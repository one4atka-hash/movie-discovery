import { Injectable, NestMiddleware } from '@nestjs/common';

function createRequestId(): string {
  // Short, URL-safe, good enough for request correlation.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const existing = req.headers?.['x-request-id'];
    const id = (typeof existing === 'string' && existing.trim().length ? existing : createRequestId()).trim();
    req.headers = req.headers ?? {};
    req.headers['x-request-id'] = id;
    res.setHeader?.('x-request-id', id);
    next();
  }
}

