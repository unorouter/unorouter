import type { TObject } from "@sinclair/typebox/type";
import { useTranslations, type TranslationValues } from "next-intl";

// Values are read off the schema, so a constraint the field does not declare
// arrives as undefined.
type Values = Record<string, TranslationValues[string] | undefined>;

// Both lookups pass a RUNTIME key: one built from the field name, one the
// validator's own message, which is raw TypeBox prose when a field declares no
// msg(). Neither is in next-intl's key union, and on a miss t() hands the key
// straight back, so that is the signal to use the fallback.
function safeT(
  t: (key: string, values?: Values) => string,
  key: string,
  fallback: string,
  values?: Values,
): string {
  try {
    const out = t(key, values);
    return out === key ? fallback : out;
  } catch {
    return fallback;
  }
}

type MyFormErrorProps = {
  error?: string | null;
  schema: TObject;
  name: string;
};

// Shared with the submit-failure toast, which has to name a field whose own
// message may be rendered in an unmounted tab.
export function formatFieldError(
  t: ReturnType<typeof useTranslations>,
  schema: TObject,
  name: string,
  error: string,
): { label: string; message: string } {
  const property = schema.properties[name];

  const cleanedName = name.replace(/\.\d+\./g, ".");

  const humanized = cleanedName
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // next-intl types t() to the literal key union, which cannot express a key
  // built at runtime. One widening here keeps it out of both lookups below.
  const translate = t as (key: string, values?: Values) => string;

  const label = safeT(
    translate,
    `FORM.TYPE.${cleanedName.toUpperCase()}`,
    humanized,
  );

  return {
    label,
    message: safeT(translate, error, error, {
      type: label,
      minLength: property?.minLength,
      maxLength: property?.maxLength,
      minimum: property?.minimum,
    }),
  };
}

export function MyFormError(props: MyFormErrorProps) {
  const t = useTranslations();

  if (!props.error) return null;

  const error = formatFieldError(
    t,
    props.schema,
    props.name,
    props.error,
  ).message;

  if (!error) return null;

  return (
    <p data-slot="form-message" className="text-destructive text-xs font-bold">
      {error}
    </p>
  );
}
