import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response } from 'express';

function createRequestId(): string {
  // Short, URL-safe, good enough for request correlation.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: () => void) {
    const existing = req.headers['x-request-id'];
    const id = (
      typeof existing === 'string' && existing.trim().length
        ? existing
        : createRequestId()
    ).trim();
    // Express normalizes header keys to lowercase, but allow missing header.
    req.headers['x-request-id'] = id;
    res.setHeader('x-request-id', id);
    next();
  }
}
