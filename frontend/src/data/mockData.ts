import { CandidateProfile, AgentStage } from '../types';

export const HARPREET_PROFILE: CandidateProfile = {
  id: 'harpreet-singh',
  name: 'Harpreet Singh',
  age: 39,
  location: 'Mohali, Punjab',
  experienceYears: 14,
  currentRole: 'Manual QA Tester',
  targetRole: 'QA Automation Engineer',
  matchScore: 72,
  salaryTrajectory: {
    currentAvg: '₹8.5L / year',
    targetAvg: '₹16.2L / year',
  },
  domainSpecialization: 'Core Banking & Payment Gateways',
  storyQuote: "14 years testing financial systems down to the decimal. When automated pipelines arrived, recruitment filters rejected me because I didn't list scripting frameworks. Second Act showed me I was 72% ready on day one.",
  existingSkills: [
    {
      id: 'skill-1',
      name: 'Test-Case Design',
      type: 'existing',
      category: 'Quality Architecture',
      yearsOfExperience: 14,
      proficiency: 95,
      description: 'Systematic boundary-value analysis, equivalence partitioning, and risk-weighted matrix design across complex financial ledgers.',
      relevanceToTarget: 'Automation scripts are only as good as the test logic behind them. Harpreet already knows what edge cases will break production.',
      transferWeight: 0.95,
      iconName: 'FileCheck'
    },
    {
      id: 'skill-2',
      name: 'Defect Triage',
      type: 'existing',
      category: 'System Diagnostics',
      yearsOfExperience: 12,
      proficiency: 92,
      description: 'Root-cause isolation, stack trace reproduction, severity classification, and cross-functional engineering alignment.',
      relevanceToTarget: 'Diagnosing flaky test runs and classifying automation test failures requires deep defect reproduction instincts.',
      transferWeight: 0.90,
      iconName: 'AlertCircle'
    },
    {
      id: 'skill-3',
      name: 'Banking-Domain Knowledge',
      type: 'existing',
      category: 'Domain Mastery',
      yearsOfExperience: 9,
      proficiency: 88,
      description: 'Regulatory compliance standards, AML/KYC transaction workflows, payment gateway handshakes, and double-entry accounting checks.',
      relevanceToTarget: 'Fintech companies cannot afford junior engineers who misunderstand ledger reconciliation during test authoring.',
      transferWeight: 0.88,
      iconName: 'Landmark'
    },
    {
      id: 'skill-4',
      name: 'Requirement Analysis',
      type: 'existing',
      category: 'Product Governance',
      yearsOfExperience: 11,
      proficiency: 90,
      description: 'Deconstructing ambiguous PRDs and user stories into unambiguous, verifiable acceptance criteria and test matrices.',
      relevanceToTarget: 'Translating acceptance criteria into automated assertions directly accelerates sprint velocity.',
      transferWeight: 0.92,
      iconName: 'Layers'
    }
  ],
  skillGaps: [
    {
      id: 'gap-1',
      name: 'Automation-Tool Scripting',
      type: 'gap',
      category: 'Technical Bridge',
      proficiency: 15,
      description: 'Writing async test scripts in Playwright / Python to automate UI interactions, form entries, and API validations.',
      relevanceToTarget: 'The mechanical syntax for running tests automatically. Built directly on top of Harpreet’s existing manual test steps.',
      transferWeight: 0.85,
      iconName: 'Code2'
    },
    {
      id: 'gap-2',
      name: 'CI/CD Fundamentals',
      type: 'gap',
      category: 'DevOps & Pipeline',
      proficiency: 20,
      description: 'Configuring GitHub Actions or Jenkins triggers to run automated regression suites on every pull request.',
      relevanceToTarget: 'Integrates automated test suites directly into modern continuous deployment delivery cycles.',
      transferWeight: 0.80,
      iconName: 'GitBranch'
    }
  ],
  learningModules: [
    {
      id: 'module-scripting',
      skillName: 'Automation-Tool Scripting',
      whyItMatters: 'Converts Harpreet’s 14 years of manual test steps into executable Playwright/Python code without relearning testing logic.',
      bridgeTimeframe: '3 to 4 weeks (1 hr/day)',
      steps: [
        {
          id: 'step-1-1',
          stepNumber: 1,
          title: 'Translate Manual Steps to Playwright Selectors',
          estimatedTime: '4 days',
          description: 'Map physical mouse clicks and input fields from manual test cases into resilient CSS & text-based locators.',
          practicalExercise: 'Write locators for a banking login form with 2FA modal.',
          leveragesExistingSkill: 'Test-Case Design',
          completed: false,
        },
        {
          id: 'step-1-2',
          stepNumber: 2,
          title: 'Asynchronous State & Smart Assertions',
          estimatedTime: '6 days',
          description: 'Master waitForResponse, auto-waiting, and expect assertions to eliminate flaky race conditions.',
          practicalExercise: 'Test a slow-loading fund-transfer confirmation page with dynamic loading spinners.',
          leveragesExistingSkill: 'Defect Triage',
          completed: false,
        },
        {
          id: 'step-1-3',
          stepNumber: 3,
          title: 'Page Object Model Architecture',
          estimatedTime: '8 days',
          description: 'Structure test suites using clean Page Object patterns for scalable maintainability.',
          practicalExercise: 'Refactor 5 banking test cases into reusable page classes.',
          leveragesExistingSkill: 'Requirement Analysis',
          completed: false,
        }
      ]
    },
    {
      id: 'module-cicd',
      skillName: 'CI/CD Fundamentals',
      whyItMatters: 'Empowers Harpreet to run his automated suites automatically whenever developers push code, closing the DevOps loop.',
      bridgeTimeframe: '2 to 3 weeks (1 hr/day)',
      steps: [
        {
          id: 'step-2-1',
          stepNumber: 1,
          title: 'Git Branching & Pull Request Workflows',
          estimatedTime: '3 days',
          description: 'Learn Git fundamentals: branch creation, commit conventions, and pull request hygiene.',
          practicalExercise: 'Fork a sample repository, create a test branch, and open a PR.',
          leveragesExistingSkill: 'Defect Triage',
          completed: false,
        },
        {
          id: 'step-2-2',
          stepNumber: 2,
          title: 'GitHub Actions YAML Workflow Creation',
          estimatedTime: '5 days',
          description: 'Write a workflow to trigger headless test executions on every PR merge.',
          practicalExercise: 'Create a .github/workflows/test.yml that spins up an Ubuntu container, installs dependencies, and runs tests.',
          leveragesExistingSkill: 'Banking-Domain Integrity',
          completed: false,
        },
        {
          id: 'step-2-3',
          stepNumber: 3,
          title: 'Automated Artifact Reporting & Slack Alerts',
          estimatedTime: '4 days',
          description: 'Configure HTML test-report uploads and failure notifications to engineering Slack channels.',
          practicalExercise: 'Attach Playwright video traces and error screenshots to failed build logs.',
          leveragesExistingSkill: 'Defect Triage',
          completed: false,
        }
      ]
    }
  ]
};

