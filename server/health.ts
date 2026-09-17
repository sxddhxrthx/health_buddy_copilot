import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { parseHealthDraft, type HealthRecord } from '../shared/health.js';
import {
  parseVisitDraft,
  type Account,
  type CareSnapshot,
  type Person,
  type Visit,
} from '../shared/care.js';
import { reportsForPatient, seedHealthRecords } from './health-data.js';
import type { Runtime } from './runtime.js';

class AccessError extends Error {
  constructor(
    message: string,
    public status = 403,
  ) {
    super(message);
  }
}

export function healthRouter({ database }: Runtime) {
  const router = Router();
  function patientFor(viewer: Account, id: string): Person {
    const patient = database
      .prepare(
        `SELECT user.id, user.name, profiles.persona FROM user
      JOIN profiles ON profiles.user_id = user.id WHERE user.id = ? AND user.role = 'patient'`,
      )
      .get(id) as Person | undefined;
    const allowed =
      viewer.role === 'patient'
        ? viewer.id === id
        : database
            .prepare('SELECT 1 FROM sharing WHERE patient_id = ? AND doctor_id = ? AND active = 1')
            .get(id, viewer.id);
    if (!patient || !allowed) throw new AccessError('Patient unavailable.', 404);
    return patient;
  }
  function snapshot(viewer: Account, id: string): CareSnapshot {
    const patient = patientFor(viewer, id);
    const records = database
      .prepare('SELECT data FROM health_records WHERE patient_id = ?')
      .all(id) as { data: string }[];
    const visits = database
      .prepare(
        `SELECT visits.*, user.name AS doctor_name FROM visits
      JOIN user ON user.id = visits.doctor_id WHERE patient_id = ?
      AND (status = 'finalized' OR doctor_id = ?) ORDER BY updated_at DESC`,
      )
      .all(id, viewer.role === 'doctor' ? viewer.id : '') as {
      id: string;
      doctor_id: string;
      doctor_name: string;
      status: Visit['status'];
      revision: number;
      data: string;
    }[];
    return {
      patient,
      records: records.map(({ data }) => JSON.parse(data)),
      reports: reportsForPatient(patient),
      importedReportIds: (
        database.prepare('SELECT report_id FROM imported_reports WHERE patient_id = ?').all(id) as {
          report_id: string;
        }[]
      ).map(({ report_id }) => report_id),
      visits: visits.map((visit) => ({
        id: visit.id,
        doctorId: visit.doctor_id,
        doctorName: visit.doctor_name,
        status: visit.status,
        revision: visit.revision,
        draft: JSON.parse(visit.data),
        history: (
          database
            .prepare('SELECT * FROM visit_revisions WHERE visit_id = ? ORDER BY revision DESC')
            .all(visit.id) as {
            revision: number;
            data: string;
            reason: string;
            published_at: string;
          }[]
        ).map((entry) => ({
          revision: entry.revision,
          draft: JSON.parse(entry.data),
          reason: entry.reason,
          publishedAt: entry.published_at,
        })),
      })),
    };
  }
  function requireRole(viewer: Account, role: Account['role']) {
    if (viewer.role !== role) throw new AccessError('This action is not available for your role.');
  }
  router.get('/care/patients', (_req, res) => {
    const viewer = res.locals.user as Account;
    requireRole(viewer, 'doctor');
    res.json(
      database
        .prepare(
          `SELECT user.id, user.name, profiles.persona FROM sharing
      JOIN user ON user.id = sharing.patient_id JOIN profiles ON profiles.user_id = user.id
      WHERE doctor_id = ? AND active = 1 ORDER BY user.name`,
        )
        .all(viewer.id),
    );
  });
  router.get('/care/patients/:id', (req, res) => {
    const viewer = res.locals.user as Account;
    requireRole(viewer, 'doctor');
    res.json(snapshot(viewer, String(req.params.id)));
  });
  router.get('/care/sharing', (_req, res) => {
    const viewer = res.locals.user as Account;
    requireRole(viewer, 'patient');
    const doctors = database
      .prepare(
        `SELECT user.id, user.name, profiles.persona,
      COALESCE(sharing.active, 0) AS active FROM user JOIN profiles ON profiles.user_id = user.id
      LEFT JOIN sharing ON sharing.doctor_id = user.id AND sharing.patient_id = ?
      WHERE user.role = 'doctor' ORDER BY user.name`,
      )
      .all(viewer.id) as (Person & { active: number })[];
    res.json(doctors.map((doctor) => ({ ...doctor, active: doctor.active === 1 })));
  });
  router.post('/care/sharing', (req, res) => {
    const viewer = res.locals.user as Account;
    requireRole(viewer, 'patient');
    const body = req.body;
    if (
      !body ||
      Object.keys(body).some((key) => !['doctorId', 'active', 'syntheticOnly'].includes(key)) ||
      body.syntheticOnly !== true ||
      typeof body.active !== 'boolean' ||
      typeof body.doctorId !== 'string'
    )
      throw new Error('Choose a doctor and confirm fictional-only sharing.');
    if (!database.prepare("SELECT 1 FROM user WHERE id = ? AND role = 'doctor'").get(body.doctorId))
      throw new AccessError('Doctor unavailable.', 404);
    database
      .prepare(
        `INSERT INTO sharing VALUES (?, ?, ?, ?) ON CONFLICT(patient_id, doctor_id)
      DO UPDATE SET active = excluded.active, updated_at = excluded.updated_at`,
      )
      .run(viewer.id, body.doctorId, Number(body.active), new Date().toISOString());
    res.json({ saved: true });
  });
  router.get('/health-demo/reports', (_req, res) => {
    const viewer = res.locals.user as Account;
    requireRole(viewer, 'patient');
    res.json(snapshot(viewer, viewer.id).reports);
  });
  router.post('/health-demo', (req, res) => {
    const viewer = res.locals.user as Account;
    requireRole(viewer, 'patient');
    const body = req.body;
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      Object.keys(body).some(
        (key) =>
          ![
            'action',
            'syntheticOnly',
            'record',
            'recordId',
            'reportId',
            'confirmed',
            'records',
          ].includes(key),
      )
    )
      throw new Error('Invalid health request.');
    if (body.action === 'read') {
      res.json(snapshot(viewer, viewer.id));
      return;
    }
    if (body.syntheticOnly !== true)
      throw new Error('Confirm that all entries are fictional demo data.');
    database.transaction(() => {
      const total = (
        database
          .prepare('SELECT count(*) AS total FROM health_records WHERE patient_id = ?')
          .get(viewer.id) as { total: number }
      ).total;
      if (body.action === 'save') {
        const draft = parseHealthDraft(body.record);
        if (body.recordId !== undefined) {
          if (typeof body.recordId !== 'string') throw new Error('Invalid record.');
          const old = database
            .prepare('SELECT data FROM health_records WHERE patient_id = ? AND id = ?')
            .get(viewer.id, body.recordId) as { data: string } | undefined;
          if (!old) throw new AccessError('Record unavailable.', 404);
          const record = JSON.parse(old.data) as HealthRecord;
          if (record.kind !== draft.kind) throw new Error('Record type cannot be changed.');
          database
            .prepare('UPDATE health_records SET data = ? WHERE id = ?')
            .run(JSON.stringify({ ...record, ...draft }), record.id);
        } else {
          if (total >= 500) throw new Error('Demo limit reached: 500 records per patient.');
          const record: HealthRecord = { ...draft, id: randomUUID(), source: 'manual' };
          database
            .prepare('INSERT INTO health_records VALUES (?, ?, ?)')
            .run(record.id, viewer.id, JSON.stringify(record));
        }
      } else if (body.action === 'delete') {
        if (
          typeof body.recordId !== 'string' ||
          !database
            .prepare('DELETE FROM health_records WHERE id = ? AND patient_id = ?')
            .run(body.recordId, viewer.id).changes
        )
          throw new AccessError('Record unavailable.', 404);
      } else if (body.action === 'import') {
        const report = reportsForPatient(patientFor(viewer, viewer.id)).find(
          (report) => report.id === body.reportId,
        );
        if (!report || body.confirmed !== true)
          throw new Error('Choose a bundled report and confirm your review.');
        if (
          database
            .prepare('SELECT 1 FROM imported_reports WHERE patient_id = ? AND report_id = ?')
            .get(viewer.id, report.id)
        )
          throw new Error('This report has already been imported.');
        if (
          !Array.isArray(body.records) ||
          body.records.length !== report.fields.length ||
          total + body.records.length > 500
        )
          throw new Error('Review every field and stay within the 500-record demo limit.');
        const records: HealthRecord[] = body.records.map((input: unknown, index: number) => {
          const draft = parseHealthDraft(input);
          if (draft.kind !== report.fields[index].draft.kind)
            throw new Error('Report record type cannot be changed.');
          return { ...draft, id: randomUUID(), source: 'simulated-report', reportId: report.id };
        });
        for (const record of records)
          database
            .prepare('INSERT INTO health_records VALUES (?, ?, ?)')
            .run(record.id, viewer.id, JSON.stringify(record));
        database.prepare('INSERT INTO imported_reports VALUES (?, ?)').run(viewer.id, report.id);
      } else if (body.action === 'reset') {
        database.prepare('DELETE FROM health_records WHERE patient_id = ?').run(viewer.id);
        database.prepare('DELETE FROM imported_reports WHERE patient_id = ?').run(viewer.id);
        for (const source of seedHealthRecords()) {
          const record = { ...source, id: randomUUID() };
          database
            .prepare('INSERT INTO health_records VALUES (?, ?, ?)')
            .run(record.id, viewer.id, JSON.stringify(record));
        }
      } else throw new Error('Unsupported health action.');
    })();
    res.json(snapshot(viewer, viewer.id));
  });
  router.post('/care/patients/:id/visits', (req, res) => {
    const viewer = res.locals.user as Account;
    requireRole(viewer, 'doctor');
    const id = String(req.params.id);
    patientFor(viewer, id);
    const body = req.body;
    if (
      !body ||
      Array.isArray(body) ||
      body.syntheticOnly !== true ||
      Object.keys(body).some(
        (key) =>
          !['action', 'visitId', 'revision', 'draft', 'reason', 'syntheticOnly'].includes(key),
      )
    )
      throw new Error('Confirm fictional-only visit documentation.');
    database.transaction(() => {
      if (body.action === 'create') {
        const count = database
          .prepare('SELECT count(*) AS total FROM visits WHERE patient_id = ?')
          .get(id) as { total: number };
        if (count.total >= 200) throw new Error('Demo limit reached: 200 visits per patient.');
        const draft = parseVisitDraft(body.draft);
        database
          .prepare("INSERT INTO visits VALUES (?, ?, ?, ?, 'draft', 1, ?)")
          .run(randomUUID(), id, viewer.id, JSON.stringify(draft), new Date().toISOString());
        return;
      }
      if (typeof body.visitId !== 'string' || !Number.isInteger(body.revision))
        throw new Error('Invalid visit revision.');
      const visit = database
        .prepare('SELECT * FROM visits WHERE id = ? AND patient_id = ? AND doctor_id = ?')
        .get(body.visitId, id, viewer.id) as
        { id: string; data: string; status: string; revision: number } | undefined;
      if (!visit) throw new AccessError('Visit unavailable.', 404);
      if (visit.revision !== body.revision)
        throw new AccessError('Visit changed. Reload before editing.', 409);
      if (visit.revision >= 100) throw new Error('Demo revision limit reached.');
      let data = visit.data;
      let status = visit.status;
      let reason = '';
      if (body.action === 'save' && status === 'draft')
        data = JSON.stringify(parseVisitDraft(body.draft));
      else if (body.action === 'finalize' && status === 'draft') {
        status = 'finalized';
        reason = 'Initial finalization';
      } else if (body.action === 'amend' && status === 'finalized') {
        if (typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 500)
          throw new Error('Provide an amendment reason (up to 500 characters).');
        data = JSON.stringify(parseVisitDraft(body.draft));
        reason = body.reason.trim();
      } else throw new Error('This action is not permitted for the visit status.');
      const revision = visit.revision + 1;
      const now = new Date().toISOString();
      database
        .prepare(
          'UPDATE visits SET data = ?, status = ?, revision = ?, updated_at = ? WHERE id = ?',
        )
        .run(data, status, revision, now, visit.id);
      if (status === 'finalized')
        database
          .prepare('INSERT INTO visit_revisions VALUES (?, ?, ?, ?, ?)')
          .run(visit.id, revision, data, reason, now);
    })();
    res.json(snapshot(viewer, id));
  });
  router.use(
    (
      error: Error,
      _req: import('express').Request,
      res: import('express').Response,
      _next: import('express').NextFunction,
    ) => {
      res.status(error instanceof AccessError ? error.status : 400).json({ error: error.message });
    },
  );
  return router;
}
