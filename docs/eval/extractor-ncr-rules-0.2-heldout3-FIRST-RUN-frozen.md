# Extractor evaluation: ncr-rules-0.2 (heldout3)

Extractor `ncr-rules-0.2` · dataset `ncr-roles-v1` · 3 resumes · 37 gold rows

| Metric | Result |
|---|---|
| Precision (current skills) | 100.0% (25/25) |
| Recall (current skills) | 86.2% (25/29) |
| F1 | 0.926 |
| Future-goal leakage | 0.0% (0/4) |
| Negation leakage | 0.0% (0/2) |
| Unsupported-skill rate | 0.0% (0/26) |
| Evidence coverage | 100.0% (35/35) |
| Canonicalization accuracy | 94.3% (33/35) |
| Candidate leakage (skills with evidence not in own resume) | 0 |
| Ambiguous gold pairs predicted as current | 1/2 |

Counts: TP 25, FP 0, FN 4.

## By profile group

| Group | Precision | Recall | F1 |
|---|---|---|---|
| heldout_bank_ops_ncr | 100.0% (12/12) | 80.0% (12/15) | 0.889 |
| heldout_support_ncr | 100.0% (7/7) | 100.0% (7/7) | 1.000 |
| heldout_mis_returner_ncr | 100.0% (6/6) | 85.7% (6/7) | 0.923 |

## Error categories

| Category | Count |
|---|---|
| FN:context_classification | 2 |
| FN:missing_alias | 2 |

## False negatives (4)

- `resume_16` `reconciliation` [context_classification] gold=explicit_current extracted=future_goal: Reconcile daily NEFT and RTGS settlement files
- `resume_16` `defect-management` [missing_alias] gold=explicit_current extracted=none: logging defects in Jira
- `resume_16` `customer-support` [missing_alias] gold=explicit_current extracted=none: Handled customer queries over phone and email
- `resume_18` `data-analysis` [context_classification] gold=explicit_current extracted=future_goal: Analysed monthly sales data

## False positives (0)


## Non-current mentions treated as current (0)

