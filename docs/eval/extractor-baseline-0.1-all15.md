# Extractor evaluation: baseline-0.1 (all15)

Extractor `baseline-0.1` · dataset `ncr-roles-v1` · 15 resumes · 205 gold rows

| Metric | Result |
|---|---|
| Precision (current skills) | 90.8% (167/184) |
| Recall (current skills) | 98.2% (167/170) |
| F1 | 0.944 |
| Future-goal leakage | 100.0% (14/14) |
| Negation leakage | 100.0% (1/1) |
| Unsupported-skill rate | 0.0% (0/204) |
| Evidence coverage | 100.0% (204/204) |
| Canonicalization accuracy | 97.5% (199/204) |
| Candidate leakage (skills with evidence not in own resume) | 0 |
| Ambiguous gold pairs predicted as current | 20/20 |

Counts: TP 167, FP 17, FN 3.

## By profile group

| Group | Precision | Recall | F1 |
|---|---|---|---|
| manual_qa_banking | 90.9% (30/33) | 100.0% (30/30) | 0.952 |
| banking_ops_to_ba | 90.6% (29/32) | 100.0% (29/29) | 0.951 |
| support_to_it | 89.5% (17/19) | 100.0% (17/17) | 0.945 |
| developer_go_c_linux | 92.3% (24/26) | 92.3% (24/26) | 0.923 |
| data_analyst_excel_sql_pb | 86.4% (19/22) | 100.0% (19/19) | 0.927 |
| career_break_returner | 81.0% (17/21) | 100.0% (17/17) | 0.895 |
| individual | 100.0% (31/31) | 96.9% (31/32) | 0.984 |

## Error categories

| Category | Count |
|---|---|
| FN:section_or_matching | 3 |
| FP:future_goal_leakage | 14 |
| FP:negation_leakage | 1 |
| FP:unlabelled_or_false_positive | 2 |

## False negatives (3)

- `resume_08` `go-programming` [section_or_matching] gold=explicit_current extracted=none: Go (Advanced: concurrency patterns, goroutines, channels, sync package)
- `resume_08` `c-cpp-programming` [section_or_matching] gold=explicit_current extracted=none: C (Intermediate: pointers, structs, socket APIs)
- `resume_15` `go-programming` [section_or_matching] gold=explicit_current extracted=none: [redacted: private resume]

## False positives (17)

