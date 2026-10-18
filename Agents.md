# AGENTS.md — Second Act

## 1. Project Overview

**Project:** Second Act  
**Event:** SAP Hackfest 2026 — Inclusive Workforce  
**Tagline:** “The nearest role, not the hardest restart.”

Second Act is an explainable career-transition platform designed to help workers identify realistic next career opportunities based on their existing skills, work experience, and demonstrable evidence. Instead of encouraging users to restart their careers from scratch, the platform identifies adjacent roles that build on their existing capabilities and highlights the specific gaps that prevent them from becoming ready for those roles.

The platform must prioritize **explainability, evidence-based recommendations, deterministic scoring, privacy, worker autonomy, and accessibility**.

### Core product loop

1. **Discover skill evidence:** Extract and organize skills from a worker's work history, résumé, assessments, and other permitted sources.
2. **Find feasible roles:** Compare the worker's supported skills against role requirements and apply hard constraints before ranking.
3. **Identify gaps:** Explain which mandatory requirements block a role and distinguish missing evidence from confirmed skill gaps.
4. **Demonstrate progress:** Recommend an assessment, practice activity, learning resource, or other meaningful next step.
5. **Connect optionally:** Allow the worker to share verified evidence with a mentor, employer, recruiter, or opportunity only after explicit consent.

The platform should help answer three questions:

- Which roles are the closest realistic next steps for this worker?
- What evidence supports each recommendation, and what remains uncertain?
- What is the most useful next action the worker can take?

Recommendations are decision-support information, not guarantees of employment.

### Source of truth

Detailed specifications are maintained in the `/docs` directory:

- Product requirements document (PRD)
- System design
- Data flow
- Technology stack

**Read only the relevant section needed for the current task.** Do not load all four specification documents by default. If this file and a detailed specification conflict, identify the conflict and follow the project's established decision process rather than silently inventing a resolution.

---

## 2. Technology Stack and Architectural Boundaries

The following stack is fixed. Do not introduce additional infrastructure or replace a listed technology without explicit authorization.

### Frontend

- React
- Vite
- TypeScript
- Tailwind CSS
- React Router
- TanStack Query, optionally, where server-state caching and synchronization justify it

The frontend owns presentation, navigation, form interaction, and accessible user experiences. It must not be treated as a trusted security boundary.

The frontend must not independently determine authorization, consent validity, or authoritative career-fit scores. It may display computed results returned by the backend.

### Public API

- Node.js LTS
- Express
- TypeScript

The Express API is the **only public application API**.

It is responsible for:

- Authentication and authorization enforcement
- Object-level access checks
- Consent verification
- Request validation and normalization
- Application workflow orchestration
- Communication with the ML service and database
- Consistent errors and request identifiers
- Audit-event recording
- Filtering data before returning it to clients

Internal ML endpoints must not become publicly accessible simply because the frontend needs their functionality. Requests from the public API to the ML service must follow the existing internal service boundary.

### ML and matching service

- Python
- FastAPI
- Pydantic
- `all-MiniLM-L6-v2` embeddings where useful
- Deterministic scoring logic

The ML service supports extraction, skill normalization, semantic matching, and scoring workflows as specified by the system design.

Language models and embeddings may help interpret unstructured text or suggest candidate skill matches. They must not override deterministic scoring rules, fabricate evidence, or independently authorize access to user data.

The service must validate structured inputs and outputs. It must also support a degraded operating mode when an external model or API is unavailable.

### Database and authentication

- Supabase Postgres
- Supabase Row-Level Security (RLS)
- Supabase Auth

Postgres is the authoritative store for persisted application data. Supabase Auth supplies the application's identity mechanism, while the Express API remains responsible for enforcing application-level authorization.

RLS is a defense-in-depth mechanism. It does not replace explicit authorization checks in the API.

### Explicitly prohibited additions

Do not add:

- A graph database
- A separate vector database
- A message broker
- Kubernetes
- Autonomous agents
- An alternative public API framework
- Unnecessary orchestration or infrastructure layers

Use Postgres and the existing application services for the functionality required by the project.

**Delivery principle:** When time is limited, prefer one complete, testable backend over a partially implemented distributed architecture.

---

## 3. Repository Structure

The intended repository structure is:

```text
apps/
  web/                         React web application
  api/                         Express public API
    src/
      routes/
      services/
      middleware/
      schemas/
  ml/                          FastAPI ML service
    app/
      extract/
      match/
      score/
      mentors/

data/
  skills.csv
  roles.csv
  role_skills.csv
  assessments.csv
  mentors_demo.csv
  opportunities.csv
  resources.csv

db/
  migrations/
  seed/
  rls/

docs/
  PRD
  SYSTEM_DESIGN
  DATA_FLOW
  TECH_STACK

tests/
  e2e/
  fixtures/
```

The directory tree above describes the intended architecture, not a guarantee that every directory currently exists.

The current working implementation also contains:

```text
apps/mobile/                   Expo application
```

Before adding or moving files, inspect the actual repository. Prefer extending the existing implementation over restructuring it to match the intended layout.

### Directory responsibilities

- `apps/web/`: Browser-facing React application, if present in the current implementation.
- `apps/mobile/`: Existing Expo application. Preserve it and its current scripts unless the task explicitly requires a change.
- `apps/api/`: Public Express routes, authorization, validation, business services, and API orchestration.
- `apps/ml/`: Internal FastAPI endpoints and ML-related functionality.
- `data/`: Canonical skills, role requirements, assessments, resources, opportunities, and clearly labelled demo records.
- `db/migrations/`: Version-controlled database schema changes.
- `db/seed/`: Reproducible initial and demo data.
- `db/rls/`: Database access policies and related SQL.
- `docs/`: Product and technical specifications.
- `tests/`: Automated tests and synthetic fixtures.

Do not introduce a second copy of a canonical dataset or create competing definitions of the same schema without a clear migration plan.

---

## 4. Development Commands

**Run commands from the repository root.** The current implementation uses npm, not pnpm.

Keep this section accurate when package scripts change. Verify commands against the root `package.json` and the relevant workspace scripts before changing or documenting them.

### Installation

```bash
npm run install:all
```

### API

```bash
npm run api:dev
npm run api:test
```

### Mobile application

```bash
npm run mobile:web
npm run mobile:start
```

### Database and demo data

```bash
npm run db:migrate
npm run demo:seed
```

Reset and verify the demo environment:

```bash
npm run demo:reset
npm run demo:check
npm run demo:smoke
```

Use the reset procedure when validating that a feature works from a clean demo state. Do not assume the database is empty or that existing demo data is disposable without checking the documented reset behavior.

### Delhi-NCR extraction workflow

Prepare the corpus:

```bash
npm run ncr:prepare
```

The expected preparation target is 15 documents. Check the command output and the relevant task specification to determine whether the expected corpus was produced.

Run evaluation:

```bash
npm run ncr:eval -- --mode baseline
npm run ncr:eval -- --mode context
```

Optional evaluation flags include:

```bash
npm run ncr:eval -- --mode baseline --heldout
npm run ncr:eval -- --mode context --private
npm run ncr:compare
npm run ncr:compare -- --private
```

Use private-data options only when authorized and consistent with the project's privacy rules. Do not include private résumé content or other personal data in logs, commits, or generated reports.

### Complete validation

```bash
npm run check
```

The current full-check command covers:

- API TypeScript type checking
- API tests
- Mobile TypeScript type checking
- Mobile linting

Do not assume this command also executes database, end-to-end, ML, or extraction evaluations unless the actual scripts confirm it.

If scripts change, update this block in the same task that changes them.

---

## 5. Hard Invariants

These requirements are mandatory. Every invariant must have appropriate automated test coverage. New functionality must not weaken or bypass them.

### 5.1 Deterministic skill-fit scoring

The fit score must be calculated by deterministic code, never by an LLM.

The score is:

\[
\text{Fit} =
100 \times
\frac{\sum_i w_i \cdot \min(p_i/q_i,1)\cdot e_i}
{\sum_i w_i}
\]

Where:

- \(w_i\) is the importance weight of requirement \(i\).
- \(p_i\) is the worker's known proficiency level for the corresponding skill.
- \(q_i\) is the required proficiency level.
- \(e_i\) is the evidence factor associated with the skill's evidence state.

Weights and evidence factors must come from versioned configuration. Do not scatter unexplained constants across route handlers, frontend components, or ML prompts.

Validate the denominator and input domain. Reject invalid requirement levels, non-positive weights, and other invalid scoring inputs as specified by the tests.

