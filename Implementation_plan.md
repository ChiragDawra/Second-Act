# Second Act — Implementation Plan

## 1. Purpose and Execution Principles

**Project:** Second Act  
**Event:** SAP Hackfest 2026 — Inclusive Workforce  
**Tagline:** “The nearest role, not the hardest restart.”

Second Act is an explainable career-transition platform that helps workers identify realistic adjacent roles, understand which skills they can demonstrate, discover what prevents them from becoming ready for a role, and make measurable progress through assessments and verified evidence.

This plan defines the implementation sequence, task boundaries, dependencies, and acceptance criteria for delivering the project in small, demonstrable increments.

### Primary delivery principle

**Complete one end-to-end vertical slice using the Harpreet demo before expanding the platform's breadth.**

The first complete journey should demonstrate how a worker with 14 years of manual QA experience in banking software can discover transferable skills, identify a feasible next role, address a specific evidence gap, complete an assessment, and receive updated recommendations.

Do not build isolated features that cannot be demonstrated together.

### Definition of a vertical slice

A vertical slice includes the necessary parts of a feature across:

- Data and database schema
- Backend business logic
- API validation and authorization
- Frontend or mobile UI
- Automated tests
- Synthetic demo data
- A reproducible demonstration path

A phase is not complete simply because its code compiles. Its acceptance criteria must pass, and its demo path must work.

### Task execution rules

- Task IDs such as `P1.1` and `P4.2` are the primary units of implementation.
- Give the coding agent one task ID at a time.
- Each task should have a defined scope, explicit dependencies, and observable acceptance criteria.
- Write tests with the implementation rather than postponing all testing until the end.
- Commit each completed task where practical so work can be resumed without reloading the entire conversation.
- Do not start a dependent task until its prerequisites are available or an explicit, documented interface allows parallel work.

### Source of truth

Before implementing a task, read:

1. `AGENTS.md`
2. The task's row in this plan
3. Only the relevant sections of the specifications in `/docs`
4. The existing source files and tests that the task will change

The PRD, system design, data flow, and technology stack documents remain authoritative for detailed product and architectural decisions. Do not load all four documents for every task.

---

## 2. Architecture and Implementation Constraints

Follow `AGENTS.md` for the full set of architectural rules and hard invariants.

### Required technology stack

- **Frontend:** React + Vite + TypeScript + Tailwind where the web app is part of the current implementation; preserve the existing Expo mobile app and its scripts.
- **Public API:** Node.js LTS + Express + TypeScript.
- **ML service:** Python + FastAPI + Pydantic, with deterministic matching and scoring.
- **Database and authentication:** Supabase Postgres, RLS, and Supabase Auth.
- **Embeddings:** `all-MiniLM-L6-v2`, optional and used only where semantic matching provides value.

The Express API is the only public application API. The ML service must remain behind the established service boundary.

### Do not introduce

- A graph database
- A separate vector database
- A message broker
- Kubernetes
- Autonomous agents
- Unnecessary microservices or orchestration layers

When time is limited, simplify optional infrastructure instead of compromising the core journey.

### Non-negotiable requirements

1. Scores are computed by deterministic code, never by an LLM.
2. Fit scores represent estimated skill fit, not hiring probability.
3. Mandatory requirements use a separate blocker gate.
4. Hard constraints are applied before ranking.
5. Unknown skills are not automatically treated as absent.
6. Assessments update only the skills they explicitly test.
7. Recommendation results are reproducible for identical inputs and versions.
8. LLM functionality is optional and schema-validated.
9. Every protected API route enforces JWT authentication and object-level authorization.
10. Sharing requires explicit consent and a field allowlist.
11. Sensitive personal information and secrets must not appear in logs or Git.
12. Synthetic people and simulated opportunities must be visibly labelled.
13. No secrets are committed or exposed through frontend environment variables.

These requirements apply throughout every phase, not just the final hardening phase.

---

## 3. Phase Overview

| Phase | Main outcome | Estimated duration |
|---|---|---:|
| Phase 0 | Reproducible repository and development environment | 0.5 day |
| Phase 1 | Validated schema and realistic demo dataset | 1 day |
| Phase 2 | Authentication, profile API, and authorization | 1 day |
| Phase 3 | Skill extraction and worker review | 1–1.5 days |
| Phase 4 | Deterministic role-matching engine | 1.5 days |
| Phase 5 | Gap pathway and assessment verification | 1 day |
| Phase 6 | Mentors, opportunities, HR, and consent | 1 day |
| Phase 7 | Security, evaluation, deployment, and demo | 1 day |

These are planning estimates, not guarantees. Data quality, integration work, and debugging may change the schedule.

**Critical path:** Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5.

Phase 6 builds on the core platform. Phase 7 validates and packages the complete experience.

---

# Phase 0 — Foundations

**Estimated duration:** 0.5 day

**Objective:** Establish a reproducible development environment and ensure all services can be started, checked, and tested before substantial feature work begins.

### P0.1 — Repository and workspace setup

**Scope**

- Inspect the current repository and identify its existing apps, scripts, lockfile, and deployment configuration.
- Preserve existing working code rather than replacing the repository structure wholesale.
- Establish or verify the intended directories for application code, data, database migrations, tests, and documentation.
- Configure strict TypeScript settings for TypeScript projects.
- Configure linting and formatting using the packages already present where possible.
- Ensure the root scripts provide a consistent way to install dependencies and validate the project.
- Keep the package manager consistent with the current repository.

