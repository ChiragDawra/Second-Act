# Second Act — Product Requirements Document (PRD)

**Team:** Maniac Coders  
**Hackathon:** SAP Hackfest 2026 — Inclusive Workforce  
**Primary theme:** Entrepreneurship & Employment  
**Supporting capability:** Alumni and professional mentorship  
**Product tagline:** *The nearest role, not the hardest restart.*  
**Document status:** Proposed MVP specification for mentor evaluation

---

## 1. Executive summary

Second Act is an explainable career-transition and workforce-redeployment platform for people whose roles are changing or disappearing because of automation, AI, restructuring, or changing skill requirements. It helps people uncover transferable skills, identify realistic adjacent roles, understand what is missing, demonstrate relevant skills, connect with a mentor, and move toward a suitable opportunity.

The product is **not** a generic job portal, a resume chatbot, or a system that predicts who will get hired. Its core differentiator is the **Adjacency Engine**: a transparent system that compares evidence-backed worker skills with explicit role requirements and explains both the fit and the gaps.

### Product promise

> Turn work experience into an evidence-backed path to the nearest feasible next role—with clear gaps, practical validation, and human support.

## 2. Problem statement

Workers can be overlooked when their resumes and target job descriptions describe related capabilities using different language. A job title alone may understate experience, and a resume may fail to make transferable skills explicit. Generic advice such as “learn automation” does not identify which requirement matters, how to demonstrate it, or whether the role fits the worker’s constraints.

Second Act tests the hypothesis that a curated skill/role knowledge base, evidence-aware extraction, and transparent constraints-based ranking can produce more useful transition recommendations than keyword overlap alone. This is a hypothesis to evaluate—not a proven claim about all displaced workers.

## 3. Users and stakeholders

### Primary beneficiary — worker in transition

Needs a respectful, practical route from prior experience to a feasible next role. Must be able to inspect, correct, and control the profile and decide what to share.

### Enterprise user — HR/workforce transition reviewer

Needs a view of potential internal redeployment matches and the evidence behind them. Recommendations are decision support, not automatic layoff, exclusion, or hiring decisions.

### Supporting user — mentor/alumnus

Needs a limited view of the goals and gap areas shared by a worker, with consent, plus a structured mentorship request or sprint.

### Demo persona — Harpreet

A fictional worker with 14 years of manual QA experience and banking-domain knowledge whose role has been affected by change. QA Automation Engineer is one possible transition to evaluate. Any skill, gap, score, opportunity, or mentor shown in the demo must come from the seeded dataset and be visibly labelled as illustrative where applicable.

## 4. Goals and success criteria

### MVP goals

1. Turn a resume/work-history description into a reviewable set of candidate skills with evidence and status.
2. Recommend the top three feasible adjacent roles from a curated set of 10–20 roles.
3. Explain role fit, transferable evidence, unknowns, missing skills, mandatory blockers, and user-constraint failures.
4. Produce one gap-focused learning activity and practical assessment.
5. Update only the skill actually assessed, keeping course completion separate from demonstrated competence.
6. Show a simple mentor match and/or an HR review view using clearly labelled demo records.
7. Preserve privacy and make external sharing dependent on explicit user approval.

### Definition of MVP success

- A reviewer can trace every extracted skill to the source text, a user confirmation, or an assessment result.
- The same profile, role dataset version, and scoring-rule version produce the same rank order and score.
- The top three recommendations show the exact role requirements and the reason for ranking.
- Mandatory requirements and non-negotiable constraints cannot be concealed by an aggregate score.
- Unknown skills are labelled unknown—not silently treated as proven or definitely absent.
- The interface distinguishes role suitability, learning progress, verified evidence, market demand, and a currently verified vacancy.
- The main Harpreet demo works from start to finish without manually editing the database.
- No real CV, real mentor identity, or live SAP connection is needed to demonstrate the prototype.

## 5. Scope

### P0 — must work for the demo

**Worker profile and consent**
- Create a worker profile using synthetic data, pasted work history, or a manually entered profile.
- Capture constraints such as preferred location/remote work, salary floor (optional), available weekly learning time, training budget, and preferred role families.
- Display consent and sharing settings.

**Skills discovery**
- Extract candidate skills and associated evidence snippets from profile text.
- Normalize synonyms to canonical skill IDs and labels.
- Assign `self_reported`, `inferred`, `verified`, `unknown`, or `not_demonstrated` status as appropriate.
- Let the worker confirm, edit, or reject every uncertain skill.

