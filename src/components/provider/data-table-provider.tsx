"use client";

import {
  type DataTableStores,
  dataTableStorageAtom,
} from "@/store/data-table-store";
import { useStore } from "jotai";
import { type ReactNode, useMemo, useSyncExternalStore } from "react";

export function DataTableProvider(props: {
  children: ReactNode;
  data?: DataTableStores;
}) {
  const store = useStore();

  const dataToHydrate = props.data || ({} as DataTableStores);

  useMemo(() => {
    try {
      const existing = store.get(dataTableStorageAtom);
      if (
        props.data &&
        JSON.stringify(existing) !== JSON.stringify(props.data)
      ) {
        store.set(dataTableStorageAtom, dataToHydrate);
      }
    } catch {
      store.set(dataTableStorageAtom, dataToHydrate);
    }
  }, [store, props.data, dataToHydrate]);

  useSyncExternalStore(
    (callback) => store.sub(dataTableStorageAtom, callback),
    () => store.get(dataTableStorageAtom) ?? dataToHydrate,
    () => dataToHydrate,
  );

  return <>{props.children}</>;
}
