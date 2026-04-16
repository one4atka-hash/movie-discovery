import { describe, expect, it } from 'vitest';

import { normalizeInboxTab } from './inbox-tab.util';

describe('normalizeInboxTab', () => {
  it('keeps valid tabs', () => {
    expect(normalizeInboxTab('feed')).toBe('feed');
    expect(normalizeInboxTab('rules')).toBe('rules');
    expect(normalizeInboxTab('subs')).toBe('subs');
  });

  it('falls back to feed for unknown values', () => {
    expect(normalizeInboxTab('legacy')).toBe('feed');
    expect(normalizeInboxTab(null)).toBe('feed');
  });
});
