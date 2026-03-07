"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateTokenMutation,
  useUserGroupsQuery,
  useUserModelsQuery,
} from "@/hooks/token-hook";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LuKey, LuPlus, LuShield, LuWallet } from "react-icons/lu";
import { toast } from "sonner";

type CreateTokenSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function setExpiredTime(months: number, days: number, hours: number): number {
  if (months === 0 && days === 0 && hours === 0) return -1;
  const now = Date.now() / 1000;
  const seconds = months * 30 * 24 * 60 * 60 + days * 24 * 60 * 60 + hours * 60 * 60;
  return Math.ceil(now + seconds);
}

const QUOTA_PRESETS = [
  { label: "$1", value: 500000 },
  { label: "$10", value: 5000000 },
  { label: "$50", value: 25000000 },
  { label: "$100", value: 50000000 },
  { label: "$500", value: 250000000 },
  { label: "$1000", value: 500000000 },
];

export function CreateTokenSheet(props: CreateTokenSheetProps) {
  const t = useTranslations();
  const createMutation = useCreateTokenMutation();
  const groupsQuery = useUserGroupsQuery();
  const modelsQuery = useUserModelsQuery();

  const [name, setName] = useState("");
  const [group, setGroup] = useState("");
  const [crossGroupRetry, setCrossGroupRetry] = useState(false);
  const [expiredTime, setExpiredTimeState] = useState(-1);
  const [expirationLabel, setExpirationLabel] = useState("TOKEN.NEVER_EXPIRES");
  const [remainQuota, setRemainQuota] = useState(0);
  const [unlimitedQuota, setUnlimitedQuota] = useState(true);
  const [modelLimits, setModelLimits] = useState("");
  const [allowIps, setAllowIps] = useState("");

  const groupsData = groupsQuery.data as
    | { data?: Record<string, { desc: string; ratio: unknown }> }
    | Record<string, { desc: string; ratio: unknown }>
    | undefined;

  const groupsMap = groupsData && "data" in groupsData && groupsData.data
    ? groupsData.data
    : (groupsData as Record<string, { desc: string; ratio: unknown }> | undefined);

  const groupEntries = groupsMap ? Object.entries(groupsMap) : [];

  function resetForm() {
    setName("");
    setGroup("");
    setCrossGroupRetry(false);
    setExpiredTimeState(-1);
    setExpirationLabel("TOKEN.NEVER_EXPIRES");
    setRemainQuota(0);
    setUnlimitedQuota(true);
    setModelLimits("");
    setAllowIps("");
  }

  function handleExpirationPreset(months: number, days: number, hours: number, label: string) {
    setExpiredTimeState(setExpiredTime(months, days, hours));
    setExpirationLabel(label);
  }

  function handleSubmit() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (name.length > 50) {
      toast.error("Name must be 50 characters or less");
      return;
    }

    const modelLimitsCleaned = modelLimits
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean)
      .join(",");

    createMutation.mutate(
      {
        name: name.trim(),
        remain_quota: unlimitedQuota ? 0 : remainQuota,
        expired_time: expiredTime,
        unlimited_quota: unlimitedQuota,
        model_limits_enabled: modelLimitsCleaned.length > 0,
        model_limits: modelLimitsCleaned,
        allow_ips: allowIps.trim(),
        group,
        cross_group_retry: crossGroupRetry,
      },
      {
        onSuccess: () => {
          toast.success(t("TOKEN.CREATED_SUCCESS"));
          resetForm();
          props.onOpenChange(false);
        },
        onError: (err) => {
          const message = err instanceof Error ? err.message : "Failed to create token";
          toast.error(message);
        },
      },
    );
  }

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("TOKEN.CREATE")}</SheetTitle>
          <SheetDescription>{t("TOKEN.DESCRIPTION")}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4 pb-4">
          {/* Basic Info Section */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <LuKey className="text-muted-foreground h-4 w-4" />
              <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                Basic Info
              </span>
            </div>

            <div className="flex flex-col gap-4">
              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="token-name" className="text-xs font-medium">
                  {t("TOKEN.NAME")}
                </Label>
                <Input
                  id="token-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("TOKEN.NAME_PLACEHOLDER")}
                  maxLength={50}
                />
              </div>

              {/* Group */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium">
                  {t("TOKEN.GROUP")}
                </Label>
                {groupEntries.length > 0 ? (
                  <Select value={group} onValueChange={(v) => setGroup(v ?? "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("TOKEN.GROUP_PLACEHOLDER")} />
                    </SelectTrigger>
                    <SelectContent>
                      {groupEntries.map(([key, info]) => (
                        <SelectItem key={key} value={key}>
                          {(info as { desc: string }).desc || key}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-muted-foreground text-xs">
                    {t("TOKEN.GROUP_NO_GROUPS")}
                  </span>
                )}
              </div>

              {/* Cross-group retry (only when group = auto) */}
              {group === "auto" && (
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <Label className="text-xs font-medium">
                      {t("TOKEN.CROSS_GROUP_RETRY")}
                    </Label>
                    <span className="text-muted-foreground text-[11px]">
                      {t("TOKEN.CROSS_GROUP_RETRY_DESC")}
                    </span>
                  </div>
                  <Switch
                    checked={crossGroupRetry}
                    onCheckedChange={setCrossGroupRetry}
                    size="sm"
                  />
                </div>
              )}

              {/* Expiration */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium">
                  {t("TOKEN.EXPIRATION")}
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    variant={expirationLabel === "TOKEN.NEVER_EXPIRES" ? "default" : "outline"}
                    size="xs"
                    onClick={() => handleExpirationPreset(0, 0, 0, "TOKEN.NEVER_EXPIRES")}
                  >
                    {t("TOKEN.NEVER_EXPIRES")}
                  </Button>
                  <Button
                    variant={expirationLabel === "TOKEN.ONE_MONTH" ? "default" : "outline"}
                    size="xs"
                    onClick={() => handleExpirationPreset(1, 0, 0, "TOKEN.ONE_MONTH")}
                  >
                    {t("TOKEN.ONE_MONTH")}
                  </Button>
                  <Button
                    variant={expirationLabel === "TOKEN.ONE_DAY" ? "default" : "outline"}
                    size="xs"
                    onClick={() => handleExpirationPreset(0, 1, 0, "TOKEN.ONE_DAY")}
                  >
                    {t("TOKEN.ONE_DAY")}
                  </Button>
                  <Button
                    variant={expirationLabel === "TOKEN.ONE_HOUR" ? "default" : "outline"}
                    size="xs"
                    onClick={() => handleExpirationPreset(0, 0, 1, "TOKEN.ONE_HOUR")}
                  >
                    {t("TOKEN.ONE_HOUR")}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Quota Section */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <LuWallet className="text-muted-foreground h-4 w-4" />
              <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                {t("TOKEN.QUOTA")}
              </span>
            </div>

            <div className="flex flex-col gap-4">
              {/* Unlimited toggle */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <Label className="text-xs font-medium">
                    {t("TOKEN.UNLIMITED_QUOTA")}
                  </Label>
                  <span className="text-muted-foreground text-[11px] max-w-[300px]">
                    {t("TOKEN.UNLIMITED_QUOTA_DESC")}
                  </span>
                </div>
                <Switch
                  checked={unlimitedQuota}
                  onCheckedChange={setUnlimitedQuota}
                  size="sm"
                />
              </div>

              {/* Quota input + presets */}
              {!unlimitedQuota && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="token-quota" className="text-xs font-medium">
                      {t("TOKEN.QUOTA")}
                    </Label>
                    <Input
                      id="token-quota"
                      type="number"
                      value={remainQuota}
                      onChange={(e) => setRemainQuota(Number(e.target.value))}
                      placeholder={t("TOKEN.QUOTA_PLACEHOLDER")}
                    />
                    <span className="text-muted-foreground font-mono text-[11px]">
                      = ${(remainQuota / 500000).toFixed(2)}
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
                          variant={remainQuota === preset.value ? "default" : "outline"}
                          size="xs"
                          onClick={() => setRemainQuota(preset.value)}
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

          {/* Access Restrictions Section */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <LuShield className="text-muted-foreground h-4 w-4" />
              <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                Access Restrictions
              </span>
            </div>

            <div className="flex flex-col gap-4">
              {/* Model Limits */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="model-limits" className="text-xs font-medium">
                  {t("TOKEN.MODEL_LIMITS")}
                </Label>
                <Input
                  id="model-limits"
                  value={modelLimits}
                  onChange={(e) => setModelLimits(e.target.value)}
                  placeholder={t("TOKEN.MODEL_LIMITS_PLACEHOLDER")}
                />
                <span className="text-muted-foreground text-[11px]">
                  {t("TOKEN.MODEL_LIMITS_DESC")}
                </span>
              </div>

              {/* IP Whitelist */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ip-whitelist" className="text-xs font-medium">
                  {t("TOKEN.IP_WHITELIST")}
                </Label>
                <Textarea
                  id="ip-whitelist"
                  value={allowIps}
                  onChange={(e) => setAllowIps(e.target.value)}
                  placeholder={t("TOKEN.IP_WHITELIST_PLACEHOLDER")}
                  rows={3}
                />
                <span className="text-muted-foreground text-[11px]">
                  {t("TOKEN.IP_WHITELIST_DESC")}
                </span>
              </div>
            </div>
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>
            {t("TOKEN.CANCEL")}
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            <LuPlus data-icon="inline-start" className="h-4 w-4" />
            {t("TOKEN.SUBMIT")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
