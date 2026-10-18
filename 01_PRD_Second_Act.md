# Second Act — Implementation Plan

**Project:** Second Act — Explainable Career-Transition Platform  
**Hackathon:** SAP Hackfest 2026 — Inclusive Workforce  
**Tagline:** “The nearest role, not the hardest restart.”

**Core principle:** Complete one end-to-end vertical slice using the Harpreet demo before expanding the platform's breadth. Every phase must end in a working, demonstrable state. Task IDs such as `P1.1` and `P4.2` are the units of work assigned to the coding agent, one task at a time.

The goal is to deliver a reliable prototype that demonstrates skill discovery, explainable role recommendations, targeted skill development, evidence verification, and consent-controlled human support.

## Phase 0 — Foundations (0.5 day)

**Objective:** Establish a reproducible repository, consistent development environment, and reliable validation workflow before building product features.

- **P0.1 — Repository and workspace setup:** Establish or verify the project structure, including `apps/web`, `apps/api`, `apps/ml`, `data`, `db`, `docs`, and `tests`. Configure strict TypeScript, linting, formatting, shared development scripts, and dependency management. Preserve existing application code and scripts rather than restructuring the repository unnecessarily.
- **P0.2 — Documentation and repository hygiene:** Place the four project specifications in `/docs`, add `AGENTS.md` at the root, and configure `.gitignore` for `.env*`, credentials, build artifacts, caches, and generated files. Add secret scanning through available repository tooling or CI.
- **P0.3 — Environment and CI:** Configure a separate Supabase project for the demo, document required environment variables, and provide safe `.env.example` templates. Ensure CI installs dependencies and runs the supported type-checking, linting, and testing commands.
- **P0.4 — Application startup:** Verify that the existing frontend, Express API, and ML service can start independently. Add basic health checks where appropriate and document local startup instructions.

**Acceptance criteria**

- The repository has a documented structure and clear development instructions.
- Existing application scripts remain functional.
- Environment templates contain placeholders rather than real secrets.
- The application shells start without requiring production credentials.
- CI runs successfully against the current repository.

**Done when:** The development environment is reproducible, application shells boot, and CI passes.

## Phase 1 — Data and schema (1 day) — Highest priority

**Objective:** Create a consistent database model and high-quality initial dataset. This phase has the greatest impact on the usefulness and credibility of the recommendations.

- **P1.1 — Database migrations:** Create migrations for `profiles`, `skills`, `worker_skills`, `roles`, `role_skill_requirements`, `recommendations`, `learning_resources`, `assessments`, `assessment_results`, `mentor_profiles`, `mentor_requests`, `opportunities`, `consent_events`, and `audit_events`. Define primary keys, foreign keys, uniqueness constraints, timestamps, ownership relationships, and appropriate indexes. Keep migrations version-controlled and repeatable.
- **P1.2 — Skill taxonomy:** Curate approximately 60–100 canonical skills, including aliases, descriptions, categories, and stable identifiers. Start with a focused ESCO/O*NET subset and review relevant skills manually. Normalize synonyms so different expressions of the same capability map to one canonical skill.
- **P1.3 — Role catalogue:** Begin with three role families: software QA, IT support, and data operations. Add customer support only if time permits. Include approximately 10–15 roles with explicit skill requirements, requirement weights, mandatory flags, and required proficiency levels. Review each role to ensure requirements are reasonable and traceable.
- **P1.4 — Harpreet demo data:** Seed the fictional Harpreet profile, representing 14 years of manual QA experience in banking. Include relevant transferable evidence, uncertain skills, and realistic gaps. Add eight synthetic mentors, approximately six simulated opportunities, three to five assessments with rubrics, and learning resources with verified URLs.
- **P1.5 — Dataset validation:** Build a validator for CSV files and seed data. Check duplicate IDs, orphan references, missing fields, invalid proficiency levels, non-positive weights, malformed flags, and missing provenance. Ensure that dataset versions can be associated with recommendation results.
- **P1.6 — Reset and seed workflow:** Implement the repository's documented database reset, seed, and validation commands. Ensure that repeated resets create the same demo state and do not affect production data.

