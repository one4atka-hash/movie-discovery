import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { retry, tap } from 'rxjs';

import { ErrorNotifierService } from './error-notifier.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifier = inject(ErrorNotifierService);

  return next(req).pipe(
    retry({ count: 1, delay: 300 }),
    tap({
      error: (err: unknown) => {
        const msg =
          err instanceof HttpErrorResponse
            ? `HTTP ${err.status || 0}: ${err.message}`
            : 'Неизвестная ошибка запроса';
        notifier.show(msg);
      }
    })
  );
};
