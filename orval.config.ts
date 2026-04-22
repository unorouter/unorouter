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
});
