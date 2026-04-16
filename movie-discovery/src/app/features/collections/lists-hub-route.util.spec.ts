import { describe, expect, it } from 'vitest';

import { deriveListsTabFromUrl, isAccountListsUrl } from './lists-hub-route.util';

describe('lists hub route utils', () => {
  it('derives statuses tab from URL', () => {
    expect(deriveListsTabFromUrl('/account/lists/statuses')).toBe('statuses');
    expect(deriveListsTabFromUrl('/collections/statuses?x=1')).toBe('statuses');
  });

  it('falls back to collections tab', () => {
    expect(deriveListsTabFromUrl('/account/lists')).toBe('collections');
    expect(deriveListsTabFromUrl('/collections')).toBe('collections');
  });

  it('detects account-scoped lists URLs', () => {
    expect(isAccountListsUrl('/account/lists')).toBe(true);
    expect(isAccountListsUrl('/account/lists/statuses')).toBe(true);
    expect(isAccountListsUrl('/collections')).toBe(false);
  });
});