The exact treatment of every evidence state must follow the canonical scoring configuration and product specification.

### 5.2 Score interpretation

A fit score represents **estimated skill fit**, not the probability that a worker will be hired, interviewed, or selected.

Never:

- Label a score as a hiring probability.
- Present an unsupported percentage as a likelihood of employment.
- Imply that a high score guarantees readiness or employment.
- Combine unrelated measures into the fit score without an explicit specification.

Explain scores using the evidence and role requirements that produced them.

### 5.3 Mandatory-requirement blocker gate

Mandatory requirements are evaluated separately from the numerical fit score.

A role may have a high fit score and still be blocked because a mandatory requirement is not sufficiently demonstrated.

Do not average the blocker gate into the score. Do not allow a high score to override a blocking requirement.

The API and UI must preserve the distinction between:

- A role that is feasible under the readiness rules
- A role that requires additional proof
- A role that is blocked by a confirmed gap

Use the canonical statuses and labels defined by the product specification.

### 5.4 Hard constraints before ranking

Apply hard constraints before ranking eligible roles.

Relevant constraints may include the worker's location or remote preference, salary floor where salary data exists, available weekly learning time, and employee-versus-independent work preference.

For each filtered-out role, retain an appropriate reason so that the result is explainable and testable.

Do not silently discard roles or rank infeasible roles among the top recommendations.

### 5.5 Evidence-state semantics

Use only the canonical evidence states:

- `self_reported`
- `inferred`
- `verified`
- `unknown`
- `not_demonstrated`

Their meanings must remain distinct:

- `self_reported`: The worker reports a skill, but it has not been independently verified.
- `inferred`: The system suggests a skill based on related evidence; it still needs confirmation.
- `verified`: Evidence has passed the approved verification process.
- `unknown`: The available information does not establish whether the worker has the skill.
- `not_demonstrated`: The required skill has not been demonstrated to the standard relevant to the task or assessment.

Do not silently substitute one status for another. In particular:

- `unknown` is not equivalent to a proficiency score of zero.
- An embedding match is not verification.
- An LLM-generated claim is not verification.
- Course completion alone is not verification.
- Missing information must not automatically become a negative claim about the worker's capability.

If a more detailed distinction between missing evidence and demonstrated absence is required, use the explicit definitions in the product specification rather than inventing new statuses.

### 5.6 Assessment isolation

An assessment may update only the skill or skills it is explicitly designed and authorized to test.

Do not infer that passing an assessment verifies unrelated skills. Do not increase a worker's proficiency in other skills merely because the assessment is broadly related to them.

Tests must verify that unrelated skills remain unchanged.

### 5.7 Reproducible recommendations

The same:

- Worker profile
- Dataset version
- Scoring version

must produce the same ranking and recommendation output when the relevant inputs are identical.

Persist the dataset and scoring versions with each recommendation so that results can be reproduced and audited.

Do not let timestamps, unordered database results, nondeterministic model output, or arbitrary iteration order silently affect ranking.

### 5.8 Optional LLM functionality

LLM functionality must remain optional.

Every LLM output must be validated against an explicit schema. Outputs must reference canonical skill and role IDs rather than creating arbitrary IDs or entities.

The LLM must not receive unrestricted tools or direct database access. It must not authorize actions, change scoring rules, grant verification, or bypass consent.

When the LLM is disabled or unavailable, the application must continue to work through supported alternatives such as:

- Alias-based skill matching
- Manual skill entry
- Existing deterministic scoring
- Available cached demo profiles, where implemented

A model failure must not make the entire application unusable.

### 5.9 Authentication and object-level authorization

Every protected API route must verify the user's JWT and enforce object-level authorization.

Never trust a client-supplied profile ID, worker ID, assessment ID, or record ID as proof that the caller may access that object.

Before reading or changing a protected object, establish that the authenticated user is authorized to perform the requested action on it.

Apply authorization to nested resources and related records, not just the initial route parameter.

RLS must provide a second layer of protection. Never use elevated database credentials in the frontend.

### 5.10 Explicit consent for sharing

Sharing data with mentors, HR personnel, employers, recruiters, or other external recipients requires explicit consent.

Before sharing:

1. Verify the authenticated worker's authority over the relevant data.
2. Identify the recipient and the intended purpose.
3. Validate the recorded consent and its scope.
4. Select only fields permitted for that purpose.
5. Record an appropriate minimal audit event.
6. Ensure the user can withdraw consent through the supported workflow.

Use allowlisted fields, not unrestricted profile serialization.

A consent to share one record must not automatically authorize sharing the entire résumé, profile, or assessment history.

### 5.11 Privacy-safe logging and auditing

Never log:

- Résumé contents
- Access tokens or refresh tokens
- Authentication secrets
- Prompts containing personally identifiable information
- Raw personal data unnecessarily included in model requests
- Sensitive assessment submissions

Audit events should record only the minimum required metadata, such as:

- Action
- Actor identifier, where permitted
- Time
- Relevant non-sensitive event reference

Do not put sensitive payloads into audit records merely to simplify debugging.

When diagnosing an issue, prefer request IDs, error codes, schema-validation summaries, and synthetic fixtures over raw user data.

### 5.12 Synthetic data and truthful provenance

All demo workers, mentors, and vacancies must carry the applicable `is_synthetic` or `is_simulated` marker and a visible UI label.

Never present synthetic data as a real person, actual employer, live vacancy, verified placement, or real market outcome.

A vacancy must have a source and a checked timestamp, or be explicitly labelled as simulated. Do not invent a source, availability status, or verification date.

SAP integrations must be described as a **planned/mock adapter** unless an actual integration has been implemented and verified.

Keep the distinction between demo functionality, planned functionality, and production integrations clear in both code and user-facing copy.

### 5.13 Secrets and environment variables

Never commit secrets to Git or expose server-only environment variables to the frontend.

The `.env*` ignore rules must remain in place, with explicit exceptions only where the existing configuration requires safe example templates.

Use placeholders in example environment files. Never put real credentials in:

- Source code
- Fixtures
- README files
- Logs
- Screenshots
- Test snapshots
- Frontend bundles

If a secret is accidentally committed, removing it from the latest file is insufficient; follow the project's credential-rotation and repository-cleanup procedure.

---

## 6. Coding Conventions

### TypeScript and schemas

- Use strict TypeScript settings.
- Validate external input at every API boundary with Zod.
- Use Pydantic for Python service input and output validation.
- Keep shared API schemas under `apps/api/src/schemas`, following the current implementation's conventions.
- Avoid `any` and unsafe casts unless they are narrowly justified and documented.
- Treat database records and third-party responses as untrusted input.

### API conventions

All public API routes must live under:

```text
/api/v1
```