**Important:** The current implementation uses npm and includes `apps/api` and `apps/mobile`. Do not introduce pnpm merely because an earlier plan mentioned it.

**Acceptance criteria**

- The repository has a documented and understandable structure.
- Existing application scripts continue to work.
- TypeScript strict mode is enabled for applicable TypeScript projects.
- Linting and type checking can be run from the repository root.
- No unnecessary framework, package manager, or infrastructure migration is introduced.

### P0.2 — Project instructions and repository hygiene

**Scope**

- Add `AGENTS.md` to the repository root.
- Copy the four project specifications into `/docs`, if they are not already present.
- Verify that the specifications are readable and version-controlled.
- Add appropriate `.gitignore` entries for environment files, local credentials, build output, caches, and generated artifacts.
- Configure secret scanning through the available repository tooling or CI checks.
- Provide safe environment templates using placeholders rather than real credentials.

**Acceptance criteria**

- The coding agent can locate project rules and specifications immediately.
- Real `.env` files and credentials are excluded from Git.
- Existing useful files are preserved.
- Secret-scanning configuration is documented and does not require exposing secrets in logs.

### P0.3 — Supabase and continuous integration

**Scope**

- Establish a separate Supabase project for development and demo use.
- Document the required environment variables.
- Configure local development instructions and safe environment templates.
- Add or verify CI execution of the repository's supported validation command.
- Ensure CI runs on relevant changes and reports failures clearly.

**Acceptance criteria**

- The application can be configured using documented environment variables.
- Demo credentials and data are isolated from production resources.
- CI runs the current check command successfully.
- No production credentials are required to run ordinary tests.

### Phase 0 demo

A developer can install dependencies, start the existing app shells, run the API shell, and execute CI checks without needing to implement any career-matching functionality yet.

### Phase 0 completion gate

- [ ] Repository structure is verified.
- [ ] Root instructions and specifications exist.
- [ ] Environment templates and ignore rules are in place.
- [ ] Existing application shells boot.
- [ ] CI is green.

---

# Phase 1 — Data and Schema

**Estimated duration:** 1 day

**Priority:** Highest.

**Objective:** Establish a consistent skill taxonomy, role requirement model, database schema, and synthetic dataset. Data quality determines the usefulness of the recommendations and the credibility of the demo.

Do not build sophisticated matching functionality on top of inconsistent or poorly defined data.

## P1.1 — Database migrations

Create version-controlled migrations for the core entities:

- `profiles`
- `skills`
- `worker_skills`
- `roles`
- `role_skill_requirements`
- `recommendations`
- `learning_resources`
- `assessments`
- `assessment_results`
- `mentor_profiles`
- `mentor_requests`
- `opportunities`
- `consent_events`
- `audit_events`

**Implementation requirements**

- Define stable primary keys and foreign-key relationships.
- Add uniqueness constraints for canonical identifiers.
- Use appropriate data types and constraints for scores, weights, proficiency levels, and timestamps.
- Define ownership and relationship fields needed for authorization.
- Add dataset and scoring version fields wherever required by the recommendation lifecycle.
- Represent simulated and synthetic records explicitly.
- Avoid duplicating canonical skills inside individual role records.
- Define deletion and update behavior intentionally; do not rely on implicit database defaults for important relationships.
- Add indexes for commonly queried ownership, relationship, and filtering fields where justified.
- Keep schema changes in migrations rather than relying on manual dashboard edits.

**Acceptance criteria**

- A fresh database can be migrated successfully.
- Foreign keys and uniqueness constraints prevent invalid relationships.
- Invalid scoring inputs are rejected at the appropriate boundary.
- Migration execution is reproducible.
- The data model supports the full Harpreet journey without requiring ad hoc columns later.

## P1.2 — Curate the skill and role dataset

Create a focused dataset covering three initial role families:

1. Software QA
2. IT support
3. Data operations

Add customer support only if time remains and the first three families provide a complete demo.

**Target size**

- Approximately 60–100 canonical skills
- Approximately 10–15 roles
- A role-to-skill requirements dataset with explicit weights, required levels, and mandatory flags

Use a focused subset of ESCO and/or O*NET as the starting point. Hand-review each role's requirements before including it in the demo.

**For each skill, define**

- Stable canonical ID
- Display name
- Aliases and common variants
- Short definition
- Relevant category
- Prerequisites, where applicable
- Source or provenance where available

**For each role, define**

- Stable canonical ID
- Title and short description
- Role family
- Employee or independent-work classification
- Requirement list
- Mandatory versus optional requirements
- Requirement weights
- Required proficiency levels
- Demand-source information, where available
- Automation-exposure information, where supported by a source

**Data quality rules**

- Use canonical IDs consistently across CSV files and database records.
- Do not duplicate the same skill under different IDs merely because its name varies.
- Use aliases for common synonyms and abbreviations.
- Keep the requirement template reasonably consistent across roles.
- Avoid arbitrary requirements designed only to make one role score higher.
- Mark uncertain or simulated market information explicitly.
- Do not fabricate sources or represent assumptions as measured facts.

**Acceptance criteria**

- Every role requirement points to a canonical skill.
- Every weight is greater than zero.
- Every required proficiency level is greater than zero and within the supported scale.
- Mandatory flags use a consistent representation.
- Each role has a hand-reviewed requirement list.
- The initial QA-to-adjacent-role transition is supported by the dataset.

## P1.3 — Seed the Harpreet demo

Create a reproducible synthetic profile for Harpreet:

