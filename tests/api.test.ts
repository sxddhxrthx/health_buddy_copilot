import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_FILTERS, PROMPTS } from '../shared/contracts.js';
import { testApplication } from './helpers.js';

const app = await testApplication();
const base = app.base;
after(app.close);
const get = (path: string) => app.request('avery@doctor.example', path);
const post = (path: string, body: unknown) => app.request('avery@doctor.example', path, body);

test('patient and health API return synthetic data and no-store headers', async () => {
  for (const path of ['health', 'patient', 'study']) {
    const r = await get(path);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.ok(await r.json());
  }
});
test('cohort endpoint rejects malformed filters and does not expose source records', async () => {
  assert.equal((await post('cohort', { minScore: '90' })).status, 400);
  const r = await post('cohort', DEFAULT_FILTERS);
  const text = await r.text();
  assert.equal(r.status, 200);
  assert.doesNotMatch(text, /SYN-HIST/);
});
test('copilot recomputes aggregates rather than trusting client metrics', async () => {
  const r = await post('copilot', {
    question: PROMPTS[1],
    filters: DEFAULT_FILTERS,
    cohort: { size: 999999 },
  });
  assert.equal(r.status, 200);
  assert.doesNotMatch(await r.text(), /999999/);
});
test('copilot validates question and filter input', async () => {
  for (const body of [
    { question: '' },
    { question: ' ' },
    { question: 34 },
    { question: 'x'.repeat(1001) },
    { question: PROMPTS[0], filters: [] },
  ])
    assert.equal((await post('copilot', body)).status, 400);
});
test('review brief includes evidence appendix, missingness and human review boundary', async () => {
  const r = await post('brief', { filters: DEFAULT_FILTERS });
  assert.equal(r.status, 200);
  const { markdown } = await r.json();
  assert.match(markdown, /SYNTHETIC DEMO/);
  assert.match(markdown, /Evidence appendix/);
  assert.match(markdown, /MISS-001/);
  assert.match(markdown, /Calculation:/);
  assert.doesNotMatch(markdown, /SYN-HIST/);
});
test('unrecognized API route is JSON 404; oversized and invalid JSON requests are bounded', async () => {
  assert.equal((await get('historical-patients')).status, 404);
  assert.equal((await post('copilot', { question: 'x'.repeat(10000) })).status, 413);
  const r = await fetch(`${base}/cohort`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{bad json',
  });
  assert.equal(r.status, 400);
  assert.deepEqual(await r.json(), { error: 'Invalid request.' });
});
