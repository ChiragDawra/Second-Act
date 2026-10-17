# Second Act — Team Work Division
## Maniac Coders | SAP Hackfest 2026

**Purpose:** Divide Second Act into five independently buildable modules that integrate into one working career-recovery and mentorship platform.

**Product goal:** Help a worker identify transferable skills, discover realistic adjacent roles, close skill gaps through a personalized learning plan, connect with a relevant mentor, and demonstrate job readiness through evidence.

---

## 1. Product scope

### Core user journey
1. Candidate uploads a resume or enters work experience.
2. System extracts and normalizes skills, with the candidate able to correct them.
3. Career engine ranks adjacent roles and explains missing skills.
4. Mentor engine recommends relevant mentors based on skill gaps, role experience, availability, language, and mentoring reliability.
5. Learning planner creates a structured plan with practical deliverables and mentor checkpoints.
6. Candidate completes tasks, receives feedback, and builds evidence of readiness.
7. Admin can inspect system activity and governance flags.

### Hackathon MVP
**Must work end-to-end**
- One seeded demo persona (Harpreet) and several realistic roles.
- Skill profile extraction or a reliable fallback using sample data.
- Explainable adjacent-role matching and skill-gap output.
- Mentor recommendations from a seeded mentor catalogue.
- Session booking with availability/conflict validation.
- Learning plan with milestones and mentor-review checkpoints.
- A coherent learner UI and a basic mentor/admin view.
- Clear labeling of mock data versus live integrations.

**Stretch features**
- Mentorship copilot using approved resources and session notes (RAG).
- Calendar/video integrations.
- Live SAP SuccessFactors integration.
- Custom-trained ranking models.

Do not claim a live SAP integration unless it is actually connected and tested. For the prototype, use an SAP-compatible adapter and clearly labeled mock records.

---

## 2. Recommended technology stack

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS, shadcn/ui | Candidate, mentor, and admin interfaces |
| Main application API | Node.js, Express, TypeScript | Authentication, authorization, workflow, booking, and aggregation |
| AI/ML API | Python, FastAPI, Pydantic | Skill extraction, career matching, mentor ranking, learning-plan generation |
| Database | Supabase PostgreSQL | Persistent application data and relational records |
| Vector search | pgvector (optional for MVP) | Semantic similarity for skills and approved learning resources |
| Authentication | Supabase Auth | Sign-in and identity |
| File storage | Supabase Storage | Resume and project-evidence uploads, with access policies |
| Testing | Vitest/Jest, Pytest, API integration tests | Unit and contract tests |
| Deployment | Vercel frontend; a Python-capable host for APIs; Supabase | Hosted demonstration |
| API documentation | OpenAPI for FastAPI; documented Express routes | Team integration and testing |

**Architecture decision:** Keep the application modular, but do not create five separate microservices. One Express API and one Python AI API are enough for the hackathon.

---

## 3. Team roles and ownership

### Person 1 — Skills Discovery and Profile Intelligence
**Primary ownership:** Resume/profile input and `SkillsProfile`.

**Tasks**
- Build resume upload and profile text input.
- Parse PDF/DOCX text using an appropriate parser.
- Extract work history, skills, tools, certifications, and evidence.
- Normalize synonyms to a shared skill catalogue.
- Produce proficiency estimates with confidence and evidence.
- Let the candidate edit or confirm extracted skills.
- Add validation and a demo fallback if model/API access fails.

**Deliverables**
- `POST /api/v1/skills/extract`
- `GET /api/v1/candidates/:id/skills`
- `PATCH /api/v1/candidates/:id/skills`
- `SkillsProfile` contract and sample fixtures
- Tests for empty, malformed, and ambiguous resume inputs

**Dependencies:** Shared skill IDs and contract; can begin with mock resumes and a seed skill catalogue.

**Definition of done**
- A demo resume produces valid structured JSON.
- The user can correct the extracted profile.
- Inferred skills are not silently treated as verified skills.

