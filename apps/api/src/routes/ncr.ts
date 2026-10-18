import express, { Router } from 'express';
import type { Deps } from '../http/context.ts';
import { ApiError, badRequest } from '../http/errors.ts';
import { requireRole } from '../http/guards.ts';
import { recommend } from '../ncr/adjacency.ts';
import { getNcrDataset } from '../ncr/dataset.ts';
import { extractResume } from '../ncr/extractor.ts';
import { profileFromReview, ReviewError, reviewRequestSchema } from '../ncr/review.ts';
import { DocumentError, extractDocumentText, MAX_UPLOAD_BYTES } from '../ncr/text.ts';
import { recordAudit } from '../services/audit.ts';
import { userLimiter } from './worker.ts';

/**
 * Delhi-NCR pilot: resume upload -> skill suggestions -> worker review -> role matching.
 *
 * Stateless by design: the resume file and its text are processed in memory and never stored or
 * logged. Only counts and enums go to the audit trail. Every route is worker-only and acts on the
 * caller's own session; no profile or object id is accepted from the client.
 */

export const ncrDataset = getNcrDataset;

const UPLOAD_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/octet-stream'];

export function ncrRoutes({ db }: Deps): Router {
  const r = Router();
  const uploadLimiter = userLimiter(10);
  const writeLimiter = userLimiter(60);

  r.get('/ncr/meta', async (_req, res) => {
    await requireRole(db, res, 'worker');
    const ds = ncrDataset();
    res.json({
      dataset_version: ds.config.dataset_version,
      taxonomy_version: ds.config.taxonomy_version,
      adjacency_version: ds.config.adjacency_version,
      region_scope: ds.config.region_scope,
      cities: ds.config.cities,
      limitations: ds.config.limitations,
      labels: {
        roles: 'Team-drafted pilot roles, not yet reviewed by a domain expert',
        listings: 'SIMULATED — not live vacancies and not market demand',
      },
      skills: ds.skills.map((s) => ({ id: s.id, name: s.name, category: s.category })),
      roles: ds.roles.map((x) => ({ id: x.id, title: x.title, sector: x.sector, seniority: x.seniority })),
    });
  });

  r.post(
    '/ncr/resume/extract',
    uploadLimiter,
    express.raw({ type: UPLOAD_TYPES, limit: MAX_UPLOAD_BYTES }),
    async (req, res) => {
      const actor = await requireRole(db, res, 'worker');
      const body = req.body as unknown;
      if (!Buffer.isBuffer(body) || body.length === 0) {
        throw badRequest('file_required', 'Send the resume as the request body (PDF, DOCX or plain text).');
      }

      let doc: Awaited<ReturnType<typeof extractDocumentText>>;
      try {
        doc = await extractDocumentText(new Uint8Array(body));
      } catch (err) {
        if (err instanceof DocumentError) {
          const status = err.code === 'too_large' ? 413 : 422;
          throw new ApiError(status, `document_${err.code}`, err.message);
        }
        throw err;
      }

      const ds = ncrDataset();
      const extraction = extractResume(
        { candidate_id: actor.profileId ?? 'self', resume_id: `upload_${res.locals.requestId as string}`, document_type: doc.type, text: doc.text },
        ds,
        // "Present" in a job's date range means today for a live upload.
        { asOf: new Date() },
      );
      await db.asService((q) =>
        recordAudit(q, {
          actorUserId: actor.userId,
          actorRole: actor.role,
          action: 'ncr.resume.extract',
          objectType: 'resume',
          requestId: res.locals.requestId as string,
          metadata: { document_type: doc.type, skills: extraction.skills.length, extractor_version: extraction.extractor_version },
        }),
      );
      res.json({
        extraction,
        review_required: true,
        notice: 'These are suggestions from your resume. Nothing is used for role matching until you review and confirm it.',
      });
    },
  );

  r.post('/ncr/recommend', writeLimiter, async (req, res) => {
    const actor = await requireRole(db, res, 'worker');
    const input = reviewRequestSchema.parse(req.body);
    const ds = ncrDataset();
    let profile;
    try {
      profile = profileFromReview(ds, input.skills);
    } catch (err) {
      if (err instanceof ReviewError) throw new ApiError(422, err.code, err.message);
      throw err;
    }
    const result = recommend(ds, profile, input.preferences ?? {}, { currentRoleIds: input.current_role_ids });
    await db.asService((q) =>
      recordAudit(q, {
        actorUserId: actor.userId,
        actorRole: actor.role,
        action: 'ncr.recommend',
        objectType: 'recommendation',
        requestId: res.locals.requestId as string,
        metadata: { skills: profile.length, top_roles: result.top_roles.map((x) => x.role_id), dataset_version: result.dataset_version },
      }),
    );
    res.json(result);
  });

  return r;
}
