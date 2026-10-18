# Extractor ncr-rules-0.3 and adjacency ncr-adjacency-v2

What changed from ncr-rules-0.2 / ncr-adjacency-v1, and why. Scoring (`fit-v1`) is unchanged.

## Bugs found by probing with realistic, unseen resumes

| Bug | Effect in 0.2 | Fix in 0.3 |
|---|---|---|
| Every line under 80 characters before the first heading was skipped | Pasted text without headings returned **0 skills** | Only the first four name/title/contact lines are skipped, and only when they do not read like a sentence |
| `Experience:` (heading word + colon) was parsed as a label | The whole experience block stayed in "Document start" and was skipped | Bare section words with a colon, and `Skills: …` lines before the first heading, open a section |
| Exact alias text only | "handled customer queries", "reconciled", "reset passwords" missed | Light stemming on both sides; activity aliases ("acceptance testing") still need an inflected word, and everyday words ("react", "profiling") match only exactly |
| No Indian banking / support vocabulary | NEFT, RTGS, IMPS, UPI, Finacle, L1 tickets, Office 365, LAN/WAN all missed | 131 aliases added (all `draft_unreviewed`) |
| Context-required matches (AD, Go, C, SWIFT) had an off-by-one index | Level cues and target-role checks read the wrong position | Prefix normalised with a sentinel so trailing spaces are kept |
| Every accepted skill defaulted to level 2 in the UI; most core requirements need 3 | A manual tester with 3 years got "Junior Test Automation Engineer" as the top role and "Manual QA Tester" as blocked | Suggested level from stated level, tenure (dated jobs, "N years of experience"), and work-history mentions, with the reason shown (`level_basis`) |
| A goal next to a claim raised `conflicting_evidence` | "Uses Zendesk, wants a service-desk role" was flagged as a contradiction | Only a stated lack of experience conflicts with a claim |

## New in the extraction result

- `level_basis` per skill: why that level was suggested ("Used at work for about 5 years").
- `detected_roles`: pilot roles the resume shows the person has held (job titles, headline, summary), most recent first. Never a skill claim; aspirations ("Seeking a position as …") are ignored.
- `experience_years`: stated total, else the union of dated jobs.
- `pattern_rule` method: phrase patterns for work described with words in between ("Analysed monthly sales data", "Resolved 40+ tickets", "Led a team of 6").

## New in recommendations (ncr-adjacency-v2)

- The current role is never recommended; it is returned as `current_roles` (the starting point).
- `transition` on a role when `transition_examples.csv` documents a move from the current role.
- `learning_plan` per role: ordered steps (mandatory gaps first, then fit gained per hour), hours, weeks at the worker's weekly time, and estimated fit after learning. Learned skills stay self-reported, so the plan never promises more than the 0.7 evidence factor allows; proving skills raises it further.
- `study_next`: the skills that move the most nearby roles per hour of study.
- Saved profiles get the same `study_next` in `/recommendations/latest` and a `learning_plan` in `/roles/:id/gaps`.

## Evaluation

| Set | Precision | Recall | Future-goal leakage |
|---|---|---|---|
| synthetic12 (0.2 → 0.3) | 100% → 100% | 100% → 100% | 0/14 → 0/14 |
| heldout3 (0.2 → 0.3) | 100% → 100% | 96.6% → 100% | 0/4 → 0/4 |

**The held-out set is no longer blind.** Its last miss ("Analysed monthly sales data") was inspected while building the pattern rules, so 0.3's held-out score is not an unbiased estimate. The frozen first run of 0.2 stays in `extractor-ncr-rules-0.2-heldout3-FIRST-RUN-frozen.md`. A new unseen set is needed before quoting recall on real resumes.

The baseline report changed only because the alias file grew; `baseline-0.1` still matches exact alias text with no context.
