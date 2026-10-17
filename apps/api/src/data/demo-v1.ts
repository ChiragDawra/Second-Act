/**
 * Second Act demo dataset v1 — SYNTHETIC.
 *
 * Every person, employer, mentor and opening below is fictional and is stored
 * with is_synthetic / is_simulated = true. Skill labels are project-curated
 * and aligned in spirit with ESCO/O*NET wording; this is not an import of
 * either dataset. Salary bands are illustrative, not market data.
 */
import type { PhraseRule } from '../engine/extraction.ts';
import type { AssessmentItem } from '../engine/assessment.ts';
import type { WorkerPreferences } from '../engine/types.ts';

export const DATASET_VERSION = 'roles-demo-v1';
export const TAXONOMY_VERSION = 'taxonomy-demo-v1';
export const SCENARIO_VERSION = 'scenario-harpreet-v1';
export const RELEASED_AT = '2026-10-17';

export const DATASET_VERSIONS = [
  { id: TAXONOMY_VERSION, kind: 'taxonomy', description: 'Project-curated list of 20 skills with aliases and learning-effort estimates.', source: 'Second Act curated dataset (ESCO/O*NET-aligned labels; not an import)' },
  { id: DATASET_VERSION, kind: 'roles', description: '11 curated roles across QA, business analysis, data operations, IT support and customer support, each with 6–8 weighted requirements.', source: 'Second Act curated dataset' },
  { id: 'mentors-demo-v1', kind: 'mentors', description: '6 synthetic mentor profiles. No real people.', source: 'Synthetic' },
  { id: 'opportunities-sim-v1', kind: 'opportunities', description: '5 simulated openings at 2 synthetic employers. No live vacancy feed is connected.', source: 'Simulated' },
  { id: 'assessments-demo-v1', kind: 'assessments', description: 'One fixed-rubric, auto-graded demo assessment. Not a credential.', source: 'Second Act curated dataset' },
  { id: 'fit-v1', kind: 'scoring', description: 'Weighted, evidence-adjusted requirement coverage. Mandatory gate and hard constraints are separate from the score.', source: 'Second Act Adjacency Engine' },
  { id: 'extraction-rules-v1', kind: 'extraction', description: 'Deterministic phrase and alias matcher. No LLM is called.', source: 'Second Act Adjacency Engine' },
  { id: SCENARIO_VERSION, kind: 'scenario', description: 'Harpreet transition scenario: one worker, one mentor, one recruiter organisation, one admin.', source: 'Synthetic' },
] as const;

export const ORG_IDS = {
  northwind: '5ec0ac70-0000-4000-8000-000000000301',
  contoso: '5ec0ac70-0000-4000-8000-000000000302',
} as const;

export const ORGANIZATIONS = [
  { id: ORG_IDS.northwind, name: 'Northwind Fintech (synthetic employer)', kind: 'employer' },
  { id: ORG_IDS.contoso, name: 'Contoso Payments (synthetic employer)', kind: 'employer' },
] as const;

const SOURCE = 'Second Act curated dataset (synthetic, reviewed by the team for the demo)';