### Person 2 — Role Intelligence and Career Adjacency
**Primary ownership:** Role catalogue, role requirements, and `MatchResult`.

**Tasks**
- Create a small curated catalogue of realistic target roles.
- Define required skills, minimum proficiency, and importance weights.
- Map transferable skills between adjacent roles.
- Implement explainable role-fit scoring and missing-skill calculation.
- Return ranked roles with reasons and confidence/limitations.
- Add unit tests for scoring and edge cases.

**Deliverables**
- `GET /api/v1/roles`
- `POST /api/v1/careers/match`
- `RoleCatalog` and `MatchResult` contracts
- Seed data for Harpreet's current role and target roles
- Documented score formula and tests

**Dependencies:** Shared skill IDs and `SkillsProfile` contract. Build against fixtures while Person 1 works.

**Definition of done**
- The same inputs produce deterministic results.
- Each result explains the match and gaps.
- The UI labels scores as estimates, not guaranteed job eligibility.

### Person 3 — Mentorship Recommendation and Booking
**Primary ownership:** Mentor catalogue, matching, sessions, and feedback.

**Tasks**
- Create seeded mentor profiles with skills, target-role experience, transition experience, languages, availability, and verification status.
- Implement hard filters for consent, availability, and required language.
- Rank mentors with an explainable weighted scoring formula.
- Explain why each mentor was recommended.
- Build session request, confirmation, cancellation, and feedback flows.
- Prevent overlapping bookings using database constraints/transaction-safe checks.
- Enforce role-based access so users can only access authorized sessions and notes.

**Suggested initial ranking weights**
- Missing-skill coverage: 35%
- Target-role experience: 25%
- Career-transition experience: 15%
- Schedule compatibility: 10%
- Language preference: 10%
- Mentoring reliability/feedback: 5%

These are starting assumptions to test, not validated weights. Do not use sensitive personal characteristics as negative ranking signals.

**Deliverables**
- `GET /api/v1/mentors/recommendations?candidateId=...`
- `GET /api/v1/mentors/:id`
- `GET /api/v1/mentors/:id/availability`
- `POST /api/v1/sessions`
- `PATCH /api/v1/sessions/:id`
- `POST /api/v1/sessions/:id/feedback`
- `MentorRecommendations` contract and seed data

**Dependencies:** `MatchResult` and shared skill IDs. Start with mock career gaps and a seeded mentor catalogue.

**Definition of done**
- Recommendations include score explanations.
- Unavailable mentors cannot be booked for conflicting slots.
- A completed session can record feedback and action items.
- Booking and feedback permissions are tested.

### Person 4 — Learning Plan, Readiness, and Governance
**Primary ownership:** `LearningPlan`, milestone tracking, and review evidence.

**Tasks**
- Convert skill gaps into weekly learning milestones.
- Use a curated resource catalogue; do not let the LLM invent links.
- Generate practical tasks and project deliverables.
- Add mentor review checkpoints.
- Track milestone status and evidence URLs.
- Create a basic readiness evaluation based on demonstrated competencies.
- Flag unsupported skill claims and recommendations needing human review.
- Add a simple audit view for matching explanations and review outcomes.

**Deliverables**
- `POST /api/v1/learning/plans`
- `GET /api/v1/learning/plans/:id`
- `PATCH /api/v1/learning/milestones/:id`
- `POST /api/v1/readiness/evaluate`
- `LearningPlan` contract and resource seed data
- Governance checks and tests

**Dependencies:** `MatchResult`, skill catalogue, and mentor feedback contract. Build against fixtures.

**Definition of done**
- Each identified gap maps to at least one milestone.
- Milestones have measurable deliverables and status.
- Readiness is not based solely on attendance or time spent.
- AI-generated plans are validated and clearly presented as recommendations.

### Person 5 — Frontend, Integration, and SAP Alignment
**Primary ownership:** End-to-end product experience, shared contracts, and deployment.

