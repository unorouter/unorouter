import { defineConfig } from "orval";

export default defineConfig({
  api: {
    input: "https://api.unorouter.ai/openapi.json",
    output: {
      target: "./src/openapi.ts",
      client: "fetch",
      override: {
        mutator: { path: "./src/lib/custom-fetch.ts", name: "customFetch" },
        aliasCombinedTypes: true,
      },
    },
    hooks: { afterAllFilesWrite: "prettier --write" },
  },
});
