"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { MyFormSwitch } from "@/components/elements/form/my-form-switch";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import {
  useCreateTokenMutation,
  useDeleteTokenMutation,
  useFetchTokenKeyMutation,
  useToggleTokenStatusMutation,
  useUpdateTokenMutation,
} from "@/hooks/token-hook";
import { usePricingQuery } from "@/hooks/pricing-hook";
import { dollarsToQuota, quotaToDollars } from "@/lib/config/constants";
import { cn } from "@/lib/utils";
import { copyToClipboard, copyToClipboardAsync } from "@/lib/utils/base";
import { tokenFormSchema, type TokenFormSchema } from "@/lib/validation/token";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { Value } from "@sinclair/typebox/value";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  LuCheck,
  LuCopy,
  LuEye,
  LuEyeOff,
  LuGlobe,
  LuKey,
  LuPlus,
  LuPower,
  LuPowerOff,
  LuShield,
  LuTrash2,
  LuWallet,
} from "react-icons/lu";
import { toast } from "sonner";
import type { TokenRow } from "./token-columns";

type TokenDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token?: TokenRow | null;
};

const QUOTA_PRESETS = [
  { label: "$1", value: dollarsToQuota(1) },
  { label: "$10", value: dollarsToQuota(10) },
  { label: "$50", value: dollarsToQuota(50) },
  { label: "$100", value: dollarsToQuota(100) },
  { label: "$500", value: dollarsToQuota(500) },
  { label: "$1000", value: dollarsToQuota(1000) },
];

