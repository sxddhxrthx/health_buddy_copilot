import { test, expect } from '@playwright/test';

test('personal persona supports manual entry, reload, edit, delete and reset', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto('/');
  await page.getByRole('button', { name: 'My Health', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sam Taylor' })).toBeVisible();
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

test('personal health handles API failure and expired sessions without silently losing edits', async ({
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
  await page.evaluate(() =>
    sessionStorage.setItem('research-twin-synthetic-session-v1', 'expired'),
  );
  await page.reload();
  await page.getByRole('button', { name: 'My Health', exact: true }).click();
  await expect(page.getByText(/Demo session expired or unavailable/)).toBeVisible();
  await page.getByRole('button', { name: 'Start a new demo session', exact: true }).click();
  await expect(page.getByRole('form', { name: 'Manual health entry' })).toBeVisible();
});
