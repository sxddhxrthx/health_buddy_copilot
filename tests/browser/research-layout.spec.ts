import { test, expect } from '@playwright/test';
import { signIn } from './helpers';

test('reference controls and study panels coexist with separate selected-patient details', async ({
  page,
  context,
}) => {
  await signIn(page, 'avery@doctor.example');
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Current patient', exact: true }).selectOption({
    label: 'Jordan Lee / SYN-USER-002',
  });
  await page.getByRole('button', { name: 'View cohort details', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Define the comparison' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Reference patient: Alex Morgan' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Same season & climate' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Recorded follow-up required' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Reference research boundary' })).toContainText(
    'They do not filter or describe the selected patient.',
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
  const details = page.getByRole('region', { name: 'Selected patient research', exact: true });
  await expect(details.getByRole('heading', { name: 'Jordan Lee' })).toBeVisible();
  await expect(details.getByText('120 independently generated fictional cases')).toBeVisible();
  await expect(details.getByRole('heading', { name: /Alex Morgan/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'View research details', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'WINTER-26', exact: true })).toBeVisible();
  await expect(page.getByText('Participant enrollment', { exact: true })).toBeVisible();
  await expect(page.getByText('Recorded retention', { exact: true })).toBeVisible();
  await expect(page.getByText('Visit completion', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Research site snapshot' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Selected-patient research details' }),
  ).toBeVisible();
  await expect(
    details.getByRole('heading', { name: 'Fictional heart-failure follow-up study' }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.setOffline(true);
  await expect(details.getByText('Reconnect to load authorized patient research.')).toBeVisible();
  await expect(details.getByRole('heading', { name: 'Jordan Lee' })).toHaveCount(0);
});
