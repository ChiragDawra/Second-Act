# Extractor evaluation: baseline-0.1 (heldout3)

Extractor `baseline-0.1` · dataset `ncr-roles-v1` · 3 resumes · 37 gold rows

| Metric | Result |
|---|---|
| Precision (current skills) | 82.9% (29/35) |
| Recall (current skills) | 100.0% (29/29) |
| F1 | 0.907 |
| Future-goal leakage | 100.0% (4/4) |
| Negation leakage | 100.0% (2/2) |
| Unsupported-skill rate | 0.0% (0/37) |
| Evidence coverage | 100.0% (37/37) |
| Canonicalization accuracy | 100.0% (36/36) |
| Candidate leakage (skills with evidence not in own resume) | 0 |
| Ambiguous gold pairs predicted as current | 2/2 |

Counts: TP 29, FP 6, FN 0.

## By profile group

| Group | Precision | Recall | F1 |
|---|---|---|---|
| heldout_bank_ops_ncr | 83.3% (15/18) | 100.0% (15/15) | 0.909 |
| heldout_support_ncr | 77.8% (7/9) | 100.0% (7/7) | 0.875 |
| heldout_mis_returner_ncr | 87.5% (7/8) | 100.0% (7/7) | 0.933 |

## Error categories

| Category | Count |
|---|---|
| FP:future_goal_leakage | 4 |
| FP:negation_leakage | 2 |

## False negatives (0)


## False positives (6)

- `resume_16` `api-testing` [negation_leakage] gold=negated_or_no_experience extracted=explicit_current: - Have not worked on any API testing tools so far.
- `resume_16` `bi-dashboarding` [future_goal_leakage] gold=future_goal extracted=explicit_current: - Keen to pick up Power BI and have started a short YouTube course on dashboards; yet to build a real report.
- `resume_16` `python-programming` [future_goal_leakage] gold=future_goal extracted=explicit_current: - Planning to learn Python for automating reconciliation reports.
- `resume_17` `cloud-platforms` [future_goal_leakage] gold=future_goal extracted=explicit_current: - Intend to take the Microsoft Azure fundamentals exam next year.
- `resume_17` `shell-scripting` [negation_leakage] gold=negated_or_no_experience extracted=explicit_current: - No experience yet with Linux administration or shell scripting.
- `resume_18` `python-programming` [future_goal_leakage] gold=future_goal extracted=explicit_current: Currently learning Tableau and exploring Python for data analysis.

## Non-current mentions treated as current (6)

- `resume_16` `api-testing` [negation_leakage] gold=negated_or_no_experience extracted=explicit_current: - Have not worked on any API testing tools so far.
- `resume_16` `bi-dashboarding` [future_goal_leakage] gold=future_goal extracted=explicit_current: - Keen to pick up Power BI and have started a short YouTube course on dashboards; yet to build a real report.
- `resume_16` `python-programming` [future_goal_leakage] gold=future_goal extracted=explicit_current: - Planning to learn Python for automating reconciliation reports.
- `resume_17` `cloud-platforms` [future_goal_leakage] gold=future_goal extracted=explicit_current: - Intend to take the Microsoft Azure fundamentals exam next year.
- `resume_17` `shell-scripting` [negation_leakage] gold=negated_or_no_experience extracted=explicit_current: - No experience yet with Linux administration or shell scripting.
- `resume_18` `python-programming` [future_goal_leakage] gold=future_goal extracted=explicit_current: Currently learning Tableau and exploring Python for data analysis.
