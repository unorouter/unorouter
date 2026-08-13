"use client";

import { useJsPluginsQuery } from "@/hooks/ai/js-plugins-hook";
import { useEffect } from "react";

// Feeds the plugin engine from the local DB: full (idempotent) reload whenever
// the plugin rows change, teardown when the chat runtime unmounts. Mounted once
// in ChatRuntimeProvider.
export function useJsPluginLoader() {
  const pluginsQuery = useJsPluginsQuery();
  const rows = pluginsQuery.data;

  useEffect(() => {
    if (!rows) return;
    void import("@/lib/ai/chat/plugins/engine").then((engine) =>
      engine.loadJsPlugins(
        rows.map((r) => ({
          id: r.id,
          name: r.name,
          script: r.script,
          kind: r.kind,
          enabled: r.enabled,
        })),
      ),
    );
  }, [rows]);

  useEffect(() => {
    return () => {
      void import("@/lib/ai/chat/plugins/engine").then((engine) =>
        engine.unloadJsPlugins(),
      );
    };
  }, []);
}
