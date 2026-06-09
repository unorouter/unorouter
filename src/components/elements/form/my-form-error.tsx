import { FormMessage } from "@/components/ui/form";
import type { TranslationKey } from "@/lib/config/constants";
import type { TObject } from "@sinclair/typebox/type";
import { useTranslations } from "next-intl";

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

  // next-intl returns the raw key (it does not throw) when a translation is
  // missing, so try/catch never fires. Detect the passthrough and fall back to
  // a humanized field name instead of leaking "FORM.TYPE.CONTENT" to the user.
  const typeKey = `FORM.TYPE.${cleanedName.toUpperCase()}`;
  const translated = t(typeKey as TranslationKey);
  const type =
    translated === typeKey
      ? cleanedName.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : translated;

  let error: string;
  try {
    error = t(props.error as TranslationKey, {
      type,
      minLength: property?.minLength,
      maxLength: property?.maxLength,
      minimum: property?.minimum,
    });
  } catch (_) {
    error = props.error;
  }

  return <FormMessage className="text-xs font-bold">{error}</FormMessage>;
}
