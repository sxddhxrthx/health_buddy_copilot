import test from 'node:test';
import assert from 'node:assert/strict';
import { seedPresentationVisit } from '../server/presentation-seed.js';
import { parseVisitDraft, type CareSnapshot } from '../shared/care.js';
import { testApplication } from './helpers.js';
import type { PatientResearch } from '../shared/patient-research.js';

test('presentation seed is additive, one-time, amendable and does not restore sharing', async () => {
  const app = await testApplication();
  try {
    const db = app.runtime.database;
    const state: CareSnapshot = await (
      await app.request('jordan@patient.example', 'health-demo', { action: 'read' })
    ).json();
    const seeded = state.visits[0];
    assert.equal(seeded.draft.diagnosis, 'Advanced heart failure');
    assert.equal(seeded.status, 'finalized');
    assert.equal(seeded.revision, 1);
    assert.equal(seeded.history.length, 1);
    assert.deepEqual(parseVisitDraft(seeded.draft), seeded.draft);
    assert.ok(seeded.draft.summary.includes('ejection fraction 25%'));
    assert.ok(seeded.history[0].reason.includes('not a real clinician'));
    // Emulate an existing database before the additive presentation migration.
    db.prepare('DELETE FROM visit_revisions WHERE visit_id = ?').run(seeded.id);
    db.prepare('DELETE FROM visits WHERE id = ?').run(seeded.id);
    db.prepare('DELETE FROM app_migrations WHERE version = 5').run();
    db.prepare("INSERT INTO visits VALUES ('existing', ?, ?, ?, 'draft', 1, ?)").run(
      state.patient.id,
      seeded.doctorId,
      JSON.stringify({ ...seeded.draft, diagnosis: 'Existing fictional text' }),
      '2026-01-01T10:00:00Z',
    );
    db.prepare('UPDATE sharing SET active = 0 WHERE patient_id = ?').run(state.patient.id);
    const existing = db.prepare("SELECT * FROM visits WHERE id = 'existing'").get();
    const records = db.prepare('SELECT * FROM health_records ORDER BY id').all();
    const grants = db.prepare('SELECT * FROM sharing ORDER BY patient_id, doctor_id').all();
    seedPresentationVisit(db, state.patient.id, seeded.doctorId);
    const visits = db.prepare('SELECT * FROM visits ORDER BY id').all();
    seedPresentationVisit(db, state.patient.id, seeded.doctorId);
    assert.deepEqual(db.prepare('SELECT * FROM visits ORDER BY id').all(), visits);
    assert.deepEqual(db.prepare("SELECT * FROM visits WHERE id = 'existing'").get(), existing);
    assert.deepEqual(db.prepare('SELECT * FROM health_records ORDER BY id').all(), records);
    assert.deepEqual(
      db.prepare('SELECT * FROM sharing ORDER BY patient_id, doctor_id').all(),
      grants,
    );
    const path = `care/patients/${state.patient.id}`;
    assert.equal((await app.request('avery@doctor.example', `${path}/research`)).status, 404);
    await app.request('jordan@patient.example', 'care/sharing', {
      doctorId: seeded.doctorId,
      active: true,
      syntheticOnly: true,
    });
    const current: CareSnapshot = await (await app.request('avery@doctor.example', path)).json();
    const visit = current.visits.find((entry) => entry.status === 'finalized')!;
    const amended = await app.request('avery@doctor.example', `${path}/visits`, {
      action: 'amend',
      visitId: visit.id,
      revision: visit.revision,
      draft: { ...visit.draft, diagnosisStatus: 'provisional' },
      reason: 'Fictional presentation amendment',
      syntheticOnly: true,
    });
    assert.equal(amended.status, 200);
    seedPresentationVisit(db, state.patient.id, seeded.doctorId);
    const research: PatientResearch = await (
      await app.request('avery@doctor.example', `${path}/research`)
    ).json();
    assert.equal(research.matches.length, 0, 'amended condition must not be restored by seeding');
    const updated: CareSnapshot = await amended.json();
    assert.equal(updated.visits.find((entry) => entry.id === visit.id)!.history.length, 2);
  } finally {
    await app.close();
  }
});

test('presentation provisioning skips a full workspace without deleting visits', async () => {
  const app = await testApplication();
  try {
    const db = app.runtime.database;
    const state: CareSnapshot = await (
      await app.request('jordan@patient.example', 'health-demo', { action: 'read' })
    ).json();
    const visit = state.visits[0];
    db.prepare('DELETE FROM app_migrations WHERE version = 5').run();
    const insert = db.prepare("INSERT INTO visits VALUES (?, ?, ?, ?, 'draft', 1, ?)");
    for (let index = 1; index < 200; index++) {
      insert.run(
        `capacity-${index}`,
        state.patient.id,
        visit.doctorId,
        JSON.stringify(visit.draft),
        '2026-01-01T10:00:00Z',
      );
    }
    const before = db.prepare('SELECT * FROM visits ORDER BY id').all();
    seedPresentationVisit(db, state.patient.id, visit.doctorId);
    assert.deepEqual(db.prepare('SELECT * FROM visits ORDER BY id').all(), before);
    assert.ok(db.prepare('SELECT 1 FROM app_migrations WHERE version = 5').get());
  } finally {
    await app.close();
  }
});
