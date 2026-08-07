"use client";

import { useStatusQuery } from "@/hooks/ops/status-hook";
import { ApiInfoPanel } from "./api-info-panel";
import { ApiKeysPanel } from "./api-keys-panel";
import { UsageGlance } from "./usage-glance";

export function OverviewSection() {
  const statusQuery = useStatusQuery();
  const hasApiInfo = statusQuery.data?.api_info_enabled ?? false;

  return (
    <div className="flex flex-col gap-6">
      <UsageGlance />
      <div className={`grid gap-6 ${hasApiInfo ? "lg:grid-cols-2" : ""}`}>
        <ApiKeysPanel />
        {hasApiInfo && <ApiInfoPanel />}
      </div>
    </div>
  );
}
