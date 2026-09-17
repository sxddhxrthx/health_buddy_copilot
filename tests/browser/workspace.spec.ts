import { test, expect } from '@playwright/test';
import { openReference, signIn } from './helpers';

test.beforeEach(async ({ page }) => {
  await signIn(page, 'avery@doctor.example');
  await page.goto('/');
  await openReference(page);
});

test('five-minute journey: patient, cohort, provenance, refusal, review and study', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await expect(page.getByRole('heading', { name: 'Alex Morgan' })).toBeVisible();
  await page.getByRole('button', { name: 'Open evidence PAT-003' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('Temperature difference = 38.2 − 38.6 = −0.4 °C.')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Find comparable cohort', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Why these cases?' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Differential evidence matrix' })).toBeVisible();
  await page.getByRole('button', { name: 'Test the prescribing safety boundary' }).click();
  await expect(page.getByText('CLINICAL & PRIVACY BOUNDARY', { exact: false })).toBeVisible();
  await expect(
    page.getByText(/Historical treatment patterns cannot determine appropriate care/),
  ).toBeVisible();
  await page.getByRole('button', { name: 'What questions should a clinician review?' }).click();
  await expect(
    page.getByText(
      'Which missing investigations would help distinguish the recorded historical patterns?',
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Prepare review brief' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download .md' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('research-twin-review.md');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Research study', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'WINTER-26', exact: true })).toBeVisible();
  await expect(page.getByText('336 of 360 visits')).toBeVisible();
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('changing filters clears stale results and recalculates deterministically', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Find comparable cohort', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Why these cases?' })).toBeVisible();
  const baseline = await page.locator('.cohort-ring strong').innerText();
  await page.getByLabel('Laboratory-confirmed only').check();
  await expect(page.getByRole('heading', { name: 'Why these cases?' })).not.toBeVisible();
  await page.getByRole('button', { name: 'Find comparable cohort', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Why these cases?' })).toBeVisible();
  expect(Number(await page.locator('.cohort-ring strong').innerText())).toBeLessThan(
    Number(baseline),
  );
});

test('API failure has retry; offline reload serves shell without caching patient responses', async ({
  page,
  context,
}) => {
  await expect(page.getByRole('heading', { name: 'Alex Morgan' })).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await openReference(page);
  await expect(page.getByRole('heading', { name: 'Alex Morgan' })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText(/Cannot reach the demo API/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry connection' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Alex Morgan' })).not.toBeVisible();
  const cached = await page.evaluate(async () => {
    const keys = await caches.keys();
    return (
      await Promise.all(
        keys.map(async (key) => (await (await caches.open(key)).keys()).map((r) => r.url)),
      )
    ).flat();
  });
  expect(cached.some((url) => url.includes('/api/'))).toBe(false);
  await context.setOffline(false);
  await page.getByRole('button', { name: 'Retry connection' }).click();
  await openReference(page);
  await expect(page.getByRole('heading', { name: 'Alex Morgan' })).toBeVisible();
});

test('install manifest, icons, narrow-cohort empty state and keyboard dialog are available', async ({
  page,
  request,
}) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons).toHaveLength(2);
  for (const icon of manifest.icons) expect((await request.get(icon.src)).status()).toBe(200);
  await page.route('**/api/cohort', (route) =>
    route.fulfill({
      json: {
        id: 'COHORT-TEST',
        filters: {
          minScore: 95,
          sameEnvironment: true,
          confirmedOnly: true,
          requireFollowup: true,
        },
        suppressed: true,
        size: null,
        total: 480,
        eligible: 300,
        meanScore: null,
        completeness: null,
        dimensions: [],
        distributions: [],
        comparisons: [],
        limitations: [],
        evidence: [
          {
            id: 'COHORT-TEST-MATCH',
            title: 'Protected aggregate',
            classification: 'Calculated metric',
            source: 'Test fixture',
            period: '2026',
            calculation: 'Minimum 10',
            detail: 'Withheld',
            limitations: [],
          },
        ],
      },
    }),
  );
  await page.getByRole('button', { name: 'Find comparable cohort', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Privacy boundary reached' })).toBeVisible();
  await expect(page.locator('.cohort-ring')).not.toBeVisible();
  await page.getByRole('button', { name: 'Open evidence COHORT-TEST-MATCH' }).click();
  await expect(page.getByRole('button', { name: 'Close dialog' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open evidence COHORT-TEST-MATCH' })).toBeFocused();
});
