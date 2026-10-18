import { describe, expect, it } from 'vitest';
import { loadNcrDataset } from '../src/ncr/dataset.ts';
import { evaluateExtraction } from '../src/ncr/evaluate.ts';
import { loadEvalSet, loadHeldoutSet, runExtraction, runMentions } from '../src/ncr/evalset.ts';
import { aliasStemCollisions, collectMentions, extractResume, rangeYears, splitClauses } from '../src/ncr/extractor.ts';
import { extractionResultSchema, type ExtractedSkill, type SemanticProvider } from '../src/ncr/schema.ts';
import { DocumentError, detectDocumentType, extractDocumentText } from '../src/ncr/text.ts';

const ds = loadNcrDataset();
const run = (text: string, mode: 'context' | 'baseline' = 'context') =>
  extractResume({ candidate_id: 'c1', resume_id: 'r1', document_type: 'synthetic_text', text }, ds, { mode });
const find = (text: string, skillId: string): ExtractedSkill | undefined => run(text).skills.find((s) => s.skill_id === skillId);

describe('context rules: what a sentence says about a skill', () => {
  it('a skill in a skills list is a self-reported current claim with its stated level', () => {
    const text = 'SKILLS\n- SQL (Basic), Python (Advanced)\n';
    expect(find(text, 'sql-querying')).toMatchObject({ mention_type: 'explicit_current', status: 'self_reported', suggested_level: 1 });
    expect(find(text, 'python-programming')).toMatchObject({ mention_type: 'explicit_current', suggested_level: 3 });
  });

  it('a stated learning goal is never a current skill', () => {
    const s = find('GOALS\n- Learning goal: Intends to learn Bash and PowerShell scripting.\n', 'shell-scripting');
    expect(s).toMatchObject({ mention_type: 'future_goal', status: 'unknown', suggested_level: null });
  });

  it('"no practical experience" does not establish a skill', () => {
    const s = find('SUMMARY\nHas no practical Python coding experience.\n', 'python-programming');
    expect(s).toMatchObject({ mention_type: 'negated_or_no_experience', status: 'unknown' });
  });

  it('a future goal beats a negation in the same sentence', () => {
    const s = find('GOALS\n- Aspiration: to build Selenium suites (no commercial automation experience).\n', 'test-automation');
    expect(s?.mention_type).toBe('future_goal');
  });

  it('coursework is inferred exposure, not a self-reported skill', () => {
    const s = find('EXPERIENCE\n- Completed a Coursera course in Tableau.\n', 'bi-dashboarding');
    expect(s).toMatchObject({ mention_type: 'coursework', status: 'inferred' });
  });

  it('a target role is not a skill claim, but a title before it still is', () => {
    const text = 'PROFILE\nCustomer Service Specialist pivoting to an Enterprise IT Helpdesk role.\n';
    expect(find(text, 'customer-support')?.mention_type).toBe('explicit_current');
    expect(find(text, 'itsm-ticketing')?.mention_type).toBe('future_goal');
  });

  it('employer and place names on a header line are not evidence', () => {
    const text = 'EXPERIENCE\nSales Manager | Salesforce Services Pvt Ltd | Gurugram, HR\nJune 2019 - Present\n';
    expect(find(text, 'crm-platforms')?.mention_type).toBe('ambiguous');
  });

  it('a candidate name that is also a tool name is ignored', () => {
    expect(run('SARAH JENKINS-THORNE\nMinneapolis, MN | s.jenkins@example.test\n\nSKILLS\n- SQL\n').skills.map((s) => s.skill_id)).toEqual(['sql-querying']);
  });

  it('a lapsed credential is ambiguous', () => {
    expect(find('CERTIFICATIONS\n- CAPM, Project Management Institute (lapsed)\n', 'project-management')?.mention_type).toBe('ambiguous');
  });

  it('a "Learning Phase" skills label marks the list as coursework', () => {
    const text = 'SKILLS\nCloud & DevOps (Learning Phase): Docker (Basics), Kubernetes (Conceptual)\n';
    expect(find(text, 'docker-containers')?.mention_type).toBe('coursework');
    expect(find(text, 'kubernetes')?.mention_type).toBe('coursework');
  });

  it('a skill that is both claimed and denied keeps the claim and raises a warning', () => {
    const r = run('SKILLS\n- Python (Intermediate)\n\nGOALS\n- Has not used Python in production.\n');
    expect(r.skills.find((s) => s.skill_id === 'python-programming')?.mention_type).toBe('explicit_current');
    expect(r.warnings).toContain('conflicting_evidence:python-programming');
  });
});

