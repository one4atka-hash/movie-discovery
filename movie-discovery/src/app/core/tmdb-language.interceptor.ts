import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { ConfigService } from './config.service';
import { I18nService } from '@shared/i18n/i18n.service';

/**
 * Любой запрос к `ConfigService.api.baseUrl` получает актуальный `language`
 * (локаль TMDB из выбора пользователя).
 *
 * Исключение: `GET /movie/{id}/videos` — у TMDB при многих значениях `language`
 * приходит пустой `results` (ролики по сути не локализуются). Для этого пути
 * параметр `language` не передаём.
 */
const MOVIE_VIDEOS_SUFFIX = /\/movie\/\d+\/videos$/;

export const tmdbLanguageInterceptor: HttpInterceptorFn = (req, next) => {
  const config = inject(ConfigService);
  const i18n = inject(I18nService);
  const base = config.api.baseUrl.replace(/\/+$/, '');
  if (!base) {
    return next(req);
  }
  const pathOnly = req.url.split('?')[0];
  if (!pathOnly.startsWith(base)) {
    return next(req);
  }
  const rel = pathOnly.slice(base.length);
  if (MOVIE_VIDEOS_SUFFIX.test(rel)) {
    let params = req.params;
    if (params.has('language')) {
      params = params.delete('language');
    }
    return next(req.clone({ params }));
  }
  const lang = i18n.tmdbLocale();
  return next(req.clone({ params: req.params.set('language', lang) }));
};
