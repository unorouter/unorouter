import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FormControl, FormField, FormItem } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { Control } from "react-hook-form";
import type { TokenFormSchema } from "@/lib/validation/token";

type ModelGroup = {
  vendor: string;
  models: { name: string; vendor: string }[];
};

type TokenModelSelectProps = {
  control: Control<TokenFormSchema>;
  selectedModels: string[];
  modelsByVendor: ModelGroup[];
};

export function TokenModelSelect(props: TokenModelSelectProps) {
  const t = useTranslations();

  return (
    <FormField
      control={props.control}
      name="model_limits"
      render={({ field }) => (
        <FormItem>
          <Popover>
            <PopoverTrigger
              render={
                <FormControl>
                  <Button
                    variant="outline"
                    className="h-auto min-h-9 w-full items-center justify-between gap-2 px-2 py-1.5 font-normal"
                  >
                    <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                      {props.selectedModels.length > 0 ? (
                        props.selectedModels.map((modelName) => {
                          const vendor = props.modelsByVendor.find((g) =>
                            g.models.some((m) => m.name === modelName),
                          )?.vendor;
                          return (
                            <Badge
                              key={modelName}
                              variant="secondary"
                              className="gap-1 rounded-sm px-1.5 py-0.5 font-mono text-[10px]"
                            >
                              {vendor && (
                                <VendorIcon
                                  vendor={vendor}
                                  size={12}
                                  className="shrink-0"
                                />
                              )}
                              {modelName}
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  field.onChange(
                                    props.selectedModels.filter(
                                      (m) => m !== modelName,
                                    ),
                                  );
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    field.onChange(
                                      props.selectedModels.filter(
                                        (m) => m !== modelName,
                                      ),
                                    );
                                  }
                                }}
                                className="hover:text-foreground text-muted-foreground ml-0.5 cursor-pointer"
                              >
                                <Icon name="x" className="h-3 w-3" />
                              </span>
                            </Badge>
                          );
                        })
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          {t("TOKEN.FORM.MODEL_LIMITS_PLACEHOLDER")}
                        </span>
                      )}
                    </div>
                    <Icon name="chevrons-up-down" className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                  </Button>
                </FormControl>
              }
            />
            <PopoverContent
              className="w-[--radix-popover-trigger-width] p-0"
              align="start"
            >
              <Command>
                <CommandInput
                  placeholder={t("TOKEN.FORM.MODEL_SELECT_PLACEHOLDER")}
                />
                <CommandList className="max-h-64">
                  <CommandEmpty>
                    {t("TOKEN.FORM.MODEL_SELECT_EMPTY")}
                  </CommandEmpty>
                  {props.modelsByVendor.map((group) => (
                    <CommandGroup
                      key={group.vendor}
                      heading={
                        <div className="flex items-center gap-1.5">
                          <VendorIcon vendor={group.vendor} size={14} />
                          <span>{group.vendor}</span>
                          <span className="text-muted-foreground ml-auto font-mono text-[10px]">
                            {group.models.length}
                          </span>
                        </div>
                      }
                    >
                      {group.models.map((model) => {
                        const isSelected = props.selectedModels.includes(
                          model.name,
                        );
                        return (
                          <CommandItem
                            key={model.name}
                            value={model.name}
                            onSelect={() => {
                              const next = isSelected
                                ? props.selectedModels.filter(
                                    (m) => m !== model.name,
                                  )
                                : [...props.selectedModels, model.name];
                              field.onChange(next);
                            }}
                            className="[&>svg]:hidden"
                          >
                            <div
                              className={cn(
                                "border-primary mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "opacity-50 [&_svg]:invisible",
                              )}
                            >
                              <Icon name="check" className="h-4 w-4" />
                            </div>
                            <VendorIcon
                              vendor={model.vendor}
                              size={14}
                              className="mr-1.5 shrink-0"
                            />
                            <span className="truncate font-mono text-xs">
                              {model.name}
                            </span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </FormItem>
      )}
    />
  );
}