Use the established error format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "A safe, user-facing description",
    "requestId": "request-id"
  }
}
```

The actual request ID must be generated or propagated by the established middleware.

Error responses must not expose stack traces, secrets, internal prompts, raw database errors, or private user data.

Use consistent HTTP status codes and stable error codes so that the frontend can handle failures predictably.

### Code organization

- Keep route handlers thin.
- Put reusable business logic in services.
- Keep scoring and ranking logic deterministic and independently testable.
- Avoid duplicating authorization checks inconsistently across endpoints; use shared middleware and service-level safeguards where appropriate.
- Separate extraction, matching, scoring, and presentation responsibilities.
- Prefer explicit inputs and outputs over hidden global state.

### Dependencies

Prefer existing packages and utilities.

Before adding a dependency, explain in the pull request or task summary why the dependency is needed and why the current stack cannot reasonably meet the requirement.

Do not introduce a dependency merely to replace a small, already-supported utility.

### Changes and commits

- Keep pull requests small and focused.
- Address one concern per commit where practical.
- Write tests alongside implementation changes.
- Store synthetic test fixtures in `tests/fixtures`.
- Prefer editing existing files over creating new ones.
- Do not reformat unrelated files or perform opportunistic refactors in a focused task.

---

## 7. Token-Efficient Coding-Agent Workflow

The coding agent must work incrementally and avoid loading unnecessary context.

### Before implementation

1. Identify and state the phase task ID, such as `P3.2`.
2. Read this `AGENTS.md`.
3. Locate the corresponding plan row or acceptance criteria.
4. Read only the relevant sections of the specification and the files needed for the task.
5. Inspect existing code and tests before proposing new abstractions.

Do not load all four specification documents unless the task genuinely requires cross-document analysis.

If no task ID or plan is available, use the user's request and the existing repository structure to define the smallest reasonable scope. Ask only when a decision is genuinely blocking.

### During implementation

- Use Grep and Glob to find relevant code.
- Read large files with offsets and limits.
- Inspect CSVs with commands such as `head -n 20` rather than dumping complete datasets.
- Avoid re-reading files after a successful edit unless verification requires it.
- Write or update tests with the code.
- Run the narrowest relevant test first.
- Expand validation when the scope or risk warrants it.
- Do not make unrelated changes simply because a nearby improvement is possible.

Use the package manager and commands that are actually configured in the repository. The current project uses npm; do not substitute pnpm commands by habit.

### Before finishing

Verify:

- The requested behavior is implemented.
- Relevant tests pass.
- Applicable invariants remain intact.
- No secrets or private data were introduced.
- The changed files match the intended scope.
- Documentation and command references remain accurate.

For a completed phase, run:

```bash
npm run check
```

Also run relevant database, ML, end-to-end, or demo checks when the task affects those areas. If a check cannot run, report that limitation rather than claiming it passed.

### Final response format

Keep the final response to **2–4 lines**:

1. What changed.
2. Tests run and their actual results.
3. Any relevant limitation or unresolved issue.
4. The next task ID, if known.

Do not repeat the entire plan, paste back large sections of code, or claim tests passed when they were not run.

### Questions and uncertainty

Ask a question only when:

- A decision is irreversible or materially risky.
- The specifications conflict in a way that changes implementation.
- Required credentials, permissions, or external resources are unavailable.
- Multiple plausible interpretations would produce materially different behavior.

Otherwise, follow the documented default, implement the smallest safe solution, and note any relevant assumption.

---

## 8. Optional Agent Roles

Use subagents sparingly. The default is one agent handling the task from start to finish.

Spawn agents only when explicitly requested or when work is genuinely independent and parallel execution is useful.

Every agent must receive a concise, self-contained brief of approximately five lines containing its task, relevant files, constraints, expected output, and validation requirements.

### `data-curator`

Responsibilities:

- Build or validate `data/*.csv`.
- Use the approved ESCO/O*NET subset and project-defined sources.
- Check canonical IDs, aliases, weights, mandatory flags, and references.
- Preserve provenance and distinguish sourced data from synthetic data.
- Return the changed CSVs and a concise validation report.

### `test-writer`

Responsibilities:

- Write tests derived from the 13 hard invariants.
- Cover unit, API, authorization, privacy, and fairness behavior as relevant.
- Use synthetic fixtures only.
- Avoid modifying production behavior unless explicitly authorized.
- Report the tests added and the commands used to run them.

### `reviewer`

Responsibilities:

- Perform a read-only review.
- Compare the proposed diff against invariants 1–13.
- Inspect security, consent, determinism, data provenance, and test coverage.
- Do not modify files.
- Return only concrete violations, relevant file locations, and concise explanations.

Do not delegate tasks that depend heavily on shared, changing context unless the task can be divided cleanly.

---

## 9. Definition of Done

A phase is complete only when its acceptance criteria in the project plan have been met.

Before declaring completion, confirm the following as applicable:

- [ ] The phase acceptance list passes.
- [ ] `npm run check` passes.
- [ ] Relevant targeted tests pass.
- [ ] Database migrations and RLS policies are consistent with the implementation.
- [ ] The 13 hard invariants remain satisfied.
- [ ] Authorization and consent checks cover the affected flows.
- [ ] Synthetic records remain visibly labelled.
- [ ] No private user data or secrets were committed.
- [ ] Documentation and development commands reflect the actual implementation.
- [ ] The affected demo path runs from a clean reset.
- [ ] Any unavailable checks or unfinished requirements are explicitly reported.

Do not mark a phase complete merely because the code compiles or the UI renders.

A working phase must be reproducible, testable, privacy-conscious, and consistent with the documented product behavior.

---

## 10. Guiding Principle

Second Act should help workers move forward using the experience they already have, rather than treating a career transition as a complete restart.

Every implementation decision should preserve that goal:

**Evidence over unsupported claims. Explainable recommendations over black-box decisions. Demonstrated progress over résumé keywords. Worker consent over automatic sharing. A complete, reliable product over unnecessary infrastructure.**
