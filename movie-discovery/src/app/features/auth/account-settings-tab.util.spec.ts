import { describe, expect, it } from 'vitest';

import { normalizeAccountSettingsTab } from './account-settings-tab.util';

describe('normalizeAccountSettingsTab', () => {
  it('returns a valid tab unchanged', () => {
    expect(normalizeAccountSettingsTab('data')).toBe('data');
    expect(normalizeAccountSettingsTab('favorites')).toBe('favorites');
  });

  it('falls back to overview for unknown values', () => {
    expect(normalizeAccountSettingsTab('unknown')).toBe('overview');
    expect(normalizeAccountSettingsTab(null)).toBe('overview');
  });
});
