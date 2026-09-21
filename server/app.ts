import express from 'express';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { patient, getStudy } from './data.js';
import { findCohort, parseFilters } from './analytics.js';
import { answerQuestion, reviewQuestions } from './copilot.js';
import { DATA_VERSION, MATCH_VERSION } from '../shared/contracts.js';
import { healthRouter } from './health.js';
import { reviewRouter, type ReviewOptions } from './review.js';
import { fromNodeHeaders } from 'better-auth/node';
import type { Runtime } from './runtime.js';

export function createApp(runtime: Runtime, reviewOptions: ReviewOptions = {}) {
  const app = express();
  app.disable('x-powered-by');
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use(express.json({ limit: '8kb' }));
  app.all('/api/auth/{*path}', async (req, res) => {
    if (
      !['/api/auth/sign-in/email', '/api/auth/sign-out', '/api/auth/get-session'].includes(
        req.path,
      ) ||
      !['GET', 'POST'].includes(req.method)
    ) {
      res.status(404).json({ error: 'Authentication action unavailable.' });
      return;
    }
    if (req.method === 'POST' && req.headers.origin !== runtime.baseURL) {
      res.status(403).json({ error: 'Request origin rejected.' });
      return;
    }
    const authHeaders = fromNodeHeaders(req.headers);
    authHeaders.delete('x-forwarded-for');
    authHeaders.delete('x-real-ip');
    authHeaders.set('x-research-twin-client-ip', req.socket.remoteAddress ?? 'unknown');
    const response = await runtime.auth.handler(
      new Request(new URL(req.originalUrl, runtime.baseURL), {
        method: req.method,
        headers: authHeaders,
        body: req.method === 'GET' ? undefined : JSON.stringify(req.body ?? {}),
      }),
    );
    for (const cookie of response.headers.getSetCookie()) res.append('Set-Cookie', cookie);
    res
      .status(response.status)
      .type('application/json')
      .send(await response.text());
  });
  app.get('/api/health', (_req, res) =>
    res.json({
      status: 'ok',
      synthetic: true,
      dataVersion: DATA_VERSION,
      matchingVersion: MATCH_VERSION,
      copilot: 'deterministic-demo',
    }),
  );
  app.use('/api', async (req, res, next) => {
    const session = await runtime.auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
      query: { disableCookieCache: true },
    });
    if (!session || !['patient', 'doctor'].includes(session.user.role)) {
      res.status(401).json({ error: 'Sign in to continue.' });
      return;
    }
    if (req.method !== 'GET' && req.headers.origin !== runtime.baseURL) {
      res.status(403).json({ error: 'Request origin rejected.' });
      return;
    }
    res.locals.user = session.user;
    next();
  });
  app.get('/api/me', (_req, res) => {
    const { id, name, email, role } = res.locals.user;
    res.json({ id, name, email, role });
  });
  app.use('/api', healthRouter(runtime));
  app.use('/api', reviewRouter(runtime, reviewOptions));
  app.use('/api', (_req, res, next) => {
    if (res.locals.user.role !== 'doctor') {
      res.status(403).json({ error: 'Doctor workspace only.' });
      return;
    }
    next();
  });
  app.get('/api/patient', (_req, res) => res.json(patient));
  app.get('/api/study', (_req, res) => res.json(getStudy()));
  app.post('/api/cohort', (req, res) => {
    try {
      res.json(findCohort(parseFilters(req.body)));
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });
  app.post('/api/copilot', (req, res) => {
    try {
      if (
        typeof req.body?.question !== 'string' ||
        !req.body.question.trim() ||
        req.body.question.length > 1000
      )
        throw new Error('Question must contain 1–1000 characters.');
      // Recompute on the server: never trust a client-provided aggregate or evidence.
      const cohort = req.body.filters == null ? null : findCohort(parseFilters(req.body.filters));
      res.json(answerQuestion(req.body.question, cohort));
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });
  app.post('/api/brief', (req, res) => {
    try {
      const cohort = req.body?.filters == null ? null : findCohort(parseFilters(req.body.filters));
      const lines = [
        '# Research Twin · clinician review brief',
        '',
        'SYNTHETIC DEMO — not clinical advice. Qualified human review required.',
        `Snapshot: ${patient.asOf} | ${DATA_VERSION} | ${MATCH_VERSION}`,
        '',
        '## Current patient',
        ...patient.facts.map((f) => `- ${f.label}: ${f.value} [${f.evidenceId}]`),
        '',
        '## Missing information',
        ...patient.missing.map((g) => `- ${g.label}: ${g.detail} [${g.evidenceId}]`),
        '',
        '## Comparable cohort',
      ];
      lines.push(
        cohort && !cohort.suppressed
          ? `${cohort.size} comparable cases; mean matching score ${cohort.meanScore}/100 (not a probability); completeness ${cohort.completeness}%. [${cohort.evidence[0].id}]`
          : 'No reportable cohort selected.',
      );
      if (cohort && !cohort.suppressed)
        lines.push(
          ...cohort.comparisons.map(
            (c) => `- ${c.area}: ${c.cohort}. Difference: ${c.difference} [${c.evidenceId}]`,
          ),
        );
      lines.push(
        '',
        '## Review questions',
        ...reviewQuestions.map((q) => `- ${q}`),
        '',
        '## Limitations',
        'Similarity does not establish diagnosis or causality. Historical treatments are not recommendations. No real patient data, live literature, FHIR, Fabric or AI model is connected.',
        '',
        '## Evidence appendix',
      );
      for (const e of [...patient.evidence, ...(cohort?.evidence ?? [])])
        lines.push(
          `### ${e.id} — ${e.title}`,
          `Source: ${e.source}`,
          `Period: ${e.period}`,
          `Calculation: ${e.calculation}`,
          e.detail,
          ...e.limitations.map((l) => `- ${l}`),
          '',
        );
      res.json({ markdown: lines.join('\n') });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));
  const dist = fileURLToPath(new URL('../dist/', import.meta.url));
  if (existsSync(dist)) {
    app.use(
      express.static(dist, {
        setHeaders(res, path) {
          if (path.endsWith('sw.js') || path.endsWith('index.html'))
            res.setHeader('Cache-Control', 'no-cache');
        },
      }),
    );
    app.get('/{*path}', (_req, res) => res.sendFile(`${dist}/index.html`));
  }
  app.use(
    (
      error: Error & { status?: number },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res
        .status(error.status === 413 ? 413 : 400)
        .json({ error: error.status === 413 ? 'Request too large.' : 'Invalid request.' });
    },
  );
  return app;
}
