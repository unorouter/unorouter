import { FormMessage } from "@/components/ui/form";
import type { TObject } from "@sinclair/typebox/type";
import { safeT } from "@/lib/utils/i18n";
import { useTranslations } from "next-intl";

type MyFormErrorProps = {
  error?: string | null;
  schema: TObject;
  name: string;
};

export function MyFormError(props: MyFormErrorProps) {
  // safeT takes a loose (string -> string) translator; next-intl's strict `t` widens to it.
  const t = useTranslations() as (
    key: string,
    values?: Record<string, string | number | Date | undefined>,
  ) => string;

  if (!props.error) return null;

  const property = props.schema.properties[props.name];

  const cleanedName = props.name.replace(/\.\d+\./g, ".");

  // Humanized fallback: "base_url" -> "Base Url". Used when no FORM.TYPE.<NAME> key exists.
  const humanized = cleanedName
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // FORM.TYPE.<NAME> field label is OPTIONAL (most fields lack one); safeT falls back to humanized.
  const type = safeT(t, `FORM.TYPE.${cleanedName.toUpperCase()}`, humanized);

  // props.error may be a translation key OR a raw upstream string; safeT echoes it back if not a key.
  const error = safeT(t, props.error, props.error, {
    type,
    minLength: property?.minLength,
    maxLength: property?.maxLength,
    minimum: property?.minimum,
  });

  return <FormMessage className="text-xs font-bold">{error}</FormMessage>;
}