export const SKILLS = [
  { id: 'test-case-design', canonical_name: 'Test case design', category: 'Quality engineering', description: 'Deriving test cases from requirements using techniques such as boundary values and equivalence partitioning.', aliases: ['test case design', 'test cases', 'test scenarios'], learning_hours_per_level: 15 },
  { id: 'regression-testing', canonical_name: 'Regression testing', category: 'Quality engineering', description: 'Planning and running regression suites to catch unintended changes before release.', aliases: ['regression testing', 'regression suites', 'regression'], learning_hours_per_level: 12 },
  { id: 'defect-triage', canonical_name: 'Defect triage & reporting', category: 'Quality engineering', description: 'Reproducing, classifying and routing defects with clear evidence for developers.', aliases: ['defect triage', 'bug triage', 'defects'], learning_hours_per_level: 10 },
  { id: 'uat-coordination', canonical_name: 'User acceptance testing coordination', category: 'Delivery', description: 'Planning UAT cycles with business users, tracking sign-off and resolving blockers.', aliases: ['user acceptance testing', 'uat'], learning_hours_per_level: 15 },
  { id: 'test-reporting', canonical_name: 'Test reporting & metrics', category: 'Quality engineering', description: 'Summarising test progress, coverage and defect trends for release decisions.', aliases: ['test reporting', 'test metrics', 'defect metrics'], learning_hours_per_level: 10 },
  { id: 'sql-querying', canonical_name: 'SQL querying', category: 'Data', description: 'Writing SELECT queries with joins and aggregation to check or analyse data.', aliases: ['sql'], learning_hours_per_level: 20 },
  { id: 'test-automation-scripting', canonical_name: 'Test automation scripting', category: 'Automation', description: 'Writing maintainable automated UI or API test scripts in code (for example Playwright or Selenium WebDriver).', aliases: ['test automation', 'automated tests', 'selenium', 'playwright'], learning_hours_per_level: 30 },
  { id: 'programming-fundamentals', canonical_name: 'Programming fundamentals', category: 'Automation', description: 'Variables, control flow, functions and debugging in a general-purpose language such as Python.', aliases: ['python', 'programming', 'scripts'], learning_hours_per_level: 35 },
  { id: 'ci-cd-basics', canonical_name: 'CI/CD basics', category: 'Automation', description: 'Running automated checks in a pipeline (for example GitHub Actions or Jenkins) on every change.', aliases: ['ci/cd', 'continuous integration', 'jenkins', 'github actions'], learning_hours_per_level: 20 },
  { id: 'api-testing', canonical_name: 'API testing', category: 'Quality engineering', description: 'Testing HTTP APIs: requests, status codes, payload validation and contract checks.', aliases: ['api testing', 'postman', 'rest api'], learning_hours_per_level: 20 },
  { id: 'banking-domain', canonical_name: 'Banking & payments domain knowledge', category: 'Domain', description: 'Core banking operations, payment rails such as UPI and NEFT, ledgers and reconciliation.', aliases: ['core banking', 'upi', 'ledger', 'banking'], learning_hours_per_level: 25 },
  { id: 'regulatory-compliance', canonical_name: 'Regulatory compliance awareness (BFSI)', category: 'Domain', description: 'Understanding KYC, AML and RBI requirements and turning them into checks.', aliases: ['kyc', 'aml', 'rbi', 'hipaa', 'compliance'], learning_hours_per_level: 20 },
  { id: 'requirements-analysis', canonical_name: 'Requirements analysis', category: 'Business analysis', description: 'Clarifying requirements and turning them into precise, testable acceptance criteria.', aliases: ['requirements', 'acceptance criteria', 'user stories'], learning_hours_per_level: 15 },
  { id: 'stakeholder-communication', canonical_name: 'Stakeholder communication', category: 'Collaboration', description: 'Explaining status, risks and results to business and technical audiences.', aliases: ['stakeholders', 'stakeholder'], learning_hours_per_level: 10 },
  { id: 'process-documentation', canonical_name: 'Process documentation', category: 'Collaboration', description: 'Writing and maintaining test plans, runbooks and process documents.', aliases: ['documentation', 'test plans', 'runbooks'], learning_hours_per_level: 8 },
  { id: 'data-analysis-spreadsheets', canonical_name: 'Spreadsheet data analysis', category: 'Data', description: 'Pivot tables, lookups and validation rules to analyse operational data.', aliases: ['excel', 'spreadsheet', 'pivot tables'], learning_hours_per_level: 12 },
  { id: 'agile-delivery', canonical_name: 'Agile delivery practices', category: 'Delivery', description: 'Working in sprints: planning, stand-ups, reviews and backlog refinement.', aliases: ['agile', 'scrum', 'stand-ups', 'sprint'], learning_hours_per_level: 10 },
  { id: 'it-troubleshooting', canonical_name: 'IT troubleshooting', category: 'IT support', description: 'Diagnosing hardware, operating-system, network and access issues methodically.', aliases: ['troubleshooting', 'desktop support'], learning_hours_per_level: 15 },
  { id: 'itsm-ticketing', canonical_name: 'ITSM ticketing', category: 'IT support', description: 'Managing incidents and service requests in tools such as ServiceNow or Jira Service Management.', aliases: ['servicenow', 'itsm', 'service desk'], learning_hours_per_level: 8 },
  { id: 'customer-issue-resolution', canonical_name: 'Customer issue resolution', category: 'Customer support', description: 'Resolving customer problems end to end with empathy and clear follow-up.', aliases: ['customer support', 'customer issues', 'helpdesk'], learning_hours_per_level: 10 },
] as const;

