"use client";

import {
  IntlError,
  IntlErrorCode,
  NextIntlClientProvider,
  type Locale,
} from "next-intl";
import { ReactNode } from "react";

type Messages = Parameters<typeof NextIntlClientProvider>[0]["messages"];

// Namespaces whose keys are LEGITIMATELY optional/runtime-derived (not a pruned-key bug):
// FORM.TYPE.<field> field labels exist for only a few fields by design. A miss here must
// fall through to a humanized fallback (via safeT), never throw. The miss message is
// `Could not resolve `FORM.TYPE.X` in messages...`, so match the key inside the backticks.
const OPTIONAL_KEY_PREFIXES = ["FORM.TYPE."];

// A client component referencing a pruned key only logs MISSING_MESSAGE by default; throwing in dev makes it a red overlay instead.
function onError(error: IntlError) {
  if (
    process.env.NODE_ENV !== "production" &&
    error.code === IntlErrorCode.MISSING_MESSAGE &&
    !OPTIONAL_KEY_PREFIXES.some((p) => error.message.includes(`\`${p}`))
  ) {
    throw error;
  }
  console.error(error);
}

// locale is required here: rendered from a client component the provider can't infer it from the server request config.
export function ClientIntlProvider(props: {
  locale: Locale;
  timeZone: string;
  messages: Messages;
  children: ReactNode;
}) {
  return (
    <NextIntlClientProvider
      locale={props.locale}
      timeZone={props.timeZone}
      messages={props.messages}
      onError={onError}
    >
      {props.children}
    </NextIntlClientProvider>
  );
}