describe('ambiguous abbreviations only match with supporting context', () => {
  it('SWIFT is banking, Swift is a programming language', () => {
    expect(find('SKILLS\n- SWIFT messages (MT103), wire transfers\n', 'banking-payments-domain')).toBeDefined();
    expect(find('SKILLS\nProgramming: Python, Swift, JavaScript\n', 'banking-payments-domain')).toBeUndefined();
  });

  it('"AD" needs directory context', () => {
    expect(find('SKILLS\n- AD user creation and password resets\n', 'active-directory-admin')).toBeDefined();
    expect(find('EXPERIENCE\n- Ran the AD campaign for a retail launch.\n', 'active-directory-admin')).toBeUndefined();
  });

  it('"Go" needs programming context, "go-live" and "Go to" are not the language', () => {
    expect(find('SKILLS\nLanguages: Go, C, Python\n', 'go-programming')).toBeDefined();
    expect(find('EXPERIENCE\n- Managed the go-live for the payments release and Go to market plan.\n', 'go-programming')).toBeUndefined();
  });

  it('"C" needs programming context, a grade does not count', () => {
    expect(find('SKILLS\nLanguages: C, Go, Java\n', 'c-cpp-programming')).toBeDefined();
    expect(find('EDUCATION\n- Passed with grade C in accounting.\n', 'c-cpp-programming')).toBeUndefined();
  });
});

describe('every extracted skill is traceable, reviewable and never verified', () => {
  it('carries evidence from its own resume, a method, and a pending review', () => {
    const text = 'SKILLS\n- Jira, Confluence\n- SQL (Intermediate)\n';
    const r = run(text);
    expect(extractionResultSchema.safeParse(r).success).toBe(true);
    for (const s of r.skills) {
      expect(text).toContain(s.evidence);
      expect(s.review_status).toBe('pending');
      expect(['alias_rule', 'context_alias_rule', 'semantic_candidate']).toContain(s.method);
      expect(['self_reported', 'inferred', 'unknown']).toContain(s.status);
    }
  });

  it('rejects a skill with neither evidence nor a documented reason', () => {
    const bad = { ...run('SKILLS\n- SQL\n') };
    bad.skills = [{ ...bad.skills[0]!, evidence: '', evidence_unavailable_reason: null }];
    expect(extractionResultSchema.safeParse(bad).success).toBe(false);
  });

  it('is deterministic and leaves no state between resumes', () => {
    const a = 'SKILLS\n- Python (Advanced)\n- Docker\n';
    const b = 'SKILLS\n- Tableau (Basic)\n';
    const first = run(a);
    const other = run(b);
    expect(run(a)).toEqual(first);
    expect(run(b)).toEqual(other);
    expect(other.skills.map((s) => s.skill_id)).toEqual(['bi-dashboarding']);
  });

  it('semantic suggestions stay inferred, pending and separate from rule matches', () => {
    const text = 'EXPERIENCE\n- Kept the regional payment queue clear and chased every exception to closure.\n';
    const provider: SemanticProvider = {
      suggest: () => [
        { skill_id: 'reconciliation', similarity: 0.61, evidence: 'Kept the regional payment queue clear and chased every exception to closure.' },
        { skill_id: 'sql-querying', similarity: 0.7, evidence: 'a sentence that is not in this resume' },
      ],
    };
    const r = extractResume({ candidate_id: 'c', resume_id: 'r', document_type: 'synthetic_text', text }, ds, { semantic: provider });
    const s = r.skills.find((x) => x.skill_id === 'reconciliation');
    expect(s).toMatchObject({ method: 'semantic_candidate', status: 'inferred', review_status: 'pending', similarity_score: 0.61, mention_type: 'ambiguous' });
    expect(r.skills.find((x) => x.skill_id === 'sql-querying')).toBeUndefined();
    expect(r.warnings).toContain('semantic_candidate_dropped:sql-querying');
  });

  it('a semantic suggestion never replaces a rule match for the same skill', () => {
    const provider: SemanticProvider = { suggest: () => [{ skill_id: 'sql-querying', similarity: 0.9, evidence: 'SQL' }] };
    const r = extractResume({ candidate_id: 'c', resume_id: 'r', document_type: 'synthetic_text', text: 'SKILLS\n- SQL\n' }, ds, { semantic: provider });
    expect(r.skills.filter((s) => s.skill_id === 'sql-querying')).toHaveLength(1);
    expect(r.skills[0]!.method).toBe('alias_rule');
  });
});

