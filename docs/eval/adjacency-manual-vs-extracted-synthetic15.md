# Manual profile vs extractor profile

Same ranking code, same levels. A difference between the two columns is an extraction effect. Roles that agree but look wrong for the person point at role data, the level assumption or scoring.

Dataset `ncr-roles-v1`, scoring `fit-v1`, adjacency `ncr-adjacency-v1`. 15 resumes.

## Level assumption matters more than extraction

A resume rarely states a proficiency level, so one is assumed when the text gives none (the worker sets the real level in the review step). Many role requirements need level 3 and several are mandatory, so a level-2 default pushes roles into "stretch".

- Assumed level 2: **9 of 15** manual profiles get no recommended role (blocked by a mandatory level-3 requirement or below the bar).
- Assumed level 3: **2 of 15** get no recommended role.
- Manual and extractor results identical: **12 of 15** (level 3) and **10 of 15** (level 2).

## Detail at assumed level 3 (professional use = "Independent")

| Resume | Group | Manual profile: recommended / stretch | Extractor profile | Skills missed / extra |
|---|---|---|---|---|
| resume_01 | manual_qa_banking | Manual QA Tester; QA Analyst; UAT / Business Testing Analyst / API Tester | same | 0/2 |
| resume_02 | manual_qa_banking | Manual QA Tester; QA Analyst; Banking Operations Associate / none | same | 0/2 |
| resume_03 | banking_ops_to_ba | Junior Business Analyst; Process Analyst; Banking Operations Associate / none | same | 0/0 |
| resume_04 | banking_ops_to_ba | Process Analyst; Banking Operations Associate; Junior Business Analyst / none | same | 0/1 |
| resume_05 | support_to_it | IT Support Technician; Customer Support Specialist / Service Desk Analyst | IT Support Technician; Customer Support Specialist; Junior Application Support Analyst / Service Desk Analyst | 0/1 |
| resume_06 | support_to_it | Customer Support Specialist; Service Desk Analyst; IT Support Technician / none | same | 0/0 |
| resume_07 | developer_go_c_linux | Junior Test Automation Engineer / none | same | 0/0 |
| resume_08 | developer_go_c_linux | none / none | same | 0/0 |
| resume_09 | data_analyst_excel_sql_pb | Reporting Analyst; MIS Executive / Reporting Specialist; Junior Data Analyst / none | same | 0/1 |
| resume_10 | data_analyst_excel_sql_pb | MIS Executive / Reporting Specialist; Reporting Analyst; Junior Data Analyst / none | same | 0/0 |
| resume_11 | career_break_returner | Process Analyst; Operations Analyst / none | Process Analyst; Operations Analyst; Banking Operations Associate / none | 0/1 |
| resume_12 | career_break_returner | none / none | same | 0/0 |
| resume_16 | heldout_bank_ops_ncr | Banking Operations Associate; MIS Executive / Reporting Specialist; UAT Analyst / none | same | 0/0 |
| resume_17 | heldout_support_ncr | Service Desk Analyst; Customer Support Specialist; IT Support Technician / none | IT Support Technician; Service Desk Analyst; Customer Support Specialist / none | 0/1 |
| resume_18 | heldout_mis_returner_ncr | MIS Executive / Reporting Specialist; Operations Analyst / Reporting Analyst; Junior Data Analyst | same | 1/0 |