/** Curated phrase rules. Alias matches (lower confidence) come from SKILLS. */
export const EXTRACTION_RULES: PhraseRule[] = [
  { phrase: 'designed regression test cases', skill_id: 'test-case-design', level_hint: 3, confidence: 0.85 },
  { phrase: 'regression suites', skill_id: 'regression-testing', level_hint: 3, confidence: 0.8 },
  { phrase: 'triaged defects', skill_id: 'defect-triage', level_hint: 3, confidence: 0.85 },
  { phrase: 'coordinated user acceptance testing', skill_id: 'uat-coordination', level_hint: 3, confidence: 0.8 },
  { phrase: 'test summary reports', skill_id: 'test-reporting', level_hint: 3, confidence: 0.75 },
  { phrase: 'wrote sql queries', skill_id: 'sql-querying', level_hint: 2, confidence: 0.7 },
  { phrase: 'selenium ide scripts', skill_id: 'test-automation-scripting', level_hint: 1, confidence: 0.6 },
  { phrase: 'kyc and aml requirements', skill_id: 'regulatory-compliance', level_hint: 2, confidence: 0.65 },
  { phrase: 'derive test scenarios', skill_id: 'requirements-analysis', level_hint: 2, confidence: 0.6 },
  { phrase: 'core banking', skill_id: 'banking-domain', level_hint: 3, confidence: 0.8 },
  { phrase: 'stakeholders through test results', skill_id: 'stakeholder-communication', level_hint: 2, confidence: 0.6 },
  { phrase: 'process documentation', skill_id: 'process-documentation', level_hint: 2, confidence: 0.65 },
  { phrase: 'daily stand-ups', skill_id: 'agile-delivery', level_hint: 2, confidence: 0.45 },
  { phrase: 'audited patient records', skill_id: 'data-analysis-spreadsheets', level_hint: 2, confidence: 0.6 },
  { phrase: 'pivot tables', skill_id: 'data-analysis-spreadsheets', level_hint: 3, confidence: 0.75 },
  { phrase: 'resolve record mismatches', skill_id: 'customer-issue-resolution', level_hint: 2, confidence: 0.5 },
];

type Req = [skill_id: string, weight: number, level: number, mandatory: boolean, rubric: string];

