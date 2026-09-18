import { Router } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import type { Runtime } from './runtime.js';
import type { Account, VisitDraft } from '../shared/care.js';
import { parseHealthDraft, healthValue, type HealthRecord } from '../shared/health.js';
import {
  parseReviewRequest,
  parseReviewSelection,
  REVIEW_VERSION,
  REVIEW_WARNING,
  REVIEW_QUESTIONS,
  type ReviewReport,
  type ReviewSource,
  type ReviewStatus,
} from '../shared/review.js';
import {
  APPROVED_REVIEW_CONFIG,
  hashReview,
  validateReviewConfig,
  type ReviewConfig,
} from './review-config.js';
import { localReviewInference, type ReviewInference } from './review-inference.js';
import { pilotCohort, PILOT_GENERATOR_VERSION, PILOT_MATCH_VERSION } from './review-cohort.js';

export type ReviewOptions = { config?: ReviewConfig | null; infer?: ReviewInference };
class ReviewError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function reviewRouter(runtime: Runtime, options: ReviewOptions = {}) {
  const router = Router();
  const config = options.config === undefined ? APPROVED_REVIEW_CONFIG : options.config;
  if (config) validateReviewConfig(config);
  const infer = options.infer ?? localReviewInference;
  let busy = false;
  const { database } = runtime;
  function authorize(viewer: Account, patientId: string) {
    if (viewer.role !== 'doctor') throw new ReviewError(403, 'Doctor workspace only.');
    const grant = database
      .prepare(
        `SELECT sharing.updated_at FROM sharing
      JOIN user ON user.id = sharing.patient_id JOIN profiles ON profiles.user_id = user.id
      WHERE sharing.patient_id = ? AND sharing.doctor_id = ? AND sharing.active = 1
      AND user.role = 'patient' AND profiles.persona LIKE 'SYN-USER-%'`,
      )
      .get(patientId, viewer.id);
    if (!grant) throw new ReviewError(404, 'Patient unavailable.');
    return grant;
  }
  function snapshot(viewer: Account, patientId: string) {
    return database.transaction(() => {
      const grant = authorize(viewer, patientId);
      const records = database
        .prepare('SELECT id, data FROM health_records WHERE patient_id = ? ORDER BY id')
        .all(patientId) as { id: string; data: string }[];
      const visits = database
        .prepare(
          "SELECT id, revision, data FROM visits WHERE patient_id = ? AND status = 'finalized' ORDER BY id",
        )
        .all(patientId) as { id: string; revision: number; data: string }[];
      return { version: hashReview({ patientId, grant, records, visits }), records, visits };
    })();
  }
  router.get('/care/patients/:id/evidence-review', (req, res) => {
    const viewer = res.locals.user as Account;
    const id = String(req.params.id);
    authorize(viewer, id);
    const status: ReviewStatus = config
      ? {
          available: true,
          message: REVIEW_WARNING,
          snapshotVersion: snapshot(viewer, id).version,
          scenarios: config.scenarios,
        }
      : {
          available: false,
          message:
            'Evidence review is disabled pending model, corpus, sharing-purpose and reviewer approval.',
          scenarios: [],
        };
    res.json(status);
  });
  router.post('/care/patients/:id/evidence-review', async (req, res) => {
    const viewer = res.locals.user as Account;
    const id = String(req.params.id);
    authorize(viewer, id);
    const request = parseReviewRequest(req.body);
    if (!config) throw new ReviewError(503, 'Evidence review has not been activated.');
    if (!config.scenarios.includes(request.scenario))
      throw new ReviewError(400, 'Scenario unavailable.');
    if (busy) throw new ReviewError(429, 'Local evidence review is busy. Retry explicitly later.');
    const initial = snapshot(viewer, id);
    if (initial.version !== request.snapshotVersion)
      throw new ReviewError(409, 'Records changed. Refresh before review.');
    // Reject rather than silently truncate patient context.
    if (initial.records.length > 40 || initial.visits.length > 10)
      throw new ReviewError(
        422,
        'Pilot limit: at most 40 personal entries and 10 finalized visits.',
      );
    const records = initial.records.map(({ data }) => JSON.parse(data) as HealthRecord);
    const sources: ReviewSource[] = records.map((record, index) => {
      const parsed = parseHealthDraft(record);
      return {
        id: `PATIENT-${index + 1}`,
        kind: 'patient',
        title: 'Recorded synthetic entry',
        text: `${parsed.measuredAt} (demo local) | ${parsed.kind} | ${parsed.label} | ${healthValue(parsed)} | ${parsed.context} | pulse: ${parsed.pulse || 'not recorded'} | duration (minutes): ${parsed.duration || 'not recorded'} | recorded reference range: ${parsed.referenceRange || 'not recorded'} | source: ${record.source}${record.reportId ? ` (${record.reportId})` : ''}.`,
      };
    });
    for (const [index, visit] of initial.visits.entries()) {
      const draft = JSON.parse(visit.data) as VisitDraft;
      // No medication/dose fields or other doctors' drafts enter inference.
      sources.push({
        id: `VISIT-${index + 1}`,
        kind: 'patient',
        title: 'Finalized fictional visit summary',
        text: `${draft.measuredAt} (demo local), revision ${visit.revision}: ${draft.summary}`,
      });
    }
    sources.push(pilotCohort(records, request.scenario));
    for (const article of config.articles.filter((a) => a.scenario === request.scenario)) {
      sources.push({
        id: article.id,
        kind: 'literature',
        title: article.title,
        url: article.url,
        text: `${article.summary}\nPublished: ${article.publicationDate}. Reviewed: ${article.reviewedAt}. License: ${article.license}. Corrections/retractions check: ${article.correctionCheck}`,
      });
    }
    if (Buffer.byteLength(JSON.stringify(sources)) > 23000)
      throw new ReviewError(422, 'Pilot evidence context exceeds its limit.');
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(60000)]);
    const disconnect = () => {
      if (!res.writableEnded) controller.abort();
    };
    res.on('close', disconnect);
    busy = true;
    let checking = false;
    let revoked: ReviewError | undefined;
    const sessionHeaders = fromNodeHeaders(req.headers);
    async function recheck() {
      const session = await runtime.auth.api.getSession({
        headers: sessionHeaders,
        query: { disableCookieCache: true },
      });
      if (!session || session.user.id !== viewer.id || session.user.role !== 'doctor')
        throw new ReviewError(401, 'Sign in to continue.');
      if (snapshot(viewer, id).version !== initial.version)
        throw new ReviewError(409, 'Records or sharing changed. Draft discarded.');
    }
    const monitor = setInterval(() => {
      if (checking || signal.aborted) return;
      checking = true;
      void recheck()
        .catch((error: unknown) => {
          revoked =
            error instanceof ReviewError
              ? error
              : new ReviewError(503, 'Review authorization unavailable.');
          controller.abort();
        })
        .finally(() => {
          checking = false;
        });
    }, 500);
    try {
      const selection = parseReviewSelection(
        await infer(config, sources, signal),
        sources.filter((s) => s.kind === 'literature').map((s) => s.id),
      );
      if (revoked) throw revoked;
      signal.throwIfAborted();
      await recheck();
      signal.throwIfAborted();
      const report: ReviewReport = {
        patientId: id,
        snapshotVersion: initial.version,
        scenario: request.scenario,
        generatedAt: new Date().toISOString(),
        warning: REVIEW_WARNING,
        versions: {
          schema: REVIEW_VERSION,
          model: config.model,
          digest: config.digest,
          corpus: config.corpusVersion,
          generator: PILOT_GENERATOR_VERSION,
          matcher: PILOT_MATCH_VERSION,
        },
        sources: sources.filter(
          (s) => s.kind !== 'literature' || selection.literatureIds.includes(s.id),
        ),
        questions: selection.questionIds.map((key) => REVIEW_QUESTIONS[key]),
        limitations: [
          'The local model selects reviewed excerpts and questions only; no model-authored clinical claims are accepted.',
          'Selection does not establish applicability or entailment. Inspect every source with a qualified reviewer.',
          'Coverage matching uses measurement kinds and units only, not diagnoses, severity or treatment effects.',
          'Notes, medication fields, report originals and visit drafts are excluded. No clinical interpretation or unit conversion is performed.',
          'Missing measurements and follow-up are unknown, not normal findings. This is a point-in-time draft, not a live record.',
          ...(selection.literatureIds.length
            ? []
            : ['No literature was selected. No evidence conclusion can be drawn.']),
        ],
      };
      if (!res.destroyed) res.json(report);
    } catch (error) {
      if (!res.destroyed) {
        const failure =
          revoked ??
          (error instanceof ReviewError
            ? error
            : new ReviewError(
                503,
                'Local review failed, timed out, or returned invalid evidence. No draft retained.',
              ));
        res.status(failure.status).json({ error: failure.message });
      }
    } finally {
      clearInterval(monitor);
      controller.abort();
      res.off('close', disconnect);
      busy = false;
    }
  });
  router.use(
    (
      error: unknown,
      _req: import('express').Request,
      res: import('express').Response,
      _next: import('express').NextFunction,
    ) => {
      res.status(error instanceof ReviewError ? error.status : 400).json({
        error: error instanceof ReviewError ? error.message : 'Invalid evidence-review request.',
      });
    },
  );
  return router;
}