export const ALTERNATE_PROFILES: CandidateProfile[] = [
  HARPREET_PROFILE,
  {
    id: 'priya-nair',
    name: 'Priya Nair',
    age: 34,
    location: 'Pune, Maharashtra',
    experienceYears: 10,
    currentRole: 'Data Entry & Records Coordinator',
    targetRole: 'Data Quality & Governance Analyst',
    matchScore: 75,
    salaryTrajectory: {
      currentAvg: '₹5.2L / year',
      targetAvg: '₹11.8L / year',
    },
    domainSpecialization: 'Healthcare & Patient Records',
    storyQuote: "Automated OCR scanners took over raw data entry. But nobody knew HIPAA anomalies and error patterns like I did. Second Act helped me pivot from entering records to auditing data integrity.",
    existingSkills: [
      {
        id: 'priya-1',
        name: 'Data Integrity Auditing',
        type: 'existing',
        category: 'Data Governance',
        yearsOfExperience: 10,
        proficiency: 94,
        description: 'Deep eye for record anomalies, missing field dependencies, and standard format compliance across hospital systems.',
        relevanceToTarget: 'Data governance teams need people who intuitively recognize dirty data patterns before ingestion.',
        transferWeight: 0.94,
        iconName: 'ShieldCheck'
      },
      {
        id: 'priya-2',
        name: 'HIPAA & Compliance Standards',
        type: 'existing',
        category: 'Regulatory',
        yearsOfExperience: 8,
        proficiency: 90,
        description: 'Handling protected health information, patient consent rules, and regulatory audit compliance.',
        relevanceToTarget: 'Essential for enterprise data lineage and governance classifications.',
        transferWeight: 0.88,
        iconName: 'FileText'
      },
      {
        id: 'priya-3',
        name: 'Spreadsheet Advanced Modeling',
        type: 'existing',
        category: 'Analysis',
        yearsOfExperience: 10,
        proficiency: 88,
        description: 'VLOOKUP/XLOOKUP, pivot tables, deduplication routines, and conditional validation formulas.',
        relevanceToTarget: 'Direct conceptual precursor to relational database querying and schema checking.',
        transferWeight: 0.85,
        iconName: 'Table'
      },
      {
        id: 'priya-4',
        name: 'Cross-Department Communication',
        type: 'existing',
        category: 'Operations',
        yearsOfExperience: 9,
        proficiency: 85,
        description: 'Coordinating with clinical staff, insurance claims teams, and IT administrators.',
        relevanceToTarget: 'Data stewards must bridge technical pipelines and non-technical stakeholders.',
        transferWeight: 0.82,
        iconName: 'Users'
      }
    ],
    skillGaps: [
      {
        id: 'priya-gap-1',
        name: 'SQL Querying & Joins',
        type: 'gap',
        category: 'Technical Querying',
        proficiency: 20,
        description: 'Writing SELECT, JOIN, GROUP BY, and HAVING statements across relational Postgres tables.',
        relevanceToTarget: 'Replaces spreadsheet lookups with database queries directly on production lakes.',
        transferWeight: 0.90,
        iconName: 'Database'
      },
      {
        id: 'priya-gap-2',
        name: 'Automated Schema Validation',
        type: 'gap',
        category: 'Data Engineering',
        proficiency: 15,
        description: 'Using Great Expectations or dbt tests to automatically check null values, uniqueness, and column distributions.',
        relevanceToTarget: 'Scales manual anomaly checking to millions of daily transaction rows.',
        transferWeight: 0.84,
        iconName: 'CheckCheck'
      }
    ],
    learningModules: [
      {
        id: 'priya-module-sql',
        skillName: 'SQL Querying & Joins',
        whyItMatters: 'Translates Excel lookup intuition directly into ANSI SQL statements.',
        bridgeTimeframe: '3 weeks',
        steps: [
          {
            id: 'p-1',
            stepNumber: 1,
            title: 'Translating Excel VLOOKUP to SQL LEFT JOIN',
            estimatedTime: '4 days',
            description: 'Learn relational join syntax using tables of patient IDs and appointment records.',
            practicalExercise: 'Query patient demographic tables with missing diagnosis codes.',
            leveragesExistingSkill: 'Spreadsheet Advanced Modeling',
            completed: false,
          },
          {
            id: 'p-2',
            stepNumber: 2,
            title: 'Aggregate Filtering with GROUP BY & HAVING',
            estimatedTime: '5 days',
            description: 'Summarize hospital admission rates and filter for compliance thresholds.',
            practicalExercise: 'Find clinics with anomaly cancellation rates exceeding 15%.',
            leveragesExistingSkill: 'Data Integrity Auditing',
            completed: false,
          }
        ]
      },
      {
        id: 'priya-module-validation',
        skillName: 'Automated Schema Validation',
        whyItMatters: 'Empowers Priya to write validation rules that run automatically on incoming patient data streams.',
        bridgeTimeframe: '2 weeks',
        steps: [
          {
            id: 'p-3',
            stepNumber: 1,
            title: 'Declarative Data Quality Rules',
            estimatedTime: '4 days',
            description: 'Define expectation suites: expect_column_values_to_not_be_null, expect_column_to_match_regex.',
            practicalExercise: 'Create a validation suite for patient insurance policy numbers.',
            leveragesExistingSkill: 'HIPAA & Compliance Standards',
            completed: false,
          }
        ]
      }
    ]
  }
];