**Acceptance criteria**

- Every role requirement references a valid canonical skill.
- Weights and proficiency requirements satisfy documented constraints.
- Synthetic people and simulated opportunities are labelled correctly.
- Resource URLs are checked before being presented as verified.
- Dataset validation fails clearly when critical errors are found.
- Reset and seed operations work from a clean database.

**Done when:** The demo database can be reset and seeded reproducibly, and the complete initial dataset passes validation with version tags.

## Phase 2 — Authentication, API skeleton, and authorization (1 day)

**Objective:** Establish secure access boundaries before implementing profile extraction, recommendations, or external sharing.

- **P2.1 — Authentication middleware:** Integrate Supabase Auth with the existing frontend and implement Express JWT verification. Reject invalid or missing tokens on protected routes. Derive the authenticated identity from the verified token rather than trusting a profile ID supplied by the client.
- **P2.2 — Request validation and error handling:** Add Zod schemas at API boundaries, request IDs, consistent error responses, appropriate rate limiting, and a CORS allowlist. Ensure unexpected errors do not expose internal stack traces, credentials, or sensitive data.
- **P2.3 — Profile API:** Implement profile creation, retrieval, and updates using the documented `/api/v1/profiles` route family. Validate editable fields, enforce ownership, and prevent clients from overwriting server-controlled identifiers or authorization fields.
- **P2.4 — Consent events:** Define how consent is recorded, retrieved, and revoked according to the product specification. Capture the actor, purpose, recipient or scope where relevant, and event time without storing unnecessary personal information.
- **P2.5 — Database RLS:** Configure Supabase Row-Level Security policies for worker, mentor, and HR access patterns. Treat RLS as an additional protection layer, not a replacement for API authorization.
- **P2.6 — Authorization tests:** Test missing tokens, invalid tokens, own-profile access, cross-profile access, nested-resource ownership, and unauthorized consent operations. Use separate test identities to validate the intended access boundaries.

**Acceptance criteria**

- Protected endpoints reject unauthenticated requests.
- Users can access only authorized profiles and related resources.
- Invalid request data returns consistent validation errors.
- RLS prevents unauthorized database access.
- Audit events do not contain résumé text, access tokens, or unnecessary sensitive details.

**Done when:** Authentication, profile CRUD, consent recording, and unauthorized-access tests work correctly.

## Phase 3 — Skill extraction and review (1–1.5 days)

**Objective:** Convert work-history text into explainable candidate skills while allowing workers to review and correct the results.

- **P3.1 — Baseline extraction:** Implement FastAPI `/extract` using deterministic alias and phrase matching. Return canonical skill IDs, source evidence spans, and the appropriate initial evidence status. Enforce input size limits and reject malformed requests.
- **P3.2 — Evidence and normalization:** Preserve the text supporting each extracted skill and normalize aliases to canonical IDs. Avoid creating arbitrary skills when a phrase cannot be mapped reliably. Keep inferred claims distinct from worker-confirmed or independently verified skills.
- **P3.3 — Optional embeddings:** Add `all-MiniLM-L6-v2` as a fallback if baseline matching is insufficient. Use in-memory cosine similarity where practical. Exact alias matches take precedence, and semantic results remain suggestions rather than proof of competence.
- **P3.4 — API integration:** Implement the public extraction and skill-update endpoints, including `POST /api/v1/profiles/:id/skills/extract` and the corresponding skill-review operation. Enforce authentication, ownership, schema validation, canonical IDs, and relevant audit history.
- **P3.5 — Review UI:** Build a flow where the worker pastes work history, reviews candidate skills and supporting evidence, confirms or edits valid claims, rejects incorrect suggestions, and saves the resulting profile. Include clear loading, empty, error, and retry states.
- **P3.6 — Optional LLM extraction:** Add an LLM implementation only behind an interface, with schema-validated responses and canonical skill IDs. Keep it disabled by default. Treat résumé text as untrusted input and test prompt-injection attempts. The model must not access the database or authorize actions.

