import { test, expect } from '@playwright/test';
import { signIn, testCredentials } from './helpers';
import { emptyHealthDraft, type HealthDraft } from '../../shared/health';

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

test('body map supports range flags, proportional history and keyboard/mobile access', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const records: Partial<HealthDraft>[] = [
    {
      label: 'Creatinine',
      value: '0.9',
      referenceRange: '0.6-1.2',
      measuredAt: '2025-01-01T09:00',
    },
    {
      label: 'Creatinine',
      value: '1.1',
      referenceRange: '0.6-1.2',
      measuredAt: '2025-12-01T09:00',
    },
    {
      label: 'Creatinine',
      value: '1.4',
      referenceRange: '0.6-1.2',
      measuredAt: '2026-01-15T09:00',
    },
    { label: 'SGPT', value: '52', unit: 'U/L', referenceRange: '0-40' },
    {
      label: 'SGOT',
      value: '60',
      unit: 'U/L',
      referenceRange: '0-40',
      measuredAt: '2025-10-01T09:00',
    },
    { label: 'SGOT', value: '32', unit: 'U/L', referenceRange: '0-40' },
    { label: 'Total cholesterol', value: '230', referenceRange: '<200' },
    { label: 'Vitamin D', value: '18', unit: 'ng/mL', referenceRange: '30-100 ng/mL' },
    { label: 'HbA1c', value: '5.8', unit: '%', referenceRange: '4.0-5.6' },
    { label: 'Unknown test', value: '12', referenceRange: 'See report note' },
  ];
  for (const record of records) {
    const response = await page.request.post('/api/health-demo', {
      headers: { Origin: 'http://127.0.0.1:3001' },
      data: {
        action: 'save',
        syntheticOnly: true,
        record: { ...emptyHealthDraft('lab'), unit: 'mg/dL', ...record },
      },
    });
    expect(response.ok()).toBe(true);
  }
  await page.goto('/');
  const summary = page.getByRole('region', { name: 'Patient summary', exact: true });
  const open = summary.getByRole('button', { name: 'Body map', exact: true });
  await expect(open).toBeEnabled();
  const tileBounds = (await summary.boundingBox())!;
  const buttonBounds = (await open.boundingBox())!;
  expect(buttonBounds.x + buttonBounds.width / 2).toBeGreaterThan(
    tileBounds.x + tileBounds.width / 2,
  );
  expect(buttonBounds.x + buttonBounds.width).toBeLessThanOrEqual(tileBounds.x + tileBounds.width);
  expect(buttonBounds.y + buttonBounds.height).toBeLessThanOrEqual(
    tileBounds.y + tileBounds.height,
  );
  expect(await summary.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
    true,
  );
  await summary.screenshot({ path: testInfo.outputPath('patient-summary-body-map.png') });
  await open.click();
  const dialog = page.getByRole('dialog', { name: 'Body map', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close body map' })).toBeFocused();
  await dialog.getByRole('button', { name: '2D map', exact: true }).click();
  await expect(dialog.getByText('5', { exact: true }).first()).toBeVisible();
  const silhouette = dialog.getByRole('img', { name: 'Schematic front-facing human body' });
  await expect
    .poll(() =>
      silhouette.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
    )
    .toBe(true);
  const kidneys = dialog.getByRole('button', {
    name: 'Kidney-related tests / right: 1 outside-range series',
    exact: true,
  });
  await expect(kidneys).toHaveClass(/is-flagged/);
  const marker = await kidneys.locator('.body-organ-shape').boundingBox();
  expect(marker!.width).toBeGreaterThan(20);
  expect(marker!.height).toBeGreaterThan(20);
  const checkbox = await dialog.getByLabel('Outside range only').boundingBox();
  expect(checkbox!.width).toBeLessThan(25);
  expect(checkbox!.height).toBeLessThan(25);
  if (testInfo.project.name === 'desktop-edge') {
    await kidneys.hover();
    await expect(dialog.locator('.body-preview')).toContainText('Creatinine');
    await expect(dialog.locator('.body-preview')).toContainText('1.4 mg/dL');
  }
  await kidneys.click();
  await dialog
    .getByRole('button', { name: 'View Creatinine history / mg/dL', exact: true })
    .click();
  const chart = dialog.getByRole('img', {
    name: 'Creatinine: values versus demo-local time in mg/dL',
    exact: true,
  });
  await expect(chart).toBeVisible();
  const history = dialog.getByRole('table', { name: 'Creatinine exact history' });
  await expect(history.getByRole('row')).toHaveCount(4);
  await expect(history.getByText('1.4 mg/dL', { exact: true })).toBeVisible();
  const positions = await chart
    .locator('circle')
    .evaluateAll((circles) => circles.map((circle) => Number(circle.getAttribute('cx'))));
  expect(positions[1] - positions[0]).toBeGreaterThan((positions[2] - positions[1]) * 5);
  await history.getByRole('button', { name: '2025-01-01 / 09:00', exact: true }).click();
  await expect(dialog.locator('.body-source summary')).toContainText('2025-01-01');
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await dialog.screenshot({ path: testInfo.outputPath('body-history.png') });
  await dialog.evaluate((element) => {
    element.scrollTop = 0;
  });
  await dialog.screenshot({ path: testInfo.outputPath('body-map.png') });
  await dialog
    .getByRole('navigation', { name: 'Report groups' })
    .getByRole('button', { name: /General and systemic/ })
    .click();
  await dialog.getByRole('button', { name: 'View Vitamin D history / ng/mL', exact: true }).click();
  await expect(
    dialog.getByRole('table', { name: 'Vitamin D exact history' }).getByText('Below report range'),
  ).toBeVisible();
  await dialog.getByLabel('Outside range only').uncheck();
  await dialog
    .getByRole('button', { name: 'View Unknown test history / mg/dL', exact: true })
    .click();
  await expect(
    dialog
      .getByRole('table', { name: 'Unknown test exact history' })
      .getByText('Range not comparable'),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(open).toBeFocused();
  await expect(page.getByRole('form', { name: 'Manual health entry' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('body map treats missing ranges as unknown and opens reviewed report provenance', async ({
  page,
}) => {
  await page.goto('/');
  const open = page.getByRole('button', { name: 'Body map', exact: true });
  await open.click();
  const dialog = page.getByRole('dialog', { name: 'Body map', exact: true });
  await expect(
    dialog.getByText('No latest readings outside a comparable report range in this group.'),
  ).toBeVisible();
  await expect(dialog.locator('.body-region.is-flagged')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Close body map' }).click();
  const library = page.getByRole('region', { name: 'Synthetic report library' });
  await library.getByRole('button', { name: 'Simulate extraction', exact: true }).click();
  const review = page.getByRole('form', { name: 'Review simulated extraction' });
  await review.getByLabel('Printed reference range (optional)').nth(1).fill('4.0-5.6');
  await review.getByRole('checkbox').check();
  await review.getByRole('button', { name: 'Confirm and save report', exact: true }).click();
  await expect(
    page.getByText('Report results saved after user review. Not clinically verified.', {
      exact: true,
    }),
  ).toBeVisible();
  await open.click();
  await dialog.getByRole('button', { name: 'View HbA1c history / %', exact: true }).click();
  await dialog.locator('.body-source summary').click();
  await expect(dialog.locator('.body-source pre')).toContainText('HbA1c: 5.8');
  await expect(dialog.locator('.body-source')).toContainText('SYN-REPORT-001');
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
  await expect(selector.locator('option')).toHaveCount(200);
  const option = selector.locator('option').filter({ hasText: name });
  await selector.selectOption((await option.getAttribute('value')) as string);
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(
    page
      .getByRole('region', { name: 'Patient summary', exact: true })
      .getByRole('button', { name: 'Body map', exact: true }),
  ).toBeEnabled();
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

test('doctor body map follows the selected shared patient and closes after access is revoked', async ({
  page,
  browser,
}, testInfo) => {
  const mobile = testInfo.project.name === 'mobile-chromium';
  const name = mobile ? 'Jordan Lee' : 'Sam Taylor';
  const otherName = mobile ? 'Sam Taylor' : 'Jordan Lee';
  const value = mobile ? '1.62' : '1.41';
  const headers = { Origin: 'http://127.0.0.1:3001' };
  for (const record of [
    { value: '0.91', measuredAt: '2025-11-01T09:00' },
    { value, measuredAt: '2026-01-15T09:00' },
  ]) {
    const saved = await page.request.post('/api/health-demo', {
      headers,
      data: {
        action: 'save',
        syntheticOnly: true,
        record: {
          ...emptyHealthDraft('lab'),
          label: 'Serum creatinine',
          unit: 'mg/dL',
          referenceRange: '0.6-1.2',
          ...record,
        },
      },
    });
    expect(saved.ok()).toBe(true);
  }
  const ownResponse = await page.request.post('/api/health-demo', {
    headers,
    data: { action: 'read' },
  });
  expect(ownResponse.ok()).toBe(true);
  const own = await ownResponse.json();
  const doctorsResponse = await page.request.get('/api/care/sharing');
  expect(doctorsResponse.ok()).toBe(true);
  const doctors: { id: string; name: string }[] = await doctorsResponse.json();
  const avery = doctors.find((doctor) => doctor.name === 'Dr Avery Chen')!;
  const doctorContext = await browser.newContext({
    baseURL: 'http://127.0.0.1:3001',
    viewport: page.viewportSize(),
    isMobile: mobile,
    hasTouch: mobile,
  });
  try {
    const doctorPage = await doctorContext.newPage();
    await signIn(doctorPage, 'avery@doctor.example');
    await doctorPage.goto('/');
    const selector = doctorPage.getByRole('combobox', { name: 'Current patient', exact: true });
    await expect(selector.locator('option').filter({ hasText: name })).toHaveCount(1);
    await expect(selector.locator('option').filter({ hasText: 'Casey Patel' })).toHaveCount(0);
    await expect(doctorPage.getByRole('button', { name: 'Body map', exact: true })).toHaveCount(0);
    await selector.selectOption(own.patient.id);
    const open = doctorPage
      .getByRole('region', { name: 'Patient summary', exact: true })
      .getByRole('button', { name: 'Body map', exact: true });
    await open.click();
    const dialog = doctorPage.getByRole('dialog', { name: 'Body map', exact: true });
    await expect(dialog.locator('.body-map-header .body-overline')).toHaveText(
      `PATIENT RECORDS / ${name}`,
    );
    await dialog.getByRole('button', { name: '2D map', exact: true }).click();
    await expect(
      dialog.getByRole('button', {
        name: 'Kidney-related tests / right: 1 outside-range series',
        exact: true,
      }),
    ).toHaveClass(/is-flagged/);
    await dialog
      .getByRole('button', { name: 'View Serum creatinine history / mg/dL', exact: true })
      .click();
    const history = dialog.getByRole('table', { name: 'Serum creatinine exact history' });
    await expect(history.getByRole('row')).toHaveCount(3);
    await expect(history.getByText(`${value} mg/dL`, { exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Edit entry|Delete entry|Save/ })).toHaveCount(
      0,
    );
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
    await dialog.screenshot({ path: testInfo.outputPath('doctor-body-map.png') });
    await doctorPage.keyboard.press('Escape');
    await expect(open).toBeFocused();
    const otherId = await selector
      .locator('option')
      .filter({ hasText: otherName })
      .getAttribute('value');
    await selector.selectOption(otherId!);
    await expect(dialog).toHaveCount(0);
    await expect(doctorPage.getByRole('heading', { name: otherName, exact: true })).toBeVisible();
    await open.click();
    await expect(dialog.locator('.body-map-header .body-overline')).toHaveText(
      `PATIENT RECORDS / ${otherName}`,
    );
    await expect(dialog.getByText(`${value} mg/dL`, { exact: true })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Close body map' }).click();
    await selector.selectOption(own.patient.id);
    await open.click();
    const revoked = await page.request.post('/api/care/sharing', {
      headers,
      data: { doctorId: avery.id, active: false, syntheticOnly: true },
    });
    expect(revoked.ok()).toBe(true);
    expect((await doctorPage.request.get(`/api/care/patients/${own.patient.id}`)).status()).toBe(
      404,
    );
    await doctorPage.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(dialog).toHaveCount(0);
    await expect(selector.locator(`option[value="${own.patient.id}"]`)).toHaveCount(0);
    await expect(doctorPage.getByRole('button', { name: 'Body map', exact: true })).toHaveCount(0);
    expect(await doctorPage.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  } finally {
    const restored = await page.request.post('/api/care/sharing', {
      headers,
      data: { doctorId: avery.id, active: true, syntheticOnly: true },
    });
    await doctorContext.close();
    expect(restored.ok()).toBe(true);
  }
});

test('expanded sample profiles render distinct interactive 3D hotspots and preserve history', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const profile =
    testInfo.project.name === 'desktop-edge'
      ? {
          email: 'sam@patient.example',
          group: 'circulation',
          label: 'Total cholesterol',
          unit: 'mg/dL',
          expected: 'Above report range',
        }
      : {
          email: 'casey@patient.example',
          group: 'general',
          label: 'Vitamin B12',
          unit: 'pg/mL',
          expected: 'Below report range',
        };
  await page.context().clearCookies();
  await signIn(page, profile.email);
  await page.request.post('/api/health-demo', {
    headers: { Origin: 'http://127.0.0.1:3001' },
    data: { action: 'reset', syntheticOnly: true },
  });
  await page.goto('/');
  const sources = page.getByRole('region', { name: 'Reports and connected apps' });
  const load = sources.getByRole('button', { name: 'Load sample checkups', exact: true });
  await expect(load).toBeEnabled();
  page.once('dialog', (dialog) => dialog.accept());
  await load.click();
  const dialog = page.getByRole('dialog', { name: 'Body map', exact: true });
  await expect(dialog).toBeVisible();
  const canvas = dialog.getByRole('img', { name: 'Interactive 3D anatomical body map' });
  await expect(canvas).toHaveAttribute('data-ready', 'true');
  const pixels = await canvas.evaluate((element: HTMLCanvasElement) => {
    const copy = document.createElement('canvas');
    copy.width = element.width;
    copy.height = element.height;
    const context = copy.getContext('2d')!;
    context.drawImage(element, 0, 0);
    const data = context.getImageData(0, 0, copy.width, copy.height).data;
    let painted = 0;
    const colors = new Set<number>();
    for (let index = 0; index < data.length; index += 16) {
      if (data[index + 3] > 20) {
        painted++;
        colors.add((data[index] << 16) | (data[index + 1] << 8) | data[index + 2]);
      }
    }
    return { painted, colors: colors.size };
  });
  expect(pixels.painted).toBeGreaterThan(1000);
  expect(pixels.colors).toBeGreaterThan(100);
  const hotspot = dialog.locator(`.scene-hotspot[data-group="${profile.group}"]`);
  expect(Number(await hotspot.getAttribute('data-count'))).toBeGreaterThanOrEqual(8);
  expect(Number(await hotspot.getAttribute('data-radius'))).toBeGreaterThan(0.4);
  await hotspot.click();
  await expect(hotspot).toHaveAttribute('aria-pressed', 'true');
  const start = await canvas.getAttribute('data-azimuth');
  await dialog.getByRole('button', { name: 'Rotate body', exact: true }).click();
  await expect.poll(() => canvas.getAttribute('data-azimuth')).not.toBe(start);
  await dialog.getByRole('button', { name: 'Reset body orientation' }).click();
  await dialog.getByLabel('Find a measurement').fill(profile.label);
  await dialog
    .getByRole('button', { name: `View ${profile.label} history / ${profile.unit}`, exact: true })
    .click();
  const history = dialog.getByRole('table', { name: `${profile.label} exact history` });
  await expect(history.getByRole('row')).toHaveCount(4);
  await expect(history.getByText(profile.expected).last()).toBeVisible();
  await dialog.evaluate((element) => {
    element.scrollTop = 0;
  });
  await dialog.screenshot({ path: testInfo.outputPath('3d-profile.png') });
  await canvas.screenshot({ path: testInfo.outputPath('3d-canvas.png') });
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await dialog.getByRole('button', { name: 'Close body map' }).click();
  await expect(sources.getByRole('button', { name: 'Sample checkups loaded' })).toBeDisabled();
  await page.reload();
  await expect(sources.getByRole('button', { name: 'Sample checkups loaded' })).toBeDisabled();
  expect(errors).toEqual([]);
});

test('loaded profile sources and readings survive WebGL loss without changing extraction drafts', async ({
  page,
}, testInfo) => {
  const response = await page.request.post('/api/health-demo', {
    headers: { Origin: 'http://127.0.0.1:3001' },
    data: { action: 'load-checkups', confirmed: true, syntheticOnly: true },
  });
  expect(response.ok()).toBe(true);
  await page.goto('/');
  await page.getByRole('button', { name: 'Body map', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Body map', exact: true });
  const canvas = dialog.getByRole('img', { name: 'Interactive 3D anatomical body map' });
  await expect(canvas).toHaveAttribute('data-ready', 'true');
  if (testInfo.project.name === 'mobile-chromium') {
    for (const group of ['liver', 'kidneys']) {
      expect(
        Number(
          await dialog.locator(`.scene-hotspot[data-group="${group}"]`).getAttribute('data-count'),
        ),
      ).toBeGreaterThan(2);
    }
  }
  await dialog.getByRole('button', { name: 'Start rotation' }).click();
  const azimuth = await canvas.getAttribute('data-azimuth');
  await expect.poll(() => canvas.getAttribute('data-azimuth')).not.toBe(azimuth);
  await dialog.getByRole('button', { name: 'Pause rotation' }).click();
  await dialog.getByRole('button', { name: 'Reset body orientation' }).click();
  await canvas.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await canvas.screenshot({ path: testInfo.outputPath('3d-organ-profile.png') });
  const summary = await dialog.getByLabel('Latest report comparison summary').innerText();
  await canvas.evaluate((element) =>
    element.dispatchEvent(new Event('webglcontextlost', { cancelable: true })),
  );
  await expect(dialog.getByRole('status')).toContainText('3D unavailable');
  await expect(dialog.getByRole('button', { name: '3D anatomy', exact: true })).toBeDisabled();
  await expect(
    dialog.getByRole('img', { name: 'Schematic front-facing human body' }),
  ).toBeVisible();
  await expect(dialog.getByLabel('Latest report comparison summary')).toHaveText(summary, {
    useInnerText: true,
  });
  await dialog.getByRole('button', { name: 'Close body map' }).click();
  const library = page.getByRole('region', { name: 'Synthetic report library' });
  await library.getByRole('button', { name: 'Simulate extraction', exact: true }).click();
  const review = page.getByRole('form', { name: 'Review simulated extraction' });
  await review.getByLabel('Notes (fictional only)').first().fill('Unsaved extraction review');
  const timeline = page.getByRole('region', { name: 'Health record timeline' });
  await timeline.getByLabel('Search records').fill('Creatinine');
  await timeline
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: 'Creatinine', exact: true }) })
    .getByRole('button', { name: 'View source SYN-CHECKUP-V1-2026-01-15', exact: true })
    .click();
  const sources = page.getByRole('region', { name: 'Saved source reports' });
  await expect(sources.locator('details[open] pre')).toContainText('Creatinine');
  await expect(library.getByLabel('Sample report')).toHaveValue('SYN-REPORT-001');
  await expect(review.getByLabel('Notes (fictional only)').first()).toHaveValue(
    'Unsaved extraction review',
  );
});

test('provider previews only open coming-soon dialogs without credentials or external requests', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  const external: string[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:3001') && !request.url().startsWith('data:'))
      external.push(request.url());
  });
  const sources = page.getByRole('region', { name: 'Reports and connected apps' });
  for (const category of ['Labs and hospitals', 'Fitness and wearables']) {
    await sources.getByRole('button', { name: category, exact: true }).click();
    await sources.screenshot({
      path: testInfo.outputPath(
        `${category.startsWith('Labs') ? 'labs' : 'wearables'}-providers.png`,
      ),
    });
    const buttons = sources.getByRole('button', { name: /Coming soon$/ });
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(6);
    for (let index = 0; index < count; index++) {
      await buttons.nth(index).click();
      const modal = page.getByRole('dialog', { name: 'Coming soon', exact: true });
      await expect(modal).toBeVisible();
      await expect(modal.locator('input')).toHaveCount(0);
      await expect(modal).toContainText('No login, credentials, device permissions or reports');
      await page.keyboard.press('Escape');
      await expect(buttons.nth(index)).toBeFocused();
    }
  }
  expect(external).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
