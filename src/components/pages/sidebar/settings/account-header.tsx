"use client";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { renderQuota } from "@/lib/config/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";

const AVATAR_COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-blue-500",
  "bg-violet-500",
  "bg-purple-500",
  "bg-pink-500",
];

function getAvatarColor(username: string) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function AccountHeader() {
  const t = useTranslations();
  const authQuery = useAuthQuery();
  const user = authQuery.data;

  if (!user) return null;

  const roleBadge =
    user.role >= 100
      ? {
          label: t("SETTINGS.ROLE_SUPER_ADMIN"),
          variant: "destructive" as const,
        }
      : user.role >= 10
        ? { label: t("SETTINGS.ROLE_ADMIN"), variant: "default" as const }
        : { label: t("SETTINGS.ROLE_USER"), variant: "secondary" as const };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          {/* Avatar */}
          <div
            className={`flex h-16 w-16 shrink-0 items-center justify-center text-2xl font-bold text-white ${getAvatarColor(user.username)}`}
          >
            {user.username.charAt(0).toUpperCase()}
          </div>

          {/* User Info */}
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">
                {user.display_name || user.username}
              </span>
              <Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
            </div>
            <span className="text-muted-foreground text-sm">
              {t("SETTINGS.USER_ID")}: {user.id}
            </span>
            <span className="text-2xl font-bold">
              {renderQuota(user.quota)}
            </span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm sm:gap-6">
            <div className="flex flex-col items-center gap-1">
              <span className="text-muted-foreground text-xs">
                {t("SETTINGS.CONSUMPTION")}
              </span>
              <span className="font-medium">
                {renderQuota(user.used_quota)}
              </span>
            </div>
            <Separator orientation="vertical" className="h-8" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-muted-foreground text-xs">
                {t("SETTINGS.REQUEST_COUNT")}
              </span>
              <span className="font-medium">
                {user.request_count?.toLocaleString()}
              </span>
            </div>
            <Separator orientation="vertical" className="h-8" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-muted-foreground text-xs">
                {t("SETTINGS.DEFAULT_GROUP")}
              </span>
              <span className="font-medium">{user.group || "default"}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