**Tasks**
- Create the React app shell and navigation.
- Build learner dashboard, career matches, mentor discovery, booking, learning plan, and progress views.
- Build a simple mentor session view and admin/governance view.
- Own shared API types and coordinate contract changes.
- Wire the modules together and replace mock responses as endpoints become ready.
- Create an SAP-compatible adapter boundary and labeled mock SAP data.
- Add loading, empty, error, and fallback states.
- Configure environment variables, deployment, seeded demo data, and the presentation flow.

**Deliverables**
- Working learner journey
- Mentor and admin views
- Shared frontend types/API client
- Integration checklist and end-to-end test
- Deployment instructions and demo script
- `SAPAdapter` interface with mock implementation

**Dependencies:** Agreed contracts and sample fixtures. Person 5 should not wait for all backend modules before building the UI.

**Definition of done**
- The full demo journey works using real module endpoints where implemented.
- Errors and loading states are handled.
- Mock/SAP-simulated data is clearly labeled.
- The deployed demo can be reset and repeated reliably.

---

## 4. Shared data contracts

Create a `/contracts` folder at the start. These are conceptual JSON examples; implement them as TypeScript types and Pydantic models and keep both sides aligned.

### `SkillsProfile`
```json
{
  "candidate_id": "candidate_001",
  "skills": [
    {
      "skill_id": "manual_testing",
      "proficiency": 4,
      "evidence": ["Five years of QA experience"],
      "confidence": 0.95,
      "verified": false
    }
  ]
}
```

### `RoleCatalog`
```json
{
  "roles": [
    {
      "role_id": "qa_automation",
      "title": "QA Automation Engineer",
      "required_skills": [
        {
          "skill_id": "python",
          "importance": 0.9,
          "minimum_level": 2
        }
      ]
    }
  ]
}
```

### `MatchResult`
```json
{
  "candidate_id": "candidate_001",
  "target_role_id": "qa_automation",
  "fit_score": 72,
  "missing_skills": ["python", "ci_cd"],
  "score_version": "v1"
}
```

### `MentorRecommendations`
```json
{
  "candidate_id": "candidate_001",
  "recommendations": [
    {
      "mentor_id": "mentor_014",
      "match_score": 0.87,
      "reasons": [
        "Python automation expertise",
        "QA transition experience"
      ],
      "availability_status": "available"
    }
  ]
}
```

### `LearningPlan`
```json
{
  "candidate_id": "candidate_001",
  "target_role_id": "qa_automation",
  "milestones": [
    {
      "skill_id": "python",
      "week": 1,
      "deliverable": "Write a basic automated test",
      "mentor_review_required": true
    }
  ]
}
```

The scores and records above are illustrative. Define proficiency scales, validation rules, score formulas, and versioning before integrating the modules.

---

## 5. Repository structure

```text
second-act/
├── apps/
│   └── web/                     # React + TypeScript frontend
├── services/
│   ├── api/                     # Express application API
│   └── ai/                      # FastAPI AI/ML API
├── contracts/
│   ├── skills-profile.schema.json
│   ├── role-catalog.schema.json
│   ├── match-result.schema.json
│   ├── mentor-recommendations.schema.json
│   └── learning-plan.schema.json
├── database/
│   ├── migrations/
│   └── seed/
├── docs/
│   ├── architecture.md
│   ├── api-contracts.md
│   └── demo-script.md
├── tests/
│   ├── integration/
│   └── e2e/
├── .env.example
└── README.md
```

Keep secrets out of Git. Commit `.env.example` with variable names only, not credentials or API keys.

---

## 6. Integration plan

### Day 1 — Agree on contracts and foundation
- Confirm the MVP scope and demo persona.
- Agree on skill IDs, proficiency scale, score meanings, and API responses.
- Create the repository, database schema, seed data, and shared fixtures.
- Assign one owner per module.

