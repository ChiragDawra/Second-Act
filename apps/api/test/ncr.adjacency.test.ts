import { describe, expect, it } from 'vitest';
import { engineInputs, recommend, type NcrProfileSkill } from '../src/ncr/adjacency.ts';
import { loadNcrDataset, validateNcrDataset } from '../src/ncr/dataset.ts';
import { profileFromReview, ReviewError, reviewRequestSchema } from '../src/ncr/review.ts';

const ds = loadNcrDataset();
const skill = (skill_id: string, proficiency: number, status: NcrProfileSkill['status'] = 'self_reported'): NcrProfileSkill => ({ skill_id, status, proficiency });

/** A manual QA tester from a bank: strong testing, basic SQL, nothing on automation. */
const qaProfile = (status: NcrProfileSkill['status'] = 'self_reported'): NcrProfileSkill[] => [
  skill('manual-testing', 3, status),
  skill('test-case-design', 3, status),
  skill('functional-testing', 3, status),
  skill('regression-testing', 3, status),
  skill('defect-management', 3, status),
  skill('test-documentation', 3, status),
  skill('sql-querying', 2, status),
  skill('work-tracking-tools', 2, status),
  skill('banking-payments-domain', 3, status),
];

describe('Delhi-NCR dataset v1', () => {
  it('is internally consistent', () => {
    expect(validateNcrDataset(ds)).toEqual([]);
  });

  it('covers the four pilot role families with a documented rationale on every requirement', () => {
    expect(ds.roles.length).toBeGreaterThanOrEqual(16);
    const families = new Set(engineInputs(ds).roles.map((r) => r.id.split('-')[0]));
    expect(families.size).toBeGreaterThan(3);
    for (const id of ['manual-qa-tester', 'qa-analyst', 'uat-analyst', 'api-tester', 'junior-test-automation-engineer', 'banking-operations-associate', 'process-analyst', 'junior-business-analyst', 'customer-support-specialist', 'service-desk-analyst', 'it-support-technician', 'junior-application-support-analyst', 'operations-analyst', 'reporting-analyst', 'junior-data-analyst', 'mis-executive']) {
      expect(ds.roles.some((r) => r.id === id), id).toBe(true);
    }
    expect(ds.roleSkills.every((r) => r.evidence_rationale.length > 20)).toBe(true);
  });

  it('marks everything unreviewed and does not claim imported taxonomy identifiers', () => {
    expect(ds.roleSkills.every((r) => r.reviewer_status === 'draft_unreviewed')).toBe(true);
    expect(ds.roles.every((r) => r.review_status === 'draft_pending_human_review' && r.occupation_code === '')).toBe(true);
    expect(ds.transitions.every((t) => t.reviewer_status === 'hypothesis_unreviewed')).toBe(true);
  });

  it('keeps simulated listings distinguishable from live ones', () => {
    expect(ds.evidence.length).toBeGreaterThan(20);
    for (const e of ds.evidence) {
      expect(e.synthetic).toBe(true);
      expect(e.listing_status).toBe('simulated');
      expect(e.collected_at).toBeTruthy();
      expect(e.source_url).toBe('');
      expect(['Delhi', 'Gurugram', 'Noida', 'Ghaziabad', 'Faridabad']).toContain(e.city);
    }
  });

  it('rejects a broken dataset', () => {
    const broken = structuredClone(ds);
    broken.roleSkills[0]!.skill_id = 'does-not-exist';
    broken.roleSkills[1]!.importance_weight = -1;
    broken.evidence[0]!.listing_status = 'current';
    const problems = validateNcrDataset(broken).join('\n');
    expect(problems).toMatch(/unknown skill does-not-exist/);
    expect(problems).toMatch(/weight must be an integer 1-5/);
    expect(problems).toMatch(/synthetic but not marked simulated/);
  });

  it('keeps mandatory requirements rare, at most two per role', () => {
    for (const r of ds.roles) expect(ds.roleSkills.filter((x) => x.role_id === r.id && x.is_mandatory).length).toBeLessThanOrEqual(2);
  });
});

