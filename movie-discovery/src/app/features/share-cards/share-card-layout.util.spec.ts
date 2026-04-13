import {
  monthRecapShareRows,
  shareCardContentSnapshot,
  tonightShareRows,
  top10ShareRows,
} from './share-card-layout.util';

describe('share-card-layout.util', () => {
  it('top10 preserves favorites order and caps at 10', () => {
    const movies = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      title: `T${i}`,
      poster_path: null as string | null,
    }));
    const rows = top10ShareRows(movies, 10);
    expect(rows.map((r) => r.title).join(',')).toBe('T0,T1,T2,T3,T4,T5,T6,T7,T8,T9');
  });

  it('month recap filters YYYY-MM and sorts by date desc then title', () => {
    const entries = [
      { watchedAt: '2024-03-01', title: 'A' },
      { watchedAt: '2024-03-15', title: 'B' },
      { watchedAt: '2024-02-28', title: 'Z' },
    ];
    expect(monthRecapShareRows(entries, '2024-03').map((e) => e.title)).toEqual(['B', 'A']);
    expect(
      shareCardContentSnapshot(
        'month_recap',
        '2024-03',
        monthRecapShareRows(entries, '2024-03').map((e) => e.title),
      ),
    ).toBe('month_recap|2024-03|B\u241EA');
  });

  it('tonight shortlist takes first N from stored order', () => {
    const movies = [
      { id: 3, title: 'C', poster_path: null },
      { id: 1, title: 'A', poster_path: null },
    ];
    expect(tonightShareRows(movies, 5).map((m) => m.title)).toEqual(['C', 'A']);
  });
});
