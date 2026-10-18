import { classifyMention, levelCue, normForMatch } from './context.ts';
import type { NcrDataset } from './dataset.ts';
import {
  BASELINE_EXTRACTOR_VERSION,
  EXTRACTOR_VERSION,
  MENTION_PRIORITY,
  extractionResultSchema,
  type DetectedRole,
  type ExtractedSkill,
  type ExtractionInput,
  type ExtractionResult,
  type MentionType,
  type SemanticProvider,
} from './schema.ts';
import { headerSegments, parseDocument, type DocLine, type SectionKind } from './sections.ts';
import { stemPhrase, stemText } from './stem.ts';
import { normalizeResumeText } from './text.ts';

/**
 * Resume skill extractor for the Delhi-NCR pilot.
 *
 * Two modes, kept side by side so the effect of context handling can be measured:
 *  - baseline-0.1   alias dictionary match anywhere in the text, every hit is a current claim.
 *  - ncr-rules-0.3  section parsing, clause-level context (goal, negation, coursework, employer names),
 *                   word-form (stem) matching, unstructured-text support, tenure-based level
 *                   suggestions and detection of the pilot role the person holds now.
 *
 * One call handles one resume. There is no shared state between calls, so skills cannot leak
 * between candidates. Output is validated against extractionResultSchema.
 */

export interface ExtractOptions {
  mode?: 'baseline' | 'context';
  semantic?: SemanticProvider;
  /** Date that "Present" in a job's date range means. Defaults to the dataset's collection date. */
  asOf?: Date;
}

interface StemEntry {
  ids: string[];
  /** The alias ends in an activity word ("acceptance testing"): the resume word must be inflected too. */
  activity: boolean;
}

interface AliasIndex {
  /** Matches stemmed alias text inside stemmed resume text. */
  stemMatcher: RegExp;
  byStem: Map<string, StemEntry>;
  /** Aliases that must match exactly as written ("react" must not match "reacted"). */
  exactMatcher: RegExp | null;
  byExact: Map<string, string[]>;
  contextRequired: Map<string, string>;
}

/**
 * Single-word aliases whose stem is an everyday word. They only match as written:
 * "reacted" is not React, a customer "profile" is not profiling.
 */
const EXACT_ONLY = new Set(['react', 'profiling', 'rust', 'perf', 'macros', 'settlements', 'containers', 'treasury', 'custody']);

const indexCache = new WeakMap<NcrDataset, AliasIndex>();

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

const longestFirst = (keys: Iterable<string>) => [...keys].sort((x, y) => y.length - x.length || (x < y ? -1 : 1)).map(escapeRegex);
const bounded = (alternatives: string[]) => new RegExp(`(?<![a-z0-9])(?:${alternatives.join('|')})(?![a-z0-9])`, 'g');

function aliasIndex(ds: NcrDataset): AliasIndex {
  const cached = indexCache.get(ds);
  if (cached) return cached;
  const byStem = new Map<string, StemEntry>();
  const byExact = new Map<string, string[]>();
  const contextRequired = new Map<string, string>();
  for (const a of ds.aliases) {
    if (a.review_status === 'context_required') {
      contextRequired.set(a.alias.toLowerCase(), a.skill_id);
      continue;
    }
    const norm = normForMatch(a.alias);
    const ids = a.skill_id.split(';');
    if (EXACT_ONLY.has(norm)) {
      byExact.set(norm, ids);
      continue;
    }
    // Two spellings of one alias ("password reset", "password resets") share a stem; the first wins.
    const key = stemPhrase(norm);
    if (!byStem.has(key)) byStem.set(key, { ids, activity: norm.includes(' ') && /ing$/.test(norm) });
  }
  // Longest alias first: at any position the longest phrase wins ("jira service desk" before "jira").
  const index: AliasIndex = {
    stemMatcher: bounded(longestFirst(byStem.keys())),
    byStem,
    exactMatcher: byExact.size > 0 ? bounded(longestFirst(byExact.keys())) : null,
    byExact,
    contextRequired,
  };
  indexCache.set(ds, index);
  return index;
}