- 39-year-old composite persona, if retained by the approved PRD.
- 14 years of manual QA experience.
- Banking-domain experience.
- Existing evidence relevant to user acceptance testing, defect management, test reporting, and business-domain understanding, as supported by the demo specification.
- Explicitly labelled unknown and unverified skills.

Also seed:

- Eight synthetic mentor profiles.
- Approximately six simulated opportunities with `is_simulated=true`.
- Three to five assessments with clear rubrics.
- Learning resources with verified URLs.
- Enough role and skill data to produce meaningful adjacent-role recommendations.

**Important distinctions**

- A seeded skill is not automatically verified.
- A simulated opportunity is not a real vacancy.
- A mentor profile in the demo is not a real person's verified availability.
- A resource URL must be checked before it is described as verified.

**Acceptance criteria**

- The demo profile loads through the normal application data path.
- Every synthetic or simulated record is marked appropriately.
- All seeded relationships reference valid IDs.
- The seed operation is repeatable.
- The resulting dataset supports the initial QA-focused journey.

## P1.4 — CSV validation and dataset versioning

Implement a deterministic validation script for the source datasets.

**Validation must include**

- Duplicate canonical IDs.
- Missing required fields.
- Orphan skill and role references.
- Invalid weight values.
- Invalid proficiency levels.
- Malformed mandatory flags.
- Invalid evidence-state values where present.
- Duplicate or inconsistent aliases.
- Invalid assessment-to-skill references.
- Missing provenance or simulation labels where required.

Generate or record a dataset version that can be associated with recommendation results.

**Acceptance criteria**

- Validation exits unsuccessfully when a critical error exists.
- Errors identify the affected file and record.
- Valid data produces a concise validation summary.
- Dataset versioning is deterministic or otherwise reproducible according to the project's versioning policy.

### Phase 1 demo

The database can be reset and seeded, the Harpreet profile is available, and the complete skill and role dataset passes validation.

### Phase 1 completion gate

- [ ] Migrations run from a clean database.
- [ ] All core entities and constraints exist.
- [ ] Canonical datasets pass validation.
- [ ] Synthetic records are labelled.
- [ ] Dataset versioning is available.
- [ ] A clean reset and seed produce a consistent demo.

---

# Phase 2 — Authentication, API Skeleton, and Authorization

**Estimated duration:** 1 day

**Objective:** Establish secure access to profiles and consent records before introducing sensitive résumé data or sharing functionality.

## P2.1 — Authentication and API middleware

Implement or verify:

- Supabase Auth integration in the current frontend.
- Express JWT verification middleware.
- Request ID generation or propagation.
- Zod request validation.
- A consistent API error format.
- Rate limiting on appropriate public endpoints.
- A CORS allowlist for the intended frontend origins.
- Safe error handling and structured, privacy-conscious logs.

**Acceptance criteria**

- Requests without valid authentication are rejected where authentication is required.
- Invalid request bodies receive consistent validation errors.
- Errors include a request ID.
- Unexpected server errors do not expose secrets or stack traces to clients.
- Unapproved browser origins are rejected according to the configured CORS policy.

## P2.2 — Profile CRUD and consent events

Implement the minimum profile lifecycle:

- `POST /api/v1/profiles`
- `GET /api/v1/profiles/:id`
- `PATCH /api/v1/profiles/:id`

Implement the consent-event model and the necessary API operations to record and inspect consent according to the product specification.

**Profile behavior**

- A worker can create and update their own profile.
- Only permitted fields can be updated.
- Server-owned identifiers and fields cannot be overwritten by arbitrary client input.
- Profile ownership is established from authenticated identity and validated relationships, not trusted client-supplied IDs.
- Changes that affect security or consent are auditable.

**Acceptance criteria**

- A user can create, retrieve, and update an authorized profile.
- Attempts to access another user's profile are rejected.
- Invalid fields are rejected.
- Consent records are associated with the appropriate actor and scope.

## P2.3 — RLS and authorization tests

Implement RLS policies for the supported worker, mentor, and HR access patterns.

Create automated tests covering:

- Unauthenticated access.
- A worker accessing their own profile.
- A worker attempting to access another worker's profile.
- A worker attempting to change another worker's profile.
- Access to nested resources owned by another user.
- Unauthorized mentor or HR access.
- Unauthorized consent operations.

Use separate test identities and realistic ownership relationships.

**Acceptance criteria**

- Unauthorized requests are rejected at the API layer.
- RLS independently protects the relevant database records.
- Tests do not rely solely on frontend hiding or disabled buttons.
- No test requires a real person's résumé or private profile.

### Phase 2 demo

A user can authenticate and manage their own profile, while attempts to access another user's data fail predictably.

### Phase 2 completion gate

- [ ] JWT verification works.
- [ ] Profile CRUD is functional.
- [ ] Request validation and error handling are consistent.
- [ ] RLS policies are in place.
- [ ] Object-level authorization tests pass.

---

# Phase 3 — Skill Extraction and Worker Review

**Estimated duration:** 1–1.5 days

**Objective:** Turn work-history text into explainable candidate skills while allowing the worker to confirm, edit, or reject the system's interpretation.

## P3.1 — Deterministic alias and phrase extraction

Implement an internal FastAPI extraction endpoint.

Suggested internal endpoint:

```text
POST /extract
```

**Responsibilities**

