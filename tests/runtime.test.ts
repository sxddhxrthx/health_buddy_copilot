import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRuntime } from '../server/runtime.js';
import { testApplication } from './helpers.js';
import { emptyHealthDraft } from '../shared/health.js';
import { emptyVisitDraft, type CareSnapshot, type Person } from '../shared/care.js';

test('local authentication provisions roles and persistence survives reopening without reseeding', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'research-twin-auth-'));
  let runtime: Awaited<ReturnType<typeof createRuntime>> | undefined;
  try {
    runtime = await createRuntime({ directory });
    const credentials = JSON.parse(readFileSync(join(directory, 'demo-accounts.json'), 'utf8')) as {
      email: string;
      password: string;
    }[];
    const credential = credentials.find(({ email }) => email === 'avery@doctor.example')!;
    const response = await runtime.auth.api.signInEmail({ body: credential, asResponse: true });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.user.role, 'doctor');
    assert.ok(response.headers.get('set-cookie')?.includes('HttpOnly'));
    const cookie = response.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ');
    const headers = new Headers({ cookie });
    const expiry = runtime.database.prepare('SELECT expiresAt FROM session LIMIT 1').get();
    assert.ok(await runtime.auth.api.getSession({ headers }));
    assert.deepEqual(
      runtime.database.prepare('SELECT expiresAt FROM session LIMIT 1').get(),
      expiry,
    );
    runtime.database.prepare('UPDATE session SET expiresAt = ?').run(Date.now() - 1000);
    assert.equal(await runtime.auth.api.getSession({ headers }), null);
    await assert.rejects(
      runtime.auth.api.signInEmail({
        body: { ...credential, password: 'incorrect-test-password' },
      }),
    );
    const first = runtime.database.prepare('SELECT * FROM health_records LIMIT 1').get() as {
      id: string;
    };
    runtime.database.prepare('DELETE FROM health_records WHERE id = ?').run(first.id);
    runtime.database.prepare('UPDATE sharing SET active = 0').run();
    runtime.close();
    runtime = undefined;
    runtime = await createRuntime({ directory });
    assert.equal(
      runtime.database
        .prepare<[], { total: number }>('SELECT count(*) AS total FROM health_records')
        .get()!.total,
      47,
    );
    assert.equal(
      runtime.database.prepare<[], { total: number }>('SELECT count(*) AS total FROM user').get()!
        .total,
      5,
    );
    assert.equal(
      runtime.database
        .prepare<[], { total: number }>('SELECT count(*) AS total FROM sharing')
        .get()!.total,
      3,
    );
    assert.equal(
      runtime.database
        .prepare<[], { total: number }>('SELECT count(*) AS total FROM sharing WHERE active = 1')
        .get()!.total,
      0,
    );
    assert.equal(
      runtime.database
        .prepare<[], { total: number }>('SELECT count(*) AS total FROM visit_revisions')
        .get()!.total,
      4,
    );
  } finally {
    runtime?.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('authenticated sharing and visit ownership are enforced through the API', async () => {
  const app = await testApplication();
  const patient = 'sam@patient.example';
  const doctor = 'avery@doctor.example';
  const otherDoctor = 'riley@doctor.example';
  try {
    assert.equal((await app.request(null, 'health-demo', { action: 'read' })).status, 401);
    assert.equal((await app.request(null, 'auth/sign-up/email', {})).status, 404);
    assert.equal((await app.request(patient, 'study')).status, 403);
    assert.equal((await app.request(patient, 'care/patients')).status, 403);
    const patients: Person[] = await (await app.request(doctor, 'care/patients')).json();
    assert.equal(patients.length, 2);
    const sam = patients.find((person) => person.name === 'Sam Taylor')!;
    const path = `care/patients/${sam.id}`;
    assert.equal((await app.request(otherDoctor, path)).status, 404);
    assert.equal(
      (
        await app.request(doctor, 'health-demo', {
          action: 'save',
          syntheticOnly: true,
          record: { ...emptyHealthDraft(), value: '100' },
        })
      ).status,
      403,
    );
    const draft = {
      ...emptyVisitDraft(),
      diagnosis: 'Fictional visit finding',
      summary: 'Synthetic visit only.',
    };
    assert.equal(
      (
        await app.request(patient, `${path}/visits`, {
          action: 'create',
          draft,
          syntheticOnly: true,
        })
      ).status,
      403,
    );
    let state: CareSnapshot = await (
      await app.request(doctor, `${path}/visits`, { action: 'create', draft, syntheticOnly: true })
    ).json();
    const visit = state.visits[0];
    const own = async (): Promise<CareSnapshot> =>
      (await app.request(patient, 'health-demo', { action: 'read' })).json();
    assert.equal((await own()).visits.length, 1);
    assert.ok(!(await own()).visits.some((entry) => entry.id === visit.id));
    state = await (
      await app.request(doctor, `${path}/visits`, {
        action: 'finalize',
        visitId: visit.id,
        revision: visit.revision,
        syntheticOnly: true,
      })
    ).json();
    assert.equal((await own()).visits[0].status, 'finalized');
    assert.equal(
      (
        await app.request(doctor, `${path}/visits`, {
          action: 'save',
          visitId: visit.id,
          revision: state.visits[0].revision,
          draft,
          syntheticOnly: true,
        })
      ).status,
      400,
    );
    state = await (
      await app.request(doctor, `${path}/visits`, {
        action: 'amend',
        visitId: visit.id,
        revision: state.visits[0].revision,
        draft: { ...draft, diagnosis: 'Amended fictional finding' },
        reason: 'Corrected transcription',
        syntheticOnly: true,
      })
    ).json();
    assert.equal(state.visits[0].history.length, 2);
    assert.equal(state.visits[0].history[1].draft.diagnosis, draft.diagnosis);
    await app.request(patient, 'health-demo', { action: 'reset', syntheticOnly: true });
    assert.equal((await own()).visits[0].history.length, 2);
    const sharing: (Person & { active: boolean })[] = await (
      await app.request(patient, 'care/sharing')
    ).json();
    const avery = sharing.find((person) => person.name === 'Dr Avery Chen')!;
    assert.equal(
      (
        await app.request(patient, 'care/sharing', {
          doctorId: avery.id,
          active: false,
          syntheticOnly: true,
        })
      ).status,
      200,
    );
    assert.equal((await app.request(doctor, path)).status, 404);
    assert.equal(
      (
        await app.request(doctor, `${path}/visits`, {
          action: 'create',
          draft,
          syntheticOnly: true,
        })
      ).status,
      404,
    );
    assert.equal((await own()).visits.length, 2);
    assert.equal(
      (
        await app.request(
          patient,
          'care/sharing',
          { doctorId: avery.id, active: true, syntheticOnly: true },
          { Origin: 'http://untrusted.example' },
        )
      ).status,
      403,
    );
    assert.equal(
      (await app.request(patient, 'health-demo', { action: 'read', patientId: 'other' })).status,
      400,
    );
    assert.equal(
      (
        await app.request(patient, 'health-demo', {
          action: 'save',
          recordId: visit.id,
          syntheticOnly: true,
          record: { ...emptyHealthDraft(), value: '111' },
        })
      ).status,
      404,
    );
  } finally {
    await app.close();
  }
});

test('sharing does not transfer visit authorship and stale revisions cannot overwrite newer ones', async () => {
  const app = await testApplication();
  try {
    const patient = 'sam@patient.example';
    const doctor = 'avery@doctor.example';
    const other = 'riley@doctor.example';
    const doctors: Person[] = await (await app.request(patient, 'care/sharing')).json();
    const riley = doctors.find((person) => person.name === 'Dr Riley Shah')!;
    await app.request(patient, 'care/sharing', {
      doctorId: riley.id,
      active: true,
      syntheticOnly: true,
    });
    const own: CareSnapshot = await (
      await app.request(patient, 'health-demo', { action: 'read' })
    ).json();
    const path = `care/patients/${own.patient.id}`;
    const draft = { ...emptyVisitDraft(), diagnosis: 'Fictional diagnosis for ownership test' };
    const created: CareSnapshot = await (
      await app.request(doctor, `${path}/visits`, { action: 'create', draft, syntheticOnly: true })
    ).json();
    const visit = created.visits[0];
    const otherView: CareSnapshot = await (await app.request(other, path)).json();
    assert.equal(otherView.visits.length, 1);
    assert.ok(!otherView.visits.some((entry) => entry.id === visit.id));
    assert.equal(
      (
        await app.request(other, `${path}/visits`, {
          action: 'finalize',
          visitId: visit.id,
          revision: visit.revision,
          syntheticOnly: true,
        })
      ).status,
      404,
    );
    const updated: CareSnapshot = await (
      await app.request(doctor, `${path}/visits`, {
        action: 'save',
        visitId: visit.id,
        revision: visit.revision,
        draft,
        syntheticOnly: true,
      })
    ).json();
    assert.equal(
      (
        await app.request(doctor, `${path}/visits`, {
          action: 'finalize',
          visitId: visit.id,
          revision: visit.revision,
          syntheticOnly: true,
        })
      ).status,
      409,
    );
    await app.request(doctor, `${path}/visits`, {
      action: 'finalize',
      visitId: visit.id,
      revision: updated.visits[0].revision,
      syntheticOnly: true,
    });
    const published: CareSnapshot = await (await app.request(other, path)).json();
    assert.equal(published.visits.length, 2);
    assert.equal(
      (
        await app.request(other, `${path}/visits`, {
          action: 'amend',
          visitId: visit.id,
          revision: published.visits[0].revision,
          draft,
          reason: 'Attempted overwrite',
          syntheticOnly: true,
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await app.request('jordan@patient.example', 'health-demo', {
          action: 'delete',
          recordId: own.records[0].id,
          syntheticOnly: true,
        })
      ).status,
      404,
    );
    const original: CareSnapshot = await (
      await app.request(patient, 'health-demo', { action: 'read' })
    ).json();
    assert.equal(original.records.length, own.records.length);
    assert.equal((await app.request(patient, 'auth/update-user', { role: 'doctor' })).status, 404);
    assert.equal((await app.request(patient, 'auth/sign-out', {})).status, 200);
    assert.equal((await app.request(patient, 'me')).status, 401);
  } finally {
    await app.close();
  }
});

test('record and authentication capacity bounds reject additional writes', async () => {
  const app = await testApplication();
  try {
    const state: CareSnapshot = await (
      await app.request('sam@patient.example', 'health-demo', { action: 'read' })
    ).json();
    const insert = app.runtime.database.prepare('INSERT INTO health_records VALUES (?, ?, ?)');
    for (let index = state.records.length; index < 500; index++) {
      const record = { ...state.records[0], id: `capacity-${index}` };
      insert.run(record.id, state.patient.id, JSON.stringify(record));
    }
    assert.equal(
      (
        await app.request('sam@patient.example', 'health-demo', {
          action: 'save',
          syntheticOnly: true,
          record: { ...emptyHealthDraft(), value: '123' },
        })
      ).status,
      400,
    );
    const initial = app.runtime.database.prepare('SELECT * FROM session LIMIT 1').get() as Record<
      string,
      unknown
    >;
    const columns = Object.keys(initial);
    const statement = app.runtime.database.prepare(
      `INSERT INTO session (${columns.map((column) => `"${column}"`).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
    );
    for (let index = 1; index < 200; index++) {
      const session = {
        ...initial,
        id: `capacity-${index}`,
        token: `synthetic-capacity-token-${index}`,
      };
      statement.run(...columns.map((column) => session[column as keyof typeof session]));
    }
    const credentials = JSON.parse(
      readFileSync(join(app.runtime.directory, 'demo-accounts.json'), 'utf8'),
    ) as { email: string; password: string }[];
    await assert.rejects(app.runtime.auth.api.signInEmail({ body: credentials[0] }));
    assert.throws(() => {
      const session = { ...initial, id: 'overflow', token: 'synthetic-overflow-token' };
      statement.run(...columns.map((column) => session[column as keyof typeof session]));
    }, /Demo session capacity reached/);
  } finally {
    await app.close();
  }
});
