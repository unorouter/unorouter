"use client";

import { SectionTitle } from "@/components/elements/content/sidebar-page-header";
import { MyFormError } from "@/components/elements/form/my-form-error";
import { Icon } from "@/components/ui/icon";
import { MyFormInput } from "@/components/elements/form/my-form-input";
import { MyFormKeyedSelect } from "@/components/elements/form/my-form-keyed-select";
import { MyFormSwitch } from "@/components/elements/form/my-form-switch";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  usePricingCatalogQuery,
  usePricingVendorsQuery,
} from "@/hooks/models/pricing-hook";
import {
  useCreateTokenMutation,
  useDeleteTokenMutation,
  useToggleTokenStatusMutation,
  useUpdateTokenMutation,
  useUserGroupsQuery,
} from "@/hooks/billing/token-hook";
import { dollarsToQuota, quotaToDollars } from "@/lib/config/constants";
import { safeJsonParse, isOneOf } from "@/lib/utils/base";
import { tokenFormSchema, type TokenFormSchema } from "@/lib/validation/token";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { TokenRow } from "./token-columns";
import {
  TokenGroupMapping,
  normalizeGroupMapping,
} from "./token-group-mapping";
import { TokenKeyDisplay } from "./token-key-display";
import { TokenModelSelect } from "./token-model-select";
import { useTokenKey } from "./use-token-key";
import { formDefaults } from "@/lib/validation/helpers";
import type { TranslationKey } from "@/lib/types";

type TokenDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token?: TokenRow | null;
};

const REASONING_OPTION_KEYS = {
  off: "TOKEN.FORM.REASONING_OFF",
  low: "TOKEN.FORM.REASONING_LOW",
  medium: "TOKEN.FORM.REASONING_MEDIUM",
  high: "TOKEN.FORM.REASONING_HIGH",
  max: "TOKEN.FORM.REASONING_MAX",
} as const satisfies Record<
  TokenFormSchema["default_reasoning_effort"],
  TranslationKey
>;

const PROMPT_CACHE_OPTION_KEYS = {
  auto: "TOKEN.FORM.PROMPT_CACHE_AUTO",
  on: "TOKEN.FORM.PROMPT_CACHE_ON",
  off: "TOKEN.FORM.PROMPT_CACHE_OFF",
} as const satisfies Record<TokenFormSchema["prompt_cache"], TranslationKey>;

const isReasoningEffort = isOneOf(["low", "medium", "high", "max"] as const);
const isPromptCache = isOneOf(["on", "off"] as const);

const QUOTA_PRESETS = [1, 10, 50, 100, 500, 1000].map((dollars) => ({
  label: "$" + dollars,
  value: dollarsToQuota(dollars),
}));