const ROLE_DEFS: Array<{
  id: string;
  title: string;
  family: string;
  description: string;
  employment_type: 'employee' | 'independent';
  work_mode: 'remote' | 'hybrid' | 'onsite';
  locations: string[];
  salary: [number, number] | null;
  requirements: Req[];
}> = [
  {
    id: 'uat-lead-fintech', title: 'UAT Lead (Fintech)', family: 'Quality & testing',
    description: 'Leads user acceptance testing with business teams and owns release sign-off evidence.',
    employment_type: 'employee', work_mode: 'hybrid', locations: ['Chandigarh', 'Mohali', 'Bengaluru'], salary: [12, 18],
    requirements: [
      ['uat-coordination', 5, 3, true, 'Has run UAT cycles end to end, including sign-off.'],
      ['test-reporting', 4, 3, true, 'Produces release-readiness reports from test and defect data.'],
      ['test-case-design', 4, 3, false, 'Designs business-scenario test cases independently.'],
      ['stakeholder-communication', 4, 3, false, 'Leads result walk-throughs with business owners.'],
      ['banking-domain', 3, 2, false, 'Understands core banking and payment flows.'],
      ['defect-triage', 3, 2, false, 'Triages UAT defects with development teams.'],
      ['regulatory-compliance', 2, 2, false, 'Checks regulatory requirements are covered in UAT.'],
    ],
  },
  {
    id: 'qa-automation-engineer-bfsi', title: 'QA Automation Engineer (BFSI)', family: 'Quality & testing',
    description: 'Builds and maintains automated regression suites for banking applications.',
    employment_type: 'employee', work_mode: 'hybrid', locations: ['Mohali', 'Pune', 'Bengaluru'], salary: [10, 18],
    requirements: [
      ['test-automation-scripting', 5, 2, true, 'Writes a working automated UI test with assertions and waits.'],
      ['programming-fundamentals', 4, 2, true, 'Writes and debugs small functions in Python or Java.'],
      ['test-case-design', 4, 3, false, 'Chooses which cases are worth automating.'],
      ['regression-testing', 3, 3, false, 'Maintains a regression suite across releases.'],
      ['ci-cd-basics', 3, 2, false, 'Runs the suite in a CI pipeline on every change.'],
      ['api-testing', 3, 2, false, 'Automates API checks alongside UI tests.'],
      ['defect-triage', 2, 2, false, 'Separates product defects from flaky tests.'],
      ['banking-domain', 2, 2, false, 'Understands the banking flows under test.'],
    ],
  },
  {
    id: 'business-analyst-bfsi', title: 'Business Analyst (BFSI)', family: 'Business analysis',
    description: 'Translates banking business needs into clear, testable requirements.',
    employment_type: 'employee', work_mode: 'hybrid', locations: ['Chandigarh', 'Gurugram'], salary: [9, 15],
    requirements: [
      ['requirements-analysis', 5, 3, true, 'Writes testable acceptance criteria independently.'],
      ['banking-domain', 4, 3, true, 'Explains core banking and payment processes in depth.'],
      ['stakeholder-communication', 4, 3, false, 'Facilitates workshops with business stakeholders.'],
      ['process-documentation', 3, 2, false, 'Documents as-is and to-be processes.'],
      ['sql-querying', 3, 2, false, 'Queries data to validate business rules.'],
      ['regulatory-compliance', 3, 2, false, 'Maps KYC/AML rules to requirements.'],
      ['uat-coordination', 2, 2, false, 'Supports UAT for delivered requirements.'],
    ],
  },
  {
    id: 'compliance-testing-analyst', title: 'Compliance Testing Analyst (Banking)', family: 'Quality & testing',
    description: 'Tests that banking systems meet KYC, AML and reporting regulations.',
    employment_type: 'employee', work_mode: 'remote', locations: [], salary: [9, 14],
    requirements: [
      ['regulatory-compliance', 5, 3, true, 'Designs tests from regulatory requirements independently.'],
      ['test-case-design', 4, 3, false, 'Designs negative and boundary cases for compliance rules.'],
      ['banking-domain', 4, 3, false, 'Understands customer onboarding and transaction monitoring.'],
      ['test-reporting', 3, 2, false, 'Reports compliance test evidence for audit.'],
      ['process-documentation', 3, 2, false, 'Keeps audit-ready test documentation.'],
      ['sql-querying', 2, 2, false, 'Queries transaction data to check rule outcomes.'],
      ['defect-triage', 2, 2, false, 'Routes compliance defects with clear evidence.'],
    ],
  },
  {
    id: 'api-test-analyst', title: 'API Test Analyst', family: 'Quality & testing',
    description: 'Tests payment and banking APIs for correctness and contract compliance.',
    employment_type: 'employee', work_mode: 'remote', locations: [], salary: [10, 16],
    requirements: [
      ['api-testing', 5, 3, true, 'Tests REST APIs independently, including negative cases.'],
      ['test-case-design', 4, 3, false, 'Designs API test cases from specifications.'],
      ['programming-fundamentals', 3, 1, false, 'Reads simple scripts used in API collections.'],
      ['sql-querying', 3, 2, false, 'Verifies API side effects in the database.'],
      ['defect-triage', 3, 2, false, 'Reports API defects with request/response evidence.'],
      ['regression-testing', 2, 2, false, 'Maintains an API regression collection.'],
    ],
  },
  {
    id: 'data-quality-analyst-payments', title: 'Data Quality Analyst (Payments)', family: 'Data operations',
    description: 'Monitors and fixes data quality in payment and ledger systems.',
    employment_type: 'employee', work_mode: 'hybrid', locations: ['Mohali', 'Pune'], salary: [8, 14],
    requirements: [
      ['sql-querying', 5, 3, true, 'Writes multi-table queries to find data issues independently.'],
      ['data-analysis-spreadsheets', 4, 2, false, 'Analyses data quality trends in spreadsheets.'],
      ['banking-domain', 3, 2, false, 'Understands ledger and settlement data.'],
      ['test-reporting', 3, 2, false, 'Reports data quality metrics.'],
      ['process-documentation', 2, 2, false, 'Documents data checks and fixes.'],
      ['regulatory-compliance', 2, 2, false, 'Knows data retention and reporting rules.'],
    ],
  },
  {
    id: 'release-coordinator', title: 'Release Coordinator', family: 'Delivery',
    description: 'Coordinates release schedules, readiness checks and go/no-go decisions.',
    employment_type: 'employee', work_mode: 'onsite', locations: ['Chandigarh', 'Noida'], salary: [8, 13],
    requirements: [
      ['agile-delivery', 4, 2, true, 'Works within sprint and release ceremonies.'],
      ['stakeholder-communication', 4, 3, false, 'Runs go/no-go meetings.'],
      ['test-reporting', 3, 2, false, 'Reads test reports to judge release readiness.'],
      ['ci-cd-basics', 3, 1, false, 'Understands how builds move through pipelines.'],
      ['process-documentation', 3, 2, false, 'Maintains release runbooks.'],
      ['defect-triage', 2, 2, false, 'Prioritises release-blocking defects.'],
    ],
  },
  {
    id: 'it-support-specialist-l2', title: 'IT Support Specialist (L2)', family: 'IT support',
    description: 'Resolves escalated end-user IT issues.',
    employment_type: 'employee', work_mode: 'onsite', locations: ['Mohali'], salary: [4, 7],
    requirements: [
      ['it-troubleshooting', 5, 3, true, 'Diagnoses OS, network and access issues independently.'],
      ['itsm-ticketing', 4, 2, false, 'Manages incidents in an ITSM tool.'],
      ['customer-issue-resolution', 4, 2, false, 'Resolves user issues with clear follow-up.'],
      ['process-documentation', 2, 2, false, 'Writes knowledge-base articles.'],
      ['defect-triage', 2, 2, false, 'Escalates defects with reproduction steps.'],
      ['sql-querying', 2, 1, false, 'Runs simple lookup queries.'],
    ],
  },
  {
    id: 'customer-success-fintech', title: 'Customer Success Specialist (Fintech)', family: 'Customer support',
    description: 'Helps fintech customers adopt and resolve issues with payment products.',
    employment_type: 'employee', work_mode: 'remote', locations: [], salary: [5, 8],
    requirements: [
      ['customer-issue-resolution', 5, 3, true, 'Resolves customer issues end to end.'],
      ['stakeholder-communication', 4, 3, false, 'Explains product behaviour to customers.'],
      ['banking-domain', 3, 2, false, 'Understands payment flows customers use.'],
      ['itsm-ticketing', 2, 2, false, 'Tracks cases in a ticketing tool.'],
      ['data-analysis-spreadsheets', 2, 2, false, 'Analyses customer usage data.'],
      ['process-documentation', 2, 1, false, 'Writes help articles.'],
    ],
  },
  {
    id: 'independent-uat-consultant', title: 'Independent UAT Consultant', family: 'Quality & testing',
    description: 'Freelance UAT support for banks and fintechs, engaged per release.',
    employment_type: 'independent', work_mode: 'remote', locations: [], salary: null,
    requirements: [
      ['uat-coordination', 5, 3, true, 'Runs UAT cycles end to end without supervision.'],
      ['test-case-design', 4, 3, false, 'Designs business-scenario test cases.'],
      ['stakeholder-communication', 4, 3, false, 'Manages client stakeholders directly.'],
      ['test-reporting', 3, 3, false, 'Delivers sign-off reports to clients.'],
      ['banking-domain', 3, 3, false, 'Brings deep banking domain knowledge.'],
      ['process-documentation', 2, 2, false, 'Leaves clients with reusable test documentation.'],
    ],
  },
  {
    id: 'devops-engineer', title: 'DevOps Engineer', family: 'Engineering',
    description: 'Builds and runs delivery pipelines and infrastructure automation.',
    employment_type: 'employee', work_mode: 'hybrid', locations: ['Bengaluru', 'Pune'], salary: [12, 22],
    requirements: [
      ['ci-cd-basics', 5, 3, true, 'Builds and maintains pipelines independently.'],
      ['programming-fundamentals', 4, 3, true, 'Writes automation scripts independently.'],
      ['test-automation-scripting', 3, 2, false, 'Integrates automated tests into pipelines.'],
      ['it-troubleshooting', 3, 3, false, 'Debugs build and environment failures.'],
      ['agile-delivery', 2, 2, false, 'Works in agile delivery teams.'],
      ['process-documentation', 2, 2, false, 'Documents pipelines and runbooks.'],
    ],
  },
];