export const AGENT_STAGES: AgentStage[] = [
  {
    id: 1,
    name: 'Skills Discovery Agent',
    tagline: 'Uncovers latent, unwritten competencies',
    description: 'Bypasses rigid keyword search to extract implicit skills, cross-functional capabilities, and deep domain mastery from natural-language career history.',
    actionOutput: 'Discovered 4 foundational competencies & 14 yrs of verified banking domain depth.',
    humanOversightNote: 'Candidate reviews and validates extracted skills before any matching begins.',
    iconName: 'Compass',
    badge: 'Stage 01'
  },
  {
    id: 2,
    name: 'Market Intelligence Agent',
    tagline: 'Monitors real-time demand trajectories',
    description: 'Tracks shifting hiring velocity across enterprise technology sectors, identifying resilient, growing roles that are immune to short-term displacement cycles.',
    actionOutput: 'Identified 3 adjacent roles with +42% hiring demand growth in fintech.',
    humanOversightNote: 'Candidate filters locations, salary expectations, and working preferences.',
    iconName: 'TrendingUp',
    badge: 'Stage 02'
  },
  {
    id: 3,
    name: 'Adjacency Engine',
    tagline: 'Calculates topological skill overlap',
    description: 'Evaluates graph proximity between candidate experience and target roles. Identifies high-overlap vectors where the transition requires bridging only two or three skills.',
    actionOutput: 'Calculated 72% structural match to QA Automation Engineer; isolated exactly 2 micro-gaps.',
    humanOversightNote: 'Transparent match breakdown shows full scoring criteria and rationale.',
    iconName: 'GitFork',
    badge: 'Stage 03'
  },
  {
    id: 4,
    name: 'Learning Pathway Agent',
    tagline: 'Synthesizes targeted micro-curricula',
    description: 'Rejects 6-month generic bootcamps. Builds laser-focused 3 to 4 week micro-exercises that leverage existing mental models to bridge only the specific delta.',
    actionOutput: 'Generated 2 custom modules grounded in candidate’s existing banking test workflows.',
    humanOversightNote: 'Candidate sets daily learning pace (15–60 mins) and picks practical projects.',
    iconName: 'Sparkles',
    badge: 'Stage 04'
  },
  {
    id: 5,
    name: 'Inclusive Matching Agent',
    tagline: 'Connects ready candidates with opportunities',
    description: 'Presents verified candidate portfolios directly to progressive hiring partners who value institutional domain depth and proven upskilling agility.',
    actionOutput: 'Paired candidate with 5 enterprise partner teams committed to adjacent hiring.',
    humanOversightNote: 'No resume is submitted without candidate’s explicit one-click authorization.',
    iconName: 'Users',
    badge: 'Stage 05'
  },
  {
    id: 6,
    name: 'Bias Audit + Human-in-the-Loop',
    tagline: 'Guarantees algorithmic fairness and agency',
    description: 'Continuous audit layer that eliminates ageist proxies, credential bias, and algorithmic hallucinations. Enforces human oversight at every decision boundary.',
    actionOutput: 'Audit score: 100% compliance with SAP Ethical AI & Inclusive Workforce standards.',
    humanOversightNote: 'Human oversight is not an add-on; candidate retains 100% agency over their trajectory.',
    iconName: 'ShieldCheck',
    badge: 'Stage 06'
  }
];

export const IMPACT_THEMES = [
  {
    theme: 'WORKER',
    headline: 'From “Am I obsolete?” to “I’m two skills from my next role.”',
    subtext: 'Replaces panic and disempowerment with actionable clarity. Workers discover that 14 years of experience is an invaluable foundation, not a sunken cost.',
    stat: '72%',
    statLabel: 'Immediate role adjacency on day one',
    highlight: 'Dignity restored'
  },
  {
    theme: 'EMPLOYER',
    headline: 'Reskill and redeploy; retain institutional knowledge.',
    subtext: 'Hiring from scratch costs 3x more and discards vital institutional memory. Adjacent upskilling retains domain experts who already understand compliance, culture, and systems.',
    stat: '64%',
    statLabel: 'Lower ramp-up time vs external hiring',
    highlight: 'Institutional memory preserved'
  },
  {
    theme: 'ECONOMY',
    headline: 'Turn displacement into a redirect, not a dead end.',
    subtext: 'Prevents structural unemployment caused by sudden generative AI shifts. Instead of permanent workforce shrinkage, economies gain high-velocity tech talent in weeks.',
    stat: '3.8x',
    statLabel: 'Faster career re-entry vs generic retargeting',
    highlight: 'Macroeconomic resilience'
  }
];