describe('clause splitting', () => {
  it('splits sentences and top-level semicolons but not inside brackets', () => {
    expect(splitClauses('Enrolled in a course; practising syntax (loops; variables). Done.')).toEqual(['Enrolled in a course', 'practising syntax (loops; variables).', 'Done.']);
  });
});

describe('the evaluation set (12 synthetic resumes) and the held-out set (3 unseen resumes)', () => {
  const sets = async () => ({ main: await loadEvalSet(), held: loadHeldoutSet() });

  it('has 12 + 3 independent candidates with unique ids', async () => {
    const { main, held } = await sets();
    expect(main.resumes).toHaveLength(12);
    expect(held.resumes).toHaveLength(3);
    const ids = [...main.resumes, ...held.resumes].map((r) => r.candidate_id);
    expect(new Set(ids).size).toBe(15);
  });

  it('every gold row names a real skill and quotes its resume', async () => {
    const { main, held } = await sets();
    const skills = new Set(ds.skills.map((s) => s.id));
    for (const set of [main, held]) {
      const text = new Map(set.resumes.map((r) => [r.resume_id, r.text.replace(/\s+/g, ' ').toLowerCase()]));
      for (const g of set.gold) {
        expect(skills.has(g.skill_id), `${g.resume_id} ${g.skill_id}`).toBe(true);
        expect(text.get(g.resume_id)!.includes(g.evidence_quote.replace(/\s+/g, ' ').toLowerCase()), `${g.resume_id} ${g.evidence_quote}`).toBe(true);
      }
    }
  });

  it('context rules keep future-goal leakage at zero and every current skill supported', async () => {
    const { main, held } = await sets();
    for (const set of [main, held]) {
      const results = runExtraction(set, ds, { mode: 'context' });
      const report = evaluateExtraction(results, set.resumes, set.gold, ds, { mentions: runMentions(set, ds, 'context') });
      expect(report.future_goal_leakage.num).toBe(0);
      expect(report.negation_leakage.num).toBe(0);
      expect(report.unsupported_skill_rate.num).toBe(0);
      expect(report.candidate_leakage.skills_with_foreign_evidence).toBe(0);
      expect(report.evidence_coverage.value).toBe(1);
      expect(report.precision.value).toBeGreaterThanOrEqual(0.95);
      expect(report.recall.value).toBeGreaterThanOrEqual(0.9);
    }
  });

  it('the context-blind baseline leaks every future goal, which is why context rules exist', async () => {
    const { main } = await sets();
    const results = runExtraction(main, ds, { mode: 'baseline' });
    const report = evaluateExtraction(results, main.resumes, main.gold, ds);
    expect(report.future_goal_leakage.num).toBe(report.future_goal_leakage.den);
    expect(report.future_goal_leakage.den).toBeGreaterThan(10);
  });

  it('extracting all resumes in any order gives the same result for each (no candidate leakage)', async () => {
    const { main } = await sets();
    const forward = runExtraction(main, ds, { mode: 'context' });
    const reversed = runExtraction({ ...main, resumes: [...main.resumes].reverse() }, ds, { mode: 'context' });
    const byId = new Map(reversed.map((r) => [r.resume_id, r]));
    for (const r of forward) expect(byId.get(r.resume_id)).toEqual(r);
    expect(collectMentions(main.resumes[0]!.text, ds).length).toBeGreaterThan(0);
  });
});