### Days 2–3 — Parallel implementation
- Person 1 builds extraction and profile APIs.
- Person 2 builds role data and matching.
- Person 3 builds mentor ranking and booking.
- Person 4 builds learning plans and readiness checks.
- Person 5 builds the frontend against mock API responses.

### Day 4 — Connect the database and APIs
- Replace mocks one module at a time.
- Test API request/response contracts.
- Verify authentication, authorization, booking conflicts, and error handling.

### Day 5 — End-to-end demo
Run the same seeded candidate through the entire flow:
1. Extract or load skills.
2. Recommend adjacent roles.
3. Display skill gaps.
4. Recommend and book a mentor.
5. Generate a learning plan.
6. Record a mentor review and update evidence.

### Day 6 — Reliability and governance
- Test invalid and missing inputs.
- Test unauthorized access and duplicate/conflicting bookings.
- Review skill-match explanations and model outputs.
- Verify that demo data and simulated integrations are labeled honestly.

### Day 7 — Freeze and present
- Freeze features early.
- Deploy and verify the live environment.
- Prepare a fallback demo dataset.
- Rehearse the demo and judge Q&A.

If the event has fewer days, cut stretch features first; preserve the complete core journey.

---

## 7. Team rules that prevent integration failure

1. **Contract-first development:** Agree on request/response schemas before separate modules are implemented.
2. **Mock-first development:** Every module must have working fixtures on day one.
3. **One owner per module:** Other members can contribute, but ownership for bugs and delivery stays clear.
4. **No silent schema changes:** Contract changes require agreement from the affected module owners and integrator.
5. **Small, frequent merges:** Use feature branches and pull requests; integrate daily.
6. **Test before merging:** Each module includes unit tests and at least one contract test.
7. **Keep one source of truth:** PostgreSQL stores canonical profiles, sessions, milestones, and evidence.
8. **Human review for consequential decisions:** AI recommendations do not automatically certify skills or reject candidates.
9. **Secure personal data:** Restrict resume, session-note, and feedback access; collect only what the feature needs.
10. **Deploy early:** Test the hosted application before the final day.

---

## 8. MVP acceptance checklist

- [ ] Candidate can load or upload a profile.
- [ ] Skills are extracted into the agreed schema and can be corrected.
- [ ] At least three adjacent roles are ranked with explanations.
- [ ] Missing skills map to learning milestones.
- [ ] At least five seeded mentors can be ranked.
- [ ] Mentor recommendations explain why they fit.
- [ ] Session booking checks availability and prevents conflicts.
- [ ] A mentor can submit feedback for an authorized session.
- [ ] Progress and readiness evidence update after a milestone review.
- [ ] Learner, mentor, and admin views work.
- [ ] Mock SAP integration is labeled as simulated.
- [ ] The deployed demo can complete the journey without manual database edits.

---

## 9. Definition of success

The demo should prove that Second Act is more than a resume parser or a job recommender. It should show a continuous path from existing experience to an adjacent career, a relevant human mentor, targeted learning, and evidence of progress.

**Primary outcome metric:** Percentage of learners who complete a relevant mentorship session and subsequently demonstrate one or more previously missing skills.

**Supporting metrics:** Role-match explanation quality, mentor recommendation acceptance, booking completion, milestone completion, and user-reported usefulness.

These metrics should be treated as evaluation goals until real user data is available.

---

## 10. First meeting agenda

Use the first 45–60 minutes to settle the following:
1. Confirm the MVP and demo story.
2. Assign Persons 1–5 and agree on individual deliverables.
3. Freeze the first version of the JSON contracts.
4. Agree on database IDs, proficiency scales, and score interpretation.
5. Create seed data and fixtures for every module.
6. Set up the repository, branches, issue board, and deployment skeleton.
7. Schedule a short daily integration checkpoint.

**Final principle:** Build five independently testable modules that connect through stable contracts—not five separate projects that are merged at the last minute.
