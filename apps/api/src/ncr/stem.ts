/**
 * Light English stemming for alias matching (ncr-rules-0.3).
 *
 * Resumes say "handled customer queries", "reconciled", "logged defects"; the alias list says
 * "customer queries", "reconcile", "log defects". Both sides are reduced to the same stem so word
 * form stops deciding recall. Deliberately small: plural and -ed/-ing endings only, so "container"
 * never collapses into "contain" and "process" keeps its double s.
 *
 * Input must already be normalised with normForMatch (lower-case, hyphens as spaces).
 */

const KEEP = new Set(['this', 'has', 'was', 'is', 'his', 'its', 'us', 'as', 'yes', 'bus', 'gas', 'plus', 'news', 'sales', 'series', 'species', 'status', 'basis', 'analysis', 'axis', 'chassis', 'ios', 'macos', 'kubernetes', 'aws', 'dns', 'mis', 'sops', 'osi']);

export function stemWord(word: string): string {
  if (word.length <= 3 || KEEP.has(word) || !/^[a-z]+$/.test(word)) return word;
  let w = word;
  if (w.endsWith('ies') && w.length > 4) w = `${w.slice(0, -3)}y`;
  else if (/(?:ss|us|is)$/.test(w)) return w;
  else if (/(?:sses|xes|ches|shes|zes)$/.test(w)) w = w.slice(0, -2);
  else if (w.endsWith('es') && w.length > 4) w = w.slice(0, -1);
  else if (w.endsWith('s') && w.length > 3) w = w.slice(0, -1);

  const before = w;
  if (w.endsWith('ing') && w.length > 5) w = w.slice(0, -3);
  else if (w.endsWith('ied') && w.length > 4) w = `${w.slice(0, -3)}y`;
  else if (w.endsWith('ed') && w.length > 4) w = w.slice(0, -2);
  // logged / logging -> log, planned -> plan (but "install" keeps its ll).
  if (w !== before && /([bdgmnprt])\1$/.test(w)) w = w.slice(0, -1);

  // reconcile / reconciled / reconciling all end on "reconcil".
  if (w.endsWith('e') && w.length > 3) w = w.slice(0, -1);
  return w;
}

export interface StemmedText {
  /** Stemmed copy of the input, word by word; separators are kept as they are. */
  text: string;
  /** For every character of `text`: start and end offset of its source token in the input. */
  from: Int32Array;
  to: Int32Array;
}

/** Stems every word and keeps a map back to the input so evidence can quote the original words. */
export function stemText(norm: string): StemmedText {
  let text = '';
  const from: number[] = [];
  const to: number[] = [];
  for (const m of norm.matchAll(/[a-z]+|[^a-z]+/g)) {
    const start = m.index!;
    const token = m[0];
    if (/^[a-z]/.test(token)) {
      const stem = stemWord(token);
      text += stem;
      for (let i = 0; i < stem.length; i++) {
        from.push(start);
        to.push(start + token.length);
      }
    } else {
      text += token;
      for (let i = 0; i < token.length; i++) {
        from.push(start + i);
        to.push(start + i + 1);
      }
    }
  }
  return { text, from: Int32Array.from(from), to: Int32Array.from(to) };
}

/** Stems a whole phrase (an alias, a role title) the same way the text is stemmed. */
export const stemPhrase = (norm: string) => stemText(norm).text;
