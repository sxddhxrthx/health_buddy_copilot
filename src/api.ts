const origin = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${origin}/api/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
    credentials: 'same-origin',
    signal: signal ?? AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    if (response.status === 401 && path !== 'me' && !path.startsWith('auth/'))
      window.dispatchEvent(new Event('session-expired'));
    throw new ApiError(
      data?.error ?? data?.message ?? `Request failed (${response.status}).`,
      response.status,
    );
  }
  return response.json() as Promise<T>;
}
