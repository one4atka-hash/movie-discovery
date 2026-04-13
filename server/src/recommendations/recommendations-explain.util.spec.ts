import { buildExplain } from './recommendations-explain.util';

describe('recommendations explain util', () => {
  it('emits stable i18n keys (no user-facing labels)', () => {
    const out = buildExplain({ seedCount: 3, mode: 'mvp' }, { maxItems: 10 });
    expect(out.length).toBeGreaterThan(0);
    expect(
      out.every((x) => typeof x.key === 'string' && x.key.length > 0),
    ).toBe(true);
    expect(
      out.some((x) => 'label' in (x as unknown as Record<string, unknown>)),
    ).toBe(false);
  });

  it('clamps max items', () => {
    const out = buildExplain({ seedCount: 1, mode: 'mvp' }, { maxItems: 1 });
    expect(out).toHaveLength(1);
  });

  it('includes seedCount param as a string', () => {
    const out = buildExplain({ seedCount: 7, mode: 'mvp' }, { maxItems: 10 });
    expect(out[0]).toMatchObject({
      key: 'recs.seed',
      params: { seedCount: '7' },
    });
  });
});
