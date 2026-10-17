# AGENTS.md — Second Act

Explainable career-transition platform (SAP Hackfest 2026, Inclusive Workforce). Tagline: "The nearest role, not the hardest restart."
Core loop: skill evidence → feasible roles → verified gaps → demonstrated progress → optional mentor/opportunity.
Specs live in `/docs` (PRD, SYSTEM_DESIGN, DATA_FLOW, TECH_STACK). Read only the section you need; do not load all four.

## Stack (do not add to it)
- FE: React + Vite + TS + Tailwind (+ React Router, optional TanStack Query)
- API: Node LTS + Express + TS. The ONLY public API. Owns authz, consent, validation, orchestration.
- ML: Python + FastAPI + Pydantic. Extraction support, embeddings (all-MiniLM-L6-v2), deterministic scoring.
- DB/Auth: Supabase Postgres + RLS + Supabase Auth.
- No graph DB, vector DB, broker, K8s, or autonomous agents. If time is tight: single backend beats half a distributed system.

## Repo layout
```
apps/web        React UI
apps/api        Express (src/routes, services, middleware, schemas)
apps/ml         FastAPI (app/extract, match, score, mentors)
data/           skills.csv roles.csv role_skills.csv assessments.csv mentors_demo.csv opportunities.csv resources.csv
db/             migrations/ seed/ rls/
docs/           the 4 spec files
tests/          e2e + fixtures (synthetic only)
```

## Commands (keep this block accurate; update when scripts change)
- web: `pnpm --filter web dev|test|build`
- api: `pnpm --filter api dev|test|lint`
- ml: `cd apps/ml && uvicorn app.main:app --reload` / `pytest -q`
- db: `pnpm db:reset && pnpm db:seed`
- all checks: `pnpm check` (lint + typecheck + tests)

## Hard invariants (never violate; tests must cover each)
1. Fit score is DETERMINISTIC code, never LLM. `fit = 100*Σ(w·min(p/q,1)·e)/Σw`. Weights/evidence factors in versioned config.
2. Score is "estimated skill fit", never hiring probability. No hard-coded percentages.
3. Mandatory requirements = separate blocker gate, never averaged into score.
4. Hard constraints filter BEFORE ranking; store filter reason.
5. Statuses: `self_reported | inferred | verified | unknown | not_demonstrated`. `unknown` ≠ zero. Inferred/embedding match is never `verified`. Course completion ≠ verified.
6. Assessment updates ONLY the skill it tests.
7. Same profile + dataset_version + scoring_version ⇒ identical ranking. Persist versions with every recommendation.
8. LLM is optional: schema-validated output, canonical IDs only, no tools/DB access. LLM off ⇒ app still works (alias matching + manual entry).
9. Every API route: verify JWT + object-level authz (never trust client profile ID). RLS as backup.
10. Sharing to mentor/HR/external only after explicit consent; share allowlisted fields only.
11. Never log resumes, tokens, prompts with PII. Audit events store action/actor/time only.
12. All demo workers/mentors/vacancies carry `is_synthetic`/`is_simulated` and a visible UI label. No vacancy shown without source+checked time or a "simulated" label. SAP = "planned/mock adapter" only.
13. No secrets in Git or frontend env. `.env*` ignored.

## Conventions
- TS strict; zod schemas at every API boundary; Pydantic in ML. Shared types in `apps/api/src/schemas`.
- Routes under `/api/v1`; consistent error shape `{error:{code,message,requestId}}`.
- Small PRs per phase task; one concern per commit. Tests beside code; fixtures in `tests/fixtures`.
- Prefer editing existing files over new ones. No new dependencies without a one-line reason in the PR.

## Token-efficiency rules (for the coding agent)
- Start each task by stating the phase task ID (e.g. `P3.2`) and read ONLY: this file, the plan row for that task, and the files it touches.
- Use Grep/Glob to locate; Read with offset/limit. Never dump whole spec docs or CSVs; `head -n 20` data files.
- Do not re-read a file after a successful Edit. Do not re-explain the plan back.
- Write code and tests together; run only the affected test (`-k`, `--filter`) first, full `pnpm check` before finishing a phase.
- Final reply: 2–4 lines (what changed, test result, next task ID). No recaps, no code echo.
- Ask a question only when a decision is irreversible or the spec conflicts; otherwise pick the default in the plan and note it.
- Spawn subagents only when the user asks, or for genuinely independent work (see roles below).

## Optional agent roles (use sparingly; each starts cold, so give a 5-line brief)
- `data-curator`: builds/validates `data/*.csv` from ESCO/O*NET subset; checks IDs, weights, mandatory flags. Output: CSVs + validation report.
- `test-writer`: writes unit/API/authz/fairness tests from the invariants list only.
- `reviewer`: read-only; checks diff against invariants 1–13 and returns violations as a short list.
Default: single agent does everything inline.

## Definition of done (per phase)
Acceptance list in the plan passes; `pnpm check` green; no invariant regressions; demo path for that phase runs from a clean reset.