- Accept a bounded text input.
- Normalize text for matching without losing the original source.
- Match known aliases and phrases against the canonical skill taxonomy.
- Return candidate canonical skill IDs.
- Include source evidence spans or exact supporting text.
- Mark extracted claims as `inferred` until the worker confirms them or another approved verification mechanism applies.
- Return structured confidence or matching metadata where specified.
- Reject excessively large or malformed requests.

**Acceptance criteria**

- Exact alias matches resolve to the correct canonical IDs.
- Each extracted claim includes valid source evidence when required.
- Unknown phrases do not create arbitrary canonical skills.
- Input size limits are enforced.
- Extraction does not claim that a skill is verified.

## P3.2 — Optional embedding fallback

Add semantic matching using `all-MiniLM-L6-v2` only if the baseline matcher needs it.

**Requirements**

- Reuse the canonical skill dataset.
- Keep embeddings in memory where practical.
- Use cosine similarity or the method specified by the technical design.
- Prefer exact alias and phrase matches over ambiguous semantic matches.
- Treat semantic results as suggestions, not proof.
- Keep thresholds and normalization rules configurable and testable.
- Do not add a separate vector database.
- Allow extraction to run without embeddings when the optional model is unavailable.

**Acceptance criteria**

- Exact aliases retain precedence.
- Semantic suggestions reference existing canonical IDs.
- Similarity scores are not presented as evidence of proficiency.
- The service continues to operate through the baseline matcher if embeddings are disabled.

## P3.3 — API integration and skill review operations

Implement the public API operations:

```text
POST  /api/v1/profiles/:id/skills/extract
PATCH /api/v1/profiles/:id/skills
```

Support worker actions to:

- Confirm an extracted claim.
- Edit a skill level or its supported description where allowed.
- Reject an incorrect claim.
- Review the source evidence.
- View relevant change history.

Apply authentication, object-level authorization, schema validation, and audit requirements.

A worker confirmation must not automatically be represented as independent verification. Preserve the distinction between self-reported claims and externally verified skills.

**Acceptance criteria**

- Only authorized users can modify their own claims.
- The API rejects unknown canonical IDs and invalid levels.
- Rejected claims are handled consistently.
- Relevant changes create minimal audit events.
- Verification states cannot be assigned arbitrarily by the client.

## P3.4 — Extraction and review UI

Build the end-to-end review experience in the current frontend.

The flow should allow a worker to:

1. Paste work-history text.
2. Submit it for extraction.
3. Inspect the candidate skills.
4. See the source evidence associated with each candidate.
5. Confirm, edit, or reject candidates.
6. Save the resulting canonical profile.
7. Revisit the profile later.

Include clear loading, empty, validation-error, and failure states.

Make the distinction between inferred, self-reported, and verified evidence understandable without requiring technical knowledge.

**Acceptance criteria**

- The worker can complete the full review flow.
- Every proposed claim is reviewable.
- No claim is silently marked verified.
- The profile shown after saving reflects the persisted server state.

## P3.5 — Optional LLM extractor

Implement an LLM extractor only after the deterministic extraction path works.

**Requirements**

- Hide model-specific behavior behind an interface.
- Validate every model response against an explicit schema.
- Allow only canonical skill IDs from the approved taxonomy.
- Reject malformed responses.
- Never let model output modify database state without the authorized API workflow.
- Disable the LLM by default until configured.
- Keep model access and input handling consistent with privacy requirements.
- Test prompt-injection content embedded in résumé text.

Résumé text must be treated as untrusted data, not as instructions to the application or model.

**Acceptance criteria**

- LLM-disabled operation works.
- Invalid model output fails safely.
- Prompt-injection content cannot authorize actions or bypass validation.
- Model failure falls back to a supported deterministic path or manual entry.

### Phase 3 demo

Harpreet's work-history text is converted into candidate skills, the worker reviews the evidence, and a canonical profile is saved without requiring an LLM.

### Phase 3 completion gate

- [ ] Alias-based extraction works.
- [ ] Semantic fallback is optional.
- [ ] Review and editing are functional.
- [ ] Evidence states remain accurate.
- [ ] LLM-disabled demo works end to end.

---

# Phase 4 — Adjacency Engine

**Estimated duration:** 1.5 days

**Objective:** Recommend nearby feasible roles using deterministic scoring, hard constraints, a separate mandatory-requirement gate, and explainable results.

## P4.1 — Pure scoring module

Implement the scoring logic as a pure function with no database, HTTP, model, or filesystem dependencies.

Define a versioned configuration such as:

```text
fit-v1
```

The scoring function must use the project's approved formula and evidence factors.

**Requirements**

- Validate weights and required proficiency levels.
- Handle unknown evidence according to the canonical scoring specification.
- Preserve the relationship between supported and possible fit where both are implemented.
- Keep evidence factors in versioned configuration.
- Reject invalid scoring inputs.
- Return enough structured information to explain the score.
- Avoid hidden dependence on environment state, timestamps, or unordered collections.

**Acceptance criteria**

- Unit tests cover representative formula calculations.
- Invalid inputs are rejected.
- Identical inputs produce identical outputs.
- The scoring module can be tested independently of the API.

## P4.2 — Constraints, blocker gate, and ranking

Implement the role-recommendation pipeline in a fixed, testable order:

1. Load the authorized profile and applicable dataset version.
2. Apply hard constraints.
3. Record exclusion reasons.
4. Calculate the required fit scores for eligible roles.
5. Evaluate mandatory requirements independently.
6. Separate feasible roles from blocked or stretch roles.
7. Rank feasible roles using the specified deterministic tie-breaking rules.
8. Return the top three feasible recommendations where available.
9. Return blocked roles separately with their relevant gaps.

