import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PATIENT_SCENARIO_VERSION,
  seedPatientResearchScenarios,
  seedPresentationVisit,
} from '../server/presentation-seed.js';
import { emptyVisitDraft, parseVisitDraft, type CareSnapshot } from '../shared/care.js';
import { testApplication } from './helpers.js';
import type { PatientResearch, PatientResearchContext } from '../shared/patient-research.js';
import type { Runtime } from '../server/runtime.js';

function beforeScenarioMigration(database: Runtime['database']) {
  database.transaction(() => {
    const seeded = database
      .prepare<[string], { id: string }>(
        "SELECT id FROM visits WHERE json_extract(data, '$.summary') LIKE ?",
      )
      .all(`BUNDLED FICTIONAL RESEARCH SCENARIO / ${PATIENT_SCENARIO_VERSION}.%`);
    for (const visit of seeded) {
      database.prepare('DELETE FROM visit_revisions WHERE visit_id = ?').run(visit.id);
      database.prepare('DELETE FROM visits WHERE id = ?').run(visit.id);
    }
    database.prepare('DELETE FROM patient_research_context').run();
    database.prepare('DELETE FROM app_migrations WHERE version = 6').run();
  })();
}

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

test('scenario migration supports expanded stores without rewriting existing data', async () => {
  const app = await testApplication();
  try {
    const database = app.runtime.database;
    beforeScenarioMigration(database);
    database.exec('DROP TABLE patient_research_context');
    database.prepare('INSERT INTO app_migrations VALUES (6)').run();
    const records = database.prepare('SELECT * FROM health_records ORDER BY id').all();
    const visits = database.prepare('SELECT * FROM visits ORDER BY id').all();
    const revisions = database
      .prepare('SELECT * FROM visit_revisions ORDER BY visit_id, revision')
      .all();
    const grants = database.prepare('SELECT * FROM sharing ORDER BY patient_id, doctor_id').all();
    seedPatientResearchScenarios(database);
    const contexts = database
      .prepare<[], { data: string }>(
        'SELECT data FROM patient_research_context ORDER BY patient_id',
      )
      .all();
    assert.equal(contexts.length, 3);
    for (const row of contexts) {
      const context: PatientResearchContext = JSON.parse(row.data);
      assert.equal(context.dataVersion, PATIENT_SCENARIO_VERSION);
      assert.ok(context.ageBand);
      assert.equal(context.timeline.length, 2);
      assert.ok(context.provenance.includes('not a real clinician assessment'));
      assert.ok(context.allergyReview.includes('unverified'));
      assert.equal(context.missing.length, 3);
    }
    for (const [email, diagnosis, total] of [
      ['sam@patient.example', 'Hypertension', 1],
      ['jordan@patient.example', 'Advanced heart failure', 1],
      ['casey@patient.example', 'Asthma', 2],
    ] as const) {
      const state: CareSnapshot = await (
        await app.request(email, 'health-demo', { action: 'read' })
      ).json();
      assert.equal(state.visits.length, total);
      const seeded = state.visits.find((visit) => visit.draft.diagnosis === diagnosis)!;
      assert.equal(seeded.status, 'finalized');
      assert.equal(seeded.draft.diagnosisStatus, 'confirmed');
      assert.equal(seeded.history.length, 1);
      assert.deepEqual(parseVisitDraft(seeded.draft), seeded.draft);
    }
    assert.deepEqual(database.prepare('SELECT * FROM health_records ORDER BY id').all(), records);
    assert.deepEqual(
      database.prepare('SELECT * FROM sharing ORDER BY patient_id, doctor_id').all(),
      grants,
    );
    const afterVisits = database.prepare('SELECT * FROM visits ORDER BY id').all();
    const afterRevisions = database
      .prepare('SELECT * FROM visit_revisions ORDER BY visit_id, revision')
      .all();
    for (const visit of visits)
      assert.ok(afterVisits.some((current) => JSON.stringify(current) === JSON.stringify(visit)));
    for (const revision of revisions)
      assert.ok(
        afterRevisions.some((current) => JSON.stringify(current) === JSON.stringify(revision)),
      );
    seedPatientResearchScenarios(database);
    assert.deepEqual(database.prepare('SELECT * FROM visits ORDER BY id').all(), afterVisits);
    assert.deepEqual(
      database.prepare('SELECT * FROM visit_revisions ORDER BY visit_id, revision').all(),
      afterRevisions,
    );
    assert.deepEqual(
      database.prepare('SELECT data FROM patient_research_context ORDER BY patient_id').all(),
      contexts,
    );
  } finally {
    await app.close();
  }
});

