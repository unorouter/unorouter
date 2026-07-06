"use client";

import {
  IntlError,
  IntlErrorCode,
  NextIntlClientProvider,
  type Locale,
} from "next-intl";
import { ReactNode } from "react";

type Messages = Parameters<typeof NextIntlClientProvider>[0]["messages"];

const OPTIONAL_KEY_PREFIXES = ["FORM.TYPE."];

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
