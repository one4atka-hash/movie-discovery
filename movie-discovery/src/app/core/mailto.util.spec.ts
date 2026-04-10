import { describe, expect, it } from 'vitest';

import { buildMailtoHref } from './mailto.util';

describe('buildMailtoHref', () => {
  it('builds mailto with subject and body', () => {
    const h = buildMailtoHref('u@example.com', 'Subj', 'Body line', 5000);
    expect(h.startsWith('mailto:u@example.com?')).toBe(true);
    expect(h).toContain('subject=Subj');
    expect(h).toContain('Body+line');
  });

  it('truncates very long body to fit URI limit', () => {
    const long = 'x'.repeat(5000);
    const h = buildMailtoHref('u@example.com', 'S', long, 800);
    expect(h.length).toBeLessThanOrEqual(800);
    expect(h.includes('%E2%80%A6') || h.endsWith('…')).toBe(true);
  });

  it('returns empty string for empty recipient', () => {
    expect(buildMailtoHref('', 'a', 'b')).toBe('');
  });
});
