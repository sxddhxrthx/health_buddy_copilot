import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from '../server/app.js';
import { demoReports, seedHealthRecords } from '../server/health-data.js';
import {
  emptyHealthDraft,
  parseHealthDraft,
  trendKey,
  type HealthSession,
  type HealthKind,
} from '../shared/health.js';

const server = createApp().listen(0, '127.0.0.1');
let base = '';
before(async () => {
  if (!server.listening) await new Promise<void>((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});
after(
  () =>
    new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    ),
);
const post = (body: unknown) =>
  fetch(`${base}/health-demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
const create = async (): Promise<HealthSession> => (await post({ action: 'create' })).json();
const value = (kind: HealthKind = 'glucose') => ({ ...emptyHealthDraft(kind), value: '100' });

test('manual health parser supports each record category and canonicalizes numeric entries', () => {
  const kinds: HealthKind[] = [
    'glucose',
    'bp',
    'walking',
    'running',
    'steps',
    'weight',
    'temperature',
    'oxygen',
    'lab',
    'diagnosis',
    'other',
  ];
  for (const kind of kinds) {
    const parsed = parseHealthDraft({
      ...value(kind),
      label: 'Fictional record',
      secondary: '70',
      pulse: '72',
      duration: '20',
      value:
        kind === 'diagnosis' || kind === 'other'
          ? 'Fictional finding'
          : kind === 'steps'
            ? '0010'
            : '010.50',
    });
    if (kind !== 'diagnosis' && kind !== 'other')
      assert.equal(parsed.value, kind === 'steps' ? '10' : '10.5');
  }
});
test('health validation rejects invalid dates, units, values and unsupported types', () => {
  for (const change of [
    { kind: '__proto__' },
    { measuredAt: '2026-02-30T08:00' },
    { measuredAt: '2026-13-01T08:00' },
    { measuredAt: '2026-01-15T25:00' },
    { unit: 'kg' },
    { value: '-1' },
    { value: 'Infinity' },
    { value: '1e8' },
    { value: '' },
    { context: 'whatever' },
    { notes: 'x'.repeat(501) },
  ])
    assert.throws(() => parseHealthDraft({ ...value(), ...change }));
  assert.throws(() => parseHealthDraft({ ...value('bp'), secondary: '' }));
  assert.throws(() => parseHealthDraft({ ...value('steps'), value: '1.5' }));
  assert.throws(() => parseHealthDraft({ ...value('oxygen'), value: '101' }));
  assert.throws(() => parseHealthDraft({ ...value('running'), duration: '1441' }));
  assert.throws(() => parseHealthDraft({ ...value('lab'), label: '' }));
});
test('trends keep units, glucose contexts and named laboratory tests separate', () => {
  const draft = value();
  assert.notEqual(trendKey(draft), trendKey({ ...draft, unit: 'mmol/L' }));
  assert.notEqual(trendKey(draft), trendKey({ ...draft, context: 'Fasting' }));
  assert.notEqual(
    trendKey({ ...value('lab'), label: 'A' }),
    trendKey({ ...value('lab'), label: 'B' }),
  );
  for (const record of seedHealthRecords())
    assert.deepEqual(parseHealthDraft(record), parseHealthDraft(parseHealthDraft(record)));
});
test('demo records survive reads; edits, deletes and reset remain isolated from other sessions and clinician data', async () => {
  const first = await create(),
    second = await create();
  const patientBefore = await (await fetch(`${base}/patient`)).json();
  const request = (body: Record<string, unknown>) =>
    post({ sessionId: first.id, syntheticOnly: true, ...body });
  const response = await request({ action: 'save', record: value() });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  let state: HealthSession = await response.json();
  const recordId = state.records.at(-1)!.id;
  assert.equal(state.records.length, first.records.length + 1);
  assert.equal(state.records.at(-1)!.source, 'manual');
  state = await (await request({ action: 'read' })).json();
  assert.equal(state.records.at(-1)!.id, recordId);
  state = await (
    await request({ action: 'save', recordId, record: { ...value(), value: '109' } })
  ).json();
  assert.equal(state.records.at(-1)!.value, '109');
  assert.equal(
    (await post({ action: 'delete', sessionId: second.id, syntheticOnly: true, recordId })).status,
    400,
  );
  state = await (await request({ action: 'delete', recordId })).json();
  assert.equal(state.records.length, first.records.length);
  await request({ action: 'save', record: value('walking') });
  state = await (await request({ action: 'reset' })).json();
  assert.deepEqual(state.records, seedHealthRecords());
  assert.deepEqual(
    (await (await post({ action: 'read', sessionId: second.id })).json()).records,
    second.records,
  );
  assert.deepEqual(await (await fetch(`${base}/patient`)).json(), patientBefore);
});
test('only bundled simulated reports can be imported, with review, atomic validation and duplicate protection', async () => {
  const session = await create();
  const report = demoReports[0];
  const body = {
    action: 'import',
    sessionId: session.id,
    syntheticOnly: true,
    reportId: report.id,
    confirmed: true,
    records: report.fields.map((f) => f.draft),
  };
  for (const change of [
    { reportId: 'real-upload.pdf' },
    { confirmed: false },
    { syntheticOnly: false },
    { records: [] },
    { records: [report.fields[0].draft, { ...report.fields[1].draft, value: 'bad' }] },
  ])
    assert.equal((await post({ ...body, ...change })).status, 400);
  assert.equal(
    (await (await post({ action: 'read', sessionId: session.id })).json()).records.length,
    session.records.length,
  );
  const records = body.records.map((r) => ({ ...r }));
  records[1].referenceRange = '4.0–5.6';
  const response = await post({ ...body, records });
  assert.equal(response.status, 200);
  const state: HealthSession = await response.json();
  assert.equal(state.records.at(-1)!.referenceRange, '4.0–5.6');
  assert.equal(state.records.at(-1)!.source, 'simulated-report');
  assert.equal(state.records.at(-1)!.reportId, report.id);
  assert.equal((await post(body)).status, 400);
  assert.equal(
    (await fetch(`${base}/health-demo/reports`)).headers.get('cache-control'),
    'no-store',
  );
});
test('demo API rejects missing sessions, missing fictional confirmation and arbitrary uploads', async () => {
  assert.equal((await post({ action: 'read', sessionId: 'unknown' })).status, 404);
  const session = await create();
  assert.equal(
    (await post({ action: 'save', sessionId: session.id, record: value() })).status,
    400,
  );
  assert.equal(
    (await post({ action: 'upload', sessionId: session.id, syntheticOnly: true })).status,
    400,
  );
  assert.equal(
    (await fetch(`${base}/health-demo/upload`, { method: 'POST', body: 'pretend file' })).status,
    404,
  );
});
