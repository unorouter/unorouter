"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import {
  ALIAS_LOADERS,
  VENDOR_LOADERS,
  getVendorTheme,
} from "@/lib/config/vendor-registry";
import { Vendor } from "@/lib/types/enums";
import { useState } from "react";

const SIZES = [24, 32, 48, 64] as const;

// The registry keys ARE the match tokens VendorIcon resolves against, so
// rendering them directly is what a designer needs to see: every icon the app
// can draw, including vendors whose models are currently disabled.
function registeredVendors(): string[] {
  const fromEnum = Object.values(Vendor).filter(
    (value) => VENDOR_LOADERS[value] !== undefined,
  );
  return [...fromEnum, ...Object.keys(ALIAS_LOADERS)].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function VendorGallery() {
  const [size, setSize] = useState<number>(48);
  const [query, setQuery] = useState("");

  const all = registeredVendors();
  const needle = query.trim().toLowerCase();
  const vendors = needle
    ? all.filter((vendor) => vendor.includes(needle))
    : all;

  return (
    <div className="mx-auto w-full max-w-[1800px] px-4 pt-20 pb-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="text-foreground mr-2 text-base font-semibold">
          Vendor icons
        </h1>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter"
          className="border-border/60 bg-background/60 h-7 w-36 rounded-lg border px-2 font-mono text-[11px] outline-none"
        />
        <div className="flex items-center gap-1">
          {SIZES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSize(option)}
              className={`h-7 rounded-lg border px-2 font-mono text-[11px] ${
                size === option
                  ? "border-primary text-foreground"
                  : "border-border/60 text-muted-foreground"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <span className="text-muted-foreground font-mono text-[11px]">
          {vendors.length}/{all.length}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-0.5 sm:grid-cols-6 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-16">
        {vendors.map((vendor) => {
          const theme = getVendorTheme(vendor);
          return (
            <div
              key={vendor}
              className={`flex flex-col items-center gap-1 rounded border px-0.5 py-1.5 ${theme.bg} ${theme.border}`}
            >
              <VendorIcon vendor={vendor} size={size} />
              <span
                className={`w-full truncate text-center font-mono text-[10px] ${theme.text}`}
                title={vendor}
              >
                {vendor}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