describe('Delhi-NCR recommendations', () => {
  it('returns at most three roles, ranked, with a labelled estimated-fit score', () => {
    const r = recommend(ds, qaProfile());
    expect(r.top_roles.length).toBeGreaterThan(0);
    expect(r.top_roles.length).toBeLessThanOrEqual(3);
    expect(r.top_roles[0]!.role_id).toMatch(/qa|test|uat/);
    for (const role of r.top_roles) {
      expect(role.score_type).toBe('estimated_skill_fit_not_hiring_probability');
      expect(role.explanation.length).toBeGreaterThan(0);
    }
    const fits = r.top_roles.map((x) => x.estimated_skill_fit!);
    expect([...fits].sort((a, b) => b - a)).toEqual(fits);
  });

  it('is identical for the same profile, dataset version and scoring version', () => {
    const a = recommend(ds, qaProfile());
    const b = recommend(ds, [...qaProfile()].reverse());
    expect(b).toEqual(a);
    expect(a.dataset_version).toBe('ncr-roles-v1');
    expect(a.scoring_version).toBe('fit-v1');
  });

  it('changes its input hash when a skill changes', () => {
    const a = recommend(ds, qaProfile());
    const b = recommend(ds, [...qaProfile(), skill('python-programming', 2)]);
    expect(b.input_hash).not.toBe(a.input_hash);
  });

  it('weights evidence: verified beats self-reported beats inferred for the same levels', () => {
    const fit = (status: NcrProfileSkill['status']) => recommend(ds, qaProfile(status), {}).top_roles.concat(recommend(ds, qaProfile(status)).stretch_roles).find((x) => x.role_id === 'manual-qa-tester')?.estimated_skill_fit ?? 0;
    expect(fit('verified')).toBeGreaterThan(fit('self_reported'));
    expect(fit('self_reported')).toBeGreaterThan(fit('inferred'));
  });

  it('keeps a mandatory blocker outside the score: high fit, but not a recommended role', () => {
    // Automation is mandatory at level 2. At level 1 the role is blocked however well the rest matches.
    const profile = [
      skill('test-automation', 1),
      skill('python-programming', 3),
      skill('test-case-design', 4),
      skill('git-version-control', 3),
      skill('ci-cd-pipelines', 3),
      skill('regression-testing', 4),
      skill('api-testing', 3),
      skill('sql-querying', 3),
      skill('defect-management', 4),
      skill('functional-testing', 4),
    ];
    const r = recommend(ds, profile);
    const role = [...r.top_roles, ...r.stretch_roles].find((x) => x.role_id === 'junior-test-automation-engineer')!;
    expect(role).toBeDefined();
    expect(r.top_roles.some((x) => x.role_id === 'junior-test-automation-engineer')).toBe(false);
    expect(role.mandatory_blockers.map((m) => m.gate)).toContain('blocker');
    expect(role.estimated_skill_fit!).toBeGreaterThan(60);
  });

  it('applies hard constraints before ranking and keeps the reason', () => {
    const r = recommend(ds, qaProfile(), { work_modes: ['remote'] });
    expect(r.top_roles).toEqual([]);
    expect(r.excluded_roles.length).toBe(ds.roles.length);
    expect(r.excluded_roles[0]!.constraint_exclusion).toMatch(/remote|work mode/i);
    expect(r.message).toMatch(/preferences exclude/i);

    const mumbai = recommend(ds, qaProfile(), { cities: ['Mumbai'] });
    expect(mumbai.top_roles).toEqual([]);
    expect(mumbai.excluded_roles[0]!.constraint_exclusion).toMatch(/none match your locations/);

    const noida = recommend(ds, qaProfile(), { cities: ['Noida'] });
    expect(noida.top_roles.length).toBeGreaterThan(0);
  });

  it('says so instead of inventing a match when nothing is evidenced', () => {
    const empty = recommend(ds, []);
    expect(empty.top_roles).toEqual([]);
    expect(empty.message).toMatch(/No role in the Delhi-NCR pilot dataset/);

    const oneSkill = recommend(ds, [skill('git-version-control', 2)]);
    expect(oneSkill.top_roles).toEqual([]);
  });

  it('reports unknown requirements as unknown, not as gaps', () => {
    const r = recommend(ds, qaProfile());
    const role = r.top_roles.find((x) => x.role_id === 'manual-qa-tester')!;
    expect(role).toBeDefined();
    const unknownIds = new Set(r.top_roles.flatMap((x) => x.unknown_requirements.map((u) => u.skill_id)));
    expect(unknownIds.size).toBeGreaterThan(0);
    for (const x of r.top_roles) {
      const gaps = new Set(x.critical_gaps.map((g) => g.skill_id));
      for (const u of x.unknown_requirements) expect(gaps.has(u.skill_id)).toBe(false);
    }
  });

  it('keeps role fit, evidence confidence, readiness, demand and vacancies as separate records', () => {
    const role = recommend(ds, qaProfile()).top_roles[0]!;
    expect(typeof role.estimated_skill_fit).toBe('number');
    expect(typeof role.evidence_confidence).toBe('number');
    expect(role.readiness_status).toMatch(/ready|needs_validation|blocked/);
    expect(role.demand_signal.kind).toBe('simulated_sample');
    expect(role.demand_signal.note).toMatch(/not market demand/i);
    expect(role.vacancies).toMatchObject({ status: 'none_connected', items: [] });
    expect(role.requirement_source.reviewer_status).toBe('draft_unreviewed');
    expect(role.requirement_source.freshness_note).toMatch(/not yet reviewed/);
    expect(role.requirement_source.dataset_collected_at).toBe('2026-10-18');
  });

  it('shows resume evidence next to each matching skill', () => {
    const profile = qaProfile().map((s) => (s.skill_id === 'manual-testing' ? { ...s, evidence: 'Expert in manual test execution' } : s));
    const role = recommend(ds, profile).top_roles.find((x) => x.role_id === 'manual-qa-tester')!;
    expect(role.matching_skills.find((m) => m.skill_id === 'manual-testing')?.evidence).toBe('Expert in manual test execution');
  });

  it('states its limits', () => {
    const r = recommend(ds, qaProfile());
    expect(r.limitations.join(' ')).toMatch(/not yet reviewed/);
    expect(r.limitations.join(' ')).toMatch(/simulated/i);
    expect(r.limitations.join(' ')).toMatch(/not hiring probability/i);
  });
});