**Acceptance criteria**

- Extracted skills are linked to supporting evidence where applicable.
- Unsupported claims remain uncertain and can be rejected.
- Semantic matching never automatically establishes verification.
- Only authorized workers can modify their profiles.
- The application works when embeddings and LLM functionality are disabled.

**Done when:** Harpreet's profile can be extracted, reviewed, corrected, and saved using the baseline matcher alone.

## Phase 4 — Adjacency engine (1.5 days)

**Objective:** Recommend realistic adjacent roles using deterministic scoring, transparent evidence, hard-constraint filtering, and a separate mandatory-requirement gate.

- **P4.1 — Pure scoring function:** Implement a deterministic scoring module with no database or network dependencies. Use the documented weighted fit formula and a versioned configuration such as `fit-v1`. Define how evidence reliability factors and unknown skills are handled.
- **P4.2 — Constraint filtering:** Apply non-negotiable user constraints before ranking. Record why a role was excluded, such as a location, work-format, or other constraint violation. Do not allow an aggregate fit score to override a hard constraint.
- **P4.3 — Mandatory-requirement gate:** Evaluate mandatory skills independently of the overall score. A role that fails a mandatory requirement must remain blocked even if its numerical fit is high. Distinguish feasible recommendations from blocked or stretch roles.
- **P4.4 — Ranking and explanations:** Return up to three feasible roles, along with score breakdowns, transferable evidence, unknown skills, critical gaps, mandatory blockers, constraint-exclusion reasons, and opportunity provenance. Include dataset and scoring versions for reproducibility.
- **P4.5 — Recommendation API:** Implement `POST /api/v1/recommendations/roles` and `GET /api/v1/roles/:id/gaps`. Authorize profile access, validate inputs, persist recommendation results where required, and return stable response schemas.
- **P4.6 — Recommendation UI:** Display the top three roles, their estimated skill-fit scores, supporting evidence, important gaps, and blockers. Include the label **“Estimated skill fit, not hiring probability.”** Keep simulated vacancy status visibly separate from role suitability.
- **P4.7 — Automated tests:** Test formula calculations, invalid inputs, unknown versus zero, mandatory blockers, hard-constraint filtering, deterministic tie-breaking, version consistency, and counterfactual fairness. Changing irrelevant attributes such as a worker's name or age alone must not alter the ranking.

**Acceptance criteria**

- Identical profiles, datasets, and scoring versions produce identical results.
- Hard constraints are applied before ranking.
- Mandatory blockers cannot be overridden by high scores.
- Every recommendation has a traceable explanation.
- Unknown skills are labelled unknown rather than definitely absent.
- Fit scores are never described as hiring probabilities.

**Done when:** The engine produces explainable, repeatable recommendations and clearly displays blockers regardless of score.

## Phase 5 — Gap pathway and verification (1 day)

**Objective:** Turn recommendation gaps into practical next steps and demonstrate how new evidence can change a worker's transition pathway.

- **P5.1 — Gap prioritization:** Rank gaps using importance, gap size, and feasibility. Attach a relevant learning resource, assessment, or fixed practice task. Explain why the selected gap is worth addressing.
- **P5.2 — Assessment design:** Define assessment rubrics that map explicitly to canonical skills and required proficiency levels. Keep assessments small and practical enough for the hackathon demonstration.
- **P5.3 — Assessment submission:** Validate submissions, store results and timestamps, and record the applicable reviewer type. Update only the skills explicitly tested by the assessment. Do not treat course completion or resource viewing as proof of competence.
- **P5.4 — Evidence history:** Preserve the relationship between an assessment, its rubric, its result, and the affected skill. Ensure that unsuccessful or insufficient demonstrations do not incorrectly increase proficiency.
- **P5.5 — Recommendation recomputation:** Recalculate recommendations after relevant evidence changes. Display a before-and-after comparison explaining which scores, blockers, or role rankings changed and why.
- **P5.6 — Optional explanation generation:** Use deterministic explanation templates by default. If an LLM is added, validate its wording against computed results and fall back to deterministic explanations when the model is unavailable or returns unsupported claims.