export const ROLES = ROLE_DEFS.map((r) => ({
  id: r.id,
  title: r.title,
  family: r.family,
  description: r.description,
  employment_type: r.employment_type,
  work_mode: r.work_mode,
  locations: r.locations,
  salary_min_lpa: r.salary?.[0] ?? null,
  salary_max_lpa: r.salary?.[1] ?? null,
  source: SOURCE,
  dataset_version: DATASET_VERSION,
  last_reviewed_at: RELEASED_AT,
  requirements: r.requirements.map(([skill_id, importance_weight, required_level, is_mandatory, evidence_rubric]) => ({
    skill_id,
    importance_weight,
    required_level,
    is_mandatory,
    evidence_rubric,
  })),
}));

export const PROFILE_IDS = {
  harpreet: '5ec0ac70-0000-4000-8000-000000000101',
  priya: '5ec0ac70-0000-4000-8000-000000000102',
} as const;

export const HARPREET_PREFERENCES: WorkerPreferences = {
  locations: ['Mohali', 'Chandigarh'],
  work_modes: ['remote', 'hybrid', 'onsite'],
  employment_types: ['employee'],
  salary_floor_lpa: 9,
  weekly_learning_hours: 6,
  max_transition_weeks: 20,
  languages: ['English', 'Hindi', 'Punjabi'],
  session_formats: ['video'],
};