- `resume_01` `test-automation` [future_goal_leakage] gold=future_goal extracted=explicit_current: - Actively enrolled in a self-paced Python for Automation evening course; currently practicing syntax with an explicit learning goal to eventually transition into Selenium test script automation (no c
- `resume_02` `javascript-typescript` [future_goal_leakage] gold=future_goal extracted=explicit_current: - Pursuing an introduction to Cypress and JavaScript via Codecademy with the future aspiration of building UI automation frameworks.
- `resume_02` `test-automation` [future_goal_leakage] gold=future_goal extracted=explicit_current: - Pursuing an introduction to Cypress and JavaScript via Codecademy with the future aspiration of building UI automation frameworks.
- `resume_03` `bi-dashboarding` [future_goal_leakage] gold=future_goal extracted=explicit_current: - Long-term goal: Learn Tableau to create self-service operational risk metrics for compliance stakeholders.
- `resume_03` `data-analysis` [unlabelled_or_false_positive] gold=not_present extracted=explicit_current: - Completed online coursework: "Python for Business Data Analysis" on Coursera (audit mode; theoretical understanding, not applied in production).
- `resume_03` `python-programming` [negation_leakage] gold=negated_or_no_experience extracted=explicit_current: - Completed online coursework: "Python for Business Data Analysis" on Coursera (audit mode; theoretical understanding, not applied in production).
- `resume_05` `shell-scripting` [future_goal_leakage] gold=future_goal extracted=explicit_current: - Future Learning Goal: Intends to learn Bash and PowerShell scripting to automate repetitive user onboarding workflows.
- `resume_06` `python-programming` [future_goal_leakage] gold=future_goal extracted=explicit_current: • Learning Goal: Enrolled in an independent self-study course for Python script automation; has completed basic syntax modules (loops, variables) but has not applied Python in any enterprise or produc
- `resume_07` `rust-programming` [future_goal_leakage] gold=future_goal extracted=explicit_current: - Aspirational Study: Currently reading "Programming WebAssembly with Rust" with the intention to study Rust in the future for safety-critical systems.
- `resume_08` `kubernetes` [future_goal_leakage] gold=future_goal extracted=explicit_current: - Exploring Kubernetes Operator patterns in Go via online blog tutorials (hobby exploration only; no enterprise Kubernetes cluster management experience).
- `resume_09` `machine-learning` [future_goal_leakage] gold=future_goal extracted=explicit_current: - Completed theoretical Coursera certificate in "Machine Learning with Python" (Scikit-Learn); currently practicing basic linear regression on Kaggle datasets as a learning goal.
- `resume_09` `python-programming` [future_goal_leakage] gold=future_goal extracted=explicit_current: - Completed theoretical Coursera certificate in "Machine Learning with Python" (Scikit-Learn); currently practicing basic linear regression on Kaggle datasets as a learning goal.
- `resume_10` `r-programming` [future_goal_leakage] gold=future_goal extracted=explicit_current: * Aspirational Goal: Intends to study R programming for statistical computing in a future academic program.
- `resume_11` `ci-cd-pipelines` [unlabelled_or_false_positive] gold=not_present extracted=explicit_current: SARAH JENKINS-THORNE
- `resume_11` `python-programming` [future_goal_leakage] gold=future_goal extracted=explicit_current: - Career Goal: Has identified Python scripting as an interest area to explore for project metrics automation; currently has no practical Python coding experience.
- `resume_12` `data-analysis` [future_goal_leakage] gold=future_goal extracted=explicit_current: * Learning Goal: Exploring entry-level data analytics; intends to begin studying SQL fundamentals in the coming year (zero current database querying experience).
- `resume_12` `sql-querying` [future_goal_leakage] gold=future_goal extracted=explicit_current: * Learning Goal: Exploring entry-level data analytics; intends to begin studying SQL fundamentals in the coming year (zero current database querying experience).

## Non-current mentions treated as current (15)

- `resume_01` `test-automation` [future_goal_leakage] gold=future_goal extracted=explicit_current: - Actively enrolled in a self-paced Python for Automation evening course; currently practicing syntax with an explicit learning goal to eventually transition into Selenium test script automation (no c
- `resume_02` `javascript-typescript` [future_goal_leakage] gold=future_goal extracted=explicit_current: - Pursuing an introduction to Cypress and JavaScript via Codecademy with the future aspiration of building UI automation frameworks.
- `resume_02` `test-automation` [future_goal_leakage] gold=future_goal extracted=explicit_current: - Pursuing an introduction to Cypress and JavaScript via Codecademy with the future aspiration of building UI automation frameworks.
- `resume_03` `bi-dashboarding` [future_goal_leakage] gold=future_goal extracted=explicit_current: - Long-term goal: Learn Tableau to create self-service operational risk metrics for compliance stakeholders.
- `resume_03` `python-programming` [negation_leakage] gold=negated_or_no_experience extracted=explicit_current: - Completed online coursework: "Python for Business Data Analysis" on Coursera (audit mode; theoretical understanding, not applied in production).
- `resume_05` `shell-scripting` [future_goal_leakage] gold=future_goal extracted=explicit_current: - Future Learning Goal: Intends to learn Bash and PowerShell scripting to automate repetitive user onboarding workflows.
- `resume_06` `python-programming` [future_goal_leakage] gold=future_goal extracted=explicit_current: • Learning Goal: Enrolled in an independent self-study course for Python script automation; has completed basic syntax modules (loops, variables) but has not applied Python in any enterprise or produc
- `resume_07` `rust-programming` [future_goal_leakage] gold=future_goal extracted=explicit_current: - Aspirational Study: Currently reading "Programming WebAssembly with Rust" with the intention to study Rust in the future for safety-critical systems.
- `resume_08` `kubernetes` [future_goal_leakage] gold=future_goal extracted=explicit_current: - Exploring Kubernetes Operator patterns in Go via online blog tutorials (hobby exploration only; no enterprise Kubernetes cluster management experience).
- `resume_09` `machine-learning` [future_goal_leakage] gold=future_goal extracted=explicit_current: - Completed theoretical Coursera certificate in "Machine Learning with Python" (Scikit-Learn); currently practicing basic linear regression on Kaggle datasets as a learning goal.
- `resume_09` `python-programming` [future_goal_leakage] gold=future_goal extracted=explicit_current: - Completed theoretical Coursera certificate in "Machine Learning with Python" (Scikit-Learn); currently practicing basic linear regression on Kaggle datasets as a learning goal.
- `resume_10` `r-programming` [future_goal_leakage] gold=future_goal extracted=explicit_current: * Aspirational Goal: Intends to study R programming for statistical computing in a future academic program.
- `resume_11` `python-programming` [future_goal_leakage] gold=future_goal extracted=explicit_current: - Career Goal: Has identified Python scripting as an interest area to explore for project metrics automation; currently has no practical Python coding experience.
- `resume_12` `data-analysis` [future_goal_leakage] gold=future_goal extracted=explicit_current: * Learning Goal: Exploring entry-level data analytics; intends to begin studying SQL fundamentals in the coming year (zero current database querying experience).
- `resume_12` `sql-querying` [future_goal_leakage] gold=future_goal extracted=explicit_current: * Learning Goal: Exploring entry-level data analytics; intends to begin studying SQL fundamentals in the coming year (zero current database querying experience).
