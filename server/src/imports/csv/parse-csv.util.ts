export type CsvParseOptions = {
  /**
   * When true, the first row is treated as a header.
   * Returned `rows` are arrays (not objects) to keep this generic.
   */
  hasHeader?: boolean;
};

export type CsvParseResult = {
  header: string[] | null;
  rows: string[][];
};

/**
 * Minimal RFC4180-ish CSV parser.
 * - supports quoted fields, escaped quotes, commas and newlines inside quotes
 * - normalizes CRLF/CR to LF
 */
export function parseCsv(
  text: string,
  opts: CsvParseOptions = {},
): CsvParseResult {
  const s = String(text ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    // Avoid emitting a trailing empty row on final newline.
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = s[i + 1];
        if (next === '"') {
          field += '"';
          i++;
          continue;
        }
        inQuotes = false;
        continue;
      }
      field += ch;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      pushField();
      continue;
    }
    if (ch === '\n') {
      pushField();
      pushRow();
      continue;
    }

    field += ch;
  }

  // flush last field/row (even if empty)
  pushField();
  // ignore final empty row if file ends with newline and had no other content
  if (!(row.length === 1 && row[0] === '' && rows.length === 0)) {
    pushRow();
  }

  // Drop last row if it's entirely empty and there was a trailing newline.
  const last = rows[rows.length - 1];
  if (last && last.every((x) => x === '') && s.endsWith('\n')) {
    rows.pop();
  }

  const hasHeader = Boolean(opts.hasHeader);
  const header = hasHeader ? (rows.shift() ?? []) : null;
  return { header, rows };
}
