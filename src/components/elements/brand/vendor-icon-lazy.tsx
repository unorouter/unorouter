"use client";

import dynamic from "next/dynamic";

export const VendorIconLazy = dynamic(
  () => import("./vendor-icon").then((m) => m.VendorIcon),
  { ssr: false, loading: () => <span style={{ width: 16, height: 16, display: "inline-block" }} /> },
);
