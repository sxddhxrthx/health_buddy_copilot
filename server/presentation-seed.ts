import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { emptyVisitDraft, parseVisitDraft } from '../shared/care.js';

// Additive, one-time fictional provisioning; never rewrite an authored visit or sharing grant.
export function seedPresentationVisit(
  database: Database.Database,
  patientId: string,
  doctorId: string,
) {
  database.transaction(() => {
    if (database.prepare('SELECT 1 FROM app_migrations WHERE version = 5').get()) return;
    const { total } = database
      .prepare<[string], { total: number }>(
        'SELECT count(*) AS total FROM visits WHERE patient_id = ?',
      )
      .get(patientId)!;
    // A full workspace is preserved, not pruned or allowed to exceed its capacity.
    if (total < 200) {
      const visitId = randomUUID();
      const data = JSON.stringify(
        parseVisitDraft({
          ...emptyVisitDraft(),
          measuredAt: '2026-01-20T10:00',
          diagnosis: 'Advanced heart failure',
          diagnosisStatus: 'confirmed',
          summary:
            'BUNDLED FICTIONAL PRESENTATION SCENARIO — not a real medical assessment. ' +
            'Seeded under the demo author Dr Avery Chen, not confirmed by a real clinician. ' +
            'Jordan is the serious-heart-condition example; Sam is the routine-care comparison. ' +
            'Invented history: reduced stamina over three months, breathlessness during short walks, ' +
            'tiredness during everyday tasks and ankle swelling. Fictional echocardiogram: left ventricular ' +
            'ejection fraction 25%; fictional clinician-assigned functional class NYHA III. ' +
            'These details are authored scenario text, not interpretations of personal readings. ' +
            'Presentation timeline: initial fictional assessment on January 6; fictional cardiology ' +
            'review on January 13; this finalized summary on January 20, 2026 (demo-local dates). ' +
            'Research pages link only the exact confirmed condition label to independent invented ' +
            'documentation aggregates and a fictional study. No treatment, prognosis or trial eligibility ' +
            'is recommended. Existing personal entries remain unchanged and may not describe this scenario.',
        }),
      );
      const publishedAt = '2026-01-20T10:00:00Z';
      database
        .prepare("INSERT INTO visits VALUES (?, ?, ?, ?, 'finalized', 1, ?)")
        .run(visitId, patientId, doctorId, data, publishedAt);
      database
        .prepare('INSERT INTO visit_revisions VALUES (?, 1, ?, ?, ?)')
        .run(
          visitId,
          data,
          'Bundled fictional presentation seed; not a real clinician assessment',
          publishedAt,
        );
    }
    database.prepare('INSERT INTO app_migrations VALUES (5)').run();
  })();
}
