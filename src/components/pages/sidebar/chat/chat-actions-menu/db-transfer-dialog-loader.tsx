"use client";

import dynamic from "next/dynamic";

export const DbTransferDialogLoader = dynamic(
  () => import("./db-transfer-dialog").then((m) => m.DbTransferDialog),
  { ssr: false },
);
