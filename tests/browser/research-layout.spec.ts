import { test, expect, type Page } from '@playwright/test';
import { signIn } from './helpers';

test('expanded patients retain cohort components and switch recorded-condition details', async ({
  page,
}, testInfo) => {
  await signIn(page, 'avery@doctor.example');
  await page.goto('/');
  const selector = page.getByRole('combobox', { name: 'Current patient', exact: true });
  // 199 active grants plus the empty option; Casey's original Riley-only grant is preserved.
  await expect(selector.locator('option')).toHaveCount(200);
  await selector.selectOption({ label: 'Robin Brooks / SYN-USER-004' });
  await page.getByRole('button', { name: 'View cohort details', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Robin Brooks', exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Advanced heart failure', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Recorded condition', exact: true })
    .selectOption('Hypertension');
  await expect(page.getByRole('heading', { name: 'Hypertension', exact: true })).toBeVisible();
  await expect(page.getByText('40 independently generated fictional cases')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Advanced heart failure', exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('.cohort-hero')).toContainText('200 synthetic records');
  await expect(page.locator('.distribution-grid .distribution')).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('selected-patient-cohort.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Return to Current patient', exact: true }).click();
  await selector.selectOption({ label: 'Parker Woods / SYN-USER-200' });
  await page.getByRole('button', { name: 'View cohort details', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Robin Brooks', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Parker Woods', exact: true })).toBeVisible();
});

async function expectPatientOnly(page: Page, name: string) {
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Alex Morgan/ })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'WINTER-26', exact: true })).toHaveCount(0);
  await expect(page.locator('.nav-count')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('patient selection is consistent across pages and reference research is explicit', async ({
  page,
  context,
}) => {
  const referenceRequests: string[] = [];
  page.on('request', (request) => {
    if (/\/api\/(patient|study|cohort)$/.test(request.url())) referenceRequests.push(request.url());
  });
  await signIn(page, 'avery@doctor.example');
  await page.goto('/');
  const selector = page.getByRole('combobox', { name: 'Current patient', exact: true });
  await selector.selectOption({ label: 'Jordan Lee / SYN-USER-002' });
  await page.getByRole('button', { name: 'View cohort details', exact: true }).click();
  await expectPatientOnly(page, 'Jordan Lee');
  await expect(page.getByText('80 independently generated fictional cases')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Define the comparison' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Differential evidence matrix' })).toBeVisible();
  await expect(page.locator('.patient-banner')).toBeVisible();
  await expect(page.locator('.cohort-hero')).toBeVisible();
  await expect(page.locator('.metric-grid .metric')).toHaveCount(3);
  await expect(page.locator('.distribution-grid .distribution')).toHaveCount(3);
  await expect(page.getByRole('slider', { name: 'Minimum matching score' })).toBeDisabled();
  await expect(page.getByRole('complementary', { name: 'Research Twin Copilot' })).toContainText(
    'unavailable for selected-patient records',
  );
  await page.getByRole('button', { name: 'Research study', exact: true }).click();
  await expectPatientOnly(page, 'Jordan Lee');
  await expect(
    page.getByRole('heading', { name: 'Fictional heart-failure follow-up study' }),
  ).toBeVisible();
  expect(referenceRequests).toEqual([]);

  await page.getByRole('button', { name: 'View reference patient', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Alex Morgan', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Find comparable cohort', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Define the comparison' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Same season & climate' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Recorded follow-up required' })).toBeVisible();
  await page.getByRole('slider', { name: 'Minimum matching score' }).fill('70');
  await page.getByRole('checkbox', { name: 'Laboratory-confirmed only' }).check();
  const comparison = page.waitForRequest('**/api/cohort');
  await page.getByRole('button', { name: 'Find comparable cohort', exact: true }).click();
  expect((await comparison).postDataJSON()).toEqual({
    minScore: 70,
    sameEnvironment: true,
    confirmedOnly: true,
    requireFollowup: false,
  });
  await expect(page.getByRole('heading', { name: 'Why these cases?' })).toBeVisible();
  await page.getByRole('button', { name: 'Research study', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'WINTER-26', exact: true })).toBeVisible();
  await expect(page.getByText('Participant enrollment', { exact: true })).toBeVisible();
  await expect(page.getByText('Recorded retention', { exact: true })).toBeVisible();
  await expect(page.getByText('Visit completion', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Research site snapshot' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Jordan Lee', exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Current patient', exact: true }).click();
  await expect(selector.locator('option:checked')).toHaveText('Jordan Lee / SYN-USER-002');
  await page.getByRole('button', { name: 'Buddy cohort', exact: true }).click();
  await expectPatientOnly(page, 'Jordan Lee');
  await page.getByRole('button', { name: 'Return to Current patient', exact: true }).click();
  await selector.selectOption({ label: 'Sam Taylor / SYN-USER-001' });
  await page.getByRole('button', { name: 'View cohort details', exact: true }).click();
  await expectPatientOnly(page, 'Sam Taylor');
  await expect(page.getByRole('heading', { name: 'Routine-care comparison' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Jordan Lee', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'View research details', exact: true }).click();
  await expectPatientOnly(page, 'Sam Taylor');
  await expect(page.getByRole('heading', { name: 'Routine-care comparison' })).toBeVisible();
  await context.setOffline(true);
  await expect(page.getByText('Reconnect to load authorized patient research.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sam Taylor', exact: true })).toHaveCount(0);
});

test('no selection never falls back to reference data', async ({ page }) => {
  await signIn(page, 'avery@doctor.example');
  await page.goto('/');
  for (const tab of ['Buddy cohort', 'Research study']) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Choose a current patient' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Alex Morgan|WINTER-26/ })).toHaveCount(0);
  }
});

test('reference API failures cannot block selected patient research', async ({ page }) => {
  await signIn(page, 'avery@doctor.example');
  await page.route(/\/api\/(patient|study)$/, (route) => route.abort());
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Current patient', exact: true }).selectOption({
    label: 'Jordan Lee / SYN-USER-002',
  });
  await page.getByRole('button', { name: 'View cohort details', exact: true }).click();
  await page.getByRole('button', { name: 'View reference patient', exact: true }).click();
  await expect(page.getByText(/Cannot reach the demo API/)).toBeVisible();
  await page.getByRole('button', { name: 'Current patient', exact: true }).click();
  await page.getByRole('button', { name: 'View cohort details', exact: true }).click();
  await expectPatientOnly(page, 'Jordan Lee');
  await expect(page.getByText(/Cannot reach the demo API/)).toHaveCount(0);
});