export const WORKER_PROFILES = [
  {
    id: PROFILE_IDS.harpreet,
    account: 'worker' as const,
    display_name: 'Harpreet Singh',
    headline: 'Manual QA tester · 14 years · core banking',
    current_role_title: 'Manual QA Tester',
    experience_summary: [
      'Manual QA tester with 14 years at a core-banking software vendor (synthetic employer), 2012–2026.',
      'Designed regression test cases for core banking and UPI payment workflows.',
      'Executed regression suites before every quarterly release.',
      'Logged, reproduced and triaged defects in JIRA with developers.',
      'Coordinated user acceptance testing with branch operations teams before each release.',
      'Prepared weekly test summary reports and defect metrics for release sign-off.',
      'Wrote SQL queries to validate ledger balances after nightly batch runs.',
      'Recorded basic Selenium IDE scripts for smoke tests.',
      'Reviewed RBI KYC and AML requirements with business analysts to derive test scenarios.',
      'Walked business stakeholders through test results in release review meetings.',
      'Joined daily stand-ups with the development team.',
      'Maintained test plans and process documentation in Confluence.',
    ].join('\n'),
    preferences: HARPREET_PREFERENCES,
  },
  {
    // Control profile: never shares anything, so no other account may see it.
    id: PROFILE_IDS.priya,
    account: null,
    display_name: 'Priya Nair',
    headline: 'Records coordinator · 10 years · healthcare',
    current_role_title: 'Data Entry & Records Coordinator',
    experience_summary: [
      'Data entry and records coordinator for a hospital network (synthetic employer), 2016–2026.',
      'Audited patient records for missing fields and HIPAA format errors.',
      'Built Excel pivot tables to track insurance claim rejections.',
      'Worked with insurance claims teams to resolve record mismatches.',
    ].join('\n'),
    preferences: {
      locations: ['Pune'],
      work_modes: ['remote', 'hybrid'],
      employment_types: ['employee'],
      salary_floor_lpa: 7,
      weekly_learning_hours: 5,
      max_transition_weeks: 24,
      languages: ['English', 'Malayalam', 'Hindi'],
      session_formats: ['video', 'chat'],
    } satisfies WorkerPreferences,
  },
];

export const MENTOR_IDS = {
  meera: '5ec0ac70-0000-4000-8000-000000000201',
  arjun: '5ec0ac70-0000-4000-8000-000000000202',
  farah: '5ec0ac70-0000-4000-8000-000000000203',
  daniel: '5ec0ac70-0000-4000-8000-000000000204',
  simran: '5ec0ac70-0000-4000-8000-000000000205',
  kavya: '5ec0ac70-0000-4000-8000-000000000206',
} as const;

export const MENTORS = [
  {
    id: MENTOR_IDS.meera, account: 'mentor' as const, display_name: 'Meera Iyer',
    headline: 'Senior QA Automation Lead (synthetic mentor)',
    bio: 'Moved from manual testing to automation in a payments company. Mentors manual testers learning Playwright, Python and CI.',
    skill_ids: ['test-automation-scripting', 'programming-fundamentals', 'ci-cd-basics', 'api-testing', 'regression-testing'],
    role_experience: ['qa-automation-engineer-bfsi', 'api-test-analyst'], transition_experience: true,
    languages: ['English', 'Hindi'], session_formats: ['video', 'chat'], availability_hours_per_week: 2, capacity_remaining: 3,
  },
  {
    id: MENTOR_IDS.arjun, account: null, display_name: 'Arjun Mehta',
    headline: 'UAT Manager, payments (synthetic mentor)',
    bio: 'Runs UAT for digital payments releases and coaches testers moving into UAT leadership.',
    skill_ids: ['uat-coordination', 'test-reporting', 'stakeholder-communication', 'banking-domain'],
    role_experience: ['uat-lead-fintech', 'independent-uat-consultant'], transition_experience: false,
    languages: ['English', 'Hindi', 'Punjabi'], session_formats: ['video', 'in_person'], availability_hours_per_week: 1, capacity_remaining: 2,
  },
  {
    id: MENTOR_IDS.farah, account: null, display_name: 'Farah Khan',
    headline: 'Business Analysis Lead, BFSI (synthetic mentor)',
    bio: 'Leads business analysts on lending and compliance programmes.',
    skill_ids: ['requirements-analysis', 'process-documentation', 'sql-querying', 'regulatory-compliance'],
    role_experience: ['business-analyst-bfsi', 'compliance-testing-analyst'], transition_experience: true,
    languages: ['English', 'Hindi', 'Urdu'], session_formats: ['video'], availability_hours_per_week: 2, capacity_remaining: 1,
  },
  {
    id: MENTOR_IDS.daniel, account: null, display_name: 'Daniel Joseph',
    headline: 'DevOps Engineer (synthetic mentor)',
    bio: 'Builds CI/CD pipelines for fintech teams. Currently at full mentoring capacity.',
    skill_ids: ['ci-cd-basics', 'programming-fundamentals', 'it-troubleshooting'],
    role_experience: ['devops-engineer'], transition_experience: false,
    languages: ['English', 'Malayalam'], session_formats: ['chat'], availability_hours_per_week: 1, capacity_remaining: 0,
  },
  {
    id: MENTOR_IDS.simran, account: null, display_name: 'Simran Gill',
    headline: 'Data Quality Lead (synthetic mentor)',
    bio: 'Runs data quality for a payments ledger team.',
    skill_ids: ['sql-querying', 'data-analysis-spreadsheets', 'test-reporting'],
    role_experience: ['data-quality-analyst-payments'], transition_experience: true,
    languages: ['English', 'Punjabi'], session_formats: ['video'], availability_hours_per_week: 3, capacity_remaining: 2,
  },
  {
    id: MENTOR_IDS.kavya, account: null, display_name: 'Kavya Rao',
    headline: 'API Testing Specialist (synthetic mentor)',
    bio: 'Specialises in API contract testing. Mentors in Kannada, Telugu and Tamil.',
    skill_ids: ['api-testing', 'programming-fundamentals', 'test-automation-scripting'],
    role_experience: ['api-test-analyst'], transition_experience: false,
    languages: ['Kannada', 'Telugu', 'Tamil'], session_formats: ['video'], availability_hours_per_week: 2, capacity_remaining: 2,
  },
];