describe('worker review step', () => {
  it('turns accepted suggestions into self-reported skills, never verified', () => {
    const profile = profileFromReview(ds, [
      { skill_id: 'sql-querying', level: 2, mention_type: 'explicit_current', evidence: 'SQL' },
      { skill_id: 'bi-dashboarding', level: 1, mention_type: 'coursework' },
    ]);
    expect(profile.map((p) => p.status)).toEqual(['self_reported', 'self_reported']);
  });

  it('refuses to turn a future goal or a stated lack of experience into a current skill', () => {
    expect(() => profileFromReview(ds, [{ skill_id: 'python-programming', level: 2, mention_type: 'future_goal' }])).toThrow(ReviewError);
    expect(() => profileFromReview(ds, [{ skill_id: 'python-programming', level: 2, mention_type: 'negated_or_no_experience' }])).toThrow(/future goal/);
  });

  it('refuses unknown and duplicate skills', () => {
    expect(() => profileFromReview(ds, [{ skill_id: 'made-up-skill', level: 2, mention_type: 'explicit_current' }])).toThrow(/Unknown skill/);
    expect(() =>
      profileFromReview(ds, [
        { skill_id: 'sql-querying', level: 2, mention_type: 'explicit_current' },
        { skill_id: 'sql-querying', level: 3, mention_type: 'explicit_current' },
      ]),
    ).toThrow(/twice/);
  });

  it('validates the request shape', () => {
    expect(reviewRequestSchema.safeParse({ skills: [{ skill_id: 'sql-querying', level: 5, mention_type: 'explicit_current' }] }).success).toBe(false);
    expect(reviewRequestSchema.safeParse({ skills: [], preferences: { status: 'verified' } }).success).toBe(false);
    expect(reviewRequestSchema.safeParse({ skills: [{ skill_id: 'sql-querying', level: 2, mention_type: 'explicit_current', status: 'verified' }] }).success).toBe(true);
  });
});
