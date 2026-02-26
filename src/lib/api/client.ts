export const NEW_API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.unorouter.ai";

export function newApiFetch(path: string, options: RequestInit = {}) {
  return fetch(`${NEW_API_BASE}${path}`, options);
}

export function newApiGet(path: string, options: RequestInit = {}) {
  return newApiFetch(path, { ...options, method: "GET" });
}

export function newApiPost(path: string, body: unknown, options: RequestInit = {}) {
  return newApiFetch(path, {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options.headers },
    body: JSON.stringify(body),
  });
}