For each recommendation, provide structured information about:

- Role identity and description.
- Estimated skill-fit score or scores.
- Requirement-level score contributions where supported.
- Evidence supporting each requirement.
- Unknown or insufficiently demonstrated requirements.
- Mandatory blockers.
- Transferable skills.
- Hard-constraint exclusion reasons.
- Vacancy provenance and freshness or simulated status.
- Dataset and scoring versions.

**Acceptance criteria**

- Hard constraints are applied before ranking.
- A high numerical score cannot override a mandatory blocker.
- Blocked roles are not presented as feasible top recommendations.
- Results explain the most important reasons for inclusion, exclusion, or blocking.
- No unsupported vacancy is presented as verified and current.

## P4.3 — Recommendation API and persistence

Implement the public endpoints:

```text
POST /api/v1/recommendations/roles
GET  /api/v1/roles/:id/gaps
```

The POST route must:

- Authenticate the caller.
- Authorize access to the requested profile.
- Validate profile and filter inputs.
- Use the approved scoring and ranking implementation.
- Persist recommendation results and their versions where required.
- Return a stable response schema.

The gaps endpoint must return authorized role requirements, evidence status, and relevant blockers without leaking another worker's private information.

**Acceptance criteria**

- The API returns deterministic results for identical inputs and versions.
- Stored recommendation versions are sufficient to identify the scoring and dataset configuration.
- Unauthorized profile access is rejected.
- Errors follow the established API error format.

## P4.4 — Recommendation UI

Build the role-discovery screen with:

- Top-three feasible role cards.
- A clear fit label: **“Estimated skill fit, not hiring probability.”**
- Role-specific score details.
- Supported and uncertain evidence distinctions.
- Mandatory blockers.
- Critical skill gaps.
- Transferable evidence.
- Vacancy source and freshness information or a simulated-data label.
- A role-detail view with a clear next action.

Do not rely on colour alone to communicate readiness or evidence status. Use readable text and accessible visual indicators.

**Acceptance criteria**

- The worker can understand why a role was recommended.
- The UI distinguishes blocked roles from feasible roles.
- A numerical score never implies guaranteed employability.
- The UI reflects the authoritative API response.

## P4.5 — Scoring, determinism, and fairness tests

Add automated tests for:

- Formula calculations.
- Invalid weights and invalid or zero required levels.
- Unknown evidence versus confirmed absence.
- Mandatory blockers despite high fit scores.
- Constraint filtering before ranking.
- Deterministic tie-breaking.
- Reproducibility for identical profiles and versioned datasets.
- Stable results when irrelevant personal attributes, such as name or age, change.
- Correct score and ranking updates when relevant skill evidence changes.

Fairness tests should isolate the effect of irrelevant attributes rather than accidentally changing the skills being assessed.

**Acceptance criteria**

- The tests catch violations of the hard invariants.
- A high score cannot bypass the mandatory gate.
- Repeated identical requests return identical ranking results under identical inputs and versions.

### Phase 4 demo

Harpreet receives an explainable list of feasible adjacent roles and separately sees a blocked role with the mandatory gap that prevents it from being recommended as ready.

### Phase 4 completion gate

- [ ] Pure scoring module passes tests.
- [ ] Constraint filtering and blocker gate work.
- [ ] Recommendation API persists the required versions.
- [ ] UI shows scores and reasons.
- [ ] Determinism and fairness smoke tests pass.

---

# Phase 5 — Gap Pathway and Verification

**Estimated duration:** 1 day

**Objective:** Turn recommendation gaps into specific, actionable next steps and show how new evidence changes the worker's recommendations.

## P5.1 — Priority gap and next-best-action engine

Implement deterministic prioritization of candidate next actions.

The priority calculation should consider the factors defined in the product specification, including:

- Requirement importance.
- Size of the proficiency or evidence gap.
- Feasibility of demonstrating or learning the skill.
- Mandatory status and relevance to the target role.
- Available assessment or learning resources.

The initial plan proposes:

**Priority = importance × gap size × feasibility**

Treat this as a configurable ranking rule rather than an unvalidated claim that the resulting number represents a probability.

Each selected gap should have:

- A canonical skill ID.
- A concise reason for prioritization.
- The target proficiency or evidence requirement.
- An associated resource, assessment, or fixed practice task.
- A clear expected outcome.

Prefer proving an existing capability when doing so can materially improve supported fit. Recommend learning when the worker has a genuine gap that must be addressed first.

**Acceptance criteria**

- The same profile and versions produce the same next-best action.
- The selected action has an explicit explanation.
- A resource or assessment is linked to a valid skill.
- Unknown evidence is not automatically described as a confirmed deficiency.

## P5.2 — Assessment submission and rubric scoring

Implement the assessment lifecycle:

1. Retrieve the assessment and its rubric.
2. Verify that the assessment is available to the worker.
3. Accept and validate the submission.
4. Evaluate it using the supported rule-based or human-review workflow.
5. Store the assessment result and reviewer type.
6. Update only the skills explicitly tested by the rubric.
7. Preserve the prior evidence and assessment history where required.

Support the documented reviewer types, including rule-based and self-assessment workflows, without treating every workflow as equivalent to independent verification.

**Important:** A resource being completed is a separate event. It must not automatically increase proficiency or change a skill to `verified`.

**Acceptance criteria**