export const OPPORTUNITIES = [
  { id: 'nw-qa-automation-mohali', role_id: 'qa-automation-engineer-bfsi', org_id: ORG_IDS.northwind, title: 'QA Automation Engineer — Payments', employer_name: 'Northwind Fintech (synthetic)', location: 'Mohali', work_mode: 'hybrid', salary_band_text: '₹10–16 LPA (illustrative)' },
  { id: 'nw-uat-lead-chandigarh', role_id: 'uat-lead-fintech', org_id: ORG_IDS.northwind, title: 'UAT Lead — Digital Lending', employer_name: 'Northwind Fintech (synthetic)', location: 'Chandigarh', work_mode: 'hybrid', salary_band_text: '₹13–18 LPA (illustrative)' },
  { id: 'nw-compliance-test-remote', role_id: 'compliance-testing-analyst', org_id: ORG_IDS.northwind, title: 'Compliance Test Analyst', employer_name: 'Northwind Fintech (synthetic)', location: 'Remote (India)', work_mode: 'remote', salary_band_text: '₹9–13 LPA (illustrative)' },
  { id: 'contoso-ba-gurugram', role_id: 'business-analyst-bfsi', org_id: ORG_IDS.contoso, title: 'Business Analyst — Cards', employer_name: 'Contoso Payments (synthetic)', location: 'Gurugram', work_mode: 'hybrid', salary_band_text: '₹10–15 LPA (illustrative)' },
  { id: 'contoso-dq-pune', role_id: 'data-quality-analyst-payments', org_id: ORG_IDS.contoso, title: 'Data Quality Analyst', employer_name: 'Contoso Payments (synthetic)', location: 'Pune', work_mode: 'hybrid', salary_band_text: '₹8–12 LPA (illustrative)' },
] as const;

export const ASSESSMENT_ID = 'test-automation-foundations-v1';

