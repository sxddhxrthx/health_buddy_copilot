import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { testApplication } from './helpers.js';
import type { CareSnapshot } from '../shared/care.js';
import { demoReports, seedHealthRecords } from '../server/health-data.js';
import { CHECKUP_TESTS, CHECKUP_REPORT_IDS, sampleCheckups } from '../server/checkup-data.js';
import { emptyHealthDraft, parseHealthDraft, trendKey, type HealthKind } from '../shared/health.js';
import {
  bodyGroupFor,
  buildReportSeries,
  compareReportRange,
  parseReportRange,
} from '../shared/report-ranges.js';

const app = await testApplication();
after(app.close);
const post = (body: unknown) => app.request('sam@patient.example', 'health-demo', body);
const create = async (): Promise<CareSnapshot> => (await post({ action: 'read' })).json();
const value = (kind: HealthKind = 'glucose') => ({ ...emptyHealthDraft(kind), value: '100' });

test('expanded checkups are bounded, reproducible and produce three distinct latest-reading patterns', () => {
  assert.ok(CHECKUP_TESTS.length >= 100);
  assert.equal(new Set(CHECKUP_TESTS.map((entry) => entry.label)).size, CHECKUP_TESTS.length);
  for (const persona of ['SYN-USER-001', 'SYN-USER-002', 'SYN-USER-003']) {
    const samples = sampleCheckups({ name: 'Fictional patient', persona });
    assert.deepEqual(samples, sampleCheckups({ name: 'Fictional patient', persona }));
    assert.equal(samples.reports.length, 3);
    assert.ok(samples.records.length + 16 < 500);
    assert.equal(new Set(samples.records.map((record) => record.id)).size, samples.records.length);
    for (const record of samples.records) {
      assert.ok(CHECKUP_REPORT_IDS.includes(record.reportId!));
      assert.doesNotThrow(() => parseHealthDraft(record));
    }
    const series = buildReportSeries(samples.records);
    assert.equal(series.length, CHECKUP_TESTS.length);
    assert.ok(series.every((item) => item.points.length === 3));
    const flagged = series.filter((item) =>
      item.latest.some((point) => ['above', 'below'].includes(point.status)),
    );
    const count = (group: string) => flagged.filter((item) => item.group === group).length;
    if (persona === 'SYN-USER-001')
      assert.ok(count('circulation') >= 8 && count('liver') === 0 && count('kidneys') === 0);
    if (persona === 'SYN-USER-002')
      assert.ok(count('liver') >= 5 && count('kidneys') >= 5 && count('circulation') === 0);
    if (persona === 'SYN-USER-003')
      assert.ok(
        count('general') >= 10 &&
          flagged.filter((item) => item.latest[0].status === 'below').length >= 10,
      );
    assert.ok(!series.some((item) => item.label === 'Urine culture'));
  }
});

test('report comparison uses only explicit ranges and honors open and closed bounds', () => {
  for (const reference of ['0.6-1.2', '0.6\u20131.2', '0.6 to 1.2', '0.6 - 1.2 mg/dL']) {
    const range = parseReportRange(reference, 'mg/dL');
    assert.equal(compareReportRange(1.2, range), 'within');
    assert.equal(compareReportRange(1.21, range), 'above');
    assert.equal(compareReportRange(0.5, range), 'below');
  }
  assert.equal(compareReportRange(1.2, parseReportRange('< 1.2', 'mg/dL')), 'above');
  assert.equal(compareReportRange(1.2, parseReportRange('<= 1.2', 'mg/dL')), 'within');
  assert.equal(compareReportRange(30, parseReportRange('> 30', 'ng/mL')), 'below');
  assert.equal(compareReportRange(30, parseReportRange('\u2265 30', 'ng/mL')), 'within');
  assert.equal(compareReportRange(1.3, parseReportRange('0.6-1.5', 'mg/dL')), 'within');
  for (const reference of [
    '',
    '1.2',
    'see note',
    'male 0.6-1.2; female 0.5-1.1',
    '0.6-1.2 mmol/L',
    '2-1',
    '0,6-1,2',
    'normal',
    '1e2-2e2',
  ])
    assert.equal(
      compareReportRange(1.3, parseReportRange(reference, 'mg/dL')),
      'unknown',
      reference,
    );
  assert.equal(parseReportRange('1-2', 'Other'), null);
  assert.equal(compareReportRange(NaN, parseReportRange('1-2', 'mg/dL')), 'unknown');
});

