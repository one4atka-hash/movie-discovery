import { inboxExplainFromRuleClauses, INBOX_DEMO_RULE_FOR_SAMPLE } from './rule-clause.util';

describe('rule-clause.util', () => {
  it('builds stable explain bullets from clauses', () => {
    const ex = inboxExplainFromRuleClauses(
      INBOX_DEMO_RULE_FOR_SAMPLE.name,
      INBOX_DEMO_RULE_FOR_SAMPLE.filters,
      INBOX_DEMO_RULE_FOR_SAMPLE.channels,
    );
    expect(ex[0]).toEqual({ label: 'Rule', detail: 'Demo rule' });
    expect(ex.find((e) => e.label === 'Min rating')?.detail).toBe('≥ 7');
    expect(ex.find((e) => e.label === 'Genres (TMDB ids)')?.detail).toBe('12, 28');
    expect(ex.find((e) => e.label === 'Channels')?.detail).toContain('in-app');
  });
});
