import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import type { ReactNode } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";

type MyFormSwitchProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label?: ReactNode;
  description?: ReactNode;
  size?: "sm" | "default";
};

export const MyFormSwitch = <T extends FieldValues>({
  control,
  name,
  label,
  description,
  size,
}: MyFormSwitchProps<T>) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            {label && (
              <FormLabel className="text-xs font-medium">{label}</FormLabel>
            )}
            {description && (
              <span className="text-muted-foreground max-w-75 text-[11px]">
                {description}
              </span>
            )}
          </div>
          <FormControl>
            <Switch
              checked={field.value ?? false}
              onCheckedChange={field.onChange}
              size={size}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
};