export function TokenDialog(props: TokenDialogProps) {
  const t = useTranslations();
  const createMutation = useCreateTokenMutation();
  const updateMutation = useUpdateTokenMutation();
  const toggleMutation = useToggleTokenStatusMutation();
  const deleteMutation = useDeleteTokenMutation();
  const isEdit = !!props.token;
  const pricingQuery = usePricingVendorsQuery();
  const catalogQuery = usePricingCatalogQuery();
  const userGroupsQuery = useUserGroupsQuery();
  const form = useForm({
    resolver: typeboxResolver(tokenFormSchema),
    defaultValues: formDefaults(tokenFormSchema),
  });

  const tokenKey = useTokenKey(props.token, String(props.open));

  useEffect(() => {
    if (!props.open) return;
    if (props.token) {
      const tokenMapping = normalizeGroupMapping(
        safeJsonParse<unknown>(props.token.group_mapping, {}),
      );
      form.reset({
        name: props.token.name || "",
        remain_quota: props.token.remain_quota ?? 0,
        unlimited_quota: !!props.token.unlimited_quota,
        model_limits_enabled: !!props.token.model_limits_enabled,
        model_limits: props.token.model_limits
          ? props.token.model_limits.split(",").filter(Boolean)
          : [],
        allow_ips: props.token.allow_ips ?? "",
        group_mapping: tokenMapping,
        default_reasoning_effort: isReasoningEffort(
          props.token.default_reasoning_effort,
        )
          ? props.token.default_reasoning_effort
          : "off",
        prompt_cache: isPromptCache(props.token.prompt_cache)
          ? props.token.prompt_cache
          : "auto",
      });
    } else {
      form.reset(formDefaults(tokenFormSchema));
    }
  }, [props.open, props.token, form]);

  function handleToggleStatus() {
    if (!props.token) return;
    const isEnabled = props.token.status === 1;
    toggleMutation.mutate(
      { body: { ...props.token, status: isEnabled ? 2 : 1 } },
      {
        onSuccess: () => {
          toast.success(t("TOKEN.SUCCESS.STATUS_CHANGED"));
          props.onOpenChange(false);
        },
      },
    );
  }

  function handleDelete() {
    if (!props.token) return;
    deleteMutation.mutate(
      { id: props.token.id },
      {
        onSuccess: () => {
          toast.success(t("TOKEN.SUCCESS.DELETED"));
          props.onOpenChange(false);
        },
      },
    );
  }

  function onSubmit(data: TokenFormSchema) {
    if (!data.unlimited_quota && data.remain_quota <= 0) {
      form.setError("remain_quota", {
        type: "manual",
        message: t("TOKEN.FORM.QUOTA_POSITIVE"),
      });
      return;
    }
    // The gateway reads limits on with an empty list as "no model allowed".
    if (data.model_limits_enabled && data.model_limits.length === 0) {
      form.setError("model_limits", {
        type: "manual",
        message: t("TOKEN.FORM.MODEL_LIMITS_EMPTY"),
      });
      return;
    }
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
      group_mapping:
        Object.keys(data.group_mapping).length > 0
          ? JSON.stringify(data.group_mapping)
          : "",
      default_reasoning_effort:
        data.default_reasoning_effort === "off"
          ? ""
          : data.default_reasoning_effort,
      prompt_cache: data.prompt_cache === "auto" ? "" : data.prompt_cache,
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
            toast.success(t("TOKEN.SUCCESS.UPDATED"));
            props.onOpenChange(false);
          },
        },
      );
    } else {
      createMutation.mutate(
        { body: payload },
        {
          onSuccess: () => {
            toast.success(t("TOKEN.SUCCESS.CREATED"));
            props.onOpenChange(false);
          },
        },
      );
    }
  }

  // The picker shows a group's ratio and what that lane actually costs. Pass
  // the catalogue price as-is: it already carries the cheapest enabled group's
  // ratio, and the picker scales each row by its ratio over the cheapest.
  // Reading original_* here instead looked like the 1x sticker but is only
  // populated when the cheapest ratio is a DISCOUNT, so on the 18 models whose
  // cheapest lane is a markup it fell through to input_price and applied that
  // ratio twice.
  const modelPrices = new Map<string, { input: number; output: number }>();
  for (const m of catalogQuery.data?.models ?? [])
    if (!m.is_free && !m.is_fixed_price)
      modelPrices.set(m.model_name, {
        input: m.input_price,
        output: m.output_price,
      });

  const modelsByVendorMap = new Map<
    string,
    { name: string; vendor: string }[]
  >();
  for (const m of pricingQuery.data?.model_vendors ?? []) {
    const list = modelsByVendorMap.get(m.vendor);
    if (list) list.push({ name: m.model_name, vendor: m.vendor });
    else
      modelsByVendorMap.set(m.vendor, [
        { name: m.model_name, vendor: m.vendor },
      ]);
  }
  const modelsByVendor = [...modelsByVendorMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([vendor, items]) => ({ vendor, models: items }));

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isEnabled = props.token?.status === 1;

  const unlimitedQuota = useWatch({
    control: form.control,
    name: "unlimited_quota",
  });
  const remainQuota = useWatch({
    control: form.control,
    name: "remain_quota",
  });
  const modelLimitsEnabled = useWatch({
    control: form.control,
    name: "model_limits_enabled",
  });
  const selectedModels = useWatch({
    control: form.control,
    name: "model_limits",
  });
  const groupMapping = useWatch({
    control: form.control,
    name: "group_mapping",
  });

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="flex max-h-[90svh] flex-col gap-0 sm:max-w-lg">
        <DialogHeader className="pb-6">
          <DialogTitle>
            {isEdit ? t("TOKEN.EDIT") : t("TOKEN.CREATE")}
          </DialogTitle>
          <DialogDescription>{t("TOKEN.DESCRIPTION")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="-mx-6 flex flex-1 flex-col gap-6 overflow-y-auto px-6">
              {isEdit && tokenKey.displayKey && (
                <TokenKeyDisplay
                  displayKey={tokenKey.displayKey}
                  revealedKey={tokenKey.revealedKey}
                  isEnabled={isEnabled}
                  onToggleReveal={tokenKey.toggleReveal}
                  onCopyKey={tokenKey.copy}
                />
              )}

              {isEdit && <Separator />}

              <div>
                <SectionTitle label={t("TOKEN.FORM.NAME")} />

                <MyFormInput
                  control={form.control}
                  name="name"
                  schema={tokenFormSchema}
                  placeholder={t("TOKEN.FORM.NAME_PLACEHOLDER")}
                  maxLength={50}
                />
              </div>

              <Separator />

              <div>
                <SectionTitle icon="wallet" label={t("TOKEN.FORM.QUOTA")} />

                <div className="flex flex-col gap-4">
                  <MyFormSwitch
                    control={form.control}
                    name="unlimited_quota"
                    label={t("TOKEN.FORM.UNLIMITED_QUOTA")}
                    description={t("TOKEN.FORM.UNLIMITED_QUOTA_DESC")}
                    size="sm"
                  />

                  {!unlimitedQuota && (
                    <>
                      <FormField
                        control={form.control}
                        name="remain_quota"
                        render={({ field, fieldState }) => (
                          <FormItem>
                            <FormLabel>{t("TOKEN.FORM.QUOTA")}</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-mono text-sm">
                                  $
                                </span>
                                <Input
                                  type="number"
                                  inputMode="decimal"
                                  step="0.01"
                                  min="0"
                                  className="pl-7"
                                  placeholder={t(
                                    "TOKEN.FORM.QUOTA_PLACEHOLDER",
                                  )}
                                  value={Number(
                                    quotaToDollars(field.value).toFixed(2),
                                  )}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    if (v === "") {
                                      field.onChange(0);
                                      return;
                                    }
                                    const dollars = Number(v);
                                    if (Number.isNaN(dollars)) return;
                                    const clamped =
                                      Math.round(dollars * 100) / 100;
                                    field.onChange(dollarsToQuota(clamped));
                                  }}
                                  onBlur={field.onBlur}
                                />
                              </div>
                            </FormControl>
                            <span className="text-muted-foreground font-mono text-[11px]">
                              {t("TOKEN.FORM.QUOTA_EQUIVALENT", {
                                quota: field.value.toLocaleString(),
                              })}
                            </span>
                            {field.value <= 0 && (
                              <p className="text-muted-foreground text-[11px]">
                                {t("TOKEN.FORM.QUOTA_ZERO_HINT")}
                              </p>
                            )}
                            <MyFormError
                              name="remain_quota"
                              schema={tokenFormSchema}
                              error={fieldState.error?.message}
                            />
                          </FormItem>
                        )}
                      />
                      <div className="flex flex-col gap-1.5">
                        <span className="text-muted-foreground text-[11px]">
                          {t("TOKEN.FORM.QUOTA_PRESETS")}
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
                              onClick={() => {
                                form.setValue("remain_quota", preset.value);
                              }}
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
                <SectionTitle icon="layers" label={t("TOKEN.FORM.GROUP")} />

                <div className="flex flex-col gap-2">
                  <TokenGroupMapping
                    control={form.control}
                    mapping={groupMapping}
                    groups={userGroupsQuery.data ?? {}}
                    models={pricingQuery.data?.model_vendors ?? []}
                    prices={modelPrices}
                  />
                  <p className="text-muted-foreground text-[11px]">
                    {t("TOKEN.FORM.GROUP_MAPPING_HINT")}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <SectionTitle icon="brain" label={t("TOKEN.FORM.REASONING")} />

                <div className="flex flex-col gap-2">
                  <MyFormKeyedSelect
                    control={form.control}
                    name="default_reasoning_effort"
                    label={t("TOKEN.FORM.REASONING")}
                    labelClassName="sr-only"
                    fallback="off"
                    optionKeys={REASONING_OPTION_KEYS}
                  />
                  <p className="text-muted-foreground text-[11px]">
                    {t("TOKEN.FORM.REASONING_DESC")}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <SectionTitle
                  icon="database"
                  label={t("TOKEN.FORM.PROMPT_CACHE")}
                />

                <div className="flex flex-col gap-2">
                  <MyFormKeyedSelect
                    control={form.control}
                    name="prompt_cache"
                    label={t("TOKEN.FORM.PROMPT_CACHE")}
                    labelClassName="sr-only"
                    fallback="auto"
                    optionKeys={PROMPT_CACHE_OPTION_KEYS}
                  />
                  <p className="text-muted-foreground text-[11px]">
                    {t("TOKEN.FORM.PROMPT_CACHE_DESC")}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <SectionTitle
                  icon="shield"
                  label={t("TOKEN.FORM.MODEL_LIMITS")}
                />

                <div className="flex flex-col gap-4">
                  <MyFormSwitch
                    control={form.control}
                    name="model_limits_enabled"
                    label={t("TOKEN.FORM.MODEL_LIMITS")}
                    description={t("TOKEN.FORM.MODEL_LIMITS_DESC")}
                    size="sm"
                  />

                  {modelLimitsEnabled && (
                    <TokenModelSelect
                      control={form.control}
                      selectedModels={selectedModels}
                      modelsByVendor={modelsByVendor}
                    />
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <SectionTitle
                  icon="globe"
                  label={t("TOKEN.FORM.IP_WHITELIST")}
                />

                <FormField
                  control={form.control}
                  name="allow_ips"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={t("TOKEN.FORM.IP_WHITELIST_PLACEHOLDER")}
                          rows={3}
                          className="font-mono text-xs"
                        />
                      </FormControl>
                      <p className="text-muted-foreground text-[11px]">
                        {t("TOKEN.FORM.IP_WHITELIST_DESC")}
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
                            aria-label={
                              isEnabled ? t("TOKEN.DISABLE") : t("TOKEN.ENABLE")
                            }
                          />
                        }
                      >
                        <Icon
                          name={isEnabled ? "power-off" : "power"}
                          className="h-4 w-4"
                        />
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
                            aria-label={t("TOKEN.DELETE.BUTTON")}
                          />
                        }
                      >
                        <Icon name="trash-2" className="h-4 w-4" />
                      </TooltipTrigger>
                      <TooltipContent>
                        {t("TOKEN.DELETE.BUTTON")}
                      </TooltipContent>
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
                  {t("COMMON.CANCEL")}
                </Button>
                <Button type="submit" disabled={isPending}>
                  <Icon
                    name={isEdit ? "check" : "plus"}
                    data-icon="inline-start"
                    className="h-4 w-4"
                  />
                  {isEdit ? t("TOKEN.FORM.SAVE") : t("TOKEN.FORM.SUBMIT")}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