test('scenario provisioning respects visit capacity and preserves later amendments', async () => {
  const app = await testApplication();
  try {
    const database = app.runtime.database;
    beforeScenarioMigration(database);
    const sam: CareSnapshot = await (
      await app.request('sam@patient.example', 'health-demo', { action: 'read' })
    ).json();
    const jordan: CareSnapshot = await (
      await app.request('jordan@patient.example', 'health-demo', { action: 'read' })
    ).json();
    const doctorId = jordan.visits[0].doctorId;
    const draft = { ...jordan.visits[0].draft, diagnosis: 'Unmatched fictional finding' };
    const insert = database.prepare("INSERT INTO visits VALUES (?, ?, ?, ?, 'draft', 1, ?)");
    for (let index = 0; index < 200; index++) {
      insert.run(
        `full-${index}`,
        sam.patient.id,
        doctorId,
        JSON.stringify(draft),
        '2026-01-15T10:00:00Z',
      );
    }
    seedPatientResearchScenarios(database);
    const current: CareSnapshot = await (
      await app.request('sam@patient.example', 'health-demo', { action: 'read' })
    ).json();
    assert.equal(current.visits.length, 0, 'patient cannot see doctor drafts');
    assert.equal(
      database
        .prepare<[string], { total: number }>(
          'SELECT count(*) AS total FROM visits WHERE patient_id = ?',
        )
        .get(sam.patient.id)!.total,
      200,
    );
    const casey: CareSnapshot = await (
      await app.request('casey@patient.example', 'health-demo', { action: 'read' })
    ).json();
    const visit = casey.visits.find((entry) => entry.draft.diagnosis === 'Asthma')!;
    const response = await app.request(
      'riley@doctor.example',
      `care/patients/${casey.patient.id}/visits`,
      {
        action: 'amend',
        visitId: visit.id,
        revision: visit.revision,
        draft: { ...visit.draft, diagnosisStatus: 'provisional' },
        reason: 'Fictional scenario amended',
        syntheticOnly: true,
      },
    );
    assert.equal(response.status, 200);
    seedPatientResearchScenarios(database);
    const research: PatientResearch = await (
      await app.request('riley@doctor.example', `care/patients/${casey.patient.id}/research`)
    ).json();
    assert.equal(research.matches.length, 0);
  } finally {
    await app.close();
  }
});

test('scenario migration rolls back partial work and reuses existing confirmed labels', async () => {
  const app = await testApplication();
  try {
    const database = app.runtime.database;
    beforeScenarioMigration(database);
    const visits = database.prepare('SELECT * FROM visits ORDER BY id').all();
    database
      .prepare('UPDATE user SET role = ? WHERE email = ?')
      .run('patient', 'riley@doctor.example');
    assert.throws(() => seedPatientResearchScenarios(database), /scenario author is unavailable/);
    assert.deepEqual(database.prepare('SELECT * FROM visits ORDER BY id').all(), visits);
    assert.deepEqual(database.prepare('SELECT * FROM patient_research_context').all(), []);
    assert.equal(
      database.prepare('SELECT 1 FROM app_migrations WHERE version = 6').get(),
      undefined,
    );
    database
      .prepare('UPDATE user SET role = ? WHERE email = ?')
      .run('doctor', 'riley@doctor.example');
    const state: CareSnapshot = await (
      await app.request('sam@patient.example', 'health-demo', { action: 'read' })
    ).json();
    const jordan: CareSnapshot = await (
      await app.request('jordan@patient.example', 'health-demo', { action: 'read' })
    ).json();
    const data = JSON.stringify(
      parseVisitDraft({
        ...emptyVisitDraft(),
        diagnosis: ' HYPERTENSION ',
        diagnosisStatus: 'confirmed',
        summary: 'Existing authored fictional condition; preserve this exact record.',
      }),
    );
    database
      .prepare("INSERT INTO visits VALUES ('existing-confirmed', ?, ?, ?, 'finalized', 1, ?)")
      .run(state.patient.id, jordan.visits[0].doctorId, data, '2026-01-15T10:00:00Z');
    database
      .prepare("INSERT INTO visit_revisions VALUES ('existing-confirmed', 1, ?, ?, ?)")
      .run(data, 'Existing finalized fictional record', '2026-01-15T10:00:00Z');
    database.prepare('UPDATE sharing SET active = 0 WHERE patient_id = ?').run(state.patient.id);
    const existing = database.prepare("SELECT * FROM visits WHERE id = 'existing-confirmed'").get();
    const grants = database.prepare('SELECT * FROM sharing ORDER BY patient_id, doctor_id').all();
    seedPatientResearchScenarios(database);
    assert.deepEqual(
      database.prepare("SELECT * FROM visits WHERE id = 'existing-confirmed'").get(),
      existing,
    );
    assert.equal(
      database
        .prepare<[string], { total: number }>(
          'SELECT count(*) AS total FROM visits WHERE patient_id = ?',
        )
        .get(state.patient.id)!.total,
      1,
    );
    assert.deepEqual(
      database.prepare('SELECT * FROM sharing ORDER BY patient_id, doctor_id').all(),
      grants,
    );
    assert.equal(
      (await app.request('avery@doctor.example', `care/patients/${state.patient.id}/research`))
        .status,
      404,
    );
  } finally {
    await app.close();
  }
});
