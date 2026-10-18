# Extractor evaluation: ncr-rules-0.2 (heldout3)

Extractor `ncr-rules-0.2` · dataset `ncr-roles-v1` · 3 resumes · 37 gold rows

| Metric | Result |
|---|---|
| Precision (current skills) | 100.0% (28/28) |
| Recall (current skills) | 96.6% (28/29) |
| F1 | 0.983 |
| Future-goal leakage | 0.0% (0/4) |
| Negation leakage | 0.0% (0/2) |
| Unsupported-skill rate | 0.0% (0/29) |
| Evidence coverage | 100.0% (37/37) |
| Canonicalization accuracy | 100.0% (36/36) |
| Candidate leakage (skills with evidence not in own resume) | 0 |
| Ambiguous gold pairs predicted as current | 1/2 |

Counts: TP 28, FP 0, FN 1.

## By profile group

| Group | Precision | Recall | F1 |
|---|---|---|---|
| heldout_bank_ops_ncr | 100.0% (15/15) | 100.0% (15/15) | 1.000 |
| heldout_support_ncr | 100.0% (7/7) | 100.0% (7/7) | 1.000 |
| heldout_mis_returner_ncr | 100.0% (6/6) | 85.7% (6/7) | 0.923 |

## Error categories

| Category | Count |
|---|---|
| FN:context_classification | 1 |

## False negatives (1)

- `resume_18` `data-analysis` [context_classification] gold=explicit_current extracted=future_goal: Analysed monthly sales data

## False positives (0)


## Non-current mentions treated as current (0)

