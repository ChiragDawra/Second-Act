# Second Act — Implementation Plan

Principle: finish one vertical slice (Harpreet demo) before breadth. Each phase ends demo-able. Task IDs (P1.1…) are what you tell the coding agent to work on, one at a time.

## Phase 0 — Foundations (0.5 day)
- P0.1 Monorepo (`apps/web|api|ml`, `data`, `db`, `docs`), pnpm workspace, TS strict, lint, `pnpm check`.
- P0.2 Copy 4 specs into `/docs`; add `AGENTS.md` at root; `.gitignore` with `.env*`; secret scanning.
- P0.3 Supabase project (separate demo project), env templates, CI running `pnpm check`.
**Done when:** empty web/api/ml apps boot; CI green.

## Phase 1 — Data and schema (1 day) ← most important
- P1.1 DB migrations: profiles, skills, worker_skills, roles, role_skill_requirements, recommendations, learning_resources, assessments, assessment_results, mentor_profiles, mentor_requests, opportunities, consent_events, audit_events.
- P1.2 Curate data (3 role families: software QA, IT support, data ops; add customer support only if time): ~60–100 skills with aliases, 10–15 roles, role_skills with weight / required proficiency / mandatory flag. Pull a focused ESCO/O*NET subset, hand-review each role.
- P1.3 Seed: Harpreet profile (14 yrs manual QA, banking), 8 synthetic mentors, ~6 simulated opportunities (`is_simulated=true`), 3–5 assessments with rubrics, verified-URL resources.
- P1.4 CSV validator script (orphan IDs, weights > 0, q_i > 0).
**Done when:** `db:reset && db:seed` yields a clean, validated dataset with version tags.

## Phase 2 — Auth, API skeleton, authz (1 day)
- P2.1 Supabase Auth in FE; Express JWT middleware; zod validation; error shape; request IDs; rate limit; CORS allowlist.
- P2.2 Profile CRUD + consent events (`POST/GET/PATCH /profiles`).
- P2.3 RLS policies for worker / mentor / HR; authz test suite (own vs other profile, no token).
**Done when:** unauthorized access tests pass.

## Phase 3 — Skill extraction and review (1–1.5 days)
- P3.1 FastAPI `/extract`: alias/phrase matcher with evidence spans → canonical IDs, status `inferred`, confidence. Input size cap.
- P3.2 Embedding fallback (MiniLM, in-memory cosine; exact alias wins; semantic = suggestion only).
- P3.3 API `POST /profiles/:id/skills/extract`, `PATCH .../skills` (confirm/edit/reject, audit history).
- P3.4 UI: paste history → candidate skills with evidence → confirm/edit/reject → canonical profile.
- P3.5 Optional LLM extractor behind interface, schema-validated; off by default. Test prompt-injection text.
**Done when:** Harpreet flow works with LLM disabled.

## Phase 4 — Adjacency engine (1.5 days)
- P4.1 Scoring module (pure function, no I/O) + config file for `e_i` factors, versioned `fit-v1`.
- P4.2 Constraint filter → score → mandatory gate → top-3, with breakdown, unknowns, critical gaps, transferable evidence, vacancy_status.
- P4.3 `POST /recommendations/roles`, `GET /roles/:id/gaps`; persist with dataset + scoring versions.
- P4.4 UI: top-3 cards, role detail with score components, blockers, unknowns, "estimated skill fit, not hiring probability" label.
- P4.5 Tests: formula math, zero/invalid q, unknown ≠ 0, mandatory blocker with high score, determinism, fairness smoke (change name/age → same ranking).
**Done when:** same input twice = identical output; blocker visible regardless of score.

## Phase 5 — Gap pathway and verification (1 day)
- P5.1 Rule-based priority gap (importance × gap size × feasibility) → attach resource + fixed task.
- P5.2 Assessment submit + rubric scoring (reviewer_type = rule/self); update only assessed skill to `verified` or `not_demonstrated`; "resource completed" stored separately.
- P5.3 Recompute and show before/after ranking diff.
- P5.4 Optional LLM wording of explanation, validated against computed fields.
**Done when:** demo steps 5–7 work end to end.

## Phase 6 — Mentor, opportunities, HR, consent (1 day)
- P6.1 Mentor matcher (weighted: gap coverage, experience, availability, language, format) with visible reasons.
- P6.2 `POST /mentorships` blocked without share-approval; field allowlist; consent UI.
- P6.3 Opportunities view with source/freshness or "No current vacancy verified"/"Simulated" label.
- P6.4 HR review view: authorized profiles only, advisory banner, evidence status; mock SAP adapter labelled "mock".
- P6.5 Appeal/correct, delete/reset demo data.
**Done when:** consent tests pass (no share ⇒ rejected).

## Phase 7 — Hardening and demo (1 day)
- P7.1 E2E test of full Harpreet journey from clean reset.
- P7.2 Security checklist: HTTPS, CORS, rate limits, no PII in logs, dependency scan, secrets scan, RLS test with 3 accounts.
- P7.3 Deploy: FE on Vercel; API (+ ML internal) on one managed host; separate demo Supabase.
- P7.4 Evaluation snippet: 15–20 synthetic profiles, report extraction P/R/F1 and top-3 relevance honestly (measured only).
- P7.5 Demo script from PRD §11; "mocked vs real" slide; release checklist from PRD §12.

## Cut order if time runs short
Drop in this order: LLM extraction → embeddings → HR view polish → mentor calendar → extra role families. Never cut: authz, consent, determinism, mandatory gate, labels for synthetic/simulated data. If services get tight, run ML as a module in Express's repo or a single FastAPI process.

## Working method for least token waste
1. One task ID per session/prompt: "Do P4.2. Follow AGENTS.md."
2. Build data (Phase 1) by hand/with the data-curator brief; it dominates demo quality and costs few tokens to maintain.
3. Pure functions first (scoring, matcher) with tests, then routes, then UI. UI last per phase.
4. Run targeted tests per task; full check at phase end.
5. Keep specs in `/docs` and reference sections by heading, not by pasting.
6. Commit per task so context can be cleared between tasks without loss.
7. Use `reviewer` agent only at end of Phases 4, 6, 7.