"use client";

import { MyFormError } from "@/components/elements/form/my-form-error";
import { Icon } from "@/components/ui/icon";
import { MyFormInput } from "@/components/elements/form/my-form-input";
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
import { usePricingQuery } from "@/hooks/models/pricing-hook";
import {
  useCreateTokenMutation,
  useDeleteTokenMutation,
  useFetchTokenKeyMutation,
  useToggleTokenStatusMutation,
  useUpdateTokenMutation,
} from "@/hooks/billing/token-hook";
import { analytics } from "@/lib/analytics";
import { dollarsToQuota, quotaToDollars } from "@/lib/config/constants";
import { copyToClipboard, copyToClipboardAsync } from "@/lib/utils/base";
import { tokenFormSchema, type TokenFormSchema } from "@/lib/validation/token";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { Value } from "@sinclair/typebox/value";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { TokenRow } from "./token-columns";
import { TokenKeyDisplay } from "./token-key-display";
import { TokenModelSelect } from "./token-model-select";

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
  const pricingQuery = usePricingQuery();
  const form = useForm({
    resolver: typeboxResolver(tokenFormSchema),
    defaultValues: Value.Default(tokenFormSchema, {}) as TokenFormSchema,
  });

  const sessionKey = props.open ? `${props.token?.id ?? "new"}` : "";
  const [revealSession, setRevealSession] = useState({
    key: sessionKey,
    value: null as string | null,
  });
  if (revealSession.key !== sessionKey) {
    setRevealSession({ key: sessionKey, value: null });
  }
  const revealedKey = revealSession.value;
  const setRevealedKey = (value: string | null) => {
    setRevealSession({ key: sessionKey, value });
  };

  useEffect(() => {
    if (!props.open) return;
    if (props.token) {
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
    } else {
      form.reset(Value.Default(tokenFormSchema, {}) as TokenFormSchema);
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
        onSuccess: (data) => {
          setRevealedKey(data.key);
          analytics.tokens.keyRevealed();
        },
        onError: () => toast.error(t("TOKEN.ERROR.FETCH_KEY")),
      },
    );
  }

  function handleCopyKey() {
    if (!props.token) return;
    analytics.tokens.keyCopied();
    if (revealedKey) {
      copyToClipboard(`sk-${revealedKey}`);
      toast.success(t("TOKEN.SUCCESS.KEY_COPIED"));
      return;
    }
    const tokenId = props.token.id;
    copyToClipboardAsync(() =>
      fetchKeyMutation
        .mutateAsync({ id: tokenId })
        .then((data) => `sk-${data.key}`),
    )
      .then(() => toast.success(t("TOKEN.SUCCESS.KEY_COPIED")))
      .catch(() => toast.error(t("TOKEN.ERROR.FETCH_KEY")));
  }

  function handleToggleStatus() {
    if (!props.token) return;
    const isEnabled = props.token.status === 1;
    toggleMutation.mutate(
      { body: { ...props.token, status: isEnabled ? 2 : 1 } },
      {
        onSuccess: () => {
          analytics.tokens.statusToggled(!isEnabled);
          toast.success(t("TOKEN.SUCCESS.STATUS_CHANGED"));
          props.onOpenChange(false);
        },
        onError: () => toast.error(t("TOKEN.ERROR.STATUS_UPDATE")),
      },
    );
  }

  function handleDelete() {
    if (!props.token) return;
    deleteMutation.mutate(
      { id: props.token.id },
      {
        onSuccess: () => {
          analytics.tokens.deleted();
          toast.success(t("TOKEN.SUCCESS.DELETED"));
          props.onOpenChange(false);
        },
        onError: () => toast.error(t("TOKEN.ERROR.DELETE")),
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

    const trackProps = {
      has_ip_whitelist: !!payload.allow_ips,
      unlimited_quota: payload.unlimited_quota,
      model_limits_enabled: payload.model_limits_enabled,
      model_count: data.model_limits_enabled ? data.model_limits.length : 0,
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
            analytics.tokens.updated(trackProps);
            toast.success(t("TOKEN.SUCCESS.UPDATED"));
            props.onOpenChange(false);
          },
          onError: (err) =>
            toast.error(
              err instanceof Error && err.message
                ? err.message
                : t("TOKEN.ERROR.UPDATE"),
            ),
        },
      );
    } else {
      createMutation.mutate(
        { body: payload },
        {
          onSuccess: () => {
            analytics.tokens.created(trackProps);
            toast.success(t("TOKEN.SUCCESS.CREATED"));
            props.onOpenChange(false);
          },
          onError: (err) =>
            toast.error(
              err instanceof Error && err.message
                ? err.message
                : t("TOKEN.ERROR.CREATE"),
            ),
        },
      );
    }
  }

  const modelsByVendorMap = new Map<
    string,
    { name: string; vendor: string }[]
  >();
  for (const m of pricingQuery.data?.models ?? []) {
    const vendor = m.vendor.name;
    const list = modelsByVendorMap.get(vendor);
    if (list) list.push({ name: m.name, vendor });
    else modelsByVendorMap.set(vendor, [{ name: m.name, vendor }]);
  }
  const modelsByVendor = [...modelsByVendorMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([vendor, items]) => ({ vendor, models: items }));

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isEnabled = props.token?.status === 1;
  const displayKey = props.token
    ? revealedKey
      ? `sk-${revealedKey}`
      : `sk-${props.token.key}`
    : null;

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

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 sm:max-w-lg">
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
              {isEdit && displayKey && (
                <TokenKeyDisplay
                  displayKey={displayKey}
                  revealedKey={revealedKey}
                  isEnabled={isEnabled}
                  onToggleReveal={handleToggleReveal}
                  onCopyKey={handleCopyKey}
                />
              )}

              {isEdit && <Separator />}

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                    {t("TOKEN.FORM.NAME")}
                  </span>
                </div>

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
                <div className="mb-3 flex items-center gap-2">
                  <Icon
                    name="wallet"
                    className="text-muted-foreground h-4 w-4"
                  />
                  <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                    {t("TOKEN.FORM.QUOTA")}
                  </span>
                </div>

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
                                analytics.tokens.quotaPresetClicked({
                                  amount: preset.value,
                                });
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
                <div className="mb-3 flex items-center gap-2">
                  <Icon
                    name="shield"
                    className="text-muted-foreground h-4 w-4"
                  />
                  <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                    {t("TOKEN.FORM.MODEL_LIMITS")}
                  </span>
                </div>

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
                <div className="mb-3 flex items-center gap-2">
                  <Icon
                    name="globe"
                    className="text-muted-foreground h-4 w-4"
                  />
                  <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                    {t("TOKEN.FORM.IP_WHITELIST")}
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
                        {isEnabled ? (
                          <Icon name="power-off" className="h-4 w-4" />
                        ) : (
                          <Icon name="power" className="h-4 w-4" />
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
                  {t("TOKEN.CANCEL")}
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isEdit ? (
                    <Icon
                      name="check"
                      data-icon="inline-start"
                      className="h-4 w-4"
                    />
                  ) : (
                    <Icon
                      name="plus"
                      data-icon="inline-start"
                      className="h-4 w-4"
                    />
                  )}
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
