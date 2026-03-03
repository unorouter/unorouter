const API_URL = process.env.NEXT_PUBLIC_API_URL;

function getBaseUrl() {
  if (typeof window === "undefined") return API_URL || "";
  return "/proxy";
}

async function authFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<{ success: boolean; message: string; data: T }> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  return response.json();
}

export async function fetchSelf() {
  return authFetch<{
    id: number;
    username: string;
    display_name: string;
    role: number;
    status: number;
    group: string;
  }>("/api/user/self");
}

export async function login(username: string, password: string, turnstile?: string) {
  return authFetch<
    | { id: number; username: string; display_name: string; role: number; status: number; group: string }
    | { require_2fa: true }
  >("/api/user/login", {
    method: "POST",
    body: JSON.stringify({ username, password, turnstile }),
  });
}

export async function verify2FA(code: string) {
  return authFetch<{
    id: number;
    username: string;
    display_name: string;
    role: number;
    status: number;
    group: string;
  }>("/api/user/login/2fa", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function register(
  username: string,
  password: string,
  email?: string,
  verification_code?: string,
  aff_code?: string,
  turnstile?: string,
) {
  return authFetch<null>("/api/user/register", {
    method: "POST",
    body: JSON.stringify({
      username,
      password,
      email: email || undefined,
      verification_code: verification_code || undefined,
      aff_code: aff_code || undefined,
      turnstile: turnstile || undefined,
    }),
  });
}

export async function logout() {
  return authFetch<null>("/api/user/logout");
}

export async function fetchStatus() {
  return authFetch<Record<string, unknown>>("/api/status");
}

export async function fetchOAuthState(redirect?: string) {
  const params = new URLSearchParams();
  if (redirect) params.set("redirect", redirect);
  const qs = params.toString();
  return authFetch<string>(`/api/oauth/state${qs ? `?${qs}` : ""}`);
}

export async function sendVerificationEmail(email: string) {
  const response = await fetch(
    `${getBaseUrl()}/api/verification?email=${encodeURIComponent(email)}`,
    { credentials: "include" },
  );
  return response.json();
}
