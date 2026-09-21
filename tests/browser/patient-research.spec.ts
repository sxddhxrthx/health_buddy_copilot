import { test, expect } from '@playwright/test';
import { signIn } from './helpers';
import type { Person } from '../../shared/care';
import type { PatientResearch } from '../../shared/patient-research';

test('Jordan has a detailed fictional heart scenario and Sam has a simpler comparison', async ({
  page,
}) => {
  await signIn(page, 'avery@doctor.example');
  await page.goto('/');
  const selector = page.getByRole('combobox', { name: 'Current patient', exact: true });
  await selector.selectOption({ label: 'Jordan Lee / SYN-USER-002' });
  await page.getByRole('button', { name: 'View cohort details', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Buddy cohort', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Jordan Lee', exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Advanced heart failure', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('120 independently generated fictional cases')).toBeVisible();
  await expect(page.getByText('Fictional follow-up note present: 90 of 120 (75%)')).toBeVisible();
  await expect(page.getByText('Fictional follow-up note missing: 30 of 120 (25%)')).toBeVisible();
  await expect(
    page.getByRole('meter', { name: 'Fictional follow-up note present', exact: true }),
  ).toHaveAttribute('value', '90');
  await expect(page.getByRole('region', { name: 'Presentation at a glance' })).toContainText(
    'not a severity assessment',
  );
  await page.getByRole('button', { name: 'View research details', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Research study', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Jordan Lee', exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Fictional heart-failure follow-up study' }),
  ).toBeVisible();
  await expect(page.getByRole('region', { name: 'Study explained simply' })).toContainText(
    'not enrolled',
  );
  await page.getByText('Recorded condition sources', { exact: true }).click();
  await expect(page.getByText(/Finalized visit .*revision 1/)).toBeVisible();
  await page.getByRole('button', { name: 'Return to Current patient', exact: true }).click();
  await expect(selector.locator('option:checked')).toHaveText('Jordan Lee / SYN-USER-002');
  await page.getByRole('button', { name: 'View research details', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Jordan Lee', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Alex Morgan', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Return to Current patient', exact: true }).click();
  await selector.selectOption({ label: 'Sam Taylor / SYN-USER-001' });
  await page.getByRole('button', { name: 'View cohort details', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Routine-care comparison' })).toBeVisible();
  await expect(page.getByText(/does not establish that Sam is healthy/)).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Advanced heart failure', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'View research details', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Routine-care comparison' })).toBeVisible();
});

// Mock only the research response to avoid mutating records shared by parallel browser suites.
// Actual finalized-visit projection and authorization are covered by API tests.
test('selection follows cohort/study navigation, switches cleanly and handles no match and denied access', async ({
  page,
}) => {
  await signIn(page, 'avery@doctor.example');
  const people = (await (await page.request.get('/api/care/patients')).json()) as Person[];
  const sam = people.find((person) => person.name === 'Sam Taylor')!;
  const jordan = people.find((person) => person.name === 'Jordan Lee')!;
  let denied = false;
  await page.route('**/api/care/patients/*/research', async (route) => {
    if (denied) {
      await route.fulfill({ status: 404, json: { error: 'Patient unavailable.' } });
      return;
    }
    const person = route.request().url().includes(sam.id) ? sam : jordan;
    const response: PatientResearch = {
      patient: person,
      dataVersion: 'condition-fixtures-v1',
      matchingVersion: 'finalized-confirmed-exact-label-v1',
      unmatched: [],
      matches:
        person.id === sam.id
          ? [
              {
                condition: 'Hypertension',
                sources: [
                  {
                    visitId: 'fictional-visit',
                    revision: 2,
                    diagnosis: 'Hypertension',
                    measuredAt: '2026-01-15T10:00',
                  },
                ],
                cohort: {
                  suppressed: false,
                  total: 60,
                  followup: [
                    { label: 'Documented fictional follow-up', count: 30 },
                    { label: 'Missing fictional follow-up', count: 30 },
                  ],
                },
                study: {
                  id: 'SYN-BP-26',
                  title: 'Fictional blood-pressure documentation study',
                  description: 'Fictional fixture, not treatment evidence.',
                },
              },
            ]
          : [],
    };
    await route.fulfill({ json: response });
  });
  await page.goto('/');
  const select = page.getByRole('combobox', { name: 'Current patient', exact: true });
  await select.selectOption(sam.id);
  await page.getByRole('button', { name: 'Buddy cohort', exact: true }).click();
  await expect(page.getByRole('heading', { name: sam.name, exact: true })).toBeVisible();
  await expect(page.getByText('60 independently generated fictional cases')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Alex Morgan', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Research study', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Fictional blood-pressure documentation study' }),
  ).toBeVisible();
  await page.getByText('Recorded condition sources', { exact: true }).click();
  await expect(page.getByText(/Finalized visit fictional-visit, revision 2/)).toBeVisible();
  await page.getByRole('button', { name: 'Current patient', exact: true }).click();
  await expect(select).toHaveValue(sam.id);
  await select.selectOption(jordan.id);
  await page.getByRole('button', { name: 'Research study', exact: true }).click();
  await expect(page.getByRole('heading', { name: jordan.name, exact: true })).toBeVisible();
  await expect(page.getByText(/No matching synthetic cohort or associated study/)).toBeVisible();
  await expect(page.getByRole('heading', { name: sam.name, exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Fictional blood-pressure documentation study' }),
  ).toHaveCount(0);
  denied = true;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('alert')).toContainText('Patient unavailable.');
  await expect(page.getByRole('heading', { name: jordan.name, exact: true })).toHaveCount(0);
  denied = false;
  await page.getByRole('button', { name: 'Retry patient research' }).click();
  await expect(page.getByRole('heading', { name: jordan.name, exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('late response for a previous patient cannot replace the current selection', async ({
  page,
}) => {
  await signIn(page, 'avery@doctor.example');
  const people = (await (await page.request.get('/api/care/patients')).json()) as Person[];
  const sam = people.find((person) => person.name === 'Sam Taylor')!;
  const jordan = people.find((person) => person.name === 'Jordan Lee')!;
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/care/patients/*/research', async (route) => {
    const person = route.request().url().includes(sam.id) ? sam : jordan;
    if (person.id === sam.id) await wait;
    await route.fulfill({
      json: {
        patient: person,
        dataVersion: 'test',
        matchingVersion: 'test',
        matches: [],
        unmatched: [],
      },
    });
  });
  await page.goto('/');
  const select = page.getByRole('combobox', { name: 'Current patient', exact: true });
  await select.selectOption(sam.id);
  const request = page.waitForRequest(`**/api/care/patients/${sam.id}/research`);
  await page.getByRole('button', { name: 'Buddy cohort', exact: true }).click();
  await request;
  await page.getByRole('button', { name: 'Current patient', exact: true }).click();
  await select.selectOption(jordan.id);
  await page.getByRole('button', { name: 'Buddy cohort', exact: true }).click();
  await expect(page.getByRole('heading', { name: jordan.name, exact: true })).toBeVisible();
  const response = page.waitForResponse(`**/api/care/patients/${sam.id}/research`);
  release();
  await response;
  await expect(page.getByRole('heading', { name: jordan.name, exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: sam.name, exact: true })).toHaveCount(0);
});
