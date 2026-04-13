import { parseLetterboxdDiaryCsv } from './letterboxd-diary.util';

describe('parseLetterboxdDiaryCsv', () => {
  it('parses minimal required columns', () => {
    const csv = [
      'Date,Name,Year,Rating,Tags',
      '2026-01-10,Fight Club,1999,4.5,"classic, rewatch"',
    ].join('\n');
    const out = parseLetterboxdDiaryCsv(csv);
    expect(out).toEqual([
      {
        watchedAt: '2026-01-10',
        title: 'Fight Club',
        year: 1999,
        rating10: 9,
        tags: ['classic', 'rewatch'],
      },
    ]);
  });

  it('supports M/D/YYYY date format', () => {
    const csv = ['Date,Name', '1/2/2026,Movie'].join('\n');
    const out = parseLetterboxdDiaryCsv(csv);
    expect(out[0]?.watchedAt).toBe('2026-01-02');
  });

  it('returns empty on missing Date/Name', () => {
    const csv = ['Watched,Title', 'x,y'].join('\n');
    expect(parseLetterboxdDiaryCsv(csv)).toEqual([]);
  });
});
