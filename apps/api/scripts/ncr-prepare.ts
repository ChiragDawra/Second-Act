/**
 * Prepares the 15-resume evaluation folder (brief section 7, "Inventory").
 *
 *   npm run ncr:prepare
 *
 * 1. Splits data/delhi_ncr/v1/eval/synthetic_resumes_corpus_12_resumes.txt on its RESUME START / RESUME END
 *    markers into resume_test_data/resume_01..12_*.txt and confirms exactly 12 files.
 * 2. Copies each individual PDF from resume_test_samples/ (git-ignored) under a pseudonymous name,
 *    resume_13_individual.pdf onwards, so candidate names never appear in file names or reports.
 * 3. Counts the folder. Expected: 15.
 *
 * resume_test_data/ is git-ignored. Real resumes never leave your machine.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { CORPUS_FILE, splitCorpus, WORKING_DIR } from '../src/ncr/evalset.ts';
import { dirname, resolve } from 'node:path';

const SAMPLES_DIR = resolve(dirname(WORKING_DIR), 'resume_test_samples');

const entries = splitCorpus(readFileSync(CORPUS_FILE, 'utf8'));
if (entries.length !== 12) throw new Error(`expected exactly 12 resumes in the corpus, found ${entries.length}`);

mkdirSync(WORKING_DIR, { recursive: true });
for (const f of readdirSync(WORKING_DIR)) rmSync(resolve(WORKING_DIR, f));

for (const e of entries) writeFileSync(resolve(WORKING_DIR, `${e.name}.txt`), `${e.text}\n`);
console.log(`Split the corpus into ${entries.length} files.`);

let next = 13;
if (existsSync(SAMPLES_DIR)) {
  const pdfs = readdirSync(SAMPLES_DIR).filter((f) => f.toLowerCase().endsWith('.pdf')).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  for (const pdf of pdfs) {
    copyFileSync(resolve(SAMPLES_DIR, pdf), resolve(WORKING_DIR, `resume_${next}_individual.pdf`));
    next++;
  }
  console.log(`Added ${pdfs.length} individual PDF(s) under pseudonymous names.`);
} else {
  console.log('No resume_test_samples/ folder: only the 12 synthetic resumes were prepared.');
}

const count = readdirSync(WORKING_DIR).length;
console.log(`resume_test_data now holds ${count} files (expected 15 with the 3 PDFs).`);
if (existsSync(SAMPLES_DIR) && count !== 15) process.exit(1);