describe('document intake', () => {
  const bytes = (s: string) => new TextEncoder().encode(s);

  it('decides the file type from its first bytes, not its name', () => {
    expect(detectDocumentType(bytes('%PDF-1.7 ...'))).toBe('pdf');
    expect(detectDocumentType(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0]))).toBe('docx');
    expect(detectDocumentType(bytes('SKILLS\n- SQL\n'))).toBe('txt');
    expect(detectDocumentType(new Uint8Array([1, 2, 0, 3]))).toBeNull();
  });

  it('reads plain text', async () => {
    const doc = await extractDocumentText(bytes('SKILLS\n- SQL (Basic), Python (Advanced), Excel\n'));
    expect(doc.type).toBe('txt');
    expect(doc.text).toContain('SQL');
  });

  it('rejects empty, binary, oversize and text-less files with a typed error', async () => {
    await expect(extractDocumentText(new Uint8Array())).rejects.toMatchObject({ code: 'no_text' });
    await expect(extractDocumentText(new Uint8Array([1, 2, 0, 3]))).rejects.toMatchObject({ code: 'unsupported' });
    await expect(extractDocumentText(new Uint8Array(5 * 1024 * 1024 + 1).fill(65))).rejects.toMatchObject({ code: 'too_large' });
    await expect(extractDocumentText(bytes('   \n  '))).rejects.toBeInstanceOf(DocumentError);
  });

  it('reads a PDF and keeps its text', async () => {
    const stream = 'BT /F1 12 Tf 72 720 Td (SKILLS) Tj 0 -20 Td (SQL Basic, Python, Excel and Jira dashboards) Tj ET';
    const pdf =
      '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
      '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n' +
      `4 0 obj<</Length ${stream.length}>>stream\n${stream}\nendstream endobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n` +
      'trailer<</Root 1 0 R/Size 6>>\n%%EOF';
    const doc = await extractDocumentText(bytes(pdf));
    expect(doc.type).toBe('pdf');
    expect(doc.text).toMatch(/SKILLS/);
    expect(doc.text).toMatch(/Python/);
  });
});