**Role Adjacency Engine**
- Compare the worker profile with 10–20 curated roles.
- Filter non-negotiable constraints before ranking.
- Calculate a deterministic estimated skill-fit score with a visible breakdown.
- Return up to three viable roles with transfer evidence, gaps, blockers, and unknowns.
- Never represent a fit score as the probability of being hired.

**Gap pathway and verification**
- Select one important gap and give a grounded resource or practical task.
- Include a small, fixed assessment/rubric for the demo.
- Update only the skill assessed; preserve assessment evidence and timestamp.
- Clearly separate “resource completed” from “skill demonstrated in assessment.”

**Mentor / HR support**
- Show a small synthetic mentor shortlist ranked by gap coverage, experience relevance, availability, language, and session format.
- Permit a demo mentorship request, requiring confirmation before any profile details are shared.
- Provide a simple HR/redeployment view of a worker’s recommended internal role pathway and evidence status. Do not make employment decisions automatically.

**Trust and provenance**
- Show source/version/date for occupation and role-skill data.
- If no reliable live vacancy feed exists, state “No current vacancy verified” or show an explicitly simulated opportunity.
- Keep user-visible correction, delete/reset, and report/appeal paths appropriate to the prototype.

### P1 — only after P0 is stable

- Real resume PDF upload with secure handling and size/type validation.
- A second worker persona and wider role coverage.
- Mentor availability calendar and multi-week sprint workflow.
- Real, permissioned vacancy API/source with URL and last-checked timestamp.
- Exportable worker-controlled transition summary.

### Explicit non-goals

- Training a large language model from scratch.
- Building six unrestricted autonomous agents.
- Predicting hiring probability, salary, or guaranteed learning time.
- Automatically applying for jobs, contacting recruiters, sharing CVs, or making HR decisions.
- Scraping sites in violation of their terms.
- Claiming a native SAP SuccessFactors/Joule integration without a real, tested, authorized integration.
- Proving increased placement or retention rates from synthetic demo data.

## 6. Functional requirements

| ID | Requirement | Priority | Acceptance check |
|---|---|---:|---|
| FR-01 | Create/edit a worker profile and preferences | P0 | Missing optional fields do not crash the flow |
| FR-02 | Extract skills with evidence and provenance | P0 | Each extracted item includes source text or is marked unsupported/uncertain |
| FR-03 | Allow confirm/edit/reject of skills | P0 | User correction is persisted and included in recomputation |
| FR-04 | Normalize skill aliases to canonical IDs | P0 | Synonyms map to the same canonical skill when the taxonomy supports it |
| FR-05 | Rank up to three adjacent roles deterministically | P0 | Same versioned input produces same result |
| FR-06 | Show mandatory requirements separately | P0 | A failed mandatory skill appears as a blocker regardless of score |
| FR-07 | Apply hard user constraints before ranking | P0 | A role violating a non-negotiable constraint is removed or marked unavailable with reason |
| FR-08 | Generate one focused learning task | P0 | Task maps to a specific gap and role requirement |
| FR-09 | Record assessment result | P0 | Only assessed skill(s) change status/proficiency |
| FR-10 | Suggest a suitable synthetic mentor | P0 | Match explanation shows gap coverage and availability basis |
| FR-11 | Show source/freshness for opportunity data | P0 | No simulated vacancy is presented as real |
| FR-12 | Require approval for profile sharing | P0 | Sharing endpoint/action rejects absent consent |
| FR-13 | Expose basic HR review dashboard | P0/P1 | HR view only sees profiles it is permitted to review; demo access is labelled |
| FR-14 | Record important changes without storing resume text in logs | P0 | Audit event records action/actor/time, not sensitive document contents |

## 7. Score and status vocabulary

### Skill statuses

- `self_reported`: the worker says they have the skill; not independently assessed.
- `inferred`: a model or rule proposes the skill based on text; user review is needed.
- `verified`: supported by an appropriate practical assessment, reviewed work sample, or documented credential. The record must specify what was assessed.
- `unknown`: not enough evidence to conclude either way.
- `not_demonstrated`: an assessment or review did not show the required proficiency. This is not the same as “never has the skill.”

### Estimated skill-fit score

For each role requirement `i`, store importance weight `w_i`, required proficiency `q_i`, worker proficiency evidence `p_i`, and an evidence reliability factor `e_i` (for example, a documented configured value for verified/self-reported/inferred evidence). Compute a weighted, bounded coverage score:

