import { Router, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import type { Queryable } from '../db/types.ts';
import { AnswerValidationError, gradeAssessment, skillStateAfterAssessment, type AssessmentItem } from '../engine/assessment.ts';
import { matchMentors, type MentorCandidate } from '../engine/mentors.ts';
import type { RoleEvaluation, WorkerPreferences } from '../engine/types.ts';
import { CONSENT_VERSION, EXTRACTION_VERSION, SHAREABLE_FIELD_LABELS, SHAREABLE_FIELDS, type SkillStatus } from '../engine/vocabulary.ts';
import { actorOf, type Actor, type Deps } from '../http/context.ts';
import { ApiError, badRequest, conflict, forbidden, notFound } from '../http/errors.ts';
import { deny, requireOwnProfile } from '../http/guards.ts';
import { recordAudit } from '../services/audit.ts';
import { latestRun, recompute, type StoredRun } from '../services/recommendations.ts';
import { insertExtractedSkills } from '../services/skills.ts';
import { toDbId } from '../ncr/catalogue.ts';
import { getNcrDataset } from '../ncr/dataset.ts';
import { profileFromReview, ReviewError, reviewDecisionSchema } from '../ncr/review.ts';
import { EXTRACTOR_VERSION } from '../ncr/schema.ts';
import { recommendationView, roleChanges } from './views.ts';
import { learningPlan } from '../engine/plan.ts';

const uuid = z.uuid();
const slug = z.string().regex(/^[a-z0-9-]{1,80}$/);
const shareFields = z.array(z.enum(SHAREABLE_FIELDS)).min(1).max(SHAREABLE_FIELDS.length);

/** Per-user limiter for state-changing endpoints (keyed after authentication). */
export function userLimiter(limit: number) {
  return rateLimit({
    windowMs: 60_000,
    limit,
    keyGenerator: (_req, res) =>
      (res.locals.actor as Actor | undefined)?.userId ?? (res.locals.identity as { userId?: string } | undefined)?.userId ?? 'anonymous',
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new ApiError(429, 'rate_limited', 'Too many requests. Wait a minute and try again.')),
  });
}

/** Explicit approval must be a literal `true`; anything else is refused before validation of the rest. */
function requireConsent(body: unknown) {
  const consent = (body as { consent?: { approved?: unknown; statement_version?: unknown } } | null)?.consent;
  if (consent?.approved !== true) {
    throw badRequest('consent_required', 'Explicit approval is required before any information is shared.');
  }
  if (consent.statement_version !== CONSENT_VERSION) {
    throw badRequest('consent_version_mismatch', `Consent statement version must be ${CONSENT_VERSION}.`);
  }
}

const labelList = (fields: readonly string[]) =>
  fields.map((f) => SHAREABLE_FIELD_LABELS[f as keyof typeof SHAREABLE_FIELD_LABELS] ?? f).join('; ');

async function evaluationFor(q: Queryable, profileId: string, roleId: string): Promise<{ run: StoredRun | null; evaluation: RoleEvaluation | null }> {
  const run = await latestRun(q, profileId);
  return { run, evaluation: run?.result.evaluations.find((e) => e.role_id === roleId) ?? null };
}

/** Gap areas a mentor could help with: gaps, unknowns and unverified mandatory requirements. */
function gapSkillIds(e: RoleEvaluation): string[] {
  return [
    ...new Set([
      ...e.critical_gaps.map((g) => g.skill_id),
      ...e.unknowns.map((g) => g.skill_id),
      ...e.mandatory.filter((m) => m.gate !== 'cleared').map((m) => m.skill_id),
    ]),
  ].sort();
}

