"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { MyFormTextarea } from "@/components/elements/form/my-form-textarea";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useSendContactMutation } from "@/hooks/ops/contact-hook";
import { useStatusQuery } from "@/hooks/ops/status-hook";
import { Link } from "@/i18n/navigation";
import {
  contactChecker,
  contactSchema,
  type ContactSchema,
} from "@/lib/validation/contact";
import { formDefaults, safeParse } from "@/lib/validation/helpers";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

export function ContactForm() {
  const t = useTranslations();
  const statusQuery = useStatusQuery();
  const contactMutation = useSendContactMutation();

  const form = useForm({
    resolver: typeboxResolver(contactSchema),
    defaultValues: formDefaults(contactSchema),
  });

  const [turnstileToken, setTurnstileToken] = useState<string | undefined>();
  const turnstileRef = useRef<TurnstileInstance>(null);
  const [sent, setSent] = useState(false);

  const values = useWatch({ control: form.control });
  const isValid = safeParse(contactChecker, values).success;
  const needsTurnstile = statusQuery.data?.turnstile_check;

  function onSubmit(data: ContactSchema) {
    contactMutation.mutate(
      {
        body: {
          name: data.name.trim(),
          email: data.email.trim(),
          subject: data.subject.trim(),
          message: data.message.trim(),
          turnstile: turnstileToken,
        },
      },
      {
        onSuccess: () => setSent(true),
        onSettled: () => {
          turnstileRef.current?.reset();
          setTurnstileToken(undefined);
        },
      },
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/impressum"
        className="text-muted-foreground hover:text-foreground mb-8 inline-block text-sm"
      >
        &larr; {t("IMPRESSUM.TITLE")}
      </Link>
      <h1 className="mb-2 text-3xl font-bold">{t("CONTACT.TITLE")}</h1>
      <p className="text-muted-foreground mb-10 leading-relaxed">
        {t("CONTACT.INTRO")}
      </p>

      {sent ? (
        <p className="text-muted-foreground leading-relaxed">
          {t("CONTACT.SENT")}
        </p>
      ) : (
        <Form {...form}>
          <form
            onSubmit={(e) => {
              form.handleSubmit(onSubmit)(e);
            }}
            className="space-y-4"
          >
            <MyFormInput
              control={form.control}
              name="name"
              schema={contactSchema}
              label={t("CONTACT.NAME")}
              autoComplete="name"
              maxLength={100}
            />
            <MyFormInput
              control={form.control}
              name="email"
              schema={contactSchema}
              label={t("CONTACT.EMAIL")}
              type="email"
              autoComplete="email"
              maxLength={254}
            />
            <MyFormInput
              control={form.control}
              name="subject"
              schema={contactSchema}
              label={t("CONTACT.SUBJECT")}
              maxLength={200}
            />
            <MyFormTextarea
              control={form.control}
              name="message"
              schema={contactSchema}
              label={t("CONTACT.MESSAGE")}
              rows={8}
              maxLength={5000}
            />

            {needsTurnstile && statusQuery.data?.turnstile_site_key && (
              <Turnstile
                ref={turnstileRef}
                siteKey={statusQuery.data.turnstile_site_key}
                onSuccess={setTurnstileToken}
              />
            )}

            <p className="text-muted-foreground text-xs leading-relaxed">
              {t.rich("CONTACT.PRIVACY_NOTE", {
                privacy: (chunks) => (
                  <Link href="/privacy" className="underline">
                    {chunks}
                  </Link>
                ),
              })}
            </p>

            <Button
              type="submit"
              disabled={
                !isValid ||
                contactMutation.isPending ||
                (needsTurnstile && !turnstileToken)
              }
            >
              {contactMutation.isPending
                ? t("CONTACT.SENDING")
                : t("CONTACT.SEND")}
            </Button>
          </form>
        </Form>
      )}
    </main>
  );
}
