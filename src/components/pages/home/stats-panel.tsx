"use client";

import { useTokenStatsQuery } from "@/hooks/stats-hook";
import { LuActivity } from "react-icons/lu";

export function StatsPanel() {
  const { data } = useTokenStatsQuery();

  // quota in new-api is in 0.001-cent units (1 quota = $0.000001 USD at model_ratio=1)
  // Display as total tokens served (tpm * time is not useful; quota is the cumulative sum)
  const totalQuota = data?.quota ?? null;
  const rpm = data?.rpm ?? null;
  const tpm = data?.tpm ?? null;

  return (
    <div className="w-full max-w-lg mx-auto lg:mx-0 flex flex-col gap-px bg-white/10 border border-white/10 rounded-lg overflow-hidden backdrop-blur-md">
      {/* Tokens served */}
      <div className="bg-[#0A0A0A]/80 p-8 flex flex-col justify-center">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Tokens Served
          </span>
          <LuActivity className="h-3.5 w-3.5 text-gray-600" />
        </div>
        <div className="text-4xl md:text-5xl lg:text-5xl font-bold text-white tracking-tight tabular-nums">
          {totalQuota !== null ? totalQuota.toLocaleString() : "—"}
        </div>
      </div>

      {/* Sub-stats */}
      <div className="grid grid-cols-2 gap-px bg-white/10">
        <div className="bg-[#0A0A0A]/80 p-6 flex flex-col justify-between h-full">
          <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">
            Req / min
          </span>
          <div>
            <div className="text-2xl font-bold text-white tabular-nums mb-2">
              {rpm !== null ? rpm.toLocaleString() : "—"}
            </div>
            <div className="w-full h-0.5 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-white animate-width-expand" />
            </div>
          </div>
        </div>
        <div className="bg-[#0A0A0A]/80 p-6 flex flex-col justify-between h-full">
          <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">
            Tokens / min
          </span>
          <div className="flex flex-col">
            <div className="text-2xl font-bold text-white tabular-nums">
              {tpm !== null ? tpm.toLocaleString() : "—"}
            </div>
            <span className="text-[10px] text-green-500 mt-1 font-mono">
              Live
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
