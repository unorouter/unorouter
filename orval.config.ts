import { defineConfig } from "orval";

export default defineConfig({
  api: {
    input: "../new-api/docs/swagger/swagger.json",
    output: {
      target: "./src/lib/api/generated/api.ts",
      client: "fetch",
      override: {
        mutator: { path: "./src/lib/api/client.ts", name: "fetcher" },
      },
    },
    hooks: { afterAllFilesWrite: "prettier --write" },
  },
});