- The assessment result references the correct rubric.
- Only the skills explicitly covered by the assessment are updated.
- Failed or insufficient demonstrations do not increase proficiency.
- Completion of a learning resource is stored separately from assessment results.
- The evidence status accurately reflects the verification method.

## P5.3 — Recommendation recomputation and comparison

After an authorized skill-evidence update:

- Recompute recommendations using the appropriate dataset and scoring versions.
- Preserve the original result for comparison where the product requires history.
- Show which scores changed and why.
- Identify roles that moved up, moved down, became feasible, or remain blocked.
- Explain whether the change resulted from new evidence, a proficiency change, or another relevant input.

**Acceptance criteria**

- Before-and-after results are reproducible.
- Changes can be traced to the relevant assessment or profile update.
- Unrelated skills and unrelated recommendations are not modified arbitrarily.

## P5.4 — Explanation generation

Use deterministic templates for explanations by default.

An optional LLM may improve wording, but it must not invent facts or alter calculated fields.

Validate model-generated explanations against the underlying computed data. If validation fails or the model is unavailable, use the deterministic explanation.

**Acceptance criteria**

- Every explanation is supported by the actual recommendation output.
- The model cannot alter scores, blockers, or verification states.
- LLM-disabled operation remains fully functional.

### Phase 5 demo

Harpreet receives a prioritized next step, completes an assessment, obtains the evidence status permitted by that assessment, and sees an explainable before-and-after recommendation comparison.

### Phase 5 completion gate

- [ ] Next-best-action logic is deterministic.
- [ ] Assessments are validated and recorded.
- [ ] Only assessed skills change.
- [ ] Learning completion is separate from verification.
- [ ] Recommendation changes are explained and reproducible.

---

# Phase 6 — Mentors, Opportunities, HR, and Consent

**Estimated duration:** 1 day

**Objective:** Extend the working career-transition loop with optional human support and opportunity discovery without compromising consent, privacy, or data provenance.

## P6.1 — Mentor matching

Implement a deterministic mentor matcher based on the approved weighting configuration.

Candidate factors include:

- Coverage of the worker's relevant skill gaps.
- Relevant professional experience.
- Availability.
- Language compatibility.
- Preferred meeting format.

Return visible match reasons rather than an unexplained match score.

Use synthetic mentor profiles in the demo and display the required synthetic-data label.

**Acceptance criteria**

- Matching uses only permitted profile information.
- Results are deterministic for identical inputs and versions.
- The UI explains why each mentor is suggested.
- Demo availability is not presented as verified real-world availability.

## P6.2 — Mentorship requests and consent enforcement

Implement the mentorship-request workflow, including the planned endpoint:

```text
POST /api/v1/mentorships
```

Before creating a request that shares worker information:

- Authenticate the requester.
- Verify ownership of the relevant profile.
- Verify explicit consent for the recipient and requested data.
- Enforce a field allowlist.
- Reject requests without the required approval.
- Record a minimal audit event.
- Return a safe and consistent error response on rejection.

Build the consent UI so the worker can understand the recipient, purpose, and information being shared.

**Acceptance criteria**

- No share approval means the request is rejected.
- Consent for one recipient does not authorize unrelated sharing.
- Only approved fields are exposed.
- Automated tests cover missing, invalid, and appropriately scoped consent.

## P6.3 — Opportunity discovery

Build the opportunity view using the available opportunities dataset and any permitted external source integrations.

For every opportunity, display either:

- Source and checked timestamp when those values are supported and verified, or
- A clear statement such as **“No current vacancy verified”** or a **“Simulated”** label.

Do not invent live vacancy data or imply that a simulated opportunity is an actual opening.

**Acceptance criteria**

- Each opportunity has truthful provenance.
- Stale or unverified information is not presented as current.
- Simulated records remain visibly labelled.
- Empty states clearly explain when no verified current vacancy is available.

## P6.4 — HR review and mock SAP adapter

Implement a limited HR-facing review experience, subject to the approved authorization model.

The view may expose authorized evidence summaries, relevant skills, and verification status. It must not grant HR unrestricted access to a worker's profile or résumé.

Include an advisory banner that makes clear that recommendations support human decision-making and must not be treated as automated hiring decisions.

Any SAP integration must remain explicitly labelled as a mock or planned adapter unless an actual authorized integration has been implemented and verified.

**Acceptance criteria**

- HR access is restricted to authorized records and fields.
- Consent is enforced for external sharing.
- The UI clearly distinguishes evidence from inferred or self-reported claims.
- The SAP adapter does not claim to be a functioning production integration when it is mocked.

## P6.5 — Corrections, appeals, and demo-data reset

Implement the documented workflows for workers to correct their information, challenge incorrect claims, and request supported data deletion.

Keep profile correction distinct from an assessment review. A worker must be able to correct inaccurate personal information without the application falsely treating the correction as a verified skill.

Ensure the demo can be reset without exposing real user data or deleting unrelated production data.

**Acceptance criteria**

- The correction or appeal workflow has a defined state transition.
- Relevant changes are authorized and auditable.
- Deletion behavior respects documented foreign-key, retention, and consent requirements.
- Demo reset affects only the designated demo environment and records.

### Phase 6 demo

Harpreet can inspect a mentor suggestion, review simulated opportunities, and view a consent-controlled sharing workflow. Unauthorized sharing is rejected.

### Phase 6 completion gate

