# Delhi-NCR skill extraction and career adjacency

Status: **pilot, working end to end, not validated for real-world use.** Everything below is measured on 15 resumes
(12 synthetic, 3 individual) plus 3 held-out synthetic resumes. Read [Limitations](#limitations) before quoting any number.

This document is the implementation record for the Delhi-NCR brief: what was built, how it was evaluated, what the
results do and do not show, and what remains.

## 1. What exists

| Layer | Where | What it does |
|---|---|---|
| Dataset | `data/delhi_ncr/v1/` | 62 skills, 527 aliases, 17 roles in four families, 147 role requirements, 17 transition hypotheses, 26 simulated listings, gold labels. See its [README](../data/delhi_ncr/v1/README.md). |
| Extractor | `apps/api/src/ncr/` | Reads one resume, finds skills, classifies the sentence around each one, attaches evidence. Two modes: `baseline-0.1` and `ncr-rules-0.2`. |
| Evaluation | `src/ncr/evaluate.ts`, `scripts/ncr-eval.ts` | Precision, recall, F1, future-goal leakage, evidence coverage and more, with an error report. |
| Adjacency | `src/ncr/adjacency.ts` | Adapts the dataset to the existing deterministic `fit-v1` engine and applies a recommendation bar. |
| API | `src/routes/ncr.ts` | `POST /api/v1/ncr/resume/extract`, `POST /api/v1/ncr/recommend`, `GET /api/v1/ncr/meta`. Worker only. |
| Tests | `apps/api/test/ncr.*.test.ts` | 67 tests: context rules, ambiguous aliases, leakage, dataset checks, authorization, privacy. |

The existing demo (Harpreet, four accounts) is unchanged. The Python prototype that started this work is kept in
`experiments/python_extractor/` for reference; the production extractor is TypeScript so it shares the API's stack.

## 2. Pipeline

```
resume file (PDF, DOCX or TXT; type decided from the first bytes)
  -> text extraction in memory (unpdf, mammoth)           nothing written to disk, nothing logged
  -> normalise text, split into sections and lines
  -> alias matching, longest phrase first
  -> classify each mention from its own clause            current, coursework, future goal, negated, ambiguous
  -> one entry per skill, with evidence, section, method  schema-validated JSON
  -> worker review                                        accept, reject, set level
  -> self-reported skill profile                          never verified
  -> hard constraints, then fit-v1 scoring
  -> top 3 roles with gaps, blockers, unknowns, freshness
```

One call handles one resume and keeps no state, so skills cannot leak between candidates. A semantic provider can be
plugged in: its suggestions stay `inferred`, `pending` and separate, must quote the resume or are dropped, and never
replace a rule match. No semantic model is bundled in the API.

### Context rules (`ncr-rules-0.2`)

For each alias hit the first matching rule decides the mention type:

1. Employer, place or non-title segment of a "Title | Company | City" line: `ambiguous`.
2. Lapsed or expired credential: `ambiguous`.
3. Future goal ("intends to", "aspiring", "learning goal", "explore", a goals section...) or a target role after
   "transitioning into": `future_goal`.
4. "No practical experience", "not applied": `negated_or_no_experience`.
5. Course, bootcamp, Coursera, "Learning Phase", re-skilling section: `coursework`.
6. Otherwise: `explicit_current`.

A future goal beats a negation; a negation beats coursework. Status follows the mention: `explicit_current` is
`self_reported`, `coursework` is `inferred`, the rest are `unknown` (no evidence of ability, which is not zero). The
extractor never emits `verified`. A skill that is both claimed and denied keeps the claim and raises a
`conflicting_evidence` warning.

Ambiguous abbreviations match only with context: `AD` (needs directory words), `Go`, `C` (need programming context),
`SWIFT` (uppercase network name only; "Swift" is a language). Name and contact lines are skipped, because a surname
such as Jenkins is also a tool.

## 3. Evaluation

### Protocol

- **Unit:** one canonical skill in one resume. A skill is "extracted as current" when its mention type is
  `explicit_current`. Pairs with no gold row are `not_present`. Gold rows labelled `ambiguous` are left out of
  precision and recall and reported separately.
- **Gold labels** were written from the resume text before the extractor existed, with a written policy (future goal
  beats negation beats coursework; target roles and employer names are not evidence). Changes after the first run are
  listed in `data/delhi_ncr/v1/eval/gold_revisions.md`.
- **Metrics:** precision, recall, F1, future-goal leakage, negation leakage, unsupported-skill rate (current skill whose
  evidence is missing, not in its own resume, or does not contain the matched phrase), evidence coverage, canonicalization
  accuracy (does the evidence span map to the gold skill, checked over every mention), candidate leakage (evidence not
  found in its own resume).
- **Process:** baseline run, error report, fix the highest-impact category, rerun all resumes.

### Results

| Set | Extractor | Precision | Recall | F1 | Future-goal leakage |
|---|---|---|---|---|---|
| 12 synthetic (in-sample) | `baseline-0.1` | 88.9% (136/153) | 98.6% (136/138) | 0.935 | **100% (14/14)** |
| 12 synthetic (in-sample) | `ncr-rules-0.2` | 100% (138/138) | 100% (138/138) | 1.000 | 0% (0/14) |
| 3 held-out, **first run, rules frozen** | `ncr-rules-0.2` | 100% (25/25) | **86.2% (25/29)** | 0.926 | 0% (0/4) |
| 3 held-out, after fixing its misses | `ncr-rules-0.2` | 100% (28/28) | 96.6% (28/29) | 0.983 | 0% (0/4) |
| All 15 (12 + 3 individual PDFs) | `ncr-rules-0.2` | 100% (170/170) | 100% (170/170) | 1.000 | 0% (0/14) |

Other measures for `ncr-rules-0.2`: unsupported-skill rate 0 of 146; evidence coverage 100%; candidate leakage 0;
canonicalization accuracy 99.4% (162/163) on the synthetic set.

**How to read this.** The context-blind baseline treats every future goal as a current skill (14 of 14). That is the
finding that matters: dictionary matching alone is unsafe for this data. The 100% on the 12 synthetic resumes is
in-sample: the aliases and rules were written while reading, and corrected against, those same resumes. The held-out
first run is the only honest estimate of generalisation: precision held, recall dropped to 86% on three resumes.

### Iteration history (what actually changed)

| Step | Trigger | Change |
|---|---|---|
| Baseline | n/a | Dictionary match anywhere in the text. First run: precision 83.8%, recall 97.8%, 14/14 future goals leaked. |
| Context rules v0.2, first run | n/a | Precision 93.2%, recall 99.3%. |
| Alias clean-up | 10 false positives | Removed over-generic aliases (`dashboards`, `data validation`, `supervised`, `freight`, `logistics`, `google workspace`). |
| Name/contact lines | "Jenkins" surname matched the CI tool | Skip name, contact and headline lines. |
| Compound alias | "Automated regression test suites" evidences two skills | One alias may map to two skills (`a;b`). |
| Held-out run | 3 unseen Delhi-NCR resumes | 4 misses: inflection ("Reconcile"), phrasing ("logging defects", "customer queries"), and one claim hidden behind a goal mention. Fixed the first two kinds. |
| Real-PDF run | "Swift" (iOS) matched banking SWIFT | `SWIFT` made context-required (uppercase only). |

The three gold additions after the first run are logged. One miss remains on the held-out set: a claim ("Analysed
monthly sales data") with no alias, whose skill is also mentioned as a goal elsewhere in the resume.

### Known remaining errors and limits of the rules

- Free-text claims with no alias are missed ("Analysed sales data"). That is what the review step is for.
- A skill both claimed and denied keeps the claim; the warning is the only signal.
- Ambiguous gold pairs: 8 of 12 are still reported as current (for example a QA engineer verifying ledger balances is
  not doing reconciliation). These need the worker to confirm.
- Supervision verbs: "Supervised quality auditing" no longer counts as team leadership, which also costs one real claim
  ("Supervise an 8-person ... team"), found elsewhere in that resume by another phrase.

## 4. Adjacency

`recommend()` runs the existing `fit-v1` engine unchanged:

```
estimated_skill_fit = 100 * sum(w * min(p/q, 1) * e) / sum(w)
```

with evidence factors verified 1.0, self-reported 0.7, inferred 0.4, unknown and not-demonstrated 0. Hard constraints
filter before ranking and keep their reason. Mandatory requirements are a separate gate: a role with a high score but
a mandatory requirement below its level is a "stretch" role, not a recommendation. Unknown skills are listed as unknown,
not as gaps. A role is recommended only if its estimated fit is at least 30 and at least 2 requirements are evidenced
(configured in `scoring_config.json`, labelled a pilot cut-off, not a probability). Otherwise the response says so.

Each role carries: estimated fit, evidence confidence, readiness, matching skills with their resume evidence, critical
gaps, mandatory blockers, unknown requirements, any constraint exclusion, requirement source and freshness, a separate
demand signal (simulated sample) and a separate vacancy record (none connected), and the dataset and scoring versions.

### What the comparison shows (`docs/eval/adjacency-manual-vs-extracted-*.md`)

Profiles built from gold labels and from the extractor's output go through the same ranking code.

- At an assumed level 3 for skills whose level the resume does not state, the two give identical results for 12 of 15
  resumes; the differences come from one or two extra or missed skills.
- **The level assumption matters far more than extraction.** At an assumed level 2, 9 of 15 gold profiles get no
  recommended role, because many requirements need level 3 and several are mandatory. At level 3 only 2 of 15 do (a
  Go/C/Linux developer and a logistics account manager, for whom the pilot has no roles, which is the right answer).
- Resumes do not state levels, so the real level has to come from the worker's review and, for mandatory skills, from an
  assessment. The app must not silently default a level.

## 5. Privacy and governance

- Resume files and text are processed in memory and never stored or logged. Audit events hold counts and enums only; a
  test searches the audit table for a marker planted in a resume.
- Real resumes stay out of Git: `resume_test_samples/`, `resume_test_data/`, `.eval-private/` and
  `docs/eval/*all18*` are ignored. The committed all-15 reports contain counts and redacted examples for the three
  individual PDFs. Their gold labels are in `.eval-private/`.
- Evaluation outputs use pseudonymous ids (`candidate_013`, `resume_13_individual.pdf`).
- The three individual resumes belong to team members who supplied them for testing. Obtain consent before using any
  other real resume, and define retention before storing one. Nothing in this pilot stores resumes.
- Sharing with mentors and recruiters still requires explicit consent and an allowlist (existing feature, unchanged).
- Extracted skills are never verified. A future goal or a stated lack of experience cannot be accepted as a current
  skill (the API refuses with 422), and any `status` a client sends is ignored.
- **Credentials:** real Supabase keys were committed earlier (`3e8f445`, `6f0ecfc`) and are in the remote history.
  The tracked `.env.example` files are now blank. The service-role key and database password **must be rotated**; blanking
  the files does not remove them from history.
- `mammoth` (DOCX) reports 3 moderate advisories in transitive dependencies. Uploads are capped at 5 MB, the file type is
  read from its first bytes, and parsing happens in memory.

## 6. Definition of done

| Item | Status |
|---|---|
| Exactly 15 candidates processed independently | Done (`npm run ncr:prepare` reports 15) |
| No cross-candidate leakage | Done: 0 foreign evidence; order-independence test |
| JSON schema validation | Done (zod, on every result) |
| Method, status, evidence on every skill | Done |
| Future goals are not current skills | Done on all sets: 0 of 14 (+4 held-out) leaked |
| Semantic suggestions stay inferred and pending | Done and tested; no model bundled |
| Precision, recall, F1, leakage, coverage, alias accuracy reported | Done |
| Regression tests for discovered failures | Done |
| Each role has a stable id and a rationale | Done as **team-drafted hypotheses**; no human reviewer yet |
| Role-skill mappings have level, weight, mandatory flag, evidence | Done (rationale text is templated, not sourced) |
| Job records have source, time, location, status | Done; **all 26 are simulated** |
| NCO / ESCO / O*NET mappings preserve original ids | **Not done.** No identifiers imported; `taxonomy_mappings.csv` is an empty template |
| Hard constraints before ranking; mandatory outside the score | Done and tested |
| Same inputs give identical results | Done and tested |
| Scores called estimated skill fit | Done |
| Fit, confidence, readiness, market fit, vacancy separate | Done |
| Real resumes not committed; no secrets in the repo or client | Done for the tree; **history still holds old keys, rotate them** |
| Existing tests and demo checks still pass | API tests pass (150). Live-stack demo checks not run (no migrated project) |
| End-to-end smoke covers upload, extraction, review, matching, explanations | Done as an HTTP test; not clicked through in a browser |

## 7. Limitations

- **Tiny sample, one author.** 15 resumes plus 3 held-out. The same person wrote the taxonomy, the aliases, the gold
  labels, the rules and the held-out resumes. Results show the pipeline works and expose failure modes; they do not
  estimate performance on real Delhi-NCR resumes.
- **Gold labels have no second reviewer.** `review_status` is `pending_human_review` on every row.
- **The synthetic corpus is US-based and English.** The three held-out resumes use Indian phrasing, but they are still
  synthetic. No Hindi, no scanned resumes (no OCR), no multi-column layout testing beyond the three PDFs.
- **Role data is not market evidence.** Requirements are drafted from general knowledge; none was checked against a live
  listing. Weights, levels and the mandatory flags are hypotheses. The 26 listings are simulated. There is no demand
  claim and no vacancy feed.
- **Sources were inspected, not imported** (2026-10-18). NCO 2015: three PDF volumes on dge.gov.in, no stated reuse terms.
  NCS: no API or terms visible on the landing page. ESCO: download needs an email and acceptance of a privacy statement,
  and the page states no licence. O\*NET 31.0: CC BY 4.0 with attribution. Nothing from them is in the dataset.
- Soft skills and out-of-scope hard skills (for example Swift, HTML) are not in the taxonomy and are ignored.

## 8. Next steps, in order

1. A human domain reviewer signs off or corrects role requirements, mandatory flags and transitions.
2. A second person labels the gold set independently; measure agreement.
3. With permission, collect real Delhi-NCR listings into `job_evidence.csv` (source, URL, collection time, terms).
4. Map roles to NCO codes by hand from the PDF volumes; keep original ids in `taxonomy_mappings.csv`.
5. Evaluate on real, consented resumes, including Hindi/English mixes and scanned files.
6. Decide the default level policy with the review UI, and show the effect in the demo.

## 9. Run it

```bash
npm run ncr:prepare                          # split corpus, add PDFs from resume_test_samples/, expect 15
npm run ncr:eval -- --mode baseline          # context-blind baseline
npm run ncr:eval -- --mode context           # ncr-rules-0.2
npm run ncr:eval -- --mode context --heldout # 3 unseen resumes
npm run ncr:eval -- --mode context --private # include the 3 private PDFs (redacted report)
npm run ncr:compare                          # manual vs extractor profile through the ranking
npm run api:test                             # all API tests
```
