import test from 'node:test';
import assert from 'node:assert/strict';
import { conditionCohort, patientResearch } from '../server/patient-research.js';
import { emptyVisitDraft, type CareSnapshot, type Person } from '../shared/care.js';
import { emptyHealthDraft } from '../shared/health.js';
import type { PatientResearch } from '../shared/patient-research.js';
import { testApplication } from './helpers.js';

test('condition fixtures use exact normalized labels, deduplicate cohorts and suppress small cells', () => {
  const patient = { id: 'fictional', name: 'Fictional patient', persona: 'SYN-TEST' };
  const sources = [
    ' hypertension ',
    'HYPERTENSION',
    'possible asthma',
    'Asthma and hypertension',
  ].map((diagnosis, index) => ({
    visitId: String(index),
    revision: 2,
    diagnosis,
    measuredAt: '2026-01-15T10:00',
  }));
  const result = patientResearch(patient, sources);
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].sources.length, 2);
  assert.equal(result.matches[0].cohort.total, 60);
  assert.equal(result.unmatched.length, 2);
  assert.deepEqual(patientResearch(patient, sources), result);
  assert.equal(patientResearch(patient, []).matches.length, 0);
  for (const count of [0, 4, 9, 11]) {
    const fixtures = Array.from({ length: count }, (_, index) => ({
      condition: 'Asthma',
      followup: index === 0 ? 'Rare cell' : 'Other',
    }));
    assert.deepEqual(conditionCohort('Asthma', fixtures), {
      suppressed: true,
      total: null,
      followup: [],
    });
  }
  for (const diagnosis of ['Type 2 diabetes', 'Asthma', 'Advanced heart failure']) {
    const matched = patientResearch(patient, [{ ...sources[0], diagnosis }]);
    assert.equal(matched.matches[0].condition, diagnosis);
    assert.equal(
      matched.matches[0].cohort.total,
      diagnosis === 'Advanced heart failure' ? 120 : 60,
    );
  }
  const heart = patientResearch(patient, [
    { ...sources[0], diagnosis: ' ADVANCED HEART FAILURE ' },
  ]);
  assert.deepEqual(
    heart.matches[0].cohort.followup.map((cell) => cell.count),
    [90, 30],
  );
  assert.equal(
    heart.matches[0].cohort.followup.reduce((sum, cell) => sum + cell.count, 0),
    120,
  );
  assert.equal(
    patientResearch(patient, [{ ...sources[0], diagnosis: 'Possible advanced heart failure' }])
      .matches.length,
    0,
  );
});

test('patient research enforces grants and uses only current finalized confirmed diagnoses', async () => {
  const app = await testApplication();
  try {
    const doctor = 'avery@doctor.example';
    const patient = 'sam@patient.example';
    const people: Person[] = await (await app.request(doctor, 'care/patients')).json();
    const sam = people.find((person) => person.name === 'Sam Taylor')!;
    const jordan = people.find((person) => person.name === 'Jordan Lee')!;
    const path = `care/patients/${sam.id}`;
    const read = async (): Promise<PatientResearch> => {
      const response = await app.request(doctor, `${path}/research`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      return response.json();
    };
    const reference = await (await app.request(doctor, 'patient')).json();
    assert.equal((await app.request(null, `${path}/research`)).status, 401);
    assert.equal((await app.request(patient, `${path}/research`)).status, 403);
    assert.equal((await app.request('riley@doctor.example', `${path}/research`)).status, 404);
    assert.equal((await app.request(doctor, 'care/patients/missing/research')).status, 404);
    assert.equal((await app.request(doctor, `${path}/research?diagnosis=Asthma`)).status, 400);
    assert.equal((await read()).matches.length, 0);
    await app.request(patient, 'health-demo', {
      action: 'save',
      syntheticOnly: true,
      record: { ...emptyHealthDraft('diagnosis'), label: 'Personal diagnosis', value: 'Asthma' },
    });
    const draft = {
      ...emptyVisitDraft(),
      diagnosis: 'Hypertension',
      diagnosisStatus: 'confirmed' as const,
      summary: 'PRIVATE SUMMARY SENTINEL',
    };
    const mutate = async (body: object): Promise<CareSnapshot> => {
      const response = await app.request(doctor, `${path}/visits`, {
        ...body,
        syntheticOnly: true,
      });
      assert.equal(response.status, 200);
      return response.json();
    };
    let state = await mutate({ action: 'create', draft });
    let visit = state.visits.find((visit) => visit.draft.diagnosis === 'Hypertension')!;
    assert.equal((await read()).matches.length, 0, 'confirmed draft must not match');
    state = await mutate({ action: 'finalize', visitId: visit.id, revision: visit.revision });
    visit = state.visits.find((entry) => entry.id === visit.id)!;
    let result = await read();
    assert.equal(result.patient.id, sam.id);
    assert.deepEqual(
      result.matches.map((match) => match.condition),
      ['Hypertension'],
    );
    assert.equal(result.matches[0].sources[0].revision, visit.revision);
    assert.ok(!JSON.stringify(result).includes('PRIVATE SUMMARY SENTINEL'));
    assert.ok(!JSON.stringify(result).includes('medication'));
    const other: PatientResearch = await (
      await app.request(doctor, `care/patients/${jordan.id}/research`)
    ).json();
    assert.deepEqual(
      other.matches.map((match) => match.condition),
      ['Advanced heart failure'],
    );
    assert.equal(other.matches[0].cohort.total, 120);
    assert.equal(other.matches[0].study.id, 'SYN-HEART-26');
    assert.ok(other.matches[0].presentation?.limitations.includes('deliberately invented'));
    assert.ok(
      !JSON.stringify(other).includes('ejection fraction'),
      'visit summary stays out of research',
    );
    state = await mutate({
      action: 'amend',
      visitId: visit.id,
      revision: visit.revision,
      draft: { ...draft, diagnosis: 'Asthma' },
      reason: 'Fictional correction',
    });
    visit = state.visits.find((entry) => entry.id === visit.id)!;
    result = await read();
    assert.deepEqual(
      result.matches.map((match) => match.condition),
      ['Asthma'],
    );
    state = await mutate({
      action: 'amend',
      visitId: visit.id,
      revision: visit.revision,
      draft: { ...draft, diagnosisStatus: 'provisional' },
      reason: 'Fictional status correction',
    });
    visit = state.visits.find((entry) => entry.id === visit.id)!;
    assert.equal((await read()).matches.length, 0);
    await mutate({
      action: 'amend',
      visitId: visit.id,
      revision: visit.revision,
      draft: { ...draft, diagnosis: 'Unsupported fictional condition' },
      reason: 'Fictional correction',
    });
    result = await read();
    assert.equal(result.matches.length, 0);
    assert.equal(result.unmatched[0].diagnosis, 'Unsupported fictional condition');
    assert.deepEqual(await (await app.request(doctor, 'patient')).json(), reference);
    const doctors: Person[] = await (await app.request(patient, 'care/sharing')).json();
    await app.request(patient, 'care/sharing', {
      doctorId: doctors.find((person) => person.name === 'Dr Avery Chen')!.id,
      active: false,
      syntheticOnly: true,
    });
    assert.equal((await app.request(doctor, `${path}/research`)).status, 404);
  } finally {
    await app.close();
  }
});
