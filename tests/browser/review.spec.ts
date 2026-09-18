import { test, expect, type Page } from '@playwright/test';
import { signIn } from './helpers';
import { REVIEW_WARNING, type ReviewReport } from '../../shared/review';

async function openReview(page: Page) {
  await signIn(page, 'avery@doctor.example');
  await page.goto('/');
  await page
    .getByRole('combobox', { name: 'Current patient', exact: true })
    .selectOption({ label: 'Sam Taylor / SYN-USER-001' });
  await page.getByRole('combobox', { name: 'Doctor workflow', exact: true }).selectOption('review');
}

test('unapproved pilot is visibly disabled and documentation remains available', async ({
  page,
}) => {
  await openReview(page);
  await expect(
    page.getByText(
      'Evidence review is disabled pending model, corpus, sharing-purpose and reviewer approval.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate evidence-review draft' })).toHaveCount(0);
  await page
    .getByRole('combobox', { name: 'Doctor workflow', exact: true })
    .selectOption('documentation');
  await expect(page.getByRole('heading', { name: 'Visits and documentation' })).toBeVisible();
});

test('mocked draft renders text safely, preserves provenance, clears on switch and offline', async ({
  page,
  context,
}) => {
  await page.route('**/api/care/patients/*/evidence-review', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({
        json: {
          available: true,
          message: REVIEW_WARNING,
          snapshotVersion: 'a'.repeat(64),
          scenarios: ['cardiology'],
        },
      });
      return;
    }
    const report: ReviewReport = {
      patientId: new URL(request.url()).pathname.split('/')[4],
      snapshotVersion: 'a'.repeat(64),
      scenario: 'cardiology',
      generatedAt: '2026-01-15T10:00:00Z',
      warning: REVIEW_WARNING,
      versions: {
        schema: 'test',
        model: 'mock',
        digest: 'a'.repeat(64),
        corpus: 'fixture',
        generator: 'test',
        matcher: 'test',
      },
      sources: [
        {
          id: 'PATIENT-1',
          kind: 'patient',
          title: 'Fictional measurement',
          text: '120 / 80 mmHg <script>throw Error("unsafe")</script>',
        },
        {
          id: 'LIT-FIXTURE',
          kind: 'literature',
          title: 'Original test fixture',
          text: 'Non-medical fixture.',
          url: 'https://example.invalid/fixture',
        },
      ],
      questions: ['Verify applicability with a qualified reviewer.'],
      limitations: ['Mock inference only.'],
    };
    await route.fulfill({ json: report });
  });
  await openReview(page);
  const generate = page.getByRole('button', { name: 'Generate evidence-review draft' });
  await expect(generate).toBeDisabled();
  await page.getByRole('checkbox', { name: /I confirm these are fictional/ }).check();
  await generate.click();
  await expect(page.getByLabel('Evidence-review draft', { exact: true })).toBeFocused();
  await page.getByText('PATIENT-1: Fictional measurement', { exact: true }).click();
  await expect(
    page.getByText('120 / 80 mmHg <script>throw Error("unsafe")</script>', { exact: true }),
  ).toBeVisible();
  await page.getByText('LIT-FIXTURE: Original test fixture', { exact: true }).click();
  await expect(page.getByRole('link', { name: 'Inspect original source' })).toHaveAttribute(
    'href',
    'https://example.invalid/fixture',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page
    .getByRole('combobox', { name: 'Current patient', exact: true })
    .selectOption({ label: 'Jordan Lee / SYN-USER-002' });
  await expect(page.getByLabel('Evidence-review draft', { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('checkbox', { name: /I confirm these are fictional/ }),
  ).not.toBeChecked();
  await context.setOffline(true);
  await expect(
    page.getByText('Offline. Evidence review is unavailable; no drafts are cached.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate evidence-review draft' })).toHaveCount(0);
});

test('pending mock review can be cancelled or invalidated without stale output', async ({
  page,
}) => {
  let release!: () => void;
  let started!: () => void;
  let pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let entered = new Promise<void>((resolve) => {
    started = resolve;
  });
  await page.route('**/api/care/patients/*/evidence-review', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: {
          available: true,
          message: REVIEW_WARNING,
          snapshotVersion: 'a'.repeat(64),
          scenarios: ['cardiology'],
        },
      });
    } else {
      started();
      await pending;
      await route.fulfill({ status: 503, json: { error: 'Mock outage' } }).catch(() => undefined);
    }
  });
  await openReview(page);
  const generate = async () => {
    await page.getByRole('checkbox', { name: /I confirm these are fictional/ }).check();
    await page.getByRole('button', { name: 'Generate evidence-review draft' }).click();
    await entered;
  };
  await generate();
  await page.getByRole('button', { name: 'Cancel review' }).click();
  release();
  await expect(page.getByRole('button', { name: 'Cancel review' })).toHaveCount(0);
  await expect(page.getByLabel('Evidence-review draft', { exact: true })).toHaveCount(0);
  pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  entered = new Promise<void>((resolve) => {
    started = resolve;
  });
  await generate();
  await page
    .getByRole('combobox', { name: 'Current patient', exact: true })
    .selectOption({ label: 'Jordan Lee / SYN-USER-002' });
  release();
  await expect(page.getByRole('button', { name: 'Cancel review' })).toHaveCount(0);
  await expect(page.getByLabel('Evidence-review draft', { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('checkbox', { name: /I confirm these are fictional/ }),
  ).not.toBeChecked();
});
