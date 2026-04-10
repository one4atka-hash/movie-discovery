/**
 * Сборка mailto: для напоминаний (RFC 6068, ограничение длины URI в клиентах).
 */
export function buildMailtoHref(
  to: string,
  subject: string,
  body: string,
  maxUriLength = 2000,
): string {
  const addr = sanitizeMailtoRecipient(to);
  if (!addr) return '';

  const append = (b: string): string => {
    const q = new URLSearchParams();
    q.set('subject', subject);
    q.set('body', b);
    return `mailto:${addr}?${q.toString()}`;
  };

  let href = append(body);
  if (href.length <= maxUriLength) return href;

  const overhead = append('').length + 10;
  const budget = Math.max(120, maxUriLength - overhead);
  const truncated = body.length > budget ? `${body.slice(0, budget - 1)}…` : body;
  return append(truncated);
}

function sanitizeMailtoRecipient(email: string): string {
  const e = email.trim();
  if (!e) return '';
  if (/^[\w.%+\-]+@[\w.\-]+\.[a-z]{2,}$/i.test(e)) return e;
  return encodeURIComponent(e);
}
