import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { parseHealthDraft, type HealthRecord, type HealthSession } from '../shared/health.js';
import { demoReports, seedHealthRecords } from './health-data.js';

const SESSION_TTL = 8 * 60 * 60 * 1000;
const MAX_SESSIONS = 200;
const MAX_RECORDS = 500;

// Ephemeral, isolated demo sessions. This is NOT authentication or production storage.
export function healthRouter() {
  const router = Router();
  const sessions = new Map<string, { state: HealthSession; expires: number }>();
  router.get('/reports', (_req, res) => res.json(demoReports));
  router.post('/', (req, res) => {
    try {
      for (const [id, session] of sessions) if (session.expires <= Date.now()) sessions.delete(id);
      const body = req.body;
      if (!body || typeof body !== 'object' || Array.isArray(body))
        throw new Error('Invalid demo request.');
      if (body.action === 'create') {
        if (sessions.size >= MAX_SESSIONS) {
          res.status(503).json({ error: 'Demo session capacity reached. Try again later.' });
          return;
        }
        const state: HealthSession = {
          id: randomUUID(),
          records: seedHealthRecords(),
          importedReportIds: [],
        };
        sessions.set(state.id, { state, expires: Date.now() + SESSION_TTL });
        res.json(state);
        return;
      }
      const session = typeof body.sessionId === 'string' ? sessions.get(body.sessionId) : undefined;
      if (!session) {
        res
          .status(404)
          .json({ error: 'Demo session expired or unavailable. Start a new demo session.' });
        return;
      }
      const state = session.state;
      if (body.action === 'read') {
        res.json(state);
        return;
      }
      if (body.syntheticOnly !== true)
        throw new Error('Confirm that all entries are fictional demo data.');
      if (body.action === 'save') {
        const draft = parseHealthDraft(body.record);
        if (body.recordId !== undefined) {
          const index = state.records.findIndex((r) => r.id === body.recordId);
          if (index < 0) throw new Error('Record not found in this demo session.');
          state.records[index] = { ...state.records[index], ...draft };
        } else {
          if (state.records.length >= MAX_RECORDS)
            throw new Error('Demo limit reached: delete entries or reset the demo.');
          state.records.push({ ...draft, id: randomUUID(), source: 'manual' });
        }
      } else if (body.action === 'delete') {
        if (!state.records.some((r) => r.id === body.recordId))
          throw new Error('Record not found in this demo session.');
        state.records = state.records.filter((r) => r.id !== body.recordId);
      } else if (body.action === 'import') {
        const report = demoReports.find((r) => r.id === body.reportId);
        if (!report || body.confirmed !== true)
          throw new Error('Choose a bundled report and confirm your review.');
        if (state.importedReportIds.includes(report.id))
          throw new Error('This report has already been imported.');
        if (!Array.isArray(body.records) || body.records.length !== report.fields.length)
          throw new Error('Review every report field before saving.');
        if (state.records.length + body.records.length > MAX_RECORDS)
          throw new Error('Demo record limit reached.');
        const records: HealthRecord[] = body.records.map((input: unknown, index: number) => {
          const draft = parseHealthDraft(input);
          if (draft.kind !== report.fields[index].draft.kind)
            throw new Error('Report record type cannot be changed.');
          return { ...draft, id: randomUUID(), source: 'simulated-report', reportId: report.id };
        });
        // Validate the entire batch before committing any records.
        state.records.push(...records);
        state.importedReportIds.push(report.id);
      } else if (body.action === 'reset') {
        state.records = seedHealthRecords();
        state.importedReportIds = [];
      } else throw new Error('Unsupported demo action.');
      res.json(state);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });
  return router;
}