/** Aliases of different skills that collapse to one stem. Used by tests to keep the taxonomy unambiguous. */
export function aliasStemCollisions(ds: NcrDataset): string[] {
  const owner = new Map<string, string>();
  const out: string[] = [];
  for (const a of ds.aliases) {
    if (a.review_status === 'context_required') continue;
    const norm = normForMatch(a.alias);
    if (EXACT_ONLY.has(norm)) continue;
    const key = stemPhrase(norm);
    const prev = owner.get(key);
    if (prev !== undefined && prev !== a.skill_id) out.push(`${a.alias} -> ${a.skill_id} collides with ${prev} on "${key}"`);
    if (prev === undefined) owner.set(key, a.skill_id);
  }
  return out;
}

interface AliasHit {
  skill_ids: string[];
  /** Index in the normalised clause. */
  index: number;
  /** The words as they appear in the normalised clause. */
  matched: string;
}

/** Every alias in a normalised clause, matched on word stems so "handled customer queries" finds "customer queries". */
function aliasHits(norm: string, index: AliasIndex): AliasHit[] {
  const hits: AliasHit[] = [];
  const stemmed = stemText(norm);
  for (const m of stemmed.text.matchAll(index.stemMatcher)) {
    const start = stemmed.from[m.index!]!;
    const end = stemmed.to[m.index! + m[0].length - 1]!;
    const entry = index.byStem.get(m[0])!;
    const matched = norm.slice(start, end);
    // "acceptance testing" is an activity; "acceptance test conditions" uses "test" as a modifier.
    if (entry.activity && !/(?:ing|ed|s)$/.test(matched)) continue;
    hits.push({ skill_ids: entry.ids, index: start, matched });
  }
  if (index.exactMatcher) {
    for (const m of norm.matchAll(index.exactMatcher)) hits.push({ skill_ids: index.byExact.get(m[0])!, index: m.index!, matched: m[0] });
  }
  return hits.sort((a, b) => a.index - b.index);
}