- [ ] Mentor matching returns explainable results.
- [ ] Consent is enforced on sharing operations.
- [ ] Opportunity provenance is clear.
- [ ] HR access is restricted.
- [ ] Mock integrations are labelled honestly.
- [ ] Correction and demo-reset paths are validated.

---

# Phase 7 — Hardening, Evaluation, Deployment, and Demo

**Estimated duration:** 1 day

**Objective:** Validate the full Harpreet journey, harden the application, measure the extraction and recommendation quality honestly, and prepare a reproducible demonstration.

## P7.1 — End-to-end Harpreet journey

Create an end-to-end test that begins from a clean demo reset.

The test should exercise the supported core journey:

1. Initialize the demo environment.
2. Load Harpreet's synthetic profile.
3. Submit work-history text for skill extraction.
4. Review and confirm candidate skills.
5. Generate role recommendations.
6. Inspect a feasible role and a blocked role.
7. Complete a supported assessment or proof activity.
8. Verify the permitted evidence update.
9. Recompute recommendations.
10. Compare the before-and-after results.
11. Exercise the relevant consent-controlled workflow.
12. Confirm that synthetic and simulated records remain labelled.

Do not make the E2E test dependent on an external LLM or live vacancy provider.

**Acceptance criteria**

- The test is repeatable from a clean demo state.
- No manual database edits are required to pass it.
- Results are deterministic where expected.
- Failures identify the broken stage.

## P7.2 — Security and privacy review

Review the application against a documented checklist.

**Transport and configuration**

- HTTPS is configured for deployed endpoints.
- CORS permits only approved origins.
- Rate limits are enabled on appropriate endpoints.
- Server-only credentials are not exposed to the frontend.

**Authentication and authorization**

- JWT validation is active.
- Object-level authorization is tested.
- RLS policies protect relevant records.
- The test suite includes three distinct test identities for worker, mentor, and HR access scenarios, using only permitted operations.

**Privacy**

- No résumé content or tokens appear in logs.
- Consent is checked before data sharing.
- API responses use field allowlists.
- Synthetic data is clearly labelled.

**Supply chain and secrets**

- Run the available dependency scan.
- Run secret scanning.
- Check for accidentally committed credentials.
- Confirm environment templates contain placeholders only.

**Acceptance criteria**

- Findings are fixed or explicitly documented as unresolved.
- Tests demonstrate the relevant access boundaries.
- No unresolved critical security issue is silently accepted.

## P7.3 — Deployment

Deploy the application using the simplest supported managed infrastructure.

The proposed target is:

- Frontend on Vercel where the current frontend architecture supports it.
- Express API on one managed host.
- ML functionality behind the API on the same host where feasible, or on a separate internal service if required.
- A separate Supabase project for the demo.

Keep the ML service private and enforce its intended service boundary.

**Deployment requirements**

- Configure environment variables through the host's secret-management facilities.
- Run migrations through a controlled deployment process.
- Seed only the designated demo environment with synthetic data.
- Configure health checks and safe error reporting.
- Verify frontend-to-API connectivity.
- Verify authentication and authorization in the deployed environment.
- Document rollback and recovery steps appropriate to the deployment.

**Acceptance criteria**

- The deployed demo can complete the core journey.
- Secrets are not present in the frontend bundle.
- Database configuration matches the deployed schema.
- The demo does not rely on a developer's local machine.

## P7.4 — Extraction and recommendation evaluation

Prepare a reproducible evaluation using approximately 15–20 synthetic profiles.

Measure extraction precision, recall, and F1 where ground-truth annotations are available.

For a clearly defined evaluation set:

- Precision = correctly predicted relevant skills / all predicted relevant skills.
- Recall = correctly predicted relevant skills / all ground-truth relevant skills.
- F1 = harmonic mean of precision and recall.

Define how aliases, duplicate predictions, rejected skills, and missing predictions are counted before reporting results.

For top-three role relevance:

- Establish a documented relevance annotation or judgment method.
- Define what counts as a relevant role for each synthetic profile.
- Report the metric and denominator clearly.
- Keep measured results separate from assumptions and illustrative examples.

**Acceptance criteria**

- The evaluation can be reproduced from documented data and commands.
- Results are based on measured predictions and labelled ground truth.
- No metric is fabricated or inferred from a handful of successful demo interactions.
- Limitations are stated alongside the results.
- Private evaluation data is not exposed in public artifacts.

## P7.5 — Demo script and release checklist

Prepare the demonstration according to the PRD's demo-script section and release checklist.

The presentation should cover:

1. The career-transition problem.
2. Harpreet's starting profile.
3. Extracted skills and supporting evidence.
4. The adjacent-role recommendations.
5. Why a seemingly attractive role may remain blocked.
6. The prioritized next action.
7. Assessment and evidence update.
8. Before-and-after recommendation changes.
9. Consent-controlled sharing.
10. Privacy, fairness, and limitations.
11. What is real, what is simulated, and what is planned.

Prepare a clear **“Mocked vs. Real”** slide.

Do not claim that a planned SAP adapter is operational, that simulated vacancies are live, or that an unmeasured recommendation engine has demonstrated real hiring outcomes.

**Acceptance criteria**

- The demo follows a documented, repeatable sequence.
- The environment can be reset.
- The demo can run without an external LLM.
- All mock and simulated components are disclosed.
- The release checklist accurately reflects the actual state of the application.

### Phase 7 demo

The complete Harpreet journey works from a clean reset in the deployed demo environment, with validated security boundaries, reproducible recommendations, and an honest evaluation report.

### Phase 7 completion gate

