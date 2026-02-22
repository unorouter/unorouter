"use client";

import { cn } from "@/lib/utils";

type TickerModel = {
  name: string;
  vendor: string;
};

type Props = {
  models: TickerModel[];
  className?: string;
};

export function ModelTicker(props: Props) {
  // Triple the models for seamless looping
  const tripled = [...props.models, ...props.models, ...props.models];

  return (
    <div
      className={cn(
        "border-t border-white/10 bg-[#050505] py-5 hidden md:flex",
        props.className
      )}
    >
      <div className="max-w-360 mx-auto w-full px-6 flex items-center gap-10">
        {/* Live indicator */}
        <div className="flex items-center gap-3 text-[10px] text-white font-mono uppercase tracking-widest border border-white/20 bg-white/5 px-3 py-1 shrink-0">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          Live Inference
        </div>

        {/* Scrolling models */}
        <div className="flex-1 overflow-hidden relative">
          <div className="flex gap-12 animate-marquee whitespace-nowrap font-mono text-xs">
            {tripled.map((model, i) => (
              <div
                key={`${model.name}-${i}`}
                className="flex items-center gap-3 opacity-40 hover:opacity-100 transition-opacity cursor-default"
              >
                <span className="text-white font-medium tracking-wide text-[11px] uppercase">
                  {model.name}
                </span>
              </div>
            ))}
          </div>
          {/* Fade edges */}
          <div className="absolute inset-y-0 left-0 w-24 bg-linear-to-r from-[#050505] to-transparent pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-24 bg-linear-to-l from-[#050505] to-transparent pointer-events-none" />
        </div>

        {/* TPS counter */}
        <div className="text-[10px] font-mono text-gray-500 shrink-0">
          TPS: <span className="text-white font-bold">142.5</span>
        </div>
      </div>
    </div>
  );
}
