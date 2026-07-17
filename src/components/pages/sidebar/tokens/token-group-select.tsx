import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
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
import { cn } from "@/lib/utils";
import type { UserGroupInfo } from "@/openapi";
import { useTranslations } from "next-intl";
import type { Control } from "react-hook-form";
import type { TokenFormSchema } from "@/lib/validation/token";

const AUTO_GROUP = "auto";

type TokenGroupSelectProps = {
  control: Control<TokenFormSchema>;
  selectedGroups: string[];
  groups: Record<string, UserGroupInfo>;
};

function groupRatioLabel(info: UserGroupInfo | undefined): string | null {
  const ratio = info?.ratio;
  if (typeof ratio !== "number") return null;
  return `${ratio}x`;
}

export function TokenGroupSelect(props: TokenGroupSelectProps) {
  const t = useTranslations();

  const sortedGroups = Object.entries(props.groups).sort(([aName, a], [bName, b]) => {
    if (aName === AUTO_GROUP) return -1;
    if (bName === AUTO_GROUP) return 1;
    const aRatio = typeof a.ratio === "number" ? a.ratio : Infinity;
    const bRatio = typeof b.ratio === "number" ? b.ratio : Infinity;
    return aRatio - bRatio || aName.localeCompare(bName);
  });

  // "auto" is mutually exclusive with pinned groups; empty falls back to auto.
  function toggle(name: string, selected: string[]): string[] {
    if (name === AUTO_GROUP) return [AUTO_GROUP];
    const withoutAuto = selected.filter((g) => g !== AUTO_GROUP);
    const next = withoutAuto.includes(name)
      ? withoutAuto.filter((g) => g !== name)
      : [...withoutAuto, name];
    return next.length > 0 ? next : [AUTO_GROUP];
  }

  return (
    <FormField
      control={props.control}
      name="groups"
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
                      {props.selectedGroups.map((name) => (
                        <Badge
                          key={name}
                          variant="secondary"
                          className="gap-1 rounded-sm px-1.5 py-0.5 font-mono text-[10px]"
                        >
                          {name}
                          {groupRatioLabel(props.groups[name]) && (
                            <span className="text-muted-foreground">
                              {groupRatioLabel(props.groups[name])}
                            </span>
                          )}
                        </Badge>
                      ))}
                    </div>
                    <Icon
                      name="chevrons-up-down"
                      className="text-muted-foreground h-3.5 w-3.5 shrink-0"
                    />
                  </Button>
                </FormControl>
              }
            />
            <PopoverContent
              className="w-[--radix-popover-trigger-width] p-0"
              align="start"
            >
              <Command>
                <CommandList className="max-h-64">
                  <CommandEmpty>{t("TOKEN.FORM.GROUP_EMPTY")}</CommandEmpty>
                  <CommandGroup>
                    {sortedGroups.map(([name, info]) => {
                      const isSelected = props.selectedGroups.includes(name);
                      const ratioLabel = groupRatioLabel(info);
                      return (
                        <CommandItem
                          key={name}
                          value={name}
                          onSelect={() =>
                            field.onChange(toggle(name, props.selectedGroups))
                          }
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
                          <span className="truncate font-mono text-xs">
                            {name}
                          </span>
                          <span className="text-muted-foreground ml-auto truncate pl-2 text-[11px]">
                            {ratioLabel ?? info.desc}
                          </span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </FormItem>
      )}
    />
  );
}
