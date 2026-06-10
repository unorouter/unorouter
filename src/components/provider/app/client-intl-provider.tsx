"use client";

import {
  IntlError,
  IntlErrorCode,
  NextIntlClientProvider,
  type Locale,
} from "next-intl";
import { ReactNode } from "react";

type Messages = Parameters<typeof NextIntlClientProvider>[0]["messages"];

// LanguageProvider prunes server-only namespaces from the client messages
// (src/i18n/client-messages.ts). A client component referencing a pruned key
// only logs MISSING_MESSAGE by default, which is how such bugs ship unnoticed;
// throwing in dev turns them into a red overlay on first render instead.
function onError(error: IntlError) {
  if (
    process.env.NODE_ENV !== "production" &&
    error.code === IntlErrorCode.MISSING_MESSAGE
  ) {
    throw error;
  }
  console.error(error);
}

// `locale` is required here: rendered from a client component the provider
// cannot infer it from the server request config.
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
