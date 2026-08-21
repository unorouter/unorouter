import "dotenv/config";
import { defineConfig } from "orval";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
if (!apiUrl) throw new Error("Missing required env: NEXT_PUBLIC_API_URL");

export default defineConfig({
  api: {
    input: `${apiUrl}/openapi.json`,
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
  // Only the OpenAPI document is published; /api/* answers 404 at the edge, so
  // the client generated here is usable from inside the cluster only.
  unoImport: {
    input: "https://cards.unorouter.com/openapi/json",
    output: {
      target: "./src/lib/api/uno-import.ts",
      client: "fetch",
      override: { aliasCombinedTypes: true },
    },
    hooks: { afterAllFilesWrite: "prettier --write" },
  },
});
