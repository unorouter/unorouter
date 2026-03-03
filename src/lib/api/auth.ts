import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils";

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

interface AuthUserData {
  id: number;
  username: string;
  display_name: string;
  role: number;
  status: number;
  group: string;
}

export async function fetchSelf() {
  return handleElysia(await rpc.api.auth.self.get()) as ApiResponse<AuthUserData>;
}

export async function login(
  username: string,
  password: string,
  turnstile?: string,
) {
  return handleElysia(
    await rpc.api.auth.login.post({ username, password, turnstile }),
  ) as ApiResponse<AuthUserData | { require_2fa: true }>;
}

export async function verify2FA(code: string) {
  return handleElysia(
    await rpc.api.auth.login["2fa"].post({ code }),
  ) as ApiResponse<AuthUserData>;
}

export async function register(
  username: string,
  password: string,
  email?: string,
  verification_code?: string,
  aff_code?: string,
  turnstile?: string,
) {
  return handleElysia(
    await rpc.api.auth.register.post({
      username,
      password,
      email,
      verification_code,
      aff_code,
      turnstile,
    }),
  ) as ApiResponse<null>;
}

export async function logout() {
  return handleElysia(await rpc.api.auth.logout.get()) as ApiResponse<null>;
}

export async function fetchStatus() {
  return handleElysia(
    await rpc.api.auth.status.get(),
  ) as ApiResponse<Record<string, unknown>>;
}

export async function fetchOAuthState(redirect?: string) {
  return handleElysia(
    await rpc.api.auth.oauth.state.get({ query: { redirect } }),
  ) as ApiResponse<string>;
}

export async function sendVerificationEmail(email: string) {
  return handleElysia(
    await rpc.api.auth.verification.get({ query: { email } }),
  ) as ApiResponse<null>;
}