- [ ] End-to-end journey passes.
- [ ] Security and privacy checks are completed.
- [ ] Deployment is reproducible.
- [ ] Evaluation metrics are measured and documented.
- [ ] Demo script and release checklist are ready.
- [ ] Mocked, simulated, and planned functionality is clearly disclosed.

---

# 4. Cut Order If Time Runs Short

Remove optional complexity in this order:

1. LLM-based extraction.
2. Embedding-based fallback.
3. HR-view polish.
4. Mentor calendar and scheduling.
5. Additional role families.
6. Nonessential UI polish and optional analytics.

If running multiple services becomes a delivery risk, simplify the deployment while preserving the public API boundary and deterministic business logic. Keep the ML functionality as a module within the existing backend repository or run it in one FastAPI process if that fits the current implementation and deployment constraints.

Do not cut:

- Authentication and object-level authorization.
- Consent enforcement.
- Deterministic scoring.
- Mandatory-requirement blocker gate.
- Hard-constraint filtering.
- Evidence-state distinctions.
- Assessment isolation.
- Reproducible recommendation versions.
- Synthetic and simulated-data labels.
- Privacy-safe logging.
- Core Harpreet end-to-end journey.

**Cut optional breadth, not trust or correctness.**

---

# 5. Working Method for Minimal Token and Context Waste

## 5.1 One task per session

Start each coding-agent request with a single task ID.

Example:

> Implement P4.2. Follow AGENTS.md and this implementation plan. Read only the relevant specification sections and files. Write tests with the implementation. Do not start P4.3.

Avoid asking the agent to implement an entire phase in one prompt unless the task is explicitly scoped for that purpose.

## 5.2 Data first

Prioritize Phase 1 data quality.

The initial skill taxonomy and role requirements strongly influence:

- Extraction quality.
- Recommendation usefulness.
- Mandatory blockers.
- Next-best-action selection.
- Demo credibility.

A small, reviewed dataset is preferable to a large, inconsistent dataset.

## 5.3 Pure functions before integration

Where possible, implement in this order:

1. Canonical types and validation.
2. Pure scoring, ranking, matching, and prioritization functions.
3. Unit tests.
4. Database persistence and services.
5. API routes and authorization.
6. UI integration.
7. End-to-end tests.

This order makes failures easier to isolate and keeps the deterministic engine independent of UI and infrastructure.

## 5.4 Test progressively

For each task:

- Run the narrowest relevant test first.
- Run related unit and API tests after integration.
- Run the full project check at phase completion.
- Run the demo-reset and smoke checks where the task affects the demo path.
- Report actual results and any tests that could not run.

Use the scripts that exist in the current repository. The current setup uses npm commands, including `npm run check`; do not assume `pnpm check` exists.

## 5.5 Reference specifications instead of copying them

Keep product and technical specifications in `/docs`.

Reference relevant headings and requirements in task prompts rather than pasting entire documents into every conversation.

If the specification does not define a necessary behavior, use the smallest safe default where possible and document the assumption. Ask only when the uncertainty materially affects architecture, privacy, or product behavior.

## 5.6 Commit per task

After a task passes its relevant checks:

- Review the diff.
- Confirm no unrelated files changed.
- Confirm no secrets or private data were introduced.
- Commit the task with a clear message.
- Record any remaining issue and the next task ID.

Small commits allow work to resume after context is cleared.

## 5.7 Reviewer usage

Use the read-only `reviewer` agent at the end of:

- Phase 4: scoring, ranking, and mandatory gate.
- Phase 6: sharing, consent, and access boundaries.
- Phase 7: final security, privacy, and release readiness.

The reviewer should report concrete invariant violations, file locations, and explanations rather than general praise or a rewritten implementation plan.

Use the `data-curator` or `test-writer` roles only when the work is sufficiently independent to justify delegation.

---

# 6. Final Project Acceptance Criteria

The project is ready for demonstration when:

- [ ] A clean reset produces a consistent synthetic dataset.
- [ ] Harpreet's profile can be loaded and reviewed.
- [ ] Skill extraction works with the LLM disabled.
- [ ] Candidate skills include appropriate evidence and statuses.
- [ ] Role recommendations use deterministic scoring.
- [ ] Hard constraints run before ranking.
- [ ] Mandatory blockers cannot be overridden by a high score.
- [ ] Scores are labelled as estimated skill fit, not hiring probability.
- [ ] The next-best action is explainable and reproducible.
- [ ] Assessments update only the skills they test.
- [ ] Before-and-after recommendations can be compared.
- [ ] Sharing requires valid, explicit consent.
- [ ] Worker, mentor, and HR authorization boundaries are tested.
- [ ] Synthetic and simulated records are visibly labelled.
- [ ] No private résumé content or secrets are committed or logged.
- [ ] The core E2E journey passes from a clean reset.
- [ ] `npm run check` passes.
- [ ] Relevant database, ML, security, and deployment checks pass or have documented limitations.
- [ ] Evaluation metrics are measured and reproducible.
- [ ] The demo script distinguishes implemented, mocked, simulated, and planned functionality.

---

# 7. Guiding Principle

Second Act should demonstrate that a career transition does not have to mean starting over.

The implementation must make it possible to see what a worker can already demonstrate, understand which nearby roles are feasible, identify the next meaningful step, and make progress without surrendering control of personal information.

**Finish the complete journey first. Make every recommendation explainable. Make every verification meaningful. Keep every sharing decision under the worker's control.**
