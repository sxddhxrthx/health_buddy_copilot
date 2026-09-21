import { test, expect } from '@playwright/test';
import { signIn } from './helpers';

test('selected research replaces Alex and keeps reference controls explicitly separate', async ({
  page,
  context,
}, testInfo) => {
  await signIn(page, 'avery@doctor.example');
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Current patient', exact: true }).selectOption({
    label: 'Jordan Lee / SYN-USER-002',
  });
  await page.getByRole('button', { name: 'View cohort details', exact: true }).click();
  const details = page.getByRole('region', { name: 'Selected patient research', exact: true });
  await expect(details.getByRole('heading', { name: 'Jordan Lee', exact: true })).toBeVisible();
  await expect(details.getByText('120 independently generated fictional cases')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Alex Morgan/ })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Define the comparison' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Prepare review brief' })).toHaveCount(0);
  await page.getByRole('button', { name: 'View research details', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'WINTER-26', exact: true })).toHaveCount(0);
  await expect(page.getByText('Participant enrollment', { exact: true })).toHaveCount(0);
  await expect(
    details.getByRole('heading', { name: 'Fictional heart-failure follow-up study' }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('selected-patient-study.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'View reference patient', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Alex Morgan', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reference cohort', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Define the comparison' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Same season & climate' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Recorded follow-up required' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Reference research boundary' })).toContainText(
    'This fixed fictional scenario is separate from your shared patients.',
  );
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
  await expect(details).toHaveCount(0);
  await page.getByRole('button', { name: 'Reference study', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'WINTER-26', exact: true })).toBeVisible();
  await expect(page.getByText('Participant enrollment', { exact: true })).toBeVisible();
  await expect(page.getByText('Recorded retention', { exact: true })).toBeVisible();
  await expect(page.getByText('Visit completion', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Research site snapshot' })).toBeVisible();
  await page.getByRole('button', { name: 'Research study', exact: true }).click();
  await expect(details.getByRole('heading', { name: 'Jordan Lee', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Alex Morgan|WINTER-26/ })).toHaveCount(0);
  await context.setOffline(true);
  await expect(details.getByText('Reconnect to load authorized patient research.')).toBeVisible();
  await expect(details.getByRole('heading', { name: 'Jordan Lee' })).toHaveCount(0);
});

test('research needs an explicit patient selection and never falls back to Alex', async ({
  page,
}) => {
  await signIn(page, 'avery@doctor.example');
  await page.goto('/');
  await page.getByRole('button', { name: 'Research study', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Select a patient', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Alex Morgan|WINTER-26/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Choose current patient', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Current patient', exact: true })
    .selectOption({ label: 'Sam Taylor / SYN-USER-001' });
  await page.route('**/api/patient', (route) =>
    route.fulfill({ status: 503, json: { error: 'Reference unavailable' } }),
  );
  await page.route('**/api/study', (route) =>
    route.fulfill({ status: 503, json: { error: 'Reference unavailable' } }),
  );
  await page.getByRole('button', { name: 'Research study', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sam Taylor', exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Fictional blood-pressure documentation study' }),
  ).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