export const ASSESSMENTS: Array<{
  id: string;
  skill_id: string;
  title: string;
  description: string;
  version: string;
  items: AssessmentItem[];
  answer_key: Record<string, string>;
  pass_threshold: number;
  level_on_pass: number;
  time_estimate_minutes: number;
}> = [
  {
    id: ASSESSMENT_ID,
    skill_id: 'test-automation-scripting',
    title: 'Test automation scripting — foundations',
    description:
      'Five questions on reading and reasoning about a short Playwright (Python) test. Passing (4 of 5) verifies Test automation scripting at level 2 (Practiced). Demo assessment: auto-graded with a fixed rubric; not a credential.',
    version: 'v1',
    pass_threshold: 4,
    level_on_pass: 2,
    time_estimate_minutes: 8,
    items: [
      {
        id: 'q1',
        prompt: 'What does this line do?',
        code: 'page.get_by_role("button", name="Transfer").click()',
        options: [
          { id: 'a', label: 'Checks that a Transfer button exists, without clicking it' },
          { id: 'b', label: 'Clicks the button whose accessible name is "Transfer"' },
          { id: 'c', label: 'Creates a new button labelled "Transfer"' },
          { id: 'd', label: 'Waits for a page called "Transfer" to load' },
        ],
      },
      {
        id: 'q2',
        prompt: 'Which line checks that the confirmation message is actually shown to the user?',
        options: [
          { id: 'a', label: 'page.get_by_text("Transfer successful")' },
          { id: 'b', label: 'print("Transfer successful")' },
          { id: 'c', label: 'expect(page.get_by_text("Transfer successful")).to_be_visible()' },
          { id: 'd', label: 'page.goto("Transfer successful")' },
        ],
      },
      {
        id: 'q3',
        prompt: 'A test calls time.sleep(5) before checking the balance. Why is an auto-waiting assertion usually better?',
        options: [
          { id: 'a', label: 'It waits only as long as needed, so the test is faster and less flaky' },
          { id: 'b', label: 'It skips slow pages automatically' },
          { id: 'c', label: 'It turns off network calls during the test' },
          { id: 'd', label: 'There is no practical difference' },
        ],
      },
      {
        id: 'q4',
        prompt: 'In pytest, what happens to a function named test_refund_rejected_for_closed_account in test_refunds.py?',
        options: [
          { id: 'a', label: 'It runs only if called from main()' },
          { id: 'b', label: 'It is ignored because the name is too long' },
          { id: 'c', label: 'It runs before every other test as setup' },
          { id: 'd', label: 'pytest discovers and runs it as a test automatically' },
        ],
      },
      {
        id: 'q5',
        prompt: 'An automated UPI refund test passes locally but fails intermittently in CI. What is the best first step?',
        options: [
          { id: 'a', label: 'Delete the test so the pipeline is green' },
          { id: 'b', label: 'Re-run with tracing and logs enabled, and look for timing or test-data dependencies' },
          { id: 'c', label: 'Add time.sleep(30) before every step' },
          { id: 'd', label: 'Close the defect as "cannot reproduce"' },
        ],
      },
    ],
    answer_key: { q1: 'b', q2: 'c', q3: 'a', q4: 'd', q5: 'b' },
  },
];

export const LEARNING_RESOURCES = [
  { id: 'playwright-python-writing-tests', skill_id: 'test-automation-scripting', title: 'Playwright for Python — Writing tests', provider: 'Playwright (Microsoft)', url: 'https://playwright.dev/python/docs/writing-tests', format: 'Documentation', cost_band: 'Free' },
  { id: 'pytest-getting-started', skill_id: 'test-automation-scripting', title: 'pytest — Get started', provider: 'pytest', url: 'https://docs.pytest.org/en/stable/getting-started.html', format: 'Documentation', cost_band: 'Free' },
  { id: 'python-tutorial', skill_id: 'programming-fundamentals', title: 'The Python Tutorial', provider: 'Python Software Foundation', url: 'https://docs.python.org/3/tutorial/', format: 'Documentation', cost_band: 'Free' },
  { id: 'github-actions-docs', skill_id: 'ci-cd-basics', title: 'GitHub Actions documentation', provider: 'GitHub', url: 'https://docs.github.com/en/actions', format: 'Documentation', cost_band: 'Free' },
  { id: 'postgres-tutorial-select', skill_id: 'sql-querying', title: 'PostgreSQL tutorial — Querying a table', provider: 'PostgreSQL Global Development Group', url: 'https://www.postgresql.org/docs/current/tutorial-select.html', format: 'Documentation', cost_band: 'Free' },
];

/** The four demo identities. Emails use DEMO_EMAIL_DOMAIN; passwords never live in source. */
export const DEMO_ACCOUNTS = [
  { key: 'worker', role: 'worker', email_local: 'harpreet.worker', display_name: 'Harpreet Singh', org_id: null },
  { key: 'mentor', role: 'mentor', email_local: 'meera.mentor', display_name: 'Meera Iyer', org_id: null },
  { key: 'recruiter', role: 'recruiter', email_local: 'rohan.recruiter', display_name: 'Rohan Kapoor (Northwind Fintech)', org_id: ORG_IDS.northwind },
  { key: 'admin', role: 'admin', email_local: 'demo.admin', display_name: 'Demo Administrator', org_id: null },
] as const;
export type DemoAccountKey = (typeof DEMO_ACCOUNTS)[number]['key'];

export const DEFAULT_DEMO_EMAIL_DOMAIN = 'demo.secondact.test';
