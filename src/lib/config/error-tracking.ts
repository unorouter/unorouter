import { scrubText } from "@/lib/utils/scrub";
import type { DataCollection, ErrorEvent } from "@sentry/core";

// Errors only, nothing about the person: no IP, cookies, headers, bodies or
// query strings, which SDK v11 would otherwise collect by default.
export const NO_PERSONAL_DATA = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  genAI: { inputs: false, outputs: false },
  graphQL: { document: false, variables: false },
} satisfies DataCollection;

export function stripEvent(event: ErrorEvent): ErrorEvent {
  delete event.user;
  event.breadcrumbs = [];
  const url = event.request?.url?.split(/[?#]/)[0];
  event.request = url ? { url } : undefined;
  if (event.message) event.message = scrubText(event.message);
  for (const ex of event.exception?.values ?? []) {
    if (ex.value) ex.value = scrubText(ex.value);
  }
  return event;
}
