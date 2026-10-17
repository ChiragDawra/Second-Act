import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from './csv.ts';
import { DEFAULT_DATASET_DIR, type NcrDataset } from './dataset.ts';
import type { EvalResume, GoldRow } from './evaluate.ts';
import { collectMentions, extractResume, type ExtractOptions } from './extractor.ts';
import type { ExtractionResult } from './schema.ts';
import { extractDocumentText } from './text.ts';

/**
 * Builds the evaluation set. The 12 synthetic resumes come from the committed corpus file, so tests
 * and CI never need real resumes. The 3 individual PDFs and their gold labels are private (git-ignored)
 * and are only included when they exist and `includePrivate` is set.
 */

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
export const EVAL_DIR = resolve(DEFAULT_DATASET_DIR, 'eval');
export const CORPUS_FILE = resolve(EVAL_DIR, 'synthetic_resumes_corpus_12_resumes.txt');
export const HELDOUT_FILE = resolve(EVAL_DIR, 'heldout_resumes_3.txt');
export const HELDOUT_GOLD_FILE = resolve(EVAL_DIR, 'heldout_gold_labels.csv');
export const GOLD_FILE = resolve(DEFAULT_DATASET_DIR, 'resume_gold_labels.csv');
export const PRIVATE_DIR = resolve(REPO_ROOT, '.eval-private');
export const PRIVATE_GOLD_FILE = resolve(PRIVATE_DIR, 'resume_gold_labels_real.csv');
export const WORKING_DIR = resolve(REPO_ROOT, 'resume_test_data');

export interface CorpusEntry {
  resume_id: string;
  candidate_id: string;
  name: string;
  group: string;
  text: string;
}

/** Splits the combined corpus on its RESUME START / RESUME END markers. */
export function splitCorpus(corpus: string): CorpusEntry[] {
  const entries: CorpusEntry[] = [];
  const pattern = /=== RESUME START: (resume_(\d\d)_([a-z0-9_]+)) ===\r?\n([\s\S]*?)\r?\n=== RESUME END: \1 ===/g;
  for (const m of corpus.matchAll(pattern)) {
    entries.push({ resume_id: `resume_${m[2]}`, candidate_id: `candidate_0${m[2]}`, name: m[1]!, group: m[3]!, text: m[4]! });
  }
  return entries;
}

export function loadGold(file: string): GoldRow[] {
  return parseCsv(readFileSync(file, 'utf8')).map((r) => ({
    candidate_id: r.candidate_id!,
    resume_id: r.resume_id!,
    skill_id: r.skill_id!,
    expected_label: r.expected_label as GoldRow['expected_label'],
    evidence_quote: r.evidence_quote!,
    evidence_location: r.evidence_location!,
  }));
}

export interface EvalSet {
  resumes: EvalResume[];
  gold: GoldRow[];
  includesPrivate: boolean;
}

/** Three unseen resumes with Delhi-NCR phrasing. Rules were frozen before the first run on them. */
export function loadHeldoutSet(): EvalSet {
  const entries = splitCorpus(readFileSync(HELDOUT_FILE, 'utf8'));
  if (entries.length !== 3) throw new Error(`expected 3 held-out resumes, found ${entries.length}`);
  return {
    resumes: entries.map((e) => ({ resume_id: e.resume_id, candidate_id: e.candidate_id, text: e.text, document_type: 'synthetic_text', group: e.group })),
    gold: loadGold(HELDOUT_GOLD_FILE),
    includesPrivate: false,
  };
}

export async function loadEvalSet(options: { includePrivate?: boolean } = {}): Promise<EvalSet> {
  const entries = splitCorpus(readFileSync(CORPUS_FILE, 'utf8'));
  if (entries.length !== 12) throw new Error(`expected 12 synthetic resumes, found ${entries.length}`);
  const resumes: EvalResume[] = entries.map((e) => ({ resume_id: e.resume_id, candidate_id: e.candidate_id, text: e.text, document_type: 'synthetic_text', group: e.group }));
  const gold = loadGold(GOLD_FILE);

  let includesPrivate = false;
  if (options.includePrivate && existsSync(PRIVATE_GOLD_FILE) && existsSync(WORKING_DIR)) {
    const files = readdirSync(WORKING_DIR).filter((f) => f.toLowerCase().endsWith('.pdf')).sort();
    for (const file of files) {
      const m = file.match(/^resume_(\d\d)_([a-z_]+)\.pdf$/);
      if (!m) continue;
      const { text } = await extractDocumentText(new Uint8Array(readFileSync(resolve(WORKING_DIR, file))));
      resumes.push({ resume_id: `resume_${m[1]}`, candidate_id: `candidate_0${m[1]}`, text, document_type: 'pdf', group: m[2]! });
    }
    gold.push(...loadGold(PRIVATE_GOLD_FILE));
    includesPrivate = files.length > 0;
  }
  return { resumes, gold, includesPrivate };
}

/** Runs the extractor over every resume independently. */
export function runExtraction(set: EvalSet, ds: NcrDataset, options: ExtractOptions): ExtractionResult[] {
  return set.resumes.map((r) =>
    extractResume({ candidate_id: r.candidate_id, resume_id: r.resume_id, document_type: r.document_type as 'synthetic_text' | 'pdf', text: r.text }, ds, options),
  );
}

/** All alias hits per resume (not just the best one per skill), for the canonicalization check. */
export function runMentions(set: EvalSet, ds: NcrDataset, mode: 'baseline' | 'context') {
  return new Map(set.resumes.map((r) => [r.resume_id, collectMentions(r.text, ds, mode).map((m) => ({ skill_id: m.skill_id, evidence: m.evidence, matched: m.matched }))]));
}