test('body map preserves named series, units, contexts, tied readings and each report range', () => {
  const lab = {
    ...emptyHealthDraft('lab'),
    label: 'Creatinine',
    unit: 'mg/dL',
    source: 'manual' as const,
    referenceRange: '0.6-1.2',
    value: '1.4',
  };
  const groups = buildReportSeries([
    { ...lab, id: 'old', measuredAt: '2025-12-01T09:00' },
    { ...lab, id: 'new', measuredAt: '2026-01-15T09:00', value: '1.3', referenceRange: '0.6-1.5' },
    { ...lab, id: 'tie', measuredAt: '2026-01-15T09:00', value: '1.1' },
    { ...lab, id: 'units', unit: 'mmol/L' },
    { ...lab, id: 'different', label: 'Serum creatinine' },
    { ...lab, id: 'context', context: 'Fasting' },
  ]);
  assert.equal(groups.length, 4);
  const history = groups.find((group) => group.points.length === 3)!;
  assert.equal(history.group, 'kidneys');
  assert.equal(history.latest.length, 2);
  assert.equal(history.points[0].status, 'above');
  assert.equal(history.points[1].status, 'within');
  assert.equal(history.points[2].status, 'within');
  assert.equal(bodyGroupFor('SGOT (AST)'), 'liver');
  assert.equal(bodyGroupFor('Vitamin D'), 'general');
  assert.equal(bodyGroupFor('HbA1c'), 'general');
  assert.equal(bodyGroupFor('Creatinine comment mentions liver'), 'general');
  const bloodPressure = buildReportSeries([
    {
      ...emptyHealthDraft('bp'),
      id: 'bp',
      source: 'manual',
      value: '125',
      secondary: '75',
      pulse: '72',
      referenceRange: '90-120 / 60-80',
    },
  ]);
  assert.equal(
    bloodPressure.find((group) => group.label === 'Systolic blood pressure')!.latest[0].status,
    'above',
  );
  assert.equal(
    bloodPressure.find((group) => group.label === 'Diastolic blood pressure')!.latest[0].status,
    'within',
  );
  assert.equal(bloodPressure.find((group) => group.label === 'Pulse')!.latest[0].status, 'unknown');
});

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

