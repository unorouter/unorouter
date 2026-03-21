import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TObject } from "@sinclair/typebox/type";
import type { ComponentProps, ReactNode } from "react";
import type { Control, FieldValues, Path, RegisterOptions } from "react-hook-form";
import { MyFormError } from "./my-form-error";

type MyFormInputProps<T extends FieldValues> = {
  symbol?: string;
  control: Control<T>;
  name: Path<T>;
  schema: TObject;
  label?: ReactNode;
  validate?: RegisterOptions<T>["validate"];
} & ComponentProps<"input">;

export const MyFormInput = <T extends FieldValues>({
  control,
  label,
  name,
  schema,
  symbol,
  validate,
  ...rest
}: MyFormInputProps<T>) => {
  return (
    <FormField
      control={control}
      name={name}
      rules={{ validate }}
      render={({ field, fieldState }) => {
        const error = fieldState.error?.message;
        const isNumber = rest.type === "number";
        return (
          <FormItem>
            {label && <FormLabel>{label}</FormLabel>}

            <div className="relative flex items-center">
              {symbol && (
                <span className="absolute top-1/2 left-0 -translate-y-1/2 transform pl-2">
                  {symbol}
                </span>
              )}
              <FormControl>
                <Input
                  {...field}
                  {...rest}
                  onChange={(e) =>
                    field.onChange(
                      isNumber && e.target.value !== ""
                        ? Number(e.target.value)
                        : e,
                    )
                  }
                  className={cn(symbol && "pl-[1.2rem]", rest.className)}
                  minLength={
                    rest.minLength || schema.properties[name]?.minLength
                  }
                  maxLength={
                    rest.maxLength || schema.properties[name]?.maxLength
                  }
                  min={rest.min || schema.properties[name]?.minimum}
                  max={rest.max || schema.properties[name]?.maximum}
                />
              </FormControl>
            </div>
            <MyFormError name={name} schema={schema} error={error} />
          </FormItem>
        );
      }}
    />
  );
};
