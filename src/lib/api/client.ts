export const NEW_API_BASE = process.env.NEXT_PUBLIC_API_URL;

export class NewApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

async function newApiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${NEW_API_BASE}${path}`, options);
  if (!res.ok) throw new NewApiError(res.status, await res.text());
  return res.json() as Promise<T>;
}

export function newApiGet<T>(path: string, options: RequestInit = {}) {
  return newApiFetch<T>(path, { ...options, method: "GET" });
}

export function newApiPost<T>(
  path: string,
  body: unknown,
  options: RequestInit = {}
) {
  return newApiFetch<T>(path, {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options.headers },
    body: JSON.stringify(body)
  });
}