test('report ranges and vitamin or vital units survive parsing without clinical defaults', () => {
  for (const unit of ['ng/mL', 'pg/mL', 'nmol/L', 'bpm', 'mmHg', 'IU/L']) {
    const record = parseHealthDraft({
      ...value('lab'),
      label: 'Source test name',
      unit,
      referenceRange: '20-80',
    });
    assert.equal(record.unit, unit);
    assert.equal(record.referenceRange, '20-80');
  }
  const bloodPressure = parseHealthDraft({
    ...value('bp'),
    secondary: '70',
    referenceRange: '90-120 / 60-80',
  });
  assert.equal(bloodPressure.referenceRange, '90-120 / 60-80');
  assert.equal(parseHealthDraft(value('glucose')).referenceRange, '');
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
test('demo records survive reads; edits, deletes and reset remain isolated from other patients and reference data', async () => {
  const first = await create(),
    second: CareSnapshot = await (
      await app.request('jordan@patient.example', 'health-demo', { action: 'read' })
    ).json();
  const patientBefore = await (await app.request('avery@doctor.example', 'patient')).json();
  const request = (body: Record<string, unknown>) => post({ syntheticOnly: true, ...body });
  const response = await request({ action: 'save', record: value() });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  let state: CareSnapshot = await response.json();
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
    (
      await app.request('jordan@patient.example', 'health-demo', {
        action: 'delete',
        syntheticOnly: true,
        recordId,
      })
    ).status,
    404,
  );
  state = await (await request({ action: 'delete', recordId })).json();
  assert.equal(state.records.length, first.records.length);
  await request({ action: 'save', record: value('walking') });
  state = await (await request({ action: 'reset' })).json();
  assert.deepEqual(
    state.records.map(({ id: _id, ...record }) => record),
    seedHealthRecords().map(({ id: _id, ...record }) => record),
  );
  assert.deepEqual(
    (await (await app.request('jordan@patient.example', 'health-demo', { action: 'read' })).json())
      .records,
    second.records,
  );
  assert.deepEqual(
    await (await app.request('avery@doctor.example', 'patient')).json(),
    patientBefore,
  );
});
test('only bundled simulated reports can be imported, with review, atomic validation and duplicate protection', async () => {
  const session = await create();
  const report = demoReports[0];
  const body = {
    action: 'import',
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
    (await (await post({ action: 'read' })).json()).records.length,
    session.records.length,
  );
  const records = body.records.map((r) => ({ ...r }));
  records[1].referenceRange = '4.0–5.6';
  const response = await post({ ...body, records });
  assert.equal(response.status, 200);
  const state: CareSnapshot = await response.json();
  assert.equal(state.records.at(-1)!.referenceRange, '4.0–5.6');
  assert.equal(state.records.at(-1)!.source, 'simulated-report');
  assert.equal(state.records.at(-1)!.reportId, report.id);
  assert.equal((await post(body)).status, 400);
  for (const record of state.records.filter((record) => record.reportId === report.id))
    await post({ action: 'delete', recordId: record.id, syntheticOnly: true });
  assert.equal((await post(body)).status, 400);
  assert.equal(
    (await app.request('sam@patient.example', 'health-demo/reports')).headers.get('cache-control'),
    'no-store',
  );
});
test('demo API rejects missing authentication, missing fictional confirmation and arbitrary uploads', async () => {
  assert.equal((await app.request(null, 'health-demo', { action: 'read' })).status, 401);
  assert.equal((await post({ action: 'save', record: value() })).status, 400);
  assert.equal((await post({ action: 'upload', syntheticOnly: true })).status, 400);
  assert.equal((await app.request('avery@doctor.example', 'health-demo/upload', {})).status, 404);
});

test('sample checkups load atomically once, preserve records and enforce patient ownership and capacity', async () => {
  await post({ action: 'reset', syntheticOnly: true });
  const before = await create();
  assert.equal((await post({ action: 'load-checkups', syntheticOnly: true })).status, 400);
  assert.equal(
    (
      await app.request('avery@doctor.example', 'health-demo', {
        action: 'load-checkups',
        syntheticOnly: true,
        confirmed: true,
      })
    ).status,
    403,
  );
  const loaded = await post({ action: 'load-checkups', syntheticOnly: true, confirmed: true });
  assert.equal(loaded.status, 200);
  const next: CareSnapshot = await loaded.json();
  assert.equal(next.records.length, before.records.length + before.sampleCheckups.records);
  assert.ok(before.records.every((record) => next.records.some((item) => item.id === record.id)));
  assert.equal(next.reports.length, 5);
  assert.equal(next.sampleCheckups.loaded, true);
  assert.equal(
    (await post({ action: 'load-checkups', syntheticOnly: true, confirmed: true })).status,
    400,
  );
  const shared: CareSnapshot = await (
    await app.request('avery@doctor.example', `care/patients/${next.patient.id}`)
  ).json();
  assert.deepEqual(shared.records, next.records);
  const sample = next.records.find((record) => record.source === 'synthetic-checkup')!;
  await post({ action: 'delete', recordId: sample.id, syntheticOnly: true });
  assert.equal(
    (await post({ action: 'load-checkups', syntheticOnly: true, confirmed: true })).status,
    400,
  );
  await post({ action: 'reset', syntheticOnly: true });
  const insert = app.runtime.database.prepare('INSERT INTO health_records VALUES (?, ?, ?)');
  for (let index = 0; index < 130; index++) {
    const record = { ...before.records[0], id: `checkup-capacity-${index}` };
    insert.run(record.id, before.patient.id, JSON.stringify(record));
  }
  const full = await create();
  assert.equal(
    (await post({ action: 'load-checkups', syntheticOnly: true, confirmed: true })).status,
    400,
  );
  assert.deepEqual((await create()).records, full.records);
  assert.equal((await create()).sampleCheckups.loaded, false);
  await post({ action: 'reset', syntheticOnly: true });
});