/** Context-required aliases (ambiguous abbreviations) match only where the sentence supports the meaning. */
const GO_CONTEXT =
  /\b(C\+\+|Python|Java|JavaScript|TypeScript|Rust|Golang|Linux|goroutines?|channels?|concurrency|programming|languages?|runtime|race detector|microservices|daemon|server|implementation|GCC|Clang|Bash|Docker|gRPC)\b|\b(?:in|using|with|and|or|of)\s+Go\b|\bGo\s*[(,/]/;
const C_CONTEXT =
  /\b(Go|Golang|Python|Java|Rust|Linux|pointers|structs|socket|GCC|Clang|C99|C11|C\+\+|kernel|firmware|embedded|compiled|programming)\b|\b(?:in|using|with|and|or|of|embedded)\s+C\b|^C\s*[(,/]/;
const AD_CONTEXT = /active directory|azure|entra|group polic|user (?:creation|provisioning)|password|domain|mfa|windows|identity/i;

function contextRequiredMatches(clause: string, ctxSkills: Map<string, string>): Array<{ skill_id: string; index: number; text: string }> {
  const out: Array<{ skill_id: string; index: number; text: string }> = [];
  const ad = ctxSkills.get('ad');
  if (ad && AD_CONTEXT.test(clause)) {
    for (const m of clause.matchAll(/(?<![\w])AD(?![\w])/g)) out.push({ skill_id: ad, index: m.index!, text: 'ad' });
  }
  const go = ctxSkills.get('go');
  if (go && GO_CONTEXT.test(clause)) {
    for (const m of clause.matchAll(/(?<![\w.-])Go(?![\w-])(?!\s+(?:to|live|ahead|back|through|beyond|for)\b)/g)) {
      out.push({ skill_id: go, index: m.index!, text: 'go' });
    }
  }
  // "Swift" is also a programming language; only the capitalised network name SWIFT counts as banking.
  const swift = ctxSkills.get('swift');
  if (swift) for (const m of clause.matchAll(/(?<![A-Za-z0-9])SWIFT(?![A-Za-z0-9])/g)) out.push({ skill_id: swift, index: m.index!, text: 'swift' });
  const c = ctxSkills.get('c');
  if (c && C_CONTEXT.test(clause)) {
    for (const m of clause.matchAll(/(?<![\w.#+-])C(?![\w+#-])/g)) out.push({ skill_id: c, index: m.index!, text: 'c' });
  }
  return out;
}

/**
 * Phrase patterns for work that resumes describe with words in between ("Analysed monthly sales
 * data", "Resolved 40+ tickets a day", "Led a team of 6 agents"). Run on normalised text; every
 * hit still goes through the same context rules as an alias.
 */
const PATTERN_RULES: Array<{ skill_id: string; pattern: RegExp }> = [
  { skill_id: 'data-analysis', pattern: /\banaly[sz](?:e|ed|es|ing)\b(?:\s+[a-z0-9&/-]+){0,3}?\s+(?:data|datasets|trends|figures|numbers)\b/g },
  { skill_id: 'customer-support', pattern: /\b(?:handled|handling|resolved|resolving|attended|answered|managed|managing)\s+(?:\d+\+?\s+)?(?:(?:inbound|outbound|daily|customer|client|walk in)\s+)*(?:calls|queries|complaints|escalations|chats)\b/g },
  { skill_id: 'itsm-ticketing', pattern: /\b(?:resolved|resolving|closed|closing|handled|handling|logged|logging)\s+(?:\d+\+?\s+)?(?:(?:l[123]|it|support|incident|service|helpdesk)\s+)*tickets\b/g },
  { skill_id: 'team-leadership', pattern: /\b(?:led|leading|managed|managing|supervised|supervising|trained|training|mentored|mentoring)\s+(?:a\s+)?(?:team\s+of\s+)?\d+\+?\s+(?:members|agents|executives|associates|analysts|testers|people|staff|new joiners|juniors|team members)\b/g },
  { skill_id: 'operational-reporting', pattern: /\b(?:prepared|preparing|prepare|built|building|created|creating|generated|generating|published|publishing)\s+(?:(?:daily|weekly|monthly|quarterly|mis|management|kpi|operational|regular)\s+)+reports\b/g },
];

/** Splits at sentence ends and at top-level semicolons (not inside brackets). */
export function splitClauses(text: string): string[] {
  const clauses: string[] = [];
  for (const sentence of text.split(/(?<=[.!?])\s+(?=[A-Z"“(])/)) {
    let depth = 0;
    let start = 0;
    for (let i = 0; i < sentence.length; i++) {
      const ch = sentence[i]!;
      if (ch === '(') depth++;
      else if (ch === ')') depth = Math.max(0, depth - 1);
      else if (ch === ';' && depth === 0) {
        clauses.push(sentence.slice(start, i));
        start = i + 1;
      }
    }
    clauses.push(sentence.slice(start));
  }
  return clauses.map((c) => c.trim()).filter((c) => c.length > 0);
}

export interface Mention {
  skill_id: string;
  mention: MentionType;
  level: number | null;
  evidence: string;
  section: string;
  kind: SectionKind;
  method: 'alias_rule' | 'context_alias_rule' | 'pattern_rule';
  matched: string;
  order: number;
  /** Years of use this mention is backed by: its job's date range, or "N years" in the same sentence. */
  years: number | null;
}

const MAX_EVIDENCE = 320;
function evidenceWindow(clause: string, rawIndexHint: number): string {
  if (clause.length <= MAX_EVIDENCE) return clause;
  const start = Math.max(0, Math.min(rawIndexHint - 140, clause.length - MAX_EVIDENCE));
  const cut = clause.slice(start, start + MAX_EVIDENCE);
  return cut.trim();
}

/** Position of a normalised match inside the raw clause, to centre long evidence. Best effort only. */
function rawHint(clause: string, matched: string): number {
  const first = matched.split(' ')[0] ?? matched;
  const i = clause.toLowerCase().indexOf(first);
  return i === -1 ? 0 : i;
}

const baselineCache = new WeakMap<NcrDataset, { matcher: RegExp; byText: Map<string, string[]> }>();

/** baseline-0.1 is a frozen comparator: exact alias text, no stemming, no context. */
function baselineIndex(ds: NcrDataset) {
  const cached = baselineCache.get(ds);
  if (cached) return cached;
  const byText = new Map<string, string[]>();
  for (const a of ds.aliases) if (a.review_status !== 'context_required') byText.set(normForMatch(a.alias), a.skill_id.split(';'));
  const index = { matcher: bounded(longestFirst(byText.keys())), byText };
  baselineCache.set(ds, index);
  return index;
}

function collectBaseline(text: string, ds: NcrDataset): Mention[] {
  const { matcher, byText } = baselineIndex(ds);
  const mentions: Mention[] = [];
  let order = 0;
  for (const sentence of text.split(/\n|(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)) {
    const hits = [...normForMatch(sentence).matchAll(matcher)].map((m) => ({ skill_ids: byText.get(m[0])!, matched: m[0] }));
    for (const hit of hits) {
      for (const skill_id of hit.skill_ids) {
        mentions.push({
          skill_id,
          mention: 'explicit_current',
          level: null,
          evidence: evidenceWindow(sentence, rawHint(sentence, hit.matched)),
          section: 'Unsegmented',
          kind: 'other',
          method: 'alias_rule',
          matched: hit.matched,
          order: order++,
          years: null,
        });
      }
    }
  }
  return mentions;
}

const CONTACT_LINE = /@|https?:[/][/]|linkedin[.]com|github[.]com|[+]?[0-9][0-9 ()-]{8,}[0-9]/i;

// ------------------------------------------------------------------ dates and tenure

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?';
const POINT = `(?:${MONTH}\\s*'?\\d{2,4}|\\d{1,2}[/.-](?:19|20)\\d{2}|(?:19|20)\\d{2})`;
const DATE_RANGE = new RegExp(`(${POINT})\\s*(?:-|–|—|to|till|until)\\s*(${POINT}|present|current|till date|to date|now|ongoing|date)`, 'i');
const STATED_YEARS = /(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:years?|yrs?)\b(?:\s+(?:of|in))?(?:\s+[a-z&/-]+){0,4}?\s+(?:experience|exp)\b|(?:experience|exp)\s+of\s+(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:years?|yrs?)\b/i;
const CLAUSE_YEARS = /(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:years?|yrs?)\b/i;

/**
 * A date point as a fractional year. Month-less years count from the middle of the year. An end
 * month is inclusive: "Jan 2016 – Dec 2018" is three years.
 */
function datePoint(text: string, asOf: Date, isEnd = false): number | null {
  const t = text.trim().toLowerCase();
  if (/^(present|current|till date|to date|now|ongoing|date)$/.test(t)) return asOf.getUTCFullYear() + asOf.getUTCMonth() / 12;
  const endBonus = isEnd ? 1 / 12 : 0;
  const month = t.match(/^([a-z]{3})[a-z]*\.?\s*'?(\d{2,4})$/);
  if (month && month[1]! in MONTHS) {
    const y = Number(month[2]);
    return (y < 100 ? 2000 + y : y) + MONTHS[month[1]!]! / 12 + endBonus;
  }
  const numeric = t.match(/^(\d{1,2})[/.-](\d{4})$/);
  if (numeric) return Number(numeric[2]) + (Math.min(12, Math.max(1, Number(numeric[1]))) - 1) / 12 + endBonus;
  const year = t.match(/^(\d{4})$/);
  return year ? Number(year[1]) + 0.5 : null;
}

/** Years covered by the first date range in a line, or null when there is none (or it is nonsense). */
export function rangeYears(text: string, asOf: Date): { years: number; start: number; end: number } | null {
  const m = text.match(DATE_RANGE);
  if (!m) return null;
  const start = datePoint(m[1]!, asOf);
  const end = datePoint(m[2]!, asOf, true);
  if (start === null || end === null || end < start || end - start > 45) return null;
  return { years: Math.round((end - start) * 10) / 10, start, end };
}

/** "Duration: 18 months" on a project line. Undated, so it never adds to total experience. */
function statedDuration(text: string): { years: number; start: null; end: null } | null {
  const m = text.match(/\bduration\s*[:-]?\s*(\d{1,2}(?:\.\d)?)\s*(months?|mos?|years?|yrs?)\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  return { years: Math.round((/^m/i.test(m[2]!) ? n / 12 : n) * 10) / 10, start: null, end: null };
}

interface JobBlock {
  /** Candidate job-title texts for role detection, best first. */
  titles: string[];
  years: number | null;
  start: number | null;
  end: number | null;
}

/**
 * Groups experience lines into jobs. A line with a date range starts a job; its title is the text
 * before the employer ("Title | Company", "Title at Company") or the short line just above it.
 */
function jobBlocks(lines: DocLine[], asOf: Date): { blocks: JobBlock[]; blockOf: Array<number | null> } {
  const blocks: JobBlock[] = [];
  const blockOf: Array<number | null> = [];
  let current: number | null = null;
  let lastSection = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.section !== lastSection) {
      current = null;
      lastSection = line.section;
    }
    if (line.kind !== 'experience' && line.kind !== 'projects') {
      blockOf.push(null);
      continue;
    }
    const range = rangeYears(line.text, asOf) ?? statedDuration(line.text);
    if (range && line.text.length < 160) {
      const remainder = line.text.replace(DATE_RANGE, ' ').replace(/[()[\]]/g, ' ').trim();
      const first = headerSegments(remainder)[0]?.text.replace(/[,|–—-]+\s*$/, '').trim() ?? '';
      const titles = [first, line.label ?? ''].filter((t) => /[a-z]{3}/i.test(t) && t.length <= 70);
      const prev = lines[i - 1];
      if (prev && prev.section === line.section && prev.text.length <= 70 && blockOf[i - 1] == null) titles.push(prev.text);
      blocks.push({ titles, years: range.years, start: range.start, end: range.end });
      current = blocks.length - 1;
    }
    blockOf.push(current);
  }
  return { blocks, blockOf };
}

/** Total years: the resume's own statement wins, else the union of dated jobs (overlaps counted once). */
function totalYears(lines: DocLine[], blocks: JobBlock[]): number | null {
  for (const line of lines) {
    if (line.kind !== 'summary' && line.section !== 'Document start' && line.kind !== 'experience') continue;
    const m = line.text.match(STATED_YEARS);
    if (m) return Number(m[1] ?? m[2]);
  }
  const spans = blocks.filter((b) => b.start !== null && b.end !== null).map((b) => [b.start!, b.end!] as const).sort((a, b) => a[0] - b[0]);
  if (spans.length === 0) return null;
  let total = 0;
  let [s, e] = spans[0]!;
  for (const [ns, ne] of spans.slice(1)) {
    if (ns <= e) e = Math.max(e, ne);
    else {
      total += e - s;
      [s, e] = [ns, ne];
    }
  }
  total += e - s;
  return Math.round(total * 10) / 10;
}

// ---------------------------------------------------------------- mentions in context

/** Every alias hit with its classified context, before one mention per skill is chosen. */
export function collectMentions(rawText: string, ds: NcrDataset, mode: 'baseline' | 'context' = 'context', asOf?: Date): Mention[] {
  const text = normalizeResumeText(rawText);
  return mode === 'baseline' ? collectBaseline(text, ds) : collectContextual(parseDocument(text), ds, asOf ?? defaultAsOf(ds)).mentions;
}

const defaultAsOf = (ds: NcrDataset) => new Date(`${ds.config.collected_at}T00:00:00Z`);

/** A line before the first heading that reads like a sentence of work history, not a name or a title. */
function sentenceLike(text: string): boolean {
  const words = text.split(/\s+/).length;
  return words >= 5 && (/[.!?]$/.test(text) || /^(?:i|i'm|im|my|have|worked|handled|managed|led|working)\b/i.test(text));
}

interface Contextual {
  mentions: Mention[];
  lines: DocLine[];
  blocks: JobBlock[];
  blockOf: Array<number | null>;
}

function collectContextual(lines: DocLine[], ds: NcrDataset, asOf: Date): Contextual {
  const index = aliasIndex(ds);
  const mentions: Mention[] = [];
  const { blocks, blockOf } = jobBlocks(lines, asOf);
  let order = 0;

  const scan = (clause: string, line: DocLine, lineNo: number, claimAllowed: boolean) => {
    const norm = normForMatch(clause);
    const label = line.label ? normForMatch(line.label) : '';
    const block = blockOf[lineNo];
    const clauseYears = clause.match(CLAUSE_YEARS);
    const years = clauseYears && /experience|exp\b|worked|working/i.test(clause) ? Number(clauseYears[1]) : block != null ? blocks[block]!.years : null;
    const push = (skill_id: string, matchIndex: number, matched: string, method: Mention['method']) => {
      mentions.push({
        skill_id,
        mention: classifyMention({ clause: norm, matchIndex, kind: line.kind, label, claimAllowed }),
        level: levelCue(norm, matchIndex, matched.length),
        evidence: evidenceWindow(clause, rawHint(clause, matched)),
        section: line.section,
        kind: line.kind,
        method,
        matched,
        order: order++,
        years,
      });
    };
    for (const hit of aliasHits(norm, index)) for (const id of hit.skill_ids) push(id, hit.index, hit.matched, 'alias_rule');
    for (const rule of PATTERN_RULES) for (const m of norm.matchAll(rule.pattern)) push(rule.skill_id, m.index!, m[0], 'pattern_rule');
    for (const c of contextRequiredMatches(clause, index.contextRequired)) {
      // Normalise the prefix with a sentinel so trailing spaces are not trimmed away (index stays aligned).
      push(c.skill_id, normForMatch(`${clause.slice(0, c.index)}x`).length - 1, c.text, 'context_alias_rule');
    }
  };

  let docStartLine = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (CONTACT_LINE.test(line.text) && line.text.length < 200) continue;
    if (line.section === 'Document start') {
      // The name, title and contact block is not skill evidence ("Jenkins" is also a surname, a
      // headline is a self-description). Work-history sentences pasted without headings are.
      const header = docStartLine++ < 4 && line.text.length < 80 && !sentenceLike(line.text);
      if (header) continue;
    }
    if (line.isHeaderLine) {
      for (const seg of headerSegments(line.text)) scan(seg.text, line, i, seg.claimAllowed);
      continue;
    }
    for (const clause of splitClauses(line.text)) scan(clause, line, i, true);
  }
  return { mentions, lines, blocks, blockOf };
}

// --------------------------------------------------------------------- level advice

const KIND_QUALITY: Record<SectionKind, number> = {
  experience: 0,
  projects: 0,
  skills: 1,
  certifications: 2,
  education: 3,
  summary: 4,
  mixed: 5,
  learning: 6,
  goals: 6,
  other: 7,
};

const WORK_KINDS = new Set<SectionKind>(['experience', 'projects']);

/**
 * Suggested level on the shared 1-4 scale, with the reason in plain words. A suggestion only:
 * the worker confirms or changes it, and it stays self-reported until an assessment verifies it.
 *
 *  stated in the resume ("SQL (Basic)")                     -> that level
 *  course or training only                                  -> 1 Aware
 *  used at work for 2+ years, or in 2+ work entries         -> 3 Independent
 *  used at work (or claimed in the summary), 2+ years total -> 3 Independent
 *  used at work once                                        -> 2 Practiced
 *  listed only                                              -> 2 Practiced
 */
function suggestLevel(best: Mention, list: Mention[], totalYrs: number | null): { level: number | null; basis: string | null } {
  if (best.mention === 'coursework') {
    const stated = list.find((m) => m.mention === 'coursework' && m.level !== null)?.level ?? null;
    return { level: stated ?? 1, basis: stated ? 'Level stated in your resume' : 'Course or training only' };
  }
  if (best.mention !== 'explicit_current') return { level: null, basis: null };
  const current = list.filter((m) => m.mention === 'explicit_current');
  const stated = current.find((m) => m.level !== null)?.level;
  if (stated) return { level: stated, basis: 'Level stated in your resume' };

  const work = current.filter((m) => WORK_KINDS.has(m.kind));
  const years = Math.max(...current.map((m) => m.years ?? 0));
  const entries = new Set(work.map((m) => m.evidence)).size;
  if (years >= 2 && (work.length > 0 || current.some((m) => m.years !== null))) {
    return { level: 3, basis: `Used at work for about ${years >= 10 ? Math.round(years) : Math.round(years * 2) / 2} years` };
  }
  if (entries >= 2) return { level: 3, basis: `Used in ${entries} places in your work history` };
  const summary = current.some((m) => m.kind === 'summary');
  if ((work.length > 0 || summary) && years === 0 && totalYrs !== null && totalYrs >= 2) {
    return { level: 3, basis: `Used at work, within about ${Math.round(totalYrs)} years of experience` };
  }
  if (work.length > 0) return { level: 2, basis: years > 0 ? 'Used at work for under 2 years' : 'Used at work' };
  return { level: 2, basis: 'Listed in your resume' };
}

// ------------------------------------------------------------------- role detection

interface RoleIndex {
  matcher: RegExp;
  byStem: Map<string, { role_id: string; title: string }>;
}
const roleCache = new WeakMap<NcrDataset, RoleIndex>();

function roleIndex(ds: NcrDataset): RoleIndex {
  const cached = roleCache.get(ds);
  if (cached) return cached;
  const byStem = new Map<string, { role_id: string; title: string }>();
  for (const r of ds.roles) {
    for (const name of [r.title, ...r.title_aliases]) {
      // "Operations Executive (Banking)" is written "Operations Executive" on resumes.
      const key = stemPhrase(normForMatch(name.replace(/\([^)]*\)/g, ' ').replace(/[/]/g, ' ')));
      if (key.length >= 4 && !byStem.has(key)) byStem.set(key, { role_id: r.id, title: r.title });
    }
  }
  const index = { matcher: bounded(longestFirst(byStem.keys())), byStem };
  roleCache.set(ds, index);
  return index;
}

const ASPIRATION = /seek|looking|aspir|want|aim|transition|pivot|objective|opportunit|position as|role as|become|move into|switch/i;

function matchRole(text: string, index: RoleIndex): { role_id: string; title: string; matched: string } | null {
  const norm = normForMatch(text);
  const stemmed = stemText(norm);
  const m = stemmed.text.match(new RegExp(index.matcher.source));
  if (!m) return null;
  const hit = index.byStem.get(m[0])!;
  const start = stemmed.from[m.index!]!;
  return { ...hit, matched: norm.slice(start, stemmed.to[m.index! + m[0].length - 1]!) };
}

/** Pilot roles the person has held, from dated job titles first, then the headline and summary. */
function detectRoles(ctx: Contextual, ds: NcrDataset): DetectedRole[] {
  const index = roleIndex(ds);
  const found: Array<DetectedRole & { end: number }> = [];
  const seen = new Set<string>();
  const add = (r: { role_id: string; title: string; matched: string } | null, source: DetectedRole['source'], years: number | null, end: number) => {
    if (!r || seen.has(r.role_id)) return;
    seen.add(r.role_id);
    found.push({ role_id: r.role_id, title: r.title, matched_text: r.matched, source, years, most_recent: false, end });
  };
  for (const b of ctx.blocks) {
    for (const t of b.titles) {
      const r = matchRole(t, index);
      if (r) {
        add(r, 'job_title', b.years, b.end ?? -1);
        break;
      }
    }
  }
  let docStart = 0;
  for (const line of ctx.lines) {
    if (line.section === 'Document start' && docStart++ < 4 && line.text.length < 90 && !ASPIRATION.test(line.text)) {
      add(matchRole(line.text, index), 'headline', null, -1);
    }
    if (line.kind === 'summary' && !/objective/i.test(line.section)) {
      const first = splitClauses(line.text)[0] ?? '';
      if (!ASPIRATION.test(first)) {
        const years = first.match(CLAUSE_YEARS);
        add(matchRole(first, index), 'summary', years ? Number(years[1]) : null, -1);
      }
    }
  }
  // Most recent: the dated job that ends last; otherwise the first one found.
  const latest = found.reduce((best, r, i) => (r.end > found[best]!.end ? i : best), 0);
  return found
    .map(({ end: _end, ...r }, i) => ({ ...r, most_recent: i === latest }))
    .sort((a, b) => Number(b.most_recent) - Number(a.most_recent));
}

// ------------------------------------------------------------------------ extraction

function statusFor(mention: MentionType): ExtractedSkill['status'] {
  if (mention === 'explicit_current') return 'self_reported';
  if (mention === 'coursework') return 'inferred';
  return 'unknown';
}

/** Sentences a semantic provider may read: claimable sections, no goal, negation or course wording. */
function claimableSentences(lines: DocLine[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    if (line.kind === 'goals' || line.kind === 'learning' || line.kind === 'mixed' || line.kind === 'education') continue;
    if (CONTACT_LINE.test(line.text)) continue;
    for (const clause of splitClauses(line.text)) {
      const norm = normForMatch(clause);
      if (clause.length < 12) continue;
      const label = line.label ? normForMatch(line.label) : '';
      if (classifyMention({ clause: norm, matchIndex: norm.length, kind: line.kind, label, claimAllowed: true }) === 'explicit_current') out.push(clause);
    }
  }
  return out;
}

export function extractResume(input: ExtractionInput, ds: NcrDataset, options: ExtractOptions = {}): ExtractionResult {
  const mode = options.mode ?? 'context';
  const asOf = options.asOf ?? defaultAsOf(ds);
  const text = normalizeResumeText(input.text);
  const names = new Map(ds.skills.map((s) => [s.id, s.name]));
  const warnings: string[] = [];

  const ctx = mode === 'baseline' ? null : collectContextual(parseDocument(text), ds, asOf);
  const mentions = ctx ? ctx.mentions : collectBaseline(text, ds);
  const experienceYears = ctx ? totalYears(ctx.lines, ctx.blocks) : null;

  const bySkill = new Map<string, Mention[]>();
  for (const m of mentions) {
    const list = bySkill.get(m.skill_id) ?? [];
    list.push(m);
    bySkill.set(m.skill_id, list);
  }

  const skills: ExtractedSkill[] = [];
  for (const [skill_id, list] of [...bySkill.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const best = [...list].sort(
      (a, b) =>
        MENTION_PRIORITY.indexOf(a.mention) - MENTION_PRIORITY.indexOf(b.mention) ||
        KIND_QUALITY[a.kind] - KIND_QUALITY[b.kind] ||
        a.order - b.order,
    )[0]!;
    // Claimed and also denied. A claimed skill that is also a goal ("use Zendesk, want a service
    // desk role") is not a contradiction.
    if (best.mention === 'explicit_current' && list.some((m) => m.mention === 'negated_or_no_experience')) {
      warnings.push(`conflicting_evidence:${skill_id}`);
    }
    const level = mode === 'baseline' ? { level: null, basis: null } : suggestLevel(best, list, experienceYears);
    skills.push({
      skill_id,
      canonical_name: names.get(skill_id) ?? skill_id,
      status: statusFor(best.mention),
      mention_type: best.mention,
      suggested_level: level.level,
      level_basis: level.basis,
      evidence: best.evidence,
      evidence_unavailable_reason: best.evidence ? null : 'no_sentence_captured',
      section: best.section,
      method: best.method,
      matched_text: best.matched,
      similarity_score: null,
      mention_count: list.length,
      review_status: 'pending',
    });
  }

  if (options.semantic) {
    const found = new Set(skills.map((s) => s.skill_id));
    const sentences = ctx ? claimableSentences(ctx.lines) : text.split(/\n|(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length >= 12);
    const compact = text.replace(/\s+/g, ' ');
    for (const c of options.semantic.suggest(sentences, ds.skills.map((s) => s.id))) {
      if (found.has(c.skill_id) || !names.has(c.skill_id)) continue;
      // A suggestion must quote this resume; anything else is dropped (and counted) rather than trusted.
      if (!compact.includes(c.evidence.replace(/\s+/g, ' ').trim())) {
        warnings.push(`semantic_candidate_dropped:${c.skill_id}`);
        continue;
      }
      found.add(c.skill_id);
      skills.push({
        skill_id: c.skill_id,
        canonical_name: names.get(c.skill_id)!,
        status: 'inferred',
        mention_type: 'ambiguous',
        suggested_level: null,
        level_basis: null,
        evidence: c.evidence.slice(0, MAX_EVIDENCE),
        evidence_unavailable_reason: null,
        section: 'Unknown',
        method: 'semantic_candidate',
        matched_text: '',
        similarity_score: Math.max(0, Math.min(1, c.similarity)),
        mention_count: 1,
        review_status: 'pending',
      });
    }
  }

  if (skills.length === 0) warnings.push('no_skills_found');

  return extractionResultSchema.parse({
    candidate_id: input.candidate_id,
    resume_id: input.resume_id,
    document_type: input.document_type,
    extractor_version: mode === 'baseline' ? BASELINE_EXTRACTOR_VERSION : EXTRACTOR_VERSION,
    dataset_version: ds.config.dataset_version,
    skills,
    detected_roles: ctx ? detectRoles(ctx, ds) : [],
    experience_years: experienceYears,
    warnings,
  });
}
