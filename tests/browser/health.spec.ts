import { test, expect } from '@playwright/test';
import { signIn, testCredentials } from './helpers';

test.describe.configure({ mode: 'serial' });
test.beforeEach(async ({ page }, testInfo) => {
  const email =
    testInfo.project.name === 'desktop-edge' ? 'sam@patient.example' : 'jordan@patient.example';
  await signIn(page, email);
  const response = await page.request.post('/api/health-demo', {
    headers: { Origin: 'http://127.0.0.1:3001' },
    data: { action: 'reset', syntheticOnly: true },
  });
  expect(response.ok()).toBe(true);
});

test('personal persona supports manual entry, reload, edit, delete and reset', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto('/');
  await page.getByRole('button', { name: 'My Health', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Sam Taylor|Jordan Lee/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Buddy cohort', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Current patient', exact: true })).toHaveCount(0);
  const form = page.getByRole('form', { name: 'Manual health entry' });
  await expect(form).toBeVisible();
  await form.getByLabel('Value', { exact: true }).fill('111');
  await form.getByLabel('Glucose context').selectOption('After meal');
  await form.getByLabel('Notes (fictional only)').fill('Fictional browser test reading');
  await form.getByLabel('I am entering fictional demo data only.').check();
  await form.getByRole('button', { name: 'Save demo entry', exact: true }).click();
  await expect(page.getByText('Demo entry saved.', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'My Health', exact: true }).click();
  const timeline = page.getByRole('region', { name: 'Health record timeline' });
  await expect(timeline.getByText('Fictional browser test reading', { exact: true })).toBeVisible();
  const entry = timeline.getByRole('article').filter({ hasText: 'Fictional browser test reading' });
  await entry.getByRole('button', { name: 'Edit entry', exact: true }).click();
  await form.getByLabel('Value', { exact: true }).fill('112');
  await form.getByLabel('I am entering fictional demo data only.').check();
  await form.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(entry.getByText('112 mg/dL', { exact: true })).toBeVisible();
  await entry.getByRole('button', { name: 'Delete entry', exact: true }).click();
  await expect(entry).toHaveCount(0);
  await form.getByRole('combobox', { name: 'Record type', exact: true }).selectOption('running');
  await form.getByLabel('Value', { exact: true }).fill('4.5');
  await form.getByRole('combobox', { name: 'Unit', exact: true }).selectOption('mi');
  await form.getByLabel('Duration (minutes, optional)').fill('40');
  await form.getByLabel('I am entering fictional demo data only.').check();
  await form.getByRole('button', { name: 'Save demo entry', exact: true }).click();
  await expect(timeline.getByText('4.5 mi', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reset demo records', exact: true }).click();
  await expect(page.getByText('Demo reset to seeded records.', { exact: true })).toBeVisible();
  await expect(timeline.getByRole('article')).toHaveCount(16);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('simulated scan requires review, supports correction and preserves source without real uploads', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'My Health', exact: true }).click();
  const library = page.getByRole('region', { name: 'Synthetic report library' });
  const timeline = page.getByRole('region', { name: 'Health record timeline' });
  await expect(library).toBeVisible();
  await expect(page.locator('input[type=file]')).toHaveCount(0);
  await library.getByRole('button', { name: 'Simulate extraction', exact: true }).click();
  await expect(
    library.getByRole('button', { name: 'Confirm and save report', exact: true }),
  ).toBeDisabled();
  await expect(timeline.getByRole('article')).toHaveCount(16);
  const review = page.getByRole('form', { name: 'Review simulated extraction' });
  await review.getByLabel('Printed reference range (optional)').nth(1).fill('4.0–5.6');
  await review.getByRole('checkbox').check();
  await review.getByRole('button', { name: 'Confirm and save report', exact: true }).click();
  await expect(timeline.getByRole('article')).toHaveCount(18);
  const result = timeline
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: 'HbA1c', exact: true }) });
  await expect(result.getByText(/Printed reference range: 4.0–5.6/)).toBeVisible();
  await expect(result.getByText(/Simulated report · user-confirmed/)).toBeVisible();
  await result.getByRole('button', { name: 'View source SYN-REPORT-001' }).click();
  await expect(
    library.getByRole('button', { name: 'Simulate extraction', exact: true }),
  ).toBeDisabled();
  await library.getByLabel('Sample report').selectOption('SYN-REPORT-002');
  await library.getByRole('button', { name: 'Simulate extraction', exact: true }).click();
  await review.getByRole('checkbox').check();
  await review.getByRole('button', { name: 'Confirm and save report', exact: true }).click();
  await expect(timeline.getByText('Seasonal allergic rhinitis', { exact: true })).toBeVisible();
  await timeline.getByLabel('Search records').fill('HbA1c');
  await expect(timeline.getByRole('article')).toHaveCount(1);
  await page.reload();
  await page.getByRole('button', { name: 'My Health', exact: true }).click();
  await expect(timeline.getByText('Seasonal allergic rhinitis', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('personal health handles API failure and requires sign-in after session loss', async ({
  page,
}) => {
  await page.route('**/api/health-demo', (route) =>
    route.fulfill({ status: 503, json: { error: 'Synthetic service unavailable' } }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'My Health', exact: true }).click();
  await expect(page.getByText('Synthetic service unavailable', { exact: true })).toBeVisible();
  await page.unroute('**/api/health-demo');
  await page.getByRole('button', { name: 'Retry My Health', exact: true }).click();
  await expect(page.getByRole('form', { name: 'Manual health entry' })).toBeVisible();
  await page.context().clearCookies();
  await page.reload();
  await expect(page.getByRole('form', { name: 'Sign in', exact: true })).toBeVisible();
  await expect(page.getByRole('form', { name: 'Manual health entry' })).toHaveCount(0);
});

test('doctor selects shared patients, publishes a visit, and patient cannot edit it', async ({
  page,
}, testInfo) => {
  const desktop = testInfo.project.name === 'desktop-edge';
  const email = desktop ? 'sam@patient.example' : 'jordan@patient.example';
  const name = desktop ? 'Sam Taylor' : 'Jordan Lee';
  await page.context().clearCookies();
  await page.goto('/');
  const credentials = testCredentials('avery@doctor.example');
  await page.getByLabel('Email', { exact: true }).fill(credentials.email);
  await page.getByLabel('Password', { exact: true }).fill(credentials.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'My Health', exact: true })).toHaveCount(0);
  const selector = page.getByRole('combobox', { name: 'Current patient', exact: true });
  await expect(selector.locator('option')).toHaveCount(3);
  const option = selector.locator('option').filter({ hasText: name });
  await selector.selectOption((await option.getAttribute('value')) as string);
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(page.getByRole('form', { name: 'Manual health entry' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Edit entry', exact: true })).toHaveCount(0);
  const form = page.getByRole('form', { name: 'Visit documentation' });
  const diagnosis = `Fictional browser visit ${testInfo.project.name} ${Date.now()}`;
  await form.getByLabel('Diagnosis (fictional)', { exact: true }).fill(diagnosis);
  await form
    .getByLabel('Medicine (fictional)', { exact: true })
    .fill('Demo medicine - not for use');
  await form.getByLabel('Dose', { exact: true }).fill('Fictional dose text');
  await form.getByLabel('Route', { exact: true }).fill('Fictional route');
  await form.getByLabel('Frequency', { exact: true }).fill('Fictional schedule');
  await form.getByLabel('Duration', { exact: true }).fill('Fictional duration');
  await form.getByRole('checkbox').check();
  await form.getByRole('button', { name: 'Save visit draft', exact: true }).click();
  await expect(page.getByText('Visit draft saved.', { exact: true })).toBeVisible();
  const visit = page
    .getByRole('article', { name: 'Visit by Dr Avery Chen' })
    .filter({ hasText: diagnosis });
  page.once('dialog', (dialog) => dialog.accept());
  await visit.getByRole('button', { name: 'Finalize visit', exact: true }).click();
  await expect(page.getByText('Visit finalized and published.', { exact: true })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('doctor-workspace.png') });
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await signIn(page, email);
  await page.reload();
  const patientVisit = page
    .getByRole('article', { name: 'Visit by Dr Avery Chen' })
    .filter({ hasText: diagnosis });
  await expect(patientVisit).toBeVisible();
  await expect(patientVisit.getByRole('button')).toHaveCount(0);
  await expect(
    patientVisit.getByText('Fictional dose text', { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByRole('form', { name: 'Visit documentation' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('patient-workspace.png') });
});
