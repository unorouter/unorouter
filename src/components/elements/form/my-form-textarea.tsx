import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import type { TObject } from "@sinclair/typebox/type";
import type { ComponentProps, ReactNode } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";
import { MyFormError } from "./my-form-error";

type MyFormTextareaProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  schema: TObject;
  label?: ReactNode;
  description?: ReactNode;
} & ComponentProps<"textarea">;

export const MyFormTextarea = <T extends FieldValues>({
  control,
  description,
  label,
  name,
  schema,
  ...rest
}: MyFormTextareaProps<T>) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Textarea
              {...field}
              {...rest}
              maxLength={rest.maxLength ?? schema.properties[name]?.maxLength}
            />
          </FormControl>
          {description && (
            <p className="text-muted-foreground text-xs">{description}</p>
          )}
          <MyFormError
            name={name}
            schema={schema}
            error={fieldState.error?.message}
          />
        </FormItem>
      )}
    />
  );
};