export function TokenDialog(props: TokenDialogProps) {
  const t = useTranslations();
  const createMutation = useCreateTokenMutation();
  const updateMutation = useUpdateTokenMutation();
  const toggleMutation = useToggleTokenStatusMutation();
  const deleteMutation = useDeleteTokenMutation();
  const fetchKeyMutation = useFetchTokenKeyMutation();
  const isEdit = !!props.token;

  const form = useForm({
    resolver: typeboxResolver(tokenFormSchema),
    defaultValues: Value.Default(tokenFormSchema, {}) as TokenFormSchema,
  });

  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  useEffect(() => {
    if (props.open && props.token) {
      form.reset({
        name: props.token.name || "",
        remain_quota: props.token.remain_quota ?? 0,
        unlimited_quota: !!props.token.unlimited_quota,
        model_limits_enabled: !!props.token.model_limits_enabled,
        model_limits: props.token.model_limits
          ? props.token.model_limits.split(",").filter(Boolean)
          : [],
        allow_ips: props.token.allow_ips ?? "",
      });
      setRevealedKey(null);
    } else if (props.open && !props.token) {
      form.reset(Value.Default(tokenFormSchema, {}) as TokenFormSchema);
      setRevealedKey(null);
    }
  }, [props.open, props.token, form]);

  function handleToggleReveal() {
    if (!props.token) return;
    if (revealedKey) {
      setRevealedKey(null);
      return;
    }
    fetchKeyMutation.mutate(
      { id: props.token.id },
      {
        onSuccess: (data) => setRevealedKey(data.key),
        onError: () => toast.error(t("TOKEN.FETCH_KEY_FAILED")),
      },
    );
  }

  function handleCopyKey() {
    if (!props.token) return;
    if (revealedKey) {
      copyToClipboard(`sk-${revealedKey}`);
      toast.success(t("TOKEN.KEY_COPIED"));
      return;
    }
    const tokenId = props.token.id;
    copyToClipboardAsync(() =>
      fetchKeyMutation
        .mutateAsync({ id: tokenId })
        .then((data) => `sk-${data.key}`),
    )
      .then(() => toast.success(t("TOKEN.KEY_COPIED")))
      .catch(() => toast.error(t("TOKEN.FETCH_KEY_FAILED")));
  }

  function handleToggleStatus() {
    if (!props.token) return;
    const isEnabled = props.token.status === 1;
    toggleMutation.mutate(
      { body: { ...props.token, status: isEnabled ? 2 : 1 } },
      {
        onSuccess: () => {
          toast.success(t("TOKEN.STATUS_CHANGED"));
          props.onOpenChange(false);
        },
        onError: () => toast.error(t("TOKEN.STATUS_UPDATE_FAILED")),
      },
    );
  }

  function handleDelete() {
    if (!props.token) return;
    deleteMutation.mutate(
      { id: props.token.id },
      {
        onSuccess: () => {
          toast.success(t("TOKEN.DELETED_SUCCESS"));
          props.onOpenChange(false);
        },
        onError: () => toast.error(t("TOKEN.DELETE_FAILED")),
      },
    );
  }

  function onSubmit(data: TokenFormSchema) {
    const payload = {
      name: data.name.trim(),
      remain_quota: data.unlimited_quota ? 0 : data.remain_quota,
      expired_time: -1,
      unlimited_quota: data.unlimited_quota,
      model_limits_enabled: data.model_limits_enabled,
      model_limits: data.model_limits_enabled
        ? data.model_limits.join(",")
        : "",
      allow_ips: data.allow_ips.trim(),
      group: "auto",
      cross_group_retry: true,
    };

    if (isEdit) {
      updateMutation.mutate(
        {
          body: {
            id: props.token!.id,
            status: props.token!.status,
            ...payload,
          },
        },
        {
          onSuccess: () => {
            toast.success(t("TOKEN.UPDATED_SUCCESS"));
            props.onOpenChange(false);
          },
          onError: (err) =>
            toast.error(
              err instanceof Error ? err.message : "Failed to update token",
            ),
        },
      );
    } else {
      createMutation.mutate(
        { body: payload },
        {
          onSuccess: () => {
            toast.success(t("TOKEN.CREATED_SUCCESS"));
            props.onOpenChange(false);
          },
          onError: (err) =>
            toast.error(
              err instanceof Error ? err.message : "Failed to create token",
            ),
        },
      );
    }
  }

  const pricingQuery = usePricingQuery();
  const modelsByVendor = (() => {
    const models = pricingQuery.data?.models ?? [];
    const grouped = new Map<string, { name: string; vendor: string }[]>();
    for (const m of models) {
      const vendor = m.vendor.name;
      const list = grouped.get(vendor);
      if (list) list.push({ name: m.name, vendor });
      else grouped.set(vendor, [{ name: m.name, vendor }]);
    }
    return [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([vendor, items]) => ({ vendor, models: items }));
  })();

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isEnabled = props.token?.status === 1;
  const displayKey = props.token
    ? revealedKey
      ? `sk-${revealedKey}`
      : `sk-${props.token.key}`
    : null;

  const unlimitedQuota = form.watch("unlimited_quota");
  const remainQuota = form.watch("remain_quota");
  const modelLimitsEnabled = form.watch("model_limits_enabled");
  const selectedModels = form.watch("model_limits");

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("TOKEN.EDIT") : t("TOKEN.CREATE")}
          </DialogTitle>
          <DialogDescription>{t("TOKEN.DESCRIPTION")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-6">
              {isEdit && displayKey && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <LuKey className="text-muted-foreground h-4 w-4" />
                    <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                      {t("TOKEN.COL_KEY")}
                    </span>
                    <Badge
                      variant={isEnabled ? "default" : "destructive"}
                      className={
                        isEnabled ? "bg-green-500/10 text-green-500" : ""
                      }
                    >
                      {isEnabled
                        ? t("TOKEN.STATUS_ENABLED")
                        : t("TOKEN.STATUS_DISABLED")}
                    </Badge>
                  </div>

                  <div className="flex min-w-0 items-center gap-1.5">
                    <code className="bg-muted text-foreground block min-w-0 flex-1 truncate overflow-hidden rounded px-2 py-1.5 font-mono text-xs">
                      {displayKey}
                    </code>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={handleToggleReveal}
                            />
                          }
                        >
                          {revealedKey ? (
                            <LuEyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <LuEye className="h-3.5 w-3.5" />
                          )}
                        </TooltipTrigger>
                        <TooltipContent>
                          {revealedKey
                            ? t("TOKEN.HIDE_KEY")
                            : t("TOKEN.REVEAL_KEY")}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={handleCopyKey}
                            />
                          }
                        >
                          <LuCopy className="h-3.5 w-3.5" />
                        </TooltipTrigger>
                        <TooltipContent>{t("TOKEN.COPY_KEY")}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              )}

              {isEdit && <Separator />}

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                    {t("TOKEN.NAME")}
                  </span>
                </div>

                <MyFormInput
                  control={form.control}
                  name="name"
                  schema={tokenFormSchema}
                  placeholder={t("TOKEN.NAME_PLACEHOLDER")}
                  maxLength={50}
                />
              </div>

              <Separator />

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <LuWallet className="text-muted-foreground h-4 w-4" />
                  <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                    {t("TOKEN.QUOTA")}
                  </span>
                </div>

                <div className="flex flex-col gap-4">
                  <MyFormSwitch
                    control={form.control}
                    name="unlimited_quota"
                    label={t("TOKEN.UNLIMITED_QUOTA")}
                    description={t("TOKEN.UNLIMITED_QUOTA_DESC")}
                    size="sm"
                  />

                  {!unlimitedQuota && (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <MyFormInput
                          control={form.control}
                          name="remain_quota"
                          schema={tokenFormSchema}
                          label={t("TOKEN.QUOTA")}
                          type="number"
                          placeholder={t("TOKEN.QUOTA_PLACEHOLDER")}
                        />
                        <span className="text-muted-foreground font-mono text-[11px]">
                          = ${quotaToDollars(remainQuota).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-muted-foreground text-[11px]">
                          {t("TOKEN.QUOTA_PRESETS")}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {QUOTA_PRESETS.map((preset) => (
                            <Button
                              key={preset.value}
                              type="button"
                              variant={
                                remainQuota === preset.value
                                  ? "default"
                                  : "outline"
                              }
                              size="xs"
                              onClick={() =>
                                form.setValue("remain_quota", preset.value)
                              }
                            >
                              {preset.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <LuShield className="text-muted-foreground h-4 w-4" />
                  <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                    {t("TOKEN.MODEL_LIMITS")}
                  </span>
                </div>

                <div className="flex flex-col gap-4">
                  <MyFormSwitch
                    control={form.control}
                    name="model_limits_enabled"
                    label={t("TOKEN.MODEL_LIMITS")}
                    description={t("TOKEN.MODEL_LIMITS_DESC")}
                    size="sm"
                  />

                  {modelLimitsEnabled && (
                    <FormField
                      control={form.control}
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
                                      {selectedModels.length > 0 ? (
                                        selectedModels.map((modelName) => {
                                          const vendor =
                                            modelsByVendor.find((g) =>
                                              g.models.some(
                                                (m) => m.name === modelName,
                                              ),
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
                                                    selectedModels.filter(
                                                      (m) => m !== modelName,
                                                    ),
                                                  );
                                                }}
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    field.onChange(
                                                      selectedModels.filter(
                                                        (m) => m !== modelName,
                                                      ),
                                                    );
                                                  }
                                                }}
                                                className="hover:text-foreground text-muted-foreground ml-0.5 cursor-pointer"
                                              >
                                                <X className="h-3 w-3" />
                                              </span>
                                            </Badge>
                                          );
                                        })
                                      ) : (
                                        <span className="text-muted-foreground text-xs">
                                          {t(
                                            "TOKEN.MODEL_LIMITS_PLACEHOLDER",
                                          )}
                                        </span>
                                      )}
                                    </div>
                                    <ChevronsUpDown className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
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
                                  placeholder={t(
                                    "TOKEN.MODEL_SELECT_PLACEHOLDER",
                                  )}
                                />
                                <CommandList className="max-h-64">
                                  <CommandEmpty>
                                    {t("TOKEN.MODEL_SELECT_EMPTY")}
                                  </CommandEmpty>
                                  {modelsByVendor.map((group) => (
                                    <CommandGroup
                                      key={group.vendor}
                                      heading={
                                        <div className="flex items-center gap-1.5">
                                          <VendorIcon
                                            vendor={group.vendor}
                                            size={14}
                                          />
                                          <span>{group.vendor}</span>
                                          <span className="text-muted-foreground ml-auto font-mono text-[10px]">
                                            {group.models.length}
                                          </span>
                                        </div>
                                      }
                                    >
                                      {group.models.map((model) => {
                                        const isSelected =
                                          selectedModels.includes(model.name);
                                        return (
                                          <CommandItem
                                            key={model.name}
                                            value={model.name}
                                            onSelect={() => {
                                              const next = isSelected
                                                ? selectedModels.filter(
                                                    (m) => m !== model.name,
                                                  )
                                                : [
                                                    ...selectedModels,
                                                    model.name,
                                                  ];
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
                                              <Check className="h-4 w-4" />
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
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <LuGlobe className="text-muted-foreground h-4 w-4" />
                  <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                    {t("TOKEN.IP_WHITELIST")}
                  </span>
                </div>

                <FormField
                  control={form.control}
                  name="allow_ips"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={t("TOKEN.IP_WHITELIST_PLACEHOLDER")}
                          rows={3}
                          className="font-mono text-xs"
                        />
                      </FormControl>
                      <p className="text-muted-foreground text-[11px]">
                        {t("TOKEN.IP_WHITELIST_DESC")}
                      </p>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="mt-6 flex-row gap-2 sm:justify-between">
              {isEdit ? (
                <div className="flex gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleToggleStatus}
                            disabled={toggleMutation.isPending}
                          />
                        }
                      >
                        {isEnabled ? (
                          <LuPowerOff className="h-4 w-4" />
                        ) : (
                          <LuPower className="h-4 w-4" />
                        )}
                      </TooltipTrigger>
                      <TooltipContent>
                        {isEnabled ? t("TOKEN.DISABLE") : t("TOKEN.ENABLE")}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                            className="text-destructive hover:bg-destructive/10"
                          />
                        }
                      >
                        <LuTrash2 className="h-4 w-4" />
                      </TooltipTrigger>
                      <TooltipContent>{t("TOKEN.DELETE")}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => props.onOpenChange(false)}
                >
                  {t("TOKEN.CANCEL")}
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isEdit ? (
                    <LuCheck data-icon="inline-start" className="h-4 w-4" />
                  ) : (
                    <LuPlus data-icon="inline-start" className="h-4 w-4" />
                  )}
                  {isEdit ? t("TOKEN.SAVE") : t("TOKEN.SUBMIT")}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