**Acceptance criteria**

- The selected next step maps to a real requirement or evidence gap.
- Assessment results update only the relevant skill or skills.
- Resource completion is stored separately from demonstrated competence.
- Recommendation changes are traceable to relevant evidence updates.
- The same versioned inputs produce reproducible results.

**Done when:** Harpreet can complete a gap-focused activity, receive an appropriate assessment result, and see the effect on recommendations.

## Phase 6 — Mentors, opportunities, HR, and consent (1 day)

**Objective:** Add human support and opportunity discovery while preserving worker control over personal information.

- **P6.1 — Mentor matching:** Rank synthetic mentors using gap coverage, relevant experience, availability, language, and preferred session format. Display understandable reasons for each match rather than relying on an unexplained score.
- **P6.2 — Mentorship requests:** Implement the mentorship-request endpoint and workflow. Require explicit sharing consent before transmitting worker details. Enforce an allowlist of permitted fields and reject unauthorized requests.
- **P6.3 — Consent interface:** Show who will receive information, the purpose of sharing, and which fields will be shared. Ensure consent is specific to the intended purpose and recipient, and respect revocation according to the product specification.
- **P6.4 — Opportunity discovery:** Display opportunity information with source and checked timestamp when verified. Otherwise show **“No current vacancy verified”** or a clear **“Simulated”** label. Never present invented or stale opportunities as live vacancies.
- **P6.5 — HR review view:** Build a limited, authorized view of relevant role pathways and evidence statuses. Include an advisory banner explaining that recommendations support human decision-making and must not make automated employment decisions.
- **P6.6 — SAP integration boundary:** Keep the SAP adapter explicitly labelled as planned or mocked unless a real, authorized integration has been implemented and tested. Do not imply production connectivity that does not exist.
- **P6.7 — Corrections and demo reset:** Provide appropriate correction, appeal, deletion, and reset paths. Keep demo-data operations isolated from production records and preserve required audit and retention behavior.

**Acceptance criteria**

- Mentor matches include visible reasons.
- Sharing is rejected when required consent is absent.
- Only allowlisted fields are shared.
- HR users see only authorized information.
- Simulated records remain clearly labelled.
- Corrections and resets behave predictably.

**Done when:** The demo supports mentor suggestions, opportunity discovery, restricted HR review, and consent-controlled sharing.

## Phase 7 — Hardening and demo (1 day)

**Objective:** Validate the complete journey, review security and privacy, measure system quality, and prepare a repeatable demonstration.

- **P7.1 — End-to-end testing:** Run Harpreet's complete journey from a clean reset: profile creation, extraction, skill review, recommendations, blocker inspection, gap activity, assessment, recommendation recomputation, and consent-controlled sharing.
- **P7.2 — Security review:** Verify HTTPS, CORS restrictions, rate limits, JWT validation, object-level authorization, RLS, and privacy-safe logging. Run dependency and secret scans, and test worker, mentor, and HR access using three separate identities.
- **P7.3 — Deployment:** Deploy the frontend to Vercel where compatible with the current architecture. Host the Express API and internal ML service using managed infrastructure, keeping the ML service behind the public API boundary. Use a separate Supabase project for demo data.
- **P7.4 — Evaluation:** Evaluate approximately 15–20 synthetic profiles with documented ground truth. Measure extraction precision, recall, F1, and top-three role relevance only where the dataset supports those metrics. Report limitations and avoid claiming real-world employment impact.
- **P7.5 — Reproducibility:** Document how to reset the demo, seed the dataset, run checks, and reproduce evaluation results. Ensure that the main journey does not depend on live vacancy feeds or an external LLM.
- **P7.6 — Demo and release checklist:** Prepare the PRD's demo script and a “Mocked vs. Real” slide. Clearly identify implemented features, synthetic records, simulated opportunities, planned integrations, and any limitations.

