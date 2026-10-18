/**
 * Resume layout parsing: splits text into lines tagged with the section they belong to.
 * Only known heading vocabulary starts a section, so job titles written in capitals
 * ("LEAD TEST ANALYST") are not mistaken for headings.
 */

export type SectionKind =
  | 'summary'
  | 'skills'
  | 'experience'
  | 'education'
  | 'certifications'
  | 'projects'
  | 'goals'
  | 'learning'
  | 'mixed'
  | 'other';

export interface DocLine {
  text: string;
  /** Heading text as written, or "Document start" before the first heading. */
  section: string;
  kind: SectionKind;
  /** The "Label:" part of a "Label: content" line, if any. */
  label: string | null;
  /** True for "Title | Company | City"-style lines in the experience section. */
  isHeaderLine: boolean;
}

const HEADING_RULES: Array<[RegExp, SectionKind]> = [
  [/^(objective|summary|professional summary|career summary|career statement|executive profile|executive summary|profile|professional profile|about me)\b/i, 'summary'],
  [/re-?skilling|upskilling|re-?entry|modernization|coursework/i, 'learning'],
  [/personal (projects|interests)|interests? & objectives|projects & goals/i, 'mixed'],
  [/goal|aspir|future|upcoming|exploration|forward|in progress|targets?\b/i, 'goals'],
  [/skill|competenc|expertise|technolog|capabilit|assets|proficienc|technical/i, 'skills'],
  [/experience|history|employment|career gap|sabbatical|pause/i, 'experience'],
  [/education|academic|degree/i, 'education'],
  [/certif|credential|licen/i, 'certifications'],
  [/project/i, 'projects'],
  [/volunteer|activities|engagements|awards|languages|references|publications/i, 'other'],
];

const BULLET = /^\s*(?:[-*•◦▪●·–—]|•)\s+/;
const LABEL = /^([A-Za-z][A-Za-z0-9 &/+().,'’-]{1,70}?)\s*:\s*(.*)$/;
const GOAL_LABEL = /goal|aspir|future|learning|interest|explor|planned/i;

function headingKind(line: string): SectionKind | null {
  const t = line.trim();
  if (t.length < 4 || t.length > 90 || /[.!?]$/.test(t) || BULLET.test(line)) return null;
  const letters = t.replace(/[^A-Za-z]/g, '');
  if (letters.length < 4) return null;
  const upper = letters.replace(/[^A-Z]/g, '').length / letters.length;
  const words = t.split(/\s+/).length;
  const titleCase = words <= 4 && /^[A-Z][a-z]+(?:[\s&/-]+[A-Z]?[a-z]+)*$/.test(t);
  if (upper < 0.8 && !titleCase) return null;
  for (const [pattern, kind] of HEADING_RULES) if (pattern.test(t)) return kind;
  return null;
}

const COMPANY_WORDS = /\b(inc\.?|corp\.?|llc|ltd|bank|partners|solutions|systems|services|group|supply chain|logistics|freight|networks|capital|securities|health|retail|financial|technologies|express|trading|platforms)\b/i;

function looksLikeHeaderLine(text: string): boolean {
  if (text.length > 160) return false;
  const segments = text.split(/\s+[|—–]\s+/);
  if (segments.length < 2) return false;
  return /,\s*[A-Z]{2}\b|\b(19|20)\d\d\b|\bPresent\b/.test(text);
}

/**
 * Splits a header line ("Title | Company | City") into segments. Only a title-like first
 * segment can carry a skill claim; employer and place names are not evidence.
 */
export function headerSegments(text: string): Array<{ text: string; claimAllowed: boolean }> {
  return text.split(/\s+[|—–]\s+/).map((part, i) => ({ text: part, claimAllowed: i === 0 && !COMPANY_WORDS.test(part) }));
}

export function parseDocument(text: string): DocLine[] {
  const out: DocLine[] = [];
  let section = 'Document start';
  let kind: SectionKind = 'other';
  let pendingLabel: string | null = null;

  const raw = text.split('\n');
  for (let i = 0; i < raw.length; i++) {
    const original = raw[i]!;
    const trimmed = original.trim();
    if (!trimmed) {
      pendingLabel = null;
      continue;
    }

    const heading = headingKind(trimmed);
    if (heading) {
      section = trimmed.replace(/\s+/g, ' ');
      kind = heading;
      pendingLabel = null;
      continue;
    }

    let body = trimmed.replace(BULLET, '');

    // A wrapped PDF line continues the previous sentence: join when the previous line is unfinished.
    const prev = out[out.length - 1];
    if (prev && prev.section === section && !BULLET.test(original) && /^[a-z(]/.test(body) && !/[.!?:;]$/.test(prev.text) && prev.label === null) {
      prev.text = `${prev.text} ${body}`;
      continue;
    }

    let label: string | null = pendingLabel;
    pendingLabel = null;
    const m = body.match(LABEL);
    if (m && !/^(https?|email|phone|linkedin|github|location)$/i.test(m[1]!.trim())) {
      const rest = m[2]!.trim();
      if (rest === '') {
        // "Programming Languages :" with the content on the next line.
        pendingLabel = m[1]!.trim();
        continue;
      }
      label = m[1]!.trim();
      body = rest;
    }

    out.push({
      text: body,
      section,
      kind: label && GOAL_LABEL.test(label) && (kind === 'skills' || kind === 'other' || kind === 'summary') ? 'goals' : kind,
      label,
      isHeaderLine: kind === 'experience' && looksLikeHeaderLine(body),
    });
  }
  return out;
}
