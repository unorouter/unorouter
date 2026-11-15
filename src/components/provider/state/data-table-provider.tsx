"use client";

import {
  type DataTableStores,
  dataTableStorageAtom,
  tablesHydratedAtom,
} from "@/store/data-table-store";
import { useStore } from "jotai";
import { type ReactNode, useEffect } from "react";

export function DataTableProvider(props: {
  children: ReactNode;
  data?: DataTableStores;
}) {
  const store = useStore();

  useEffect(() => {
    const existing = store.get(dataTableStorageAtom);
    if (props.data && JSON.stringify(existing) !== JSON.stringify(props.data))
      store.set(dataTableStorageAtom, props.data);
    store.set(tablesHydratedAtom, true);
  }, [store, props.data]);

  return <>{props.children}</>;
}