**Acceptance criteria**

- The complete demo runs from a clean reset.
- Security and authorization tests pass.
- No secrets or résumé content are exposed in logs or public artifacts.
- Evaluation metrics are measured and reproducible.
- The deployed experience does not rely on a developer's local machine.
- The demo accurately distinguishes real functionality from simulated or planned features.

**Done when:** The deployed Harpreet journey works end to end and the security, evaluation, and release checklists are complete.

## Cut order if time runs short

Drop optional complexity in this order:

1. LLM extraction.
2. Embedding fallback.
3. HR-view polish.
4. Mentor calendar and scheduling.
5. Additional role families.
6. Nonessential UI polish and analytics.

**Never cut:** Authentication, object-level authorization, consent enforcement, deterministic scoring, mandatory-requirement gates, evidence-state distinctions, assessment isolation, reproducibility, or synthetic/simulated-data labels.

If service deployment becomes difficult, simplify infrastructure while preserving the intended API boundary and deterministic business logic. Keep the ML functionality in the existing repository or use a single FastAPI process if that fits the current implementation.

## Working method — Minimize wasted tokens

1. **One task per prompt:** Assign a single task ID, such as “Implement P4.2. Follow `AGENTS.md`.”
2. **Read only what is needed:** Review `AGENTS.md`, the task description, relevant specification headings, and files that will change.
3. **Prioritize data quality:** Complete Phase 1 carefully because it drives extraction, matching, and demo credibility.
4. **Build from the core outward:** Implement pure functions and tests first, then persistence, API routes, and UI.
5. **Test incrementally:** Run targeted tests for each task and the full project check at phase completion.
6. **Avoid repeated context:** Reference documentation headings instead of pasting entire specification files.
7. **Commit per task:** Review the diff, check for secrets, and commit completed work before moving on.
8. **Delegate selectively:** Use the read-only reviewer after Phases 4, 6, and 7. Use data-curator or test-writer roles only when the work is genuinely independent.
9. **Report briefly:** End each task with what changed, which tests ran and passed, any outstanding issue, and the next task ID.

**Command consistency:** Use the scripts and package manager that actually exist in the repository. If the current project uses npm and `apps/mobile`, preserve those conventions rather than introducing pnpm or a separate web app without an explicit architectural decision.

## Final project acceptance criteria

- [ ] A clean reset produces a consistent, validated dataset.
- [ ] Harpreet's synthetic profile can be reviewed and updated.
- [ ] Skill extraction works without an LLM.
- [ ] Candidate skills have appropriate evidence and statuses.
- [ ] Role recommendations use deterministic scoring.
- [ ] Hard constraints are applied before ranking.
- [ ] Mandatory blockers cannot be overridden by high scores.
- [ ] The UI clearly labels estimated skill fit rather than hiring probability.
- [ ] A focused gap activity and assessment work end to end.
- [ ] Assessments update only the skills they test.
- [ ] Before-and-after recommendations are explainable.
- [ ] Consent is required for external sharing.
- [ ] Worker, mentor, and HR access boundaries are tested.
- [ ] Synthetic and simulated records are visibly labelled.
- [ ] The complete E2E journey passes from a clean reset.
- [ ] `npm run check` and relevant database, ML, and security checks pass using the current repository's supported scripts.
- [ ] Evaluation results are measured and documented honestly.
- [ ] The demo script clearly distinguishes implemented, mocked, simulated, and planned functionality.

**Guiding principle:** Finish the complete journey first. Make every recommendation explainable, every verification meaningful, and every sharing decision subject to the worker's control.