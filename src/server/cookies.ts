/**
 * Extracts Set-Cookie headers from an upstream response and rewrites them
 * for the current origin (strips Domain, strips Secure, forces SameSite=Lax).
 */
export function rewriteSetCookies(headers: Headers): string[] {
  const cookies = headers.getSetCookie?.() ?? [];
  return cookies.map((cookie) =>
    cookie
      .replace(/;\s*Domain=[^;]*/gi, "")
      .replace(/;\s*Secure/gi, "")
      .replace(/;\s*SameSite=\w+/gi, "; SameSite=Lax"),
  );
}
