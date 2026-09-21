import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createRuntime } from '../server/runtime.js';
import { createApp } from '../server/app.js';
import type { ReviewOptions } from '../server/review.js';

export async function testApplication(reviewOptions: ReviewOptions = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'research-twin-api-'));
  const runtime = await createRuntime({ directory });
  const server = createApp(runtime, reviewOptions).listen(0, '127.0.0.1');
  if (!server.listening) await new Promise<void>((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  const accounts = JSON.parse(readFileSync(join(directory, 'demo-accounts.json'), 'utf8')) as {
    email: string;
    password: string;
  }[];
  const cookies = new Map<string, string>();
  async function request(
    email: string | null,
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
    signal?: AbortSignal,
  ) {
    if (email && !cookies.has(email)) {
      const account = accounts.find((account) => account.email === email);
      if (!account) throw new Error('Test account unavailable.');
      const response = await runtime.auth.api.signInEmail({ body: account, asResponse: true });
      if (!response.ok) throw new Error(`Test login failed: ${response.status}`);
      cookies.set(
        email,
        response.headers
          .getSetCookie()
          .map((cookie) => cookie.split(';')[0])
          .join('; '),
      );
    }
    return fetch(`${base}/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: runtime.baseURL,
        ...(email ? { Cookie: cookies.get(email)! } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  }
  return {
    runtime,
    base,
    request,
    close: async () => {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      runtime.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}