export function workerRoutes({ db }: Deps): Router {
  const r = Router();
  const writeLimiter = userLimiter(60);
  const assessmentLimiter = userLimiter(10);

  const recomputeFor = (actor: Actor, profileId: string, trigger: string, res: Response) =>
    recompute(db, { actorUserId: actor.userId, actorRole: actor.role, profileId, trigger, requestId: res.locals.requestId as string });

  /** The recommendation view, annotated with the worker's current role (never shown as a "next" role). */
  const viewOf = async (actor: Actor, profileId: string, run: StoredRun) => {
    const p = await db.asUser(actor.userId, (q) =>
      q.query<{ current_role_title: string | null }>('select current_role_title from public.profiles where id = $1', [profileId]),
    );
    return recommendationView(run, { currentRoleTitle: p.rows[0]?.current_role_title ?? null });
  };

  // ---------------------------------------------------------------- profile
  r.get('/profiles/:id', async (req, res) => {
    const id = uuid.parse(req.params.id);
    const actor = await requireOwnProfile(db, res, id);
    const rows = await db.asUser(actor.userId, (q) =>
      q.query(
        `select id, display_name, headline, current_role_title, experience_summary, preferences, consent_version, is_synthetic, updated_at,
                catalogue, sector
         from public.profiles where id = $1`,
        [id],
      ),
    );
    if (!rows.rows[0]) throw forbidden();
    res.json({ profile: rows.rows[0] });
  });

  // ----------------------------------------------------------------- skills
  r.get('/profiles/:id/skills', async (req, res) => {
    const id = uuid.parse(req.params.id);
    const actor = await requireOwnProfile(db, res, id);
    const rows = await db.asUser(actor.userId, (q) =>
      q.query(
        `select ws.skill_id, s.canonical_name as name, s.category, s.description, ws.status, ws.proficiency,
                ws.evidence_snippet, ws.evidence_source_type, ws.confidence, ws.confidence_method, ws.review_state, ws.updated_at,
                case when ar.id is null then null else jsonb_build_object(
                  'result_id', ar.id, 'assessment_id', ar.assessment_id, 'score', ar.score,
                  'max_score', ar.max_score, 'created_at', ar.created_at) end as verified_by
         from public.worker_skills ws
         join public.skills s on s.id = ws.skill_id
         left join public.assessment_results ar on ar.id = ws.verified_by_result_id
         where ws.profile_id = $1
         order by case ws.review_state when 'pending' then 0 else 1 end, s.canonical_name`,
        [id],
      ),
    );
    res.json({ extraction_version: EXTRACTION_VERSION, skills: rows.rows });
  });

  const SkillUpdates = z.object({
    updates: z
      .array(
        z.object({
          skill_id: slug,
          action: z.enum(['confirm', 'edit', 'reject']),
          proficiency: z.number().int().min(0).max(4).optional(),
        }),
      )
      .min(1)
      .max(30),
  });

  r.patch('/profiles/:id/skills', writeLimiter, async (req, res) => {
    const id = uuid.parse(req.params.id);
    const actor = await requireOwnProfile(db, res, id);
    const { updates } = SkillUpdates.parse(req.body);
    if (new Set(updates.map((u) => u.skill_id)).size !== updates.length) {
      throw badRequest('duplicate_skill', 'Each skill may appear only once per request.');
    }

    const applied = await db.asService(async (q) => {
      const known = await q.query<{ id: string }>(
        'select s.id from public.skills s join public.profiles p on p.catalogue = s.catalogue where p.id = $2 and s.id = any($1::text[])',
        [updates.map((u) => u.skill_id), id],
      );
      const knownIds = new Set(known.rows.map((k) => k.id));
      const current = await q.query<{ skill_id: string; status: SkillStatus; proficiency: number | null; evidence_snippet: string | null }>(
        'select skill_id, status, proficiency, evidence_snippet from public.worker_skills where profile_id = $1 and skill_id = any($2::text[]) for update',
        [id, updates.map((u) => u.skill_id)],
      );
      const byId = new Map(current.rows.map((c) => [c.skill_id, c]));

      // Validate everything before writing anything.
      for (const u of updates) {
        if (!knownIds.has(u.skill_id)) throw badRequest('unknown_skill', `Skill ${u.skill_id} is not in the catalogue.`);
        const c = byId.get(u.skill_id);
        if (c && (c.status === 'verified' || c.status === 'not_demonstrated')) {
          throw conflict('skill_locked', 'Assessed skills can only change through a new assessment attempt.');
        }
        if (u.action === 'edit' && u.proficiency === undefined) throw badRequest('proficiency_required', 'Editing a skill requires a proficiency level (0–4).');
        if (u.action !== 'edit' && !c) throw notFound(`No claim recorded for ${u.skill_id}.`);
      }

      const changes: Array<{ skill_id: string; action: string; from_status: string | null; to_status: string; from_level: number | null; to_level: number | null }> = [];
      for (const u of updates) {
        const c = byId.get(u.skill_id);
        let toStatus: SkillStatus;
        let toLevel: number | null;
        let reviewState: string;
        if (u.action === 'confirm') {
          if (c!.status !== 'inferred') continue;
          [toStatus, toLevel, reviewState] = ['self_reported', c!.proficiency, 'confirmed'];
        } else if (u.action === 'reject') {
          if (c!.status === 'unknown') continue;
          [toStatus, toLevel, reviewState] = ['unknown', null, 'rejected'];
        } else {
          [toStatus, toLevel, reviewState] = ['self_reported', u.proficiency!, 'edited'];
        }

        if (c) {
          await q.query(
            `update public.worker_skills set status = $3, proficiency = $4, review_state = $5,
               evidence_source_type = case when evidence_snippet is null then 'user_confirmation' else evidence_source_type end,
               updated_at = now()
             where profile_id = $1 and skill_id = $2`,
            [id, u.skill_id, toStatus, toLevel, reviewState],
          );
        } else {
          await q.query(
            `insert into public.worker_skills (profile_id, skill_id, status, proficiency, evidence_source_type, review_state)
             values ($1, $2, $3, $4, 'user_confirmation', $5)`,
            [id, u.skill_id, toStatus, toLevel, reviewState],
          );
        }
        const change = { skill_id: u.skill_id, action: u.action, from_status: c?.status ?? null, to_status: toStatus, from_level: c?.proficiency ?? null, to_level: toLevel };
        changes.push(change);
        await recordAudit(q, {
          actorUserId: actor.userId, actorRole: actor.role, action: 'skill.reviewed', objectType: 'worker_skill',
          objectId: u.skill_id, subjectProfileId: id, requestId: res.locals.requestId as string, metadata: change,
        });
      }
      return changes;
    });

    const run = await recomputeFor(actor, id, 'skills_reviewed', res);
    res.json({ applied, recommendations: await viewOf(actor, id, run) });
  });

  r.post('/profiles/:id/skills/extract', writeLimiter, async (req, res) => {
    const id = uuid.parse(req.params.id);
    const actor = await requireOwnProfile(db, res, id);
    const out = await db.asService(async (q) => {
      const result = await insertExtractedSkills(q, id);
      await recordAudit(q, {
        actorUserId: actor.userId, actorRole: actor.role, action: 'skills.extracted', objectType: 'profile', objectId: id,
        subjectProfileId: id, requestId: res.locals.requestId as string,
        metadata: { candidates: result.candidates.length, inserted: result.inserted.length, method: EXTRACTION_VERSION },
      });
      return result;
    });
    const run = await recomputeFor(actor, id, 'skills_extracted', res);
    res.json({ candidates: out.candidates.length, inserted: out.inserted, recommendations: await viewOf(actor, id, run) });
  });

  // ---------------------------------------------------- resume import (NCR)
  // Saves the skills the worker accepted in the resume review. Each becomes self_reported (the
  // worker's own claim) with the resume sentence as evidence. Future goals and "no experience"
  // statements are refused. Assessed skills are never overwritten.
  r.post('/profiles/:id/skills/import', writeLimiter, async (req, res) => {
    const id = uuid.parse(req.params.id);
    const actor = await requireOwnProfile(db, res, id);
    const { skills, current_role_id } = z
      .object({ skills: z.array(reviewDecisionSchema).min(1).max(80), current_role_id: z.string().regex(/^[a-z0-9-]{1,80}$/).nullable().optional() })
      .parse(req.body);
    const ds = getNcrDataset();
    // The job the worker confirmed they hold now (detected from the resume). Stored as a title only.
    const currentTitle = current_role_id ? (ds.roles.find((x) => x.id === current_role_id)?.title ?? null) : null;
    if (current_role_id && !currentTitle) throw badRequest('unknown_role', `Unknown role: ${current_role_id}`);
    let accepted;
    try {
      accepted = profileFromReview(ds, skills);
    } catch (err) {
      if (err instanceof ReviewError) throw new ApiError(422, err.code, err.message);
      throw err;
    }

    const imported = await db.asService(async (q) => {
      const p = await q.query<{ catalogue: string }>('select catalogue from public.profiles where id = $1', [id]);
      if (p.rows[0]?.catalogue !== 'ncr') throw conflict('wrong_catalogue', 'Resume import is available for Delhi-NCR profiles only.');
      const written: string[] = [];
      for (const s of accepted) {
        const evidence = s.evidence ? s.evidence.slice(0, 400) : null;
        const row = await q.query<{ skill_id: string }>(
          `insert into public.worker_skills
             (profile_id, skill_id, status, proficiency, evidence_snippet, evidence_source_type, confidence, confidence_method, review_state)
           values ($1, $2, 'self_reported', $3, $4, $5, null, $6, 'confirmed')
           on conflict (profile_id, skill_id) do update set status = 'self_reported', proficiency = excluded.proficiency,
             evidence_snippet = coalesce(excluded.evidence_snippet, public.worker_skills.evidence_snippet),
             evidence_source_type = excluded.evidence_source_type, confidence_method = excluded.confidence_method,
             review_state = 'confirmed', updated_at = now()
           where public.worker_skills.status not in ('verified', 'not_demonstrated')
           returning skill_id`,
          [id, toDbId(s.skill_id), s.proficiency, evidence, evidence ? 'work_history_text' : 'user_confirmation', `${EXTRACTOR_VERSION}+worker_review`],
        );
        if (row.rows[0]) written.push(row.rows[0].skill_id);
      }
      if (currentTitle) {
        await q.query('update public.profiles set current_role_title = $2, updated_at = now() where id = $1', [id, currentTitle]);
      }
      await recordAudit(q, {
        actorUserId: actor.userId, actorRole: actor.role, action: 'skills.imported', objectType: 'profile', objectId: id,
        subjectProfileId: id, requestId: res.locals.requestId as string,
        metadata: { accepted: accepted.length, written: written.length, method: EXTRACTOR_VERSION },
      });
      return written;
    });
    const run = await recomputeFor(actor, id, 'resume_imported', res);
    res.json({ imported, recommendations: await viewOf(actor, id, run) });
  });

  const Preferences = z
    .object({
      headline: z.string().trim().min(2).max(120).optional(),
      locations: z.array(z.string().trim().min(2).max(40)).max(5).optional(),
      work_modes: z.array(z.enum(['remote', 'hybrid', 'onsite'])).max(3).optional(),
      weekly_learning_hours: z.number().int().min(1).max(60).nullable().optional(),
      max_transition_weeks: z.number().int().min(1).max(260).nullable().optional(),
      languages: z.array(z.string().trim().min(2).max(30)).max(5).optional(),
    })
    .strict();

  r.patch('/profiles/:id/preferences', writeLimiter, async (req, res) => {
    const id = uuid.parse(req.params.id);
    const actor = await requireOwnProfile(db, res, id);
    const { headline, ...prefs } = Preferences.parse(req.body);
    await db.asService(async (q) => {
      await q.query(
        'update public.profiles set preferences = preferences || $2::jsonb, headline = coalesce($3, headline), updated_at = now() where id = $1',
        [id, JSON.stringify(prefs), headline ?? null],
      );
      await recordAudit(q, {
        actorUserId: actor.userId, actorRole: actor.role, action: 'preferences.updated', objectType: 'profile', objectId: id,
        subjectProfileId: id, requestId: res.locals.requestId as string, metadata: { keys: Object.keys(prefs) },
      });
    });
    const run = await recomputeFor(actor, id, 'preferences_updated', res);
    res.json({ recommendations: await viewOf(actor, id, run) });
  });

  // -------------------------------------------------------- recommendations
  r.post('/recommendations/roles', writeLimiter, async (req, res) => {
    const { profile_id } = z.object({ profile_id: uuid }).parse(req.body);
    const actor = await requireOwnProfile(db, res, profile_id);
    const run = await recomputeFor(actor, profile_id, 'manual_recompute', res);
    res.json(await viewOf(actor, profile_id, run));
  });

  r.get('/recommendations/latest', async (req, res) => {
    const profileId = uuid.parse(req.query.profile_id);
    const actor = await requireOwnProfile(db, res, profileId);
    let run = await db.asUser(actor.userId, (q) => latestRun(q, profileId));
    if (!run) run = await recomputeFor(actor, profileId, 'first_view', res);
    res.json(await viewOf(actor, profileId, run));
  });

  r.get('/roles/:id/gaps', async (req, res) => {
    const roleId = slug.parse(req.params.id);
    const profileId = uuid.parse(req.query.profile_id);
    const actor = await requireOwnProfile(db, res, profileId);
    const data = await db.asUser(actor.userId, async (q) => {
      const { run, evaluation } = await evaluationFor(q, profileId, roleId);
      if (!evaluation) return null;
      const skillIds = [...new Set([...gapSkillIds(evaluation), ...evaluation.mandatory.map((m) => m.skill_id)])];
      const resources = await q.query(
        `select id, skill_id, title, provider, url, format, cost_band, checked_at, verified
         from public.learning_resources where skill_id = any($1::text[]) order by title`,
        [skillIds],
      );
      const assessments = await q.query(
        `select a.id, a.skill_id, s.canonical_name as skill_name, a.title, a.level_on_pass, a.time_estimate_minutes, a.is_demo
         from public.assessments a join public.skills s on s.id = a.skill_id where a.skill_id = any($1::text[])`,
        [skillIds],
      );
      const prefs = await q.query<{ weekly: number | string | null }>(
        "select preferences->>'weekly_learning_hours' as weekly from public.profiles where id = $1",
        [profileId],
      );
      const weekly = prefs.rows[0]?.weekly == null ? null : Number(prefs.rows[0].weekly);
      return { run, evaluation, resources: resources.rows, assessments: assessments.rows, weekly };
    });
    if (!data) throw notFound('No evaluation for this role yet.');

    // Next best action: prove a mandatory requirement that has an assessment, else learn the largest gap.
    const assessable = new Set((data.assessments as Array<{ skill_id: string }>).map((a) => a.skill_id));
    const proveTarget = data.evaluation.mandatory.find((m) => m.gate !== 'cleared' && assessable.has(m.skill_id));
    const learnTarget = data.evaluation.critical_gaps[0] ?? data.evaluation.unknowns[0] ?? null;
    res.json({
      computed_at: data.run?.created_at,
      scoring_version: data.run?.result.scoring_version,
      evaluation: data.evaluation,
      learning_plan: learningPlan(data.evaluation, Number.isFinite(data.weekly) ? data.weekly : null),
      learning_resources: data.resources,
      assessments: data.assessments,
      next_action: proveTarget
        ? { kind: 'prove', skill_id: proveTarget.skill_id, name: proveTarget.name, reason: proveTarget.reason }
        : learnTarget
          ? { kind: 'learn', skill_id: learnTarget.skill_id, name: learnTarget.name, reason: `Largest remaining gap for ${data.evaluation.title}.` }
          : null,
    });
  });

  // ------------------------------------------------------------- assessment
  const Answers = z.object({
    profile_id: uuid,
    answers: z.record(z.string().regex(/^q\d{1,2}$/), z.string().regex(/^[a-z]$/)),
  });

  r.post('/assessments/:id/results', assessmentLimiter, async (req, res) => {
    const assessmentId = slug.parse(req.params.id);
    const body = Answers.parse(req.body);
    const actor = await requireOwnProfile(db, res, body.profile_id);
    const profileId = body.profile_id;

    const { assessment, before } = await db.asUser(actor.userId, async (q) => {
      const a = await q.query<{ id: string; skill_id: string; title: string; items: AssessmentItem[]; pass_threshold: number; level_on_pass: number }>(
        'select id, skill_id, title, items, pass_threshold, level_on_pass from public.assessments where id = $1',
        [assessmentId],
      );
      return { assessment: a.rows[0], before: await latestRun(q, profileId) };
    });
    if (!assessment) throw notFound('Assessment not found.');

    const outcome = await db.asService(async (q) => {
      const key = await q.query<{ answer_key: Record<string, string> }>('select answer_key from public.assessment_keys where assessment_id = $1', [assessmentId]);
      let grade;
      try {
        grade = gradeAssessment(assessment.items, key.rows[0]!.answer_key, body.answers, Number(assessment.pass_threshold));
      } catch (e) {
        if (e instanceof AnswerValidationError) throw badRequest('invalid_answers', e.message);
        throw e;
      }

      const cur = await q.query<{ status: SkillStatus; proficiency: number | null; verified_by_result_id: string | null }>(
        'select status, proficiency, verified_by_result_id from public.worker_skills where profile_id = $1 and skill_id = $2 for update',
        [profileId, assessment.skill_id],
      );
      const row = cur.rows[0];
      const prior = { status: row?.status ?? ('unknown' as SkillStatus), proficiency: row?.proficiency ?? null };
      const next = skillStateAfterAssessment(prior, grade.passed, Number(assessment.level_on_pass));

      const inserted = await q.query<{ id: string; created_at: Date | string }>(
        `insert into public.assessment_results
           (profile_id, assessment_id, skill_id, score, max_score, passed, item_results, status_before, level_before, status_after, level_after)
         values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11) returning id, created_at`,
        [profileId, assessmentId, assessment.skill_id, grade.score, grade.max_score, grade.passed, JSON.stringify(grade.item_results),
          prior.status, prior.proficiency, next.status, next.proficiency],
      );
      const result = inserted.rows[0]!;
      const changed = next.status !== prior.status || next.proficiency !== prior.proficiency || grade.passed;

      if (changed) {
        const verifiedBy = grade.passed ? result.id : null;
        if (row) {
          await q.query(
            `update public.worker_skills set status = $3, proficiency = $4, evidence_source_type = 'assessment',
               review_state = 'assessed', verified_by_result_id = $5, updated_at = now()
             where profile_id = $1 and skill_id = $2`,
            [profileId, assessment.skill_id, next.status, next.proficiency, verifiedBy],
          );
        } else {
          await q.query(
            `insert into public.worker_skills (profile_id, skill_id, status, proficiency, evidence_source_type, review_state, verified_by_result_id)
             values ($1, $2, $3, $4, 'assessment', 'assessed', $5)`,
            [profileId, assessment.skill_id, next.status, next.proficiency, verifiedBy],
          );
        }
      }

      const requestId = res.locals.requestId as string;
      await recordAudit(q, {
        actorUserId: actor.userId, actorRole: actor.role, action: 'assessment.submitted', objectType: 'assessment_result',
        objectId: result.id, subjectProfileId: profileId, requestId,
        metadata: { assessment_id: assessmentId, skill_id: assessment.skill_id, score: grade.score, max_score: grade.max_score, passed: grade.passed },
      });
      if (changed) {
        await recordAudit(q, {
          actorUserId: actor.userId, actorRole: actor.role, action: 'skill.status_changed', objectType: 'worker_skill',
          objectId: assessment.skill_id, subjectProfileId: profileId, requestId,
          metadata: { cause: 'assessment', from_status: prior.status, to_status: next.status, from_level: prior.proficiency, to_level: next.proficiency },
        });
      }
      return { grade, result, prior, next, changed };
    });

    const run = await recomputeFor(actor, profileId, 'assessment_result', res);
    res.status(201).json({
      result: {
        id: outcome.result.id,
        assessment_id: assessmentId,
        title: assessment.title,
        skill_id: assessment.skill_id,
        score: outcome.grade.score,
        max_score: outcome.grade.max_score,
        passed: outcome.grade.passed,
        item_results: outcome.grade.item_results,
        created_at: new Date(outcome.result.created_at).toISOString(),
        reviewer_type: 'auto_rubric',
        is_demo_assessment: true,
      },
      skill_before: outcome.prior,
      skill_after: outcome.next,
      skills_changed: outcome.changed ? [assessment.skill_id] : [],
      role_changes: roleChanges(before, run),
      recommendations: await viewOf(actor, profileId, run),
    });
  });

  // ---------------------------------------------------------------- mentors
  r.get('/mentors/matches', async (req, res) => {
    const profileId = uuid.parse(req.query.profile_id);
    const roleId = slug.parse(req.query.role_id);
    const actor = await requireOwnProfile(db, res, profileId);

    const data = await db.asUser(actor.userId, async (q) => {
      const { evaluation } = await evaluationFor(q, profileId, roleId);
      const prefs = await q.query<{ preferences: WorkerPreferences }>('select preferences from public.profiles where id = $1', [profileId]);
      const mentors = await q.query<Omit<MentorCandidate, 'has_demo_login'> & { bio: string }>(
        `select m.id, m.display_name, m.headline, m.bio, m.skill_ids, m.role_experience, m.transition_experience, m.languages, m.session_formats,
                m.availability_hours_per_week, m.capacity_remaining, m.is_synthetic
         from public.mentor_profiles m join public.profiles p on p.id = $1 and p.catalogue = m.catalogue
         where m.verification_status in ('synthetic_demo', 'verified')
         order by m.display_name`,
        [profileId],
      );
      const open = await q.query<{ mentor_id: string; status: string; id: string }>(
        `select id, mentor_id, status from public.mentor_requests where profile_id = $1 and status in ('requested', 'accepted')`,
        [profileId],
      );
      const names = await q.query<{ id: string; canonical_name: string }>('select id, canonical_name from public.skills');
      return { evaluation, prefs: prefs.rows[0]?.preferences ?? {}, mentors: mentors.rows, open: open.rows, names: names.rows };
    });
    if (!data.evaluation) throw notFound('No evaluation for this role yet.');
    // Which catalogue mentors have a demo login (identity column is not client-readable).
    // Mentors who can actually answer: a linked account that is active.
    const withLogin = await db.asService((q) =>
      q.query<{ id: string }>("select m.id from public.mentor_profiles m join public.app_users u on u.user_id = m.user_id where u.status = 'active'"),
    );
    const loginIds = new Set(withLogin.rows.map((m) => m.id));

    const gapNames = new Map(data.names.map((n) => [n.id, n.canonical_name]));
    const result = matchMentors({
      mentors: data.mentors.map((m) => ({ ...m, has_demo_login: loginIds.has(m.id) })),
      gapSkillIds: gapSkillIds(data.evaluation),
      gapNames,
      targetRoleId: roleId,
      targetRoleTitle: data.evaluation.title,
      preferences: data.prefs,
    });
    const openByMentor = new Map(data.open.map((o) => [o.mentor_id, o]));
    const bios = new Map(data.mentors.map((m) => [m.id, m.bio]));
    res.json({
      version: result.version,
      target_role: { id: roleId, title: data.evaluation.title },
      gap_skills: result.gap_skill_ids.map((id) => ({ id, name: gapNames.get(id) ?? id })),
      privacy_note: 'Matching uses only your gap list and preferences. Nothing is shared until you approve a request.',
      matches: result.matches.filter((m) => m.mentor.is_synthetic || loginIds.has(m.mentor.id)).map((m) => ({
        ...m,
        mentor: { ...m.mentor, bio: bios.get(m.mentor.id) ?? '' },
        covered_gaps: m.covered_gap_ids.map((id) => ({ id, name: gapNames.get(id) ?? id })),
        uncovered_gaps: m.uncovered_gap_ids.map((id) => ({ id, name: gapNames.get(id) ?? id })),
        open_request: openByMentor.get(m.mentor.id) ?? null,
      })),
    });
  });

  const MentorshipRequest = z.object({
    profile_id: uuid,
    mentor_id: uuid,
    target_role_id: slug,
    shared_fields: shareFields,
    message: z.string().trim().max(500).optional(),
  });

  r.post('/mentorships', writeLimiter, async (req, res) => {
    const profileId = uuid.parse((req.body as { profile_id?: unknown })?.profile_id);
    const actor = await requireOwnProfile(db, res, profileId);
    requireConsent(req.body);
    const body = MentorshipRequest.parse(req.body);
    const fields = [...new Set(body.shared_fields)];

    const ctx = await db.asUser(actor.userId, async (q) => {
      const mentor = await q.query<{ id: string; display_name: string; capacity_remaining: number; languages: string[]; is_synthetic: boolean }>(
        `select m.id, m.display_name, m.capacity_remaining, m.languages, m.is_synthetic
         from public.mentor_profiles m join public.profiles p on p.id = $2 and p.catalogue = m.catalogue
         where m.id = $1 and m.verification_status in ('synthetic_demo', 'verified')`,
        [body.mentor_id, profileId],
      );
      const role = await q.query<{ id: string; title: string }>(
        'select r.id, r.title from public.roles r join public.profiles p on p.id = $2 and p.catalogue = r.catalogue where r.id = $1',
        [body.target_role_id, profileId],
      );
      const prefs = await q.query<{ preferences: WorkerPreferences }>('select preferences from public.profiles where id = $1', [profileId]);
      const { evaluation } = await evaluationFor(q, profileId, body.target_role_id);
      return { mentor: mentor.rows[0], role: role.rows[0], prefs: prefs.rows[0]?.preferences ?? {}, evaluation };
    });
    if (!ctx.mentor) throw notFound('Mentor not found.');
    if (!ctx.role) throw notFound('Role not found.');
    if (ctx.mentor.capacity_remaining <= 0) throw conflict('mentor_unavailable', 'This mentor has no capacity in this period.');
    const langs = (ctx.prefs.languages ?? []).map((l) => l.toLowerCase());
    if (langs.length > 0 && !ctx.mentor.languages.some((l) => langs.includes(l.toLowerCase()))) {
      throw conflict('mentor_unavailable', 'This mentor does not share a language with your preferences.');
    }

    const statement =
      `I approve sharing these items with ${ctx.mentor.display_name}${ctx.mentor.is_synthetic ? ' (synthetic demo mentor)' : ''} for mentorship towards ` +
      `${ctx.role.title}: ${labelList(fields)}. Nothing else is shared, and I can revoke this at any time.`;

    const created = await db.asService(async (q) => {
      const consent = await q.query<{ id: string }>(
        `insert into public.consent_events (profile_id, purpose, recipient_type, recipient_id, fields, consent_version, statement, granted)
         values ($1, 'mentor_request', 'mentor', $2, $3, $4, $5, true) returning id`,
        [profileId, body.mentor_id, fields, CONSENT_VERSION, statement],
      );
      const request = await q.query<{ id: string; status: string; created_at: Date | string }>(
        `insert into public.mentor_requests (profile_id, mentor_id, target_role_id, focus_skill_ids, shared_fields, consent_event_id, message)
         values ($1, $2, $3, $4, $5, $6, $7) returning id, status, created_at`,
        [profileId, body.mentor_id, body.target_role_id, ctx.evaluation ? gapSkillIds(ctx.evaluation) : [], fields, consent.rows[0]!.id, body.message ?? null],
      );
      const requestId = res.locals.requestId as string;
      const id = request.rows[0]!.id;
      await recordAudit(q, {
        actorUserId: actor.userId, actorRole: actor.role, action: 'consent.granted', objectType: 'consent_event', objectId: consent.rows[0]!.id,
        subjectProfileId: profileId, requestId, metadata: { purpose: 'mentor_request', recipient_type: 'mentor', fields },
      });
      await recordAudit(q, {
        actorUserId: actor.userId, actorRole: actor.role, action: 'mentorship.requested', objectType: 'mentor_request', objectId: id,
        subjectProfileId: profileId, requestId, metadata: { mentor_id: body.mentor_id, target_role_id: body.target_role_id },
      });
      return { id, status: request.rows[0]!.status, created_at: new Date(request.rows[0]!.created_at).toISOString(), consent_event_id: consent.rows[0]!.id };
    }).catch((e: unknown) => {
      if ((e as { code?: string }).code === '23505') throw conflict('request_exists', 'You already have an open request with this mentor.');
      throw e;
    });

    res.status(201).json({ request: { ...created, mentor_id: body.mentor_id, target_role_id: body.target_role_id, shared_fields: fields, consent_statement: statement } });
  });

  r.get('/mentorships', async (req, res) => {
    const profileId = uuid.parse(req.query.profile_id);
    const actor = await requireOwnProfile(db, res, profileId);
    const rows = await db.asUser(actor.userId, (q) =>
      q.query(
        `select r.id, r.status, r.shared_fields, r.message, r.created_at, r.responded_at, r.revoked_at,
                jsonb_build_object('id', m.id, 'display_name', m.display_name, 'headline', m.headline, 'is_synthetic', m.is_synthetic) as mentor,
                jsonb_build_object('id', ro.id, 'title', ro.title) as target_role,
                c.statement as consent_statement,
                coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'body', n.body, 'action_items', n.action_items, 'created_at', n.created_at)
                                   order by n.created_at desc)
                          from public.mentor_notes n where n.request_id = r.id and n.kind = 'feedback'), '[]'::jsonb) as feedback
         from public.mentor_requests r
         join public.mentor_profiles m on m.id = r.mentor_id
         join public.roles ro on ro.id = r.target_role_id
         join public.consent_events c on c.id = r.consent_event_id
         where r.profile_id = $1
         order by r.created_at desc`,
        [profileId],
      ),
    );
    res.json({ requests: rows.rows });
  });

  r.post('/mentorships/:id/revoke', writeLimiter, async (req, res) => {
    const id = uuid.parse(req.params.id);
    const actor = actorOf(res);
    const rows = await db.asUser(actor.userId, (q) =>
      q.query<{ profile_id: string; status: string; consent_event_id: string }>(
        'select profile_id, status, consent_event_id from public.mentor_requests where id = $1',
        [id],
      ),
    );
    const request = rows.rows[0];
    if (!request || actor.role !== 'worker' || request.profile_id !== actor.profileId) {
      throw await deny(db, res, 'not_request_owner', request?.profile_id);
    }
    if (!['requested', 'accepted'].includes(request.status)) throw conflict('request_closed', 'This request is no longer active.');
    await db.asService(async (q) => {
      await q.query("update public.mentor_requests set status = 'revoked', revoked_at = now() where id = $1", [id]);
      await q.query('update public.consent_events set revoked_at = now() where id = $1', [request.consent_event_id]);
      await recordAudit(q, {
        actorUserId: actor.userId, actorRole: actor.role, action: 'consent.revoked', objectType: 'mentor_request', objectId: id,
        subjectProfileId: request.profile_id, requestId: res.locals.requestId as string, metadata: { purpose: 'mentor_request' },
      });
    });
    res.json({ id, status: 'revoked' });
  });

  // -------------------------------------------------------- recruiter share
  const ShareApproval = z.object({
    recipient: z.object({ type: z.literal('recruiter_org'), org_id: uuid }),
    target_role_id: slug.optional(),
    fields: shareFields,
  });

  r.post('/profiles/:id/share-approval', writeLimiter, async (req, res) => {
    const profileId = uuid.parse(req.params.id);
    const actor = await requireOwnProfile(db, res, profileId);
    requireConsent(req.body);
    const body = ShareApproval.parse(req.body);
    const fields = [...new Set(body.fields)];

    const ctx = await db.asUser(actor.userId, async (q) => {
      const org = await q.query<{ id: string; name: string }>("select id, name from public.organizations where id = $1 and kind = 'employer' and status = 'active'", [body.recipient.org_id]);
      const role = body.target_role_id
        ? (await q.query<{ id: string; title: string }>('select id, title from public.roles where id = $1', [body.target_role_id])).rows[0]
        : undefined;
      return { org: org.rows[0], role };
    });
    if (!ctx.org) throw notFound('Organisation not found.');
    if (body.target_role_id && !ctx.role) throw notFound('Role not found.');

    const statement =
      `I approve sharing these items with recruiters at ${ctx.org.name} for review${ctx.role ? ` for ${ctx.role.title}` : ''}: ` +
      `${labelList(fields)}. This does not apply for any job on my behalf, and I can revoke it at any time.`;

    const grant = await db.asService(async (q) => {
      const consent = await q.query<{ id: string }>(
        `insert into public.consent_events (profile_id, purpose, recipient_type, recipient_id, fields, consent_version, statement, granted)
         values ($1, 'recruiter_share', 'recruiter_org', $2, $3, $4, $5, true) returning id`,
        [profileId, ctx.org!.id, fields, CONSENT_VERSION, statement],
      );
      const g = await q.query<{ id: string; granted_at: Date | string }>(
        `insert into public.share_grants (profile_id, org_id, target_role_id, fields, consent_event_id)
         values ($1, $2, $3, $4, $5) returning id, granted_at`,
        [profileId, ctx.org!.id, body.target_role_id ?? null, fields, consent.rows[0]!.id],
      );
      const requestId = res.locals.requestId as string;
      await recordAudit(q, {
        actorUserId: actor.userId, actorRole: actor.role, action: 'consent.granted', objectType: 'consent_event', objectId: consent.rows[0]!.id,
        subjectProfileId: profileId, requestId, metadata: { purpose: 'recruiter_share', recipient_type: 'recruiter_org', fields },
      });
      await recordAudit(q, {
        actorUserId: actor.userId, actorRole: actor.role, action: 'share.granted', objectType: 'share_grant', objectId: g.rows[0]!.id,
        subjectProfileId: profileId, requestId, metadata: { org_id: ctx.org!.id },
      });
      return { id: g.rows[0]!.id, granted_at: new Date(g.rows[0]!.granted_at).toISOString() };
    }).catch((e: unknown) => {
      if ((e as { code?: string }).code === '23505') throw conflict('share_exists', 'You already share with this organisation. Revoke it first to change the fields.');
      throw e;
    });

    res.status(201).json({ grant: { ...grant, org: ctx.org, target_role_id: body.target_role_id ?? null, fields, consent_statement: statement } });
  });

  r.get('/profiles/:id/shares', async (req, res) => {
    const profileId = uuid.parse(req.params.id);
    const actor = await requireOwnProfile(db, res, profileId);
    const rows = await db.asUser(actor.userId, (q) =>
      q.query(
        `select g.id, g.fields, g.granted_at, g.revoked_at, g.target_role_id,
                jsonb_build_object('id', o.id, 'name', o.name, 'is_synthetic', o.is_synthetic) as org,
                c.statement as consent_statement
         from public.share_grants g
         join public.organizations o on o.id = g.org_id
         join public.consent_events c on c.id = g.consent_event_id
         where g.profile_id = $1 order by g.granted_at desc`,
        [profileId],
      ),
    );
    res.json({ shares: rows.rows });
  });

  r.post('/shares/:id/revoke', writeLimiter, async (req, res) => {
    const id = uuid.parse(req.params.id);
    const actor = actorOf(res);
    const rows = await db.asUser(actor.userId, (q) =>
      q.query<{ profile_id: string; revoked_at: string | null; consent_event_id: string }>(
        'select profile_id, revoked_at, consent_event_id from public.share_grants where id = $1',
        [id],
      ),
    );
    const grant = rows.rows[0];
    if (!grant || actor.role !== 'worker' || grant.profile_id !== actor.profileId) {
      throw await deny(db, res, 'not_share_owner', grant?.profile_id);
    }
    if (grant.revoked_at) throw conflict('share_closed', 'This share is already revoked.');
    await db.asService(async (q) => {
      await q.query('update public.share_grants set revoked_at = now() where id = $1', [id]);
      await q.query('update public.consent_events set revoked_at = now() where id = $1', [grant.consent_event_id]);
      await recordAudit(q, {
        actorUserId: actor.userId, actorRole: actor.role, action: 'consent.revoked', objectType: 'share_grant', objectId: id,
        subjectProfileId: grant.profile_id, requestId: res.locals.requestId as string, metadata: { purpose: 'recruiter_share' },
      });
    });
    res.json({ id, status: 'revoked' });
  });

  // ------------------------------------------------------------------ audit
  r.get('/audit/:profileId', async (req, res) => {
    const profileId = uuid.parse(req.params.profileId);
    const actor = await requireOwnProfile(db, res, profileId);
    const rows = await db.asUser(actor.userId, (q) =>
      q.query(
        `select id::text as id, created_at, actor_role, action, object_type, outcome, metadata
         from public.audit_events where subject_profile_id = $1 order by created_at desc, id desc limit 100`,
        [profileId],
      ),
    );
    res.json({ events: rows.rows });
  });

  return r;
}
