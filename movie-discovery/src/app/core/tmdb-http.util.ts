import { HttpErrorResponse } from '@angular/common/http';

/**
 * TMDB/proxy sometimes returns HTML (SPA index) or empty body.
 * We parse JSON explicitly to provide a clearer HttpErrorResponse.
 */
export function parseTmdbJsonText<T>(text: string, url: string): T {
  const t = text.trim();
  if (t.length === 0) {
    throw new HttpErrorResponse({ status: 502, statusText: 'Empty body', url });
  }
  const head = t.slice(0, 12).toLowerCase();
  if (t.startsWith('<!') || head.startsWith('<html')) {
    throw new HttpErrorResponse({
      status: 200,
      statusText: 'OK',
      url,
      error: { tmdbNonJson: true },
    });
  }
  try {
    return JSON.parse(t) as T;
  } catch {
    throw new HttpErrorResponse({
      status: 200,
      statusText: 'OK',
      url,
      error: { tmdbNonJson: true },
    });
  }
}
