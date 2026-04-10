import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';

type ErrorBody = {
  ok: false;
  error: string;
  statusCode: number;
  timestamp: string;
  path?: string;
  requestId?: string;
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<{ url?: string; headers?: Record<string, string | string[] | undefined> }>();
    const res = ctx.getResponse<{ status: (s: number) => any; json: (b: ErrorBody) => any }>();

    const requestIdHeader = req?.headers?.['x-request-id'];
    const requestId = Array.isArray(requestIdHeader) ? requestIdHeader[0] : requestIdHeader;
    const path = req?.url;
    const timestamp = new Date().toISOString();

    if (exception instanceof ThrottlerException) {
      res.status(429).json({
        ok: false,
        error: 'Too many requests',
        statusCode: 429,
        timestamp,
        path,
        requestId
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      // Default Nest can return object/array here; we keep it simple for API clients.
      const msg = exception.message || 'Error';
      res.status(status).json({
        ok: false,
        error: msg,
        statusCode: status,
        timestamp,
        path,
        requestId
      });
      return;
    }

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      ok: false,
      error: 'Internal server error',
      statusCode: 500,
      timestamp,
      path,
      requestId
    });
  }
}