describe('ncr-rules-0.3: real-world resume shapes', () => {
  it('reads work history pasted without any headings', () => {
    const r = run('I have 4 years of experience in customer support at a BPO in Gurgaon.\nWorked on Zendesk and Freshdesk for ticket handling.\nGood at MS Excel and basic SQL.\n');
    const ids = r.skills.map((s) => s.skill_id);
    expect(ids).toEqual(expect.arrayContaining(['customer-support', 'itsm-ticketing', 'excel-spreadsheets', 'sql-querying']));
    expect(r.skills.find((s) => s.skill_id === 'sql-querying')?.suggested_level).toBe(1);
  });

  it('still ignores the name and headline block at the top', () => {
    const r = run('Priya Jenkins\nCustomer Service Specialist\n\nSKILLS\n- Excel\n');
    expect(r.skills.map((s) => s.skill_id)).toEqual(['excel-spreadsheets']);
  });

  it('treats "Experience:" and "Skills: …" lines as section headings', () => {
    const r = run('Amit\nSkills: ServiceNow, Office 365\nExperience:\nDesktop Support Engineer at Wipro, Noida (2020-2023)\n- Resolved L1 tickets within SLA\n');
    const sla = r.skills.find((s) => s.skill_id === 'sla-management');
    expect(sla?.section).toBe('Experience');
    expect(sla?.mention_type).toBe('explicit_current');
    expect(r.skills.find((s) => s.skill_id === 'endpoint-cloud-admin')?.section).toBe('Skills');
  });

  it('matches word forms, not only the exact alias', () => {
    expect(find('EXPERIENCE\n- Handled customer queries over phone\n', 'customer-support')?.matched_text).toBe('customer queries');
    expect(find('EXPERIENCE\n- Reconciled vendor ledgers every month\n', 'reconciliation')).toBeDefined();
  });

  it('does not stretch an activity alias onto a noun modifier', () => {
    expect(find('EXPERIENCE\n- Wrote user stories and acceptance test conditions for sprints.\n', 'uat')).toBeUndefined();
    expect(find('EXPERIENCE\n- Coordinated user acceptance testing with branches.\n', 'uat')?.mention_type).toBe('explicit_current');
  });

  it('keeps everyday words out: "reacted" is not React, a customer profile is not profiling', () => {
    const r = run('EXPERIENCE\n- Reacted quickly to outages and updated customer profiles.\n');
    expect(r.skills.map((s) => s.skill_id)).not.toEqual(expect.arrayContaining(['javascript-typescript']));
    expect(r.skills.map((s) => s.skill_id)).not.toEqual(expect.arrayContaining(['debugging-profiling']));
  });

  it('knows Indian banking terms', () => {
    expect(find('EXPERIENCE\n- Processed NEFT, RTGS and IMPS payments within cut-off times.\n', 'banking-payments-domain')).toBeDefined();
  });

  it('finds work described with words in between (pattern rules)', () => {
    const s = find('EXPERIENCE\n- Analysed monthly sales data to find slow-moving stock.\n', 'data-analysis');
    expect(s?.method).toBe('pattern_rule');
    expect(s?.mention_type).toBe('explicit_current');
    expect(find('GOALS\n- Want to analyse sales data with Python one day.\n', 'data-analysis')?.mention_type).toBe('future_goal');
  });

  it('suggests a level from tenure and says why', () => {
    const r = run('EXPERIENCE\nOperations Executive | HDFC Bank | Gurugram | Jun 2019 - May 2024\n- Daily reconciliation of nostro accounts\n');
    const rec = r.skills.find((s) => s.skill_id === 'reconciliation')!;
    expect(rec.suggested_level).toBe(3);
    expect(rec.level_basis).toMatch(/about 5 years/);
    const listed = run('SKILLS\n- Jira\n').skills[0]!;
    expect(listed.suggested_level).toBe(2);
    expect(listed.level_basis).toBe('Listed in your resume');
  });

  it('a stated level always wins over tenure', () => {
    const r = run('SKILLS\nSQL (Basic)\nEXPERIENCE\nMIS Executive | Acme | 2015 - 2021\n- Wrote SQL queries for reports\n');
    expect(r.skills.find((s) => s.skill_id === 'sql-querying')?.suggested_level).toBe(1);
  });

  it('detects the pilot role held now and total experience, never as a skill claim', () => {
    const r = run('EXPERIENCE\nCustomer Service Executive | Concentrix | Jan 2016 - Dec 2018\n- Handled inbound calls\nIT Helpdesk Analyst | Wipro | Jan 2019 - Jan 2023\n- Resolved L1 tickets\n');
    expect(r.detected_roles[0]).toMatchObject({ role_id: 'service-desk-analyst', most_recent: true, source: 'job_title' });
    expect(r.detected_roles.map((d) => d.role_id)).toContain('customer-support-specialist');
    expect(r.experience_years).toBe(7.1); // Jan 2016 – Jan 2023, end month inclusive
  });

  it('does not treat a target role in the objective as the current one', () => {
    const r = run('CAREER OBJECTIVE\nSeeking a position as Junior Business Analyst.\nEXPERIENCE\n- Reconciled accounts\n');
    expect(r.detected_roles).toEqual([]);
  });

  it('a goal next to a claim is not a contradiction; a denial is', () => {
    expect(run('EXPERIENCE\n- Used Zendesk daily.\nGOALS\n- Move into a service desk role.\n').warnings).not.toContain('conflicting_evidence:itsm-ticketing');
  });

  it('parses date ranges in the common resume formats', () => {
    const asOf = new Date('2026-10-01T00:00:00Z');
    expect(rangeYears('Jun 2019 - May 2021', asOf)?.years).toBe(2);
    expect(rangeYears('2015 – 2021', asOf)?.years).toBe(6);
    expect(rangeYears('03/2020 to Present', asOf)?.years).toBe(6.6);
    expect(rangeYears('no dates here', asOf)).toBeNull();
  });

  it('keeps the alias taxonomy unambiguous after stemming', () => {
    expect(aliasStemCollisions(ds)).toEqual([]);
  });
});

describe('ncr-rules-0.3: bugs found while generating landing-page examples', () => {
  it('"currently learning X" is coursework, but machine learning stays a skill', () => {
    expect(find('EXPERIENCE\n- Learning Selenium WebDriver with Java.\n', 'test-automation')?.mention_type).toBe('coursework');
    expect(find('SKILLS\n- Currently learning Power BI\n', 'bi-dashboarding')?.mention_type).toBe('coursework');
    expect(find('EXPERIENCE\n- Built machine learning models for churn.\n', 'machine-learning')?.mention_type).toBe('explicit_current');
  });

  it('an employer introduced with "at an …" is not part of the title claim', () => {
    const s = find('EXPERIENCE\nDesktop Support Engineer at an IT services firm, Noida (2020 – 2024)\n', 'desktop-hardware-support');
    expect(s?.mention_type).toBe('explicit_current');
  });

  it('setting up laptops "for new joiners" is not team leadership', () => {
    expect(find('EXPERIENCE\n- Installed and configured Windows and Office 365 for new joiners.\n', 'team-leadership')).toBeUndefined();
    expect(find('EXPERIENCE\n- Trained 4 new joiners on SOPs.\n', 'team-leadership')?.mention_type).toBe('explicit_current');
  });
});