`fit_score = 100 × sum(w_i × min(p_i / q_i, 1) × e_i) / sum(w_i)`

Implementation must define zero/unknown handling and display it. Unknown skills contribute no demonstrated evidence to this conservative baseline, but must be listed as **unknown**, not called definitely missing. The score is an illustrative ranking aid, not a calibrated employment outcome or hiring probability. Keep these fields separate:

- `role_fit_score`
- `evidence_confidence`
- `critical_gaps`
- `readiness_status`
- `market_fit`
- `estimated_learning_effort`

Mandatory requirements are independent blockers and may not be cancelled out by a high average score. Weights and evidence factors must be documented and versioned.

## 8. Data and AI policy

- Start from a curated skill taxonomy and role requirements; do not make the LLM the source of truth.
- Use a model for messy text extraction and semantic candidate retrieval, not for final score arithmetic or permission decisions.
- Validate structured model output against a schema and canonical skill vocabulary.
- A resume-derived inference is not a verified skill.
- Recommendations must be grounded in actual role-skill records and visible evidence.
- Keep occupation requirements, labour-market demand, and live vacancy status as distinct data types.
- Record dataset version, scoring-rule version, and model version for reproducibility.
- Use synthetic worker and mentor data in the hackathon demo. Real CV processing requires explicit consent, appropriate privacy controls, and a clear retention/deletion policy.

## 9. Product risks and mitigations

| Risk | Mitigation |
|---|---|
| Unsupported skills are added by the model | Evidence span, uncertainty status, user review, taxonomy validation |
| Score looks like a hiring probability | Label it estimated skill fit; show score components and limitations |
| Strong average score hides mandatory gap | Separate blocker gate and gap panel |
| Old or simulated jobs look real | Source, collection/checked date, status, and simulation label |
| Bias from age/name/prestige | Do not rank using protected traits; run counterfactual smoke tests |
| LLM invents a credential or source | Schema and taxonomy validation; explanations only from computed fields |
| Data leaks across worker/HR/mentor accounts | Server-side authorization, database row-level controls, consented sharing |
| Scope balloons | Finish one vertical slice before extra roles, agents, or integrations |

## 10. Evaluation plan

Build a small test set from synthetic profiles and public taxonomy data; manually review it. Measure and report actual results only.

- Skill extraction: precision, recall, F1, unsupported-claim rate.
- Skill normalization: alias-mapping accuracy.
- Recommendations: expert relevance of top three, Precision@3 where labels exist, critical-gap omission rate.
- Explainability: whether each explanation is supported by displayed inputs and requirements.
- Repeatability: identical versioned input produces identical scores/ranking.
- Robustness: empty, malformed, contradictory, and extremely long input cases.
- Fairness smoke test: changing irrelevant demographic details alone should not change the ranking.
- Assessment: only the skill actually tested changes state.
- Consent/security: unauthorized profile and mentor access is denied; external sharing without approval fails.

Synthetic data can demonstrate workflow correctness but cannot establish real-world placement impact or validated fairness.

## 11. Demo narrative

1. Introduce fictional Harpreet and explain why keyword matching may undersell manual QA and banking-domain experience.
2. Extract candidate skills and display the evidence behind each.
3. Have Harpreet correct one uncertain or inaccurate skill.
4. Show three adjacent roles and explain the ranking.
5. Open QA Automation Engineer; show score components, mandatory blockers, unknowns, and gaps.
6. Assign one gap-focused task and complete a small assessment.
7. Update the relevant skill only, then recompute the role view.
8. Show a synthetic mentor match or sourced opportunity pathway.
9. Open the HR review view and show evidence-led redeployment support.
10. Demonstrate consent and make clear what is mocked versus connected.

**Winning demo moment:** the worker can see why a transition is plausible, what remains uncertain, and what evidence will move them closer to the next opportunity.

## 12. Release readiness checklist

- [ ] Main journey works from seeded data in a clean session.
- [ ] All demo people, mentors, vacancies, and outcomes are labelled synthetic unless independently verified.
- [ ] No hard-coded “72% match” or guaranteed outcome claim.
- [ ] Score calculation and dataset version are visible or inspectable.
- [ ] Mandatory blockers and constraints work.
- [ ] Skills can be edited and recalculated.
- [ ] Assessment updates only relevant skill(s).
- [ ] Unauthorized access and consent checks pass.
- [ ] Secrets and CVs are not committed to Git or copied into public logs.
- [ ] SAP is described as a planned integration unless a real API call has been successfully tested.
