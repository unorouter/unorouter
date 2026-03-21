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

  let type = "";
  try {
    type = t(`FORM.TYPE.${cleanedName.toUpperCase()}` as TranslationKey);
  } catch (_) {
    type = cleanedName;
  }

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
