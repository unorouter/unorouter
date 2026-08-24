import type { TObject } from "@sinclair/typebox/type";
import { safeT } from "@/lib/utils/i18n";
import { useTranslations } from "next-intl";

type MyFormErrorProps = {
  error?: string | null;
  schema: TObject;
  name: string;
};

export function MyFormError(props: MyFormErrorProps) {
  const t = useTranslations() as (
    key: string,
    values?: Record<string, string | number | Date | undefined>,
  ) => string;

  if (!props.error) return null;

  const property = props.schema.properties[props.name];

  const cleanedName = props.name.replace(/\.\d+\./g, ".");

  const humanized = cleanedName
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const type = safeT(t, `FORM.TYPE.${cleanedName.toUpperCase()}`, humanized);

  const error = safeT(t, props.error, props.error, {
    type,
    minLength: property?.minLength,
    maxLength: property?.maxLength,
    minimum: property?.minimum,
  });

  if (!error) return null;

  return (
    <p data-slot="form-message" className="text-destructive text-xs font-bold">
      {error}
    </p>
  );
}
