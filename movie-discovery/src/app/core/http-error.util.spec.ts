import { HttpErrorResponse } from '@angular/common/http';
import { describe, it, expect } from 'vitest';

import { friendlyHttpErrorMessage } from './http-error.util';

describe('friendlyHttpErrorMessage', () => {
  it('maps TMDB invalid key with status_message', () => {
    const err = new HttpErrorResponse({
      status: 401,
      statusText: 'Unauthorized',
      url: 'https://api.themoviedb.org/3/search/movie',
      error: {
        status_code: 7,
        status_message: 'Invalid API key: You must be granted a valid key.'
      }
    });
    const text = friendlyHttpErrorMessage(err);
    expect(text).toContain('Неверный');
    expect(text).toContain('Invalid API key');
  });

  it('maps network error status 0', () => {
    const err = new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' });
    expect(friendlyHttpErrorMessage(err)).toContain('Нет сети');
  });

  it('maps 429 rate limit', () => {
    const err = new HttpErrorResponse({ status: 429, statusText: 'Too Many Requests' });
    expect(friendlyHttpErrorMessage(err)).toContain('429');
  });

  it('maps JSON parse failure with HTTP 200', () => {
    const err = new HttpErrorResponse({
      status: 200,
      statusText: 'OK',
      url: 'http://localhost:4200/tmdb/search/movie',
      error: '<!doctype html>'
    });
    Object.assign(err, {
      message: 'Http failure during parsing for http://localhost:4200/tmdb/search/movie'
    });
    expect(friendlyHttpErrorMessage(err)).toContain('не JSON');
  });
});
