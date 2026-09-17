import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRuntime } from '../../server/runtime.js';

export function testCredentials(email: string) {
  const accounts = JSON.parse(readFileSync(resolve('.local/e2e/demo-accounts.json'), 'utf8')) as {
    email: string;
    password: string;
  }[];
  const account = accounts.find((account) => account.email === email);
  if (!account) throw new Error('Browser test account is unavailable.');
  return account;
}

export async function signIn(page: Page, email: string) {
  const origin = 'http://127.0.0.1:3001';
  const runtime = await createRuntime({ directory: '.local/e2e', baseURL: origin });
  let response: Response;
  try {
    response = await runtime.auth.api.signInEmail({
      body: testCredentials(email),
      asResponse: true,
    });
  } finally {
    runtime.close();
  }
  if (!response.ok) throw new Error(`Browser fixture login failed (${response.status}).`);
  await page.context().addCookies(
    response.headers.getSetCookie().map((cookie) => {
      const pair = cookie.split(';')[0];
      const separator = pair.indexOf('=');
      return {
        name: pair.slice(0, separator),
        value: pair.slice(separator + 1),
        url: origin,
        httpOnly: true,
        sameSite: 'Lax' as const,
      };
    }),
  );
}

export async function openReference(page: Page) {
  await page.getByRole('button', { name: 'Buddy cohort', exact: true }).click();
  await page.getByRole('button', { name: 'View reference patient', exact: true }).click();
}
