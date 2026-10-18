# Delhi-NCR dataset v1 (`ncr-roles-v1`)

Pilot data for the Delhi-NCR skill extractor and adjacency engine (Delhi, Gurugram, Noida, Ghaziabad, Faridabad).
Collected and authored 2026-10-18.

**Read this first.** This is a project-curated pilot, not a labour-market survey. Every role, requirement, weight,
mandatory flag and transition is a team-drafted hypothesis marked unreviewed. Every job listing is **simulated**.
Nothing here supports a claim about real Delhi-NCR demand, vacancies or hiring odds.

## Files

| File | Rows | Purpose | Review status |
|---|---|---|---|
| `skills.csv` | 62 | Canonical skills with aliases, category, description | `draft_unreviewed` |
| `skill_aliases.csv` | 527 | One row per alias. `context_required` rows (`ad`, `go`, `c`, `swift`) match only where the sentence supports the meaning. A row with `a;b` evidences two skills at once | `draft_unreviewed` |
| `roles.csv` | 17 | Four families: QA/testing, banking operations and business analysis, customer and IT support, data and reporting | `draft_pending_human_review` |
| `role_skills.csv` | 147 | Requirement per role and skill: weight 1-5, required level 1-4, mandatory flag, rationale | `draft_unreviewed` |
| `transition_examples.csv` | 17 | Source role to target role, transferable and gap skills (derived from `role_skills.csv`) | `hypothesis_unreviewed` |
| `job_evidence.csv` | 26 | Listing records. All `synthetic=true`, `listing_status=simulated`, no URL | simulated |
| `taxonomy_mappings.csv` | 0 | Empty template for NCO / ESCO / O\*NET ids when they are mapped | n/a |
| `scoring_config.json` | 1 | Versions, cities, recommendation bar, learning hours per level, limitations | n/a |
| `resume_gold_labels.csv` | 165 | Gold labels for the 12 synthetic resumes | `pending_human_review` |
| `eval/` | | Corpus of 12 synthetic resumes, 3 held-out resumes and labels, manifest, `gold_revisions.md` | synthetic |

## Proficiency scale (one scale everywhere)

| Level | Label | Meaning |
|---|---|---|
| 0 | None | No evidence of use |
| 1 | Aware | Has used it with guidance or on small tasks |
| 2 | Practiced | Uses it regularly on routine work |
| 3 | Independent | Handles typical work alone and fixes its own mistakes |
| 4 | Expert | Designs approaches, teaches others, handles the hard cases |

Importance weight: 5 defining, 4 core, 3 important, 1-2 supporting. A weight is a relative importance inside one role,
not a probability.

## Statuses

`self_reported`, `inferred`, `verified`, `unknown`, `not_demonstrated`. Resume extraction produces `self_reported`
(an explicit current claim), `inferred` (coursework or a model suggestion) or `unknown` (goals, negations, ambiguous).
Only an assessment can produce `verified`. Unknown is not zero.

## Provenance and honesty

- **Skills and aliases** were written by the project team's tooling while reading the 15 evaluation resumes, so they fit
  that corpus. The held-out resumes exist to show how far that fit generalises.
- **Role requirements** carry a templated rationale ("Team-drafted hypothesis ... not yet validated against live
  listings"). `source_url` is empty because no requirement has been checked against a real source yet.
- **Mandatory flags** are provisional: at most two per role, each needing a second reviewer.
- **Transitions** carry no success rate and invent none.
- **Occupation codes** are blank. NCO-2015 mapping has not been done.
- **Simulated listings** exercise the pipeline. They are labelled, carry a collection date, and are shown in the product
  only as a "simulated sample", never as demand or openings.

See [SOURCES.md](SOURCES.md) for the sources inspected and their access conditions.

## Changing the data

Edit the CSVs, then run `npm run api:test`. The `ncr.adjacency` tests validate referential integrity (every role, skill and
alias reference), weight and level ranges, the simulated-listing rule and the at-most-two-mandatory rule. Bump
`dataset_version` in `scoring_config.json` for any change that alters results.
