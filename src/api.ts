const origin = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${origin}/api/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error ?? `Request failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
}
