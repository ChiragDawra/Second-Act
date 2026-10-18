/** Minimal RFC-4180 CSV parser (quoted fields, doubled quotes, CRLF). No dependency needed for versioned data files. */
export function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/^﻿/, '');

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((cell) => cell !== '') || row.length > 1) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell !== '')) rows.push(row);
  }

  const [header, ...body] = rows;
  if (!header) return [];
  return body.map((cells, n) => {
    if (cells.length !== header.length) {
      throw new Error(`CSV row ${n + 2} has ${cells.length} fields, expected ${header.length}`);
    }
    return Object.fromEntries(header.map((name, i) => [name, cells[i] ?? '']));
  });
}

export function splitList(value: string, separator = ';'): string[] {
  return value
    .split(separator)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
