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
    <div className="mx-auto w-full max-w-7xl px-6 py-12">
      <div className="mb-8 space-y-2">
        <h1 className="text-foreground text-2xl font-semibold sm:text-3xl">
          Vendor icon reference
        </h1>
        <p className="text-muted-foreground text-sm">
          Every icon the app can render, independent of whether that vendor
          currently serves live models. {all.length} entries.
        </p>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name"
          className="border-border/60 bg-background/60 h-9 w-56 rounded-xl border px-3 font-mono text-xs outline-none"
        />
        <div className="flex items-center gap-1">
          {SIZES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSize(option)}
              className={`h-9 rounded-xl border px-3 font-mono text-xs ${
                size === option
                  ? "border-primary text-foreground"
                  : "border-border/60 text-muted-foreground"
              }`}
            >
              {option}px
            </button>
          ))}
        </div>
        <span className="text-muted-foreground font-mono text-xs">
          {vendors.length} shown
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {vendors.map((vendor) => {
          const theme = getVendorTheme(vendor);
          return (
            <div
              key={vendor}
              className={`flex flex-col items-center gap-3 rounded-2xl border p-4 ${theme.bg} ${theme.border}`}
            >
              <VendorIcon vendor={vendor} size={size} />
              <span
                className={`text-center font-mono text-[11px] break-all ${theme.text}`}
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
