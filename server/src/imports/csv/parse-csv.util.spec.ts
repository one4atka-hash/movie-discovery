import { parseCsv } from './parse-csv.util';

describe('parseCsv', () => {
  it('parses simple rows', () => {
    const out = parseCsv('a,b\nc,d');
    expect(out.header).toBeNull();
    expect(out.rows).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('supports header', () => {
    const out = parseCsv('h1,h2\n1,2', { hasHeader: true });
    expect(out.header).toEqual(['h1', 'h2']);
    expect(out.rows).toEqual([['1', '2']]);
  });

  it('handles quoted fields with commas and newlines', () => {
    const out = parseCsv('a,"b,b","c\nc"\n1,2,3');
    expect(out.rows).toEqual([
      ['a', 'b,b', 'c\nc'],
      ['1', '2', '3'],
    ]);
  });

  it('handles escaped quotes', () => {
    const out = parseCsv('"a""b",c');
    expect(out.rows).toEqual([['a"b', 'c']]);
  });

  it('ignores trailing empty row caused by final newline', () => {
    const out = parseCsv('a,b\n');
    expect(out.rows).toEqual([['a', 'b']]);
  });
});
