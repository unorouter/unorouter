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

export function MyFormError(props: MyFormErrorProps) {
  const t = useTranslations();

  if (!props.error) return null;

  const property = props.schema.properties[props.name];

  const cleanedName = props.name.replace(/\.\d+\./g, ".");

  const humanized = cleanedName
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // next-intl types t() to the literal key union, which cannot express a key
  // built at runtime. One widening here keeps it out of both lookups below.
  const translate = t as (key: string, values?: Values) => string;

  const type = safeT(
    translate,
    `FORM.TYPE.${cleanedName.toUpperCase()}`,
    humanized,
  );

  const error = safeT(translate, props.error, props.error, {
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
