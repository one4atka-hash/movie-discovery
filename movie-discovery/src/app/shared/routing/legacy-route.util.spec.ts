import { describe, expect, it } from 'vitest';

import { mergeLegacyRedirectQueryParams, toAbsoluteCommands } from './legacy-route.util';

describe('legacy route utils', () => {
  it('converts canonical target to absolute commands', () => {
    expect(toAbsoluteCommands('/account/inbox')).toEqual(['/', 'account', 'inbox']);
    expect(toAbsoluteCommands('/')).toEqual(['/']);
  });

  it('merges incoming and appended query params', () => {
    expect(mergeLegacyRedirectQueryParams({ q: 'search' }, { tab: 'subs' })).toEqual({
      q: 'search',
      tab: 'subs',
    });
  });

  it('returns undefined when there are no query params', () => {
    expect(mergeLegacyRedirectQueryParams({})).toBeUndefined();
  });
});